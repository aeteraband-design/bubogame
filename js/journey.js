(() => {
    const CHANGED = 'bubo:journey-change';
    const DISTRICTS = [
        { id: 'night', name: 'Ночной город', shortName: 'Ночь' },
        { id: 'dawn', name: 'Дневной город', shortName: 'День' },
        { id: 'music', name: 'Музыкальный квартал', shortName: 'Музыка' },
        { id: 'magic', name: 'Школа магии', shortName: 'Магия' },
        { id: 'jungle', name: 'Джунгли', shortName: 'Джунгли' }
    ];
    const BOSS_REWARD = { xp: 150, coins: 0, spins: 1 };
    let state = { id: '', peak: 0, bossWave: 0, pending: [] };
    let flight = false;
    let windFlight = false;
    let launchingWind = false;
    let openBossTimer = 0;

    function restore(data) {
        if (!data || typeof data !== 'object') return;
        state = {
            id: typeof data.id === 'string' ? data.id : '',
            peak: Number.isSafeInteger(data.peak) && data.peak > 0 ? data.peak : 0,
            bossWave: [1, 2].includes(data.bossWave) ? data.bossWave : 0,
            pending: Array.isArray(data.pending) ? [...new Set(data.pending.filter(id => typeof id === 'string' && id))] : []
        };
    }

    function snapshot() { return { ...state, pending: [...state.pending] }; }
    function notify() { window.dispatchEvent(new Event(CHANGED)); }

    function configuredTotal() { return Math.max(1, TOTAL_THEMES); }
    function districtIndex(count) {
        return Math.min(DISTRICTS.length - 1, Math.floor(count * DISTRICTS.length / configuredTotal()));
    }
    function mapProgress() { return Math.min(configuredTotal(), Math.max(state.peak, getTotalCollectedThemes())); }
    function region() { return DISTRICTS[districtIndex(mapProgress())]; }
    function regionName(id) { return DISTRICTS.find(district => district.id === id)?.name || ''; }
    function districtUnlockAt(id) {
        const index = DISTRICTS.findIndex(district => district.id === id);
        return index < 0 ? null : Math.ceil(index * configuredTotal() / DISTRICTS.length);
    }
    function regionProgress() {
        const count = mapProgress();
        const index = districtIndex(count);
        const start = districtUnlockAt(DISTRICTS[index].id);
        const end = districtUnlockAt(DISTRICTS[index + 1]?.id) ?? configuredTotal();
        return { passed: Math.max(0, count - start), total: Math.max(1, end - start) };
    }

    function recordCollection() {
        if (!flight) return;
        const previous = districtIndex(state.peak);
        state.peak = mapProgress();
        const current = region();
        if (current === DISTRICTS[previous]) return;
        AudioFX.setDistrict?.(current.id);
        showGoldBanner(current.name, 'fa-map-location-dot', '#FDBA74');
        window.BuboPlaytest?.record('journey:district', { from: DISTRICTS[previous].id, to: current.id, collected: state.peak, score });
        notify();
    }

    function resetRoute({ retainRewards = true } = {}) {
        clearTimeout(openBossTimer);
        openBossTimer = 0;
        state = { id: '', peak: 0, bossWave: 0, pending: retainRewards ? state.pending : [] };
        notify();
    }

    function enterFlight({ secondWind = false } = {}) {
        flight = true;
        windFlight = secondWind;
        state.peak = mapProgress();
        AudioFX.setDistrict?.(region().id);
        notify();
    }
    function leaveFlight() {
        if (!flight) return;
        flight = false;
        windFlight = false;
        AudioFX.setDistrict?.(null);
        notify();
    }

    function isBossReady() {
        return !hasWonGame && THEME_KEYS_ALL.length > 0 && THEME_KEYS_ALL.every(
            key => (collected[key] || 0) >= CATEGORIES[key].count
        );
    }
    function show(type, message) { window.BuboCampaign.showJourneyResult(type, message); }
    function onCollectionComplete() {
        if (!flight || openBossTimer || !isBossReady()) return;
        const saved = StorageManager.saveLocal();
        gameActive = false;
        waitingFirstTap = false;
        openBossTimer = setTimeout(() => {
            openBossTimer = 0;
            window.FlightQuizBonus?.endFlight(score, 'boss-ready');
            returnToHome();
            show(saved ? 'journey-ready' : 'journey-save-error', saved
                ? 'Все значки собраны. Башня Смотрителя открыта.'
                : 'Все значки собраны. Повтори сохранение перед входом в башню.');
        }, 0);
    }

    function bossWave() { return isBossReady() ? state.bossWave : null; }
    function hasDefeatedBoss() { return hasWonGame && Boolean(state.id); }
    function saveBossWave(wave) {
        if (!isBossReady() || ![1, 2].includes(wave)) return false;
        if (wave <= state.bossWave) return true;
        const previous = state.bossWave;
        state.bossWave = wave;
        if (StorageManager.saveLocal()) return true;
        state.bossWave = previous;
        return false;
    }

    function settleRewards() {
        for (const id of state.pending) {
            const receipt = 'journey:boss:' + id;
            if (!window.profAwardCampaignXP?.(BOSS_REWARD.xp, receipt)) return false;
            if (!window.awardCampaignSpinOnce?.(receipt)) return false;
            const previous = state.pending;
            state.pending = state.pending.filter(value => value !== id);
            if (!StorageManager.saveLocal()) {
                state.pending = previous;
                return false;
            }
        }
        return !state.pending.length;
    }
    function finishBoss() {
        if (!isBossReady()) return false;
        const previous = snapshot();
        const id = state.id || window.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
        state.id = id;
        state.bossWave = 0;
        state.pending.push(id);
        hasWonGame = true;
        if (!StorageManager.saveLocal()) {
            hasWonGame = false;
            state = previous;
            return false;
        }
        if (typeof pfStat === 'function') pfStat('wins', 1);
        const rewardPending = !settleRewards();
        return { reward: { ...BOSS_REWARD }, rewardPending };
    }

    function windContext() {
        const campaign = window.BuboCampaign;
        return {
            phase: campaign.status().practiced ? (isBossReady() ? 'boss' : 'night') : 'training',
            attempts, mapReplay: hasWonGame, startedOn: campaign.onboardingSince()
        };
    }
    function offer() { return window.BuboSecondWind?.status(windContext()); }
    function celebrate() { return flight && Boolean(window.BuboCampaignDayArt?.celebrate(region().id)); }

    function start(useWind = false) {
        const campaign = window.BuboCampaign;
        if (gameActive || campaign.isActive() || openBossTimer) return false;
        if (!campaign.status().practiced) return campaign.start();
        checkDailyReset();
        settleRewards();
        const boss = isBossReady();
        if (boss && !StorageManager.saveLocal()) {
            show('journey-save-error', 'Не удалось сохранить коллекцию. Попробуй ещё раз.');
            return false;
        }
        const needsWind = attempts === 0;
        const wind = window.BuboSecondWind;
        const ticket = useWind && needsWind ? wind?.consume(windContext()) : null;
        if (needsWind && !ticket) {
            if (!useWind) wind?.recover();
            show('journey-exhausted', 'На сегодня обычные попытки закончились.');
            return false;
        }

        campaign.dismissResult();
        if (!ticket) {
            if (boss) return campaign.startJourneyBoss();
            startOrResumeFlight();
            return flight;
        }

        let started = false;
        launchingWind = true;
        try {
            if (boss) started = campaign.startJourneyBoss({ secondWind: true });
            else {
                startOrResumeFlight({ secondWind: true });
                started = flight;
            }
            started = started && wind.markStarted(ticket);
        } catch (e) {
            started = false;
        } finally {
            launchingWind = false;
        }
        if (!started) {
            const refunded = wind.refund(ticket);
            returnToHome();
            show('journey-exhausted', refunded ? 'Не удалось начать вылет. Монеты возвращены.' : 'Не удалось начать вылет. Игра восстанавливает покупку.');
            return false;
        }
        window.BuboPlaytest?.record('second_wind:started', { phase: boss ? 'boss' : region().id, mode: ticket.mode, price: ticket.price, balance: coinsGet() });
        return true;
    }

    window.BuboJourney = {
        restore, snapshot, resetRoute, recordCollection, enterFlight, leaveFlight, onCollectionComplete,
        isFlight: () => flight, isSecondWind: () => launchingWind || windFlight, inSecondWind: () => windFlight,
        region, regionName, districtUnlockAt, regionProgress, districts: () => [...DISTRICTS],
        isBossReady, hasDefeatedBoss, bossWave, saveBossWave, finishBoss, settleRewards, offer, start, celebrate
    };
})();
