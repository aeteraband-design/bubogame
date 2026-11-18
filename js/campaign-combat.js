(() => {
    const COLD_MAX = 2;
    const DASH = { duration: 150, fade: 90 };
    const COLORS = { fire: '#FF8056', water: '#7DDCFF', shazam: '#FFCE73' };
    const WAVE_TIPS = { fire: 'Мороженое гасит огонь', water: 'Ускорение ослабляет напор', shazam: 'Подбери ШАЗАМ' };
    let wave = '', coldGuard = 0, shazamOffered = false, finalGateApproached = false;
    let fireBlocks = 0, fireShots = 0, waterJets = 0, shazamStarts = 0;
    let previousDash = null;

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
        finishDash() {
            if (previousDash && !shazamBusy()) { restoreDash(); notify(); }
        },
        shot(pipe) { fireShots++; window.BuboCampaignGuardian?.strike('fire', pipe); notify(); },
        jet() { waterJets++; window.BuboCampaignGuardian?.strike('water'); notify(); }
    };
})();
