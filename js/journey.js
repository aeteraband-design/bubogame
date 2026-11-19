(() => {
    const CHANGED = 'bubo:journey-change';
    // Stored collection slots keep their IDs when a district assigns them new topics.
    const THEME_KEYS = Object.freeze(['kino', 'series', 'cartoons', 'music', 'fun']);
    const DISTRICTS = [
        { id: 'night', name: 'Ночной город', shortName: 'Ночь', legacy: ['kino', 'series'] },
        { id: 'dawn', name: 'Дневной город', shortName: 'День' },
        { id: 'music', name: 'Венецианский карнавал', shortName: 'Венеция', legacy: ['music'] },
        { id: 'magic', name: 'Замок алхимиков', shortName: 'Замок', legacy: ['fun'] },
        { id: 'jungle', name: 'Джунгли', shortName: 'Джунгли', legacy: ['', '', 'cartoons'] }
    ];
    const BOSS_REWARD = { xp: 150, coins: 0, spins: 1 };
    function newRunId() { return window.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2); }
    function newState(pending = []) {
        return {
            version: 2, runId: newRunId(), index: 0, bonusGates: 0, bossWave: 0, prize: '', pending, legacyCollection: null,
            lostAttempts: 0, stars: DISTRICTS.map(() => 0), pathCoins: [0, 0, 0]
        };
    }
    let state = newState();
    let savedRoute = '';
    let flight = false;
    let windFlight = false;
    let launchingWind = false;
    let openBossTimer = 0;

    function count(value) { return Number.isSafeInteger(value) && value > 0 ? value : 0; }
    function routeKey(data) {
        return data?.version === 2 ? [data.runId || '', data.index, data.bossWave, data.prize || ''].join(':') : '';
    }
    function markSaved(data) { savedRoute = routeKey(data); }
    function isOutdated() {
        const stored = JSON.parse(BuboSaveStorage.getItem(StorageManager.LOCAL_KEY) || 'null');
        return savedRoute !== routeKey(stored?.journey);
    }
    function reloadIfOutdated() {
        try { if (!isOutdated()) return false; } catch (error) { return false; }
        window.location.reload();
        return true;
    }

    function restore(data, fromStorage = false) {
        if (fromStorage) markSaved(data);
        const pending = Array.isArray(data?.pending)
            ? [...new Set(data.pending.filter(id => typeof id === 'string' && id))] : [];
        if (data?.version === 2) {
            const index = Math.min(DISTRICTS.length, count(data.index));
            state = {
                ...newState(pending), index, bonusGates: Math.min(5, count(data.bonusGates)),
                ...(typeof data.runId === 'string' && data.runId ? { runId: data.runId } : {}),
                bossWave: [1, 2].includes(data.bossWave) ? data.bossWave : 0,
                lostAttempts: count(data.lostAttempts),
                stars: DISTRICTS.map((_, i) => Math.min(3, count(data.stars?.[i]))),
                pathCoins: [0, 1, 2].map(i => Math.min(4, count(data.pathCoins?.[i]))),
                prize: index < DISTRICTS.length && data.prize === DISTRICTS[index].id ? data.prize : '',
                legacyCollection: data.legacyCollection && typeof data.legacyCollection === 'object'
                    ? data.legacyCollection : null
            };
            hasWonGame = index >= DISTRICTS.length;
            return;
        }
        // Preserve all old counts. Bring across only badges whose question theme actually matches.
        const legacyCollection = Object.fromEntries(Object.entries(collected).map(([key, value]) => [key, count(value)]));
        state = { ...newState(pending), legacyCollection };
        hasWonGame = false;
        loadDistrictCollection(region());
    }

    function snapshot() { return { ...state, pending: [...state.pending], stars: [...state.stars], pathCoins: [...state.pathCoins] }; }
    function notify() { window.dispatchEvent(new Event(CHANGED)); }
    function region() { return DISTRICTS[Math.min(state.index, DISTRICTS.length - 1)]; }
    function regionName(id) { return DISTRICTS.find(district => district.id === id)?.name || ''; }
    function themeVisual(key) {
        const slot = THEME_KEYS.indexOf(key);
        return slot < 0 ? null : window.BuboCampaignTopics?.districtTopics?.(region().id)?.[slot] || CATEGORIES[key];
    }

    function themeQuota(key, district = region().id) { return ADMIN_CFG.districtThemes[district]?.[key] || ADMIN_CFG.themes[key]; }
    function districtTotal(district) { return THEME_KEYS.reduce((sum, key) => sum + themeQuota(key, district), 0); }
    function recordLoss() { state.lostAttempts++; }
    function starsFor(id) { return state.stars[DISTRICTS.findIndex(district => district.id === id)] || 0; }
    function availablePathCoins(tier) { return Math.max(0, 4 - (state.pathCoins[tier] || 0)); }
    function recordPathCoin(tier) {
        if (!availablePathCoins(tier)) return;
        state.pathCoins[tier]++;
        StorageManager.save();
    }

    function loadDistrictCollection(district) {
        for (const key of Object.keys(collected)) collected[key] = 0;
        for (const [slot, key] of THEME_KEYS.entries()) {
            const original = district.legacy?.[slot];
            collected[key] = original ? Math.min(themeQuota(key, district.id), count(state.legacyCollection?.[original])) : 0;
        }
    }

    function regionProgress() {
        let total = 0, passed = 0;
        for (const key of THEME_KEYS) {
            const quota = themeQuota(key);
            total += quota;
            passed += Math.min(quota, count(collected[key]));
        }
        return { passed, total };
    }

    function flightProgress() {
        const { passed, total } = regionProgress();
        const target = Math.max(total, DIFF_LEVELS.length);
        return { passed: passed + Math.min(state.bonusGates, target - total), total: target };
    }

    function difficultyIndex() {
        const { passed, total } = flightProgress();
        return Math.min(DIFF_LEVELS.length - 1, Math.floor(passed * DIFF_LEVELS.length / total));
    }

    function recordCollection(key) {
        if (!THEME_KEYS.includes(key)) return null;
        const amount = collected[key];
        const credit = themeQuota(key) === 1 && amount >= 1 ? 2 : amount;
        return window.BuboCampaignTopics?.collectDistrictToken(region().id, key, credit);
    }

    function resetRoute({ retainRewards = true } = {}) {
        clearTimeout(openBossTimer);
        openBossTimer = 0;
        const stars = state.stars;
        state = newState(retainRewards ? state.pending : []);
        if (retainRewards) state.stars = stars;
        window.BuboCampaignCombat?.resetFlightHazard({ newRoute: true });
        notify();
    }

    function syncTopicUnlocks() {
        for (const key of THEME_KEYS) recordCollection(key);
    }

    function enterFlight({ secondWind = false } = {}) {
        flight = true;
        windFlight = secondWind;
        syncTopicUnlocks();
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

    function prizeDistrictId() { return state.prize; }
    function isBossReady() {
        if (hasWonGame || state.prize) return false;
        const { passed, total } = flightProgress();
        return passed >= total;
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
                ? 'Коллекция района собрана. Путь к Смотрителю открыт.'
                : 'Не удалось сохранить коллекцию. Попробуй ещё раз.');
        }, 0);
    }

    function onRegularGate() {
        const { passed, total } = regionProgress();
        if (passed !== total || total + state.bonusGates >= DIFF_LEVELS.length) return;
        state.bonusGates++;
        updateDifficultyHUD();
        StorageManager.save();
        onCollectionComplete();
    }

    function bossWave() { return isBossReady() ? state.bossWave : null; }
    function hasDefeatedBoss() { return hasWonGame; }
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
        if (!state.pending.length) return true;
        try { if (isOutdated()) return false; } catch (error) { return false; }
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
        if (!isBossReady() || isOutdated()) return false;
        const previous = snapshot();
        const winId = state.runId + ':' + region().id;
        state.prize = region().id;
        state.bossWave = 0;
        state.stars[state.index] = Math.max(state.stars[state.index], Math.max(1, 3 - state.lostAttempts));
        state.pending.push(winId);
        if (!StorageManager.saveLocal()) {
            state = previous;
            return false;
        }
        if (typeof pfStat === 'function') pfStat('wins', 1);
        const rewardPending = !settleRewards();
        return { reward: { ...BOSS_REWARD }, rewardPending };
    }

    function commitBoss() {
        const locks = window.navigator?.locks;
        if (!locks) return Promise.resolve().then(finishBoss);
        const lockName = 'bubo:boss:' + BuboLocalProfiles.storageKey(StorageManager.LOCAL_KEY);
        return locks.request(lockName, finishBoss);
    }

    // The wheel persists both the prize and district unlock in the same game snapshot.
    function advanceAfterPrize(district) {
        if (!district || district !== state.prize || district !== region().id) return null;
        const previous = snapshot();
        const previousCollection = { ...collected };
        const previousVictory = hasWonGame;
        state.index++;
        state.prize = '';
        state.bonusGates = 0;
        state.lostAttempts = 0;
        state.pathCoins = [0, 0, 0];
        hasWonGame = state.index >= DISTRICTS.length;
        if (!hasWonGame) loadDistrictCollection(region());
        return () => {
            state = previous;
            collected = previousCollection;
            hasWonGame = previousVictory;
        };
    }

    function refreshAfterPrize() {
        window.BuboCampaignCombat?.resetFlightHazard({ newRoute: true });
        lastKnownDiffIdx = difficultyIndex();
        snapProgressVisuals();
        updateHUDAll();
        notify();
    }
    function windContext() {
        const campaign = window.BuboCampaign;
        return {
            phase: campaign.status().practiced ? (isBossReady() ? 'boss' : 'night') : 'training',
            attempts, mapReplay: hasWonGame || Boolean(prizeDistrictId()), startedOn: campaign.onboardingSince()
        };
    }
    function offer() { return window.BuboSecondWind?.status(windContext()); }
    function celebrate() { return flight && Boolean(window.BuboCampaignDayArt?.celebrate(region().id)); }

    function start(useWind = false) {
        const campaign = window.BuboCampaign;
        if (gameActive || campaign.isActive() || openBossTimer || reloadIfOutdated()) return false;
        if (!campaign.status().practiced) return campaign.start();
        checkDailyReset();
        settleRewards();
        if (prizeDistrictId()) {
            openRoulette({ victory: true });
            return true;
        }
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
        restore, snapshot, markSaved, isOutdated, reloadIfOutdated, resetRoute, recordCollection, syncTopicUnlocks, onRegularGate, enterFlight, leaveFlight, onCollectionComplete,
        isFlight: () => flight, isSecondWind: () => launchingWind || windFlight, inSecondWind: () => windFlight,
        region, regionName, regionProgress, flightProgress, difficultyIndex, themeKeys: () => THEME_KEYS,
        districts: () => [...DISTRICTS], themeVisual, themeQuota, districtTotal, starsFor, recordLoss, availablePathCoins, recordPathCoin, prizeDistrictId, advanceAfterPrize, refreshAfterPrize, completedCount: () => state.index,
        isBossReady, hasDefeatedBoss, bossWave, saveBossWave, commitBoss, settleRewards, offer, start, celebrate
    };
})();
