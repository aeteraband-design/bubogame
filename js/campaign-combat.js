(() => {
    const COLD_MAX = 2;
    const DASH = { duration: 150, fade: 90 };
    const COLORS = { fire: '#FF8056', water: '#7DDCFF', shazam: '#FFCE73' };
    const WAVE_TIPS = { fire: 'Мороженое гасит огонь', water: 'Ускорение ослабляет напор', shazam: 'Подбери ШАЗАМ' };
    let wave = '', coldGuard = 0, shazamOffered = false, finalGateApproached = false;
    let fireBlocks = 0, fireShots = 0, waterJets = 0, shazamStarts = 0;
    let previousDash = null;

    const FLIGHT_WARNING = 60;
    const FLIGHT_RECOVERY = 150;
    let flightPlan = null, flightEvent = null, pendingHazard = '', flightRecovery = 0;

    function usesFlightHazards() {
        return Boolean(window.BuboJourney?.isFlight() && !window.BuboCampaign?.isActive());
    }

    function remainingHazard(kind) {
        return kind === 'fire' ? crystalTime : waterTime;
    }

    function resetFlightHazard({ newRoute = false } = {}) {
        if (flightEvent && !flightEvent.warning) {
            if (flightEvent.kind === 'fire') crystalReset();
            else waterReset();
        }
        flightEvent = null;
        pendingHazard = '';
        flightRecovery = 0;
        if (newRoute) flightPlan = null;
    }

    function flightHazard() {
        if (!flightEvent || (!flightEvent.warning && remainingHazard(flightEvent.kind) <= 0)) return null;
        const { kind, warning, elapsed } = flightEvent;
        return { kind, warning, progress: Math.min(1, elapsed / FLIGHT_WARNING) };
    }

    function isFlightHazardPipe(pipe, kind) {
        return flightEvent?.kind === kind && flightEvent.targets.has(pipe);
    }

    function canMarkPipe(pipe) {
        return !pipe.campaign && pipe.x >= owl.x + owl.radius;
    }

    function markFlightPipes(event) {
        for (const pipe of pipes) {
            if (!canMarkPipe(pipe) || event.seen.has(pipe)) continue;
            event.seen.add(pipe);
            if (event.nextIsTarget) event.targets.add(pipe);
            event.nextIsTarget = !event.nextIsTarget;
        }
    }

    function updateFlightHazard(dt) {
        if (!gameActive || !usesFlightHazards()) return;
        const journey = window.BuboJourney;
        const district = journey.region().id;
        const { passed, total } = journey.regionProgress();
        const reserve = Math.min(2, Math.floor(total / 6));
        const lastTrigger = total - reserve - 1;
        const frequency = ADMIN_CFG.crystalFreq | 0;
        if (flightPlan?.district !== district || flightPlan.total !== total || flightPlan.frequency !== frequency) {
            resetFlightHazard();
            flightPlan = { district, total, frequency, slots: makeCrystalPlan(total, frequency, passed, lastTrigger) };
        }
        if (flightPlan.finishing) return;
        if (passed > lastTrigger) {
            flightPlan.finishing = true;
            resetFlightHazard();
            return;
        }
        for (const slot of flightPlan.slots) {
            if (slot.done || slot.at > passed) continue;
            slot.done = true;
            // Save one upcoming encounter. Large jumps cannot queue a chain of attacks.
            if (!pendingHazard) pendingHazard = slot.kind === 'crystal' ? 'fire' : 'water';
        }
        if (flightEvent) {
            if (flightEvent.warning) {
                markFlightPipes(flightEvent);
                flightEvent.elapsed += dt;
                if (flightEvent.elapsed >= FLIGHT_WARNING) {
                    for (const pipe of pipes) {
                        if (!canMarkPipe(pipe)) flightEvent.targets.delete(pipe);
                    }
                    flightEvent.warning = false;
                    if (flightEvent.kind === 'fire') registerCrystal({ pickedUp: false });
                    else registerWater({ pickedUp: false });
                }
            } else if (remainingHazard(flightEvent.kind) > 0) {
                markFlightPipes(flightEvent);
            } else {
                flightRecovery += dt;
                if (flightRecovery >= FLIGHT_RECOVERY) { flightEvent = null; flightRecovery = 0; }
            }
            return;
        }
        if (!pendingHazard || crystalTime > 0 || waterTime > 0 || shazamBusy() || !pipes.some(canMarkPipe)) return;
        const kind = pendingHazard;
        pendingHazard = '';
        flightEvent = { kind, warning: true, elapsed: 0, seen: new WeakSet(), targets: new WeakSet(), nextIsTarget: true };
        markFlightPipes(flightEvent);
        const fire = kind === 'fire';
        try { AudioFX.playWatcherWarning?.(kind); } catch (e) {}
        showGoldBanner(fire ? 'Смотритель · огонь' : 'Смотритель · вода',
            fire ? 'fa-fire' : 'fa-droplet', COLORS[kind], 1100);
    }

    function notify() {
        window.dispatchEvent(new Event('bubo:campaign-combat'));
    }

    function restoreDash() {
        if (!previousDash) return;
        SHZ.DUR = previousDash.duration;
        SHZ.FADE = previousDash.fade;
        previousDash = null;
    }

    function reset() {
        restoreDash();
        wave = '';
        window.BuboCampaignGuardian?.reset();
        coldGuard = 0;
        shazamOffered = false;
        finalGateApproached = false;
        fireBlocks = fireShots = waterJets = shazamStarts = 0;
        notify();
    }

    function status() {
        return { wave, coldGuard, shazamOffered, finalGateApproached, shazamActive: Boolean(previousDash) && shazamBusy(), fireBlocks, fireShots, waterJets, shazamStarts };
    }

    function approach(pipe) {
        const gate = pipe.campaign;
        if (!gate || pipe.campaignAnnounced) return;
        pipe.campaignAnnounced = true;
        if (!gate.wave || gate.wave === wave) return;
        wave = gate.wave;
        window.BuboCampaignGuardian?.phase(wave);
        if (wave === 'shazam') shazamOffered = true;
        window.BuboCampaign?.onWave(wave);
        if (gate.warning) showGoldBanner(WAVE_TIPS[wave] || gate.warning, 'fa-circle-exclamation', COLORS[wave]);
        notify();
    }

    function iceCream() {
        const old = coldGuard;
        coldGuard = Math.min(COLD_MAX, coldGuard + 1);
        if (old !== coldGuard) {
            try { Haptics.powerup(); } catch (e) {}
            notify();
        }
        showGoldBanner('Ледяная защита ' + coldGuard + '/' + COLD_MAX, 'fa-snowflake', '#B5E4FF', 1600);
    }

    function blockFireball(pipe) {
        if (!window.BuboCampaign?.isActive() || pipe?.campaign?.hazard !== 'fire' || coldGuard <= 0) return false;
        coldGuard--;
        fireBlocks++;
        try { AudioFX.playShieldCollect(); Haptics.powerup(); } catch (e) {}
        showGoldBanner('Лёд погасил огонь · ' + coldGuard + '/' + COLD_MAX, 'fa-snowflake', '#B5E4FF', 1700);
        notify();
        return true;
    }

    function launchShazam() {
        if (wave !== 'shazam' || shazamStarts > 0 || finalGateApproached || shazamBusy()) return false;
        previousDash = { duration: SHZ.DUR, fade: SHZ.FADE };
        SHZ.DUR = DASH.duration;
        SHZ.FADE = DASH.fade;
        shazamOffered = true;
        shazamStarts++;
        shazamStart();
        window.BuboCampaignGuardian?.strike('shazam');
        showGoldBanner('ШАЗАМ! Затем пройди последние ворота', 'fa-bolt-lightning', COLORS.shazam, 1800);
        notify();
        return true;
    }

    function beforeGate(pipe) {
        if (!pipe.campaign?.terminal || pipe.x - owl.x > 155 || pipe.campaignFinishWarned) return;
        pipe.campaignFinishWarned = true;
        finalGateApproached = true;
        if (previousDash) {
            if (shazamBusy()) shazamEnd();
            restoreDash();
        }
        notify();
        showGoldBanner('Финиш · держи высоту', 'fa-flag-checkered', '#FFDFC2', 1700);
    }

    function catchLauncher(item) {
        const pipe = item.campaignPipe;
        return Boolean(item.__forceShz && pipe && Math.abs(owl.x - item.x) <= owl.radius + 18
            && owl.y > pipe.top + owl.radius && owl.y < pipe.top + pipe.gap - owl.radius);
    }

    window.BuboCampaignCombat = {
        status, reset, approach, iceCream, blockFireball, launchShazam, beforeGate, catchLauncher,
        usesFlightHazards, updateFlightHazard, resetFlightHazard, flightHazard, isFlightHazardPipe,
        finishDash() {
            if (previousDash && !shazamBusy()) { restoreDash(); notify(); }
        },
        shot(pipe) { fireShots++; window.BuboCampaignGuardian?.strike('fire', pipe); notify(); },
        jet() { waterJets++; window.BuboCampaignGuardian?.strike('water'); notify(); }
    };
})();
