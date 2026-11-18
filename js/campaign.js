(function () {
    const KEY = 'bubo_campaign_first_map_v1';
    const RECEIPT = 'campaign:first-map:';
    const CHANGED = 'bubo:campaign-change';
    const PHASES = ['training', 'night', 'dawn', 'boss', 'complete'];
    const STAGES = {
        training: {
            title: 'Первые три трубы',
            hint: 'Каждое нажатие поднимает сову. Остановись — она начнёт падать.',
            reward: { xp: 20, coins: 0, spins: 0 },
            gapScale: 1.65,
            routes: [[.50, .50, .47]]
        },
        night: {
            title: 'Ночной город',
            hint: 'Собери парные отметки викторины. Шесть труб открывают Дневной город.',
            reward: { xp: 80, coins: 30, spins: 0 },
            gapScale: 1.32,
            routes: [
                [.50, .46, .40, .46, .55, .51],
                [.50, .55, .61, .55, .45, .49],
                [.50, .44, .47, .53, .47, .45]
            ]
        },
        dawn: {
            title: 'Дневной город',
            hint: 'Собери парные отметки викторины. Восемь труб открывают башню.',
            reward: { xp: 40, coins: 40, spins: 0 },
            gapScale: 1.19,
            routes: [
                [.51, .43, .35, .44, .54, .62, .55, .48],
                [.50, .57, .65, .56, .46, .36, .44, .52],
                [.50, .43, .49, .58, .52, .41, .44, .54]
            ]
        },
        boss: {
            title: 'Смотритель башни',
            hint: 'Три волны. На входе в каждую подбери нужный бонус.',
            reward: { xp: 60, coins: 60, spins: 1 },
            gapScale: 1.20
        },
        complete: { title: 'Поход завершён', hint: 'Повтори маршрут, чтобы добрать пропущенные отметки викторины.' }
    };
    const WAVES = {
        fire: { title: 'Огонь', warning: 'Подбери мороженое. Каждая порция защитит от одного огненного шара.' },
        water: { title: 'Водонапор', warning: 'Подбери ускорение перед потоком воды.' },
        shazam: { title: 'ШАЗАМ', warning: 'Подбери ШАЗАМ, а в конце снова управляй совой.' }
    };
    const BOSS_ROUTE = [
        { center: .50, wave: 'fire', item: 'icecream' },
        { center: .46, wave: 'fire', hazard: 'fire', item: 'icecream' },
        { center: .49, wave: 'fire', hazard: 'fire' },
        { center: .52, wave: 'water', item: 'speedup' },
        { center: .56, wave: 'water', hazard: 'water', item: 'stamina' },
        { center: .52, wave: 'water', hazard: 'water', item: 'speedup' },
        { center: .50, wave: 'shazam', item: 'shazam' },
        { center: .50, wave: 'shazam', hazard: 'shazam' },
        { center: .50, wave: 'shazam', hazard: 'shazam' },
        { center: .50, wave: 'shazam', hazard: 'shazam' },
        { center: .50, wave: 'shazam', terminal: true }
    ];

    const BOSS_WAVE_STARTS = [0, 3, 6];
    let runtime = null;
    let result = null;

    function read() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY));
            if (raw?.version === 1 && Number.isSafeInteger(raw.seed) && raw.seed >= 0 && Number.isInteger(raw.stage)
                && raw.stage >= 0 && raw.stage < PHASES.length && Array.isArray(raw.pending)) {
                return {
                    version: 1,
                    seed: raw.seed,
                    stage: raw.stage,
                    bossWave: [1, 2].includes(raw.bossWave) ? raw.bossWave : 0,
                    replayStage: raw.stage === PHASES.length - 1 && [1, 2, 3].includes(raw.replayStage) ? raw.replayStage : null,
                    replaySeed: Number.isSafeInteger(raw.replaySeed) && raw.replaySeed > 0 ? raw.replaySeed : 0,
                    replayBossWave: [1, 2].includes(raw.replayBossWave) ? raw.replayBossWave : 0,
                    onboardingSince: /^\d{4}-\d{2}-\d{2}$/.test(raw.onboardingSince) ? raw.onboardingSince : '',
                    pending: [...new Set(raw.pending)].filter(index => Number.isInteger(index) && index >= 0 && index < raw.stage),
                    guardDay: /^\d{4}-\d{2}-\d{2}$/.test(raw.guardDay) ? raw.guardDay : '',
                    guarded: Array.isArray(raw.guarded) ? raw.guarded.filter(phase => ['night', 'dawn', 'boss'].includes(phase)) : []
                };
            }
        } catch (e) {}
        return {
            version: 1, seed: 0, stage: 0, bossWave: 0, replayStage: null, replaySeed: 0, replayBossWave: 0,
            onboardingSince: '', pending: [], guardDay: '', guarded: []
        };
    }

    function save(value) {
        try { localStorage.setItem(KEY, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }

    function notify() {
        window.dispatchEvent(new CustomEvent(CHANGED));
    }

    function route(phase, seed) {
        const stage = STAGES[phase];
        if (phase === 'boss') return BOSS_ROUTE;
        if (!stage.routes) return [];
        const offset = phase === 'dawn' ? 1 : 0;
        const variant = (seed + offset) % stage.routes.length;
        return stage.routes[variant].map(center => ({ center }));
    }

    function rewardPending() {
        const progress = read();
        if (runtime?.test) return progress.pending.length === 0;
        for (const index of progress.pending) {
            const phase = PHASES[index];
            const reward = STAGES[phase].reward;
            const receipt = RECEIPT + phase;
            if (reward.coins && !window.coinsAddOnce?.(reward.coins, receipt)) break;
            if (reward.xp && !window.profAwardCampaignXP?.(reward.xp, receipt)) break;
            if (reward.spins && !window.awardCampaignSpinOnce?.(receipt)) break;
            if (!save({ ...progress, pending: progress.pending.filter(item => item !== index) })) break;
            progress.pending = progress.pending.filter(item => item !== index);
        }
        return read().pending.length === 0;
    }

    function status() {
        const progress = read();
        const nextPhase = PHASES[progress.replayStage ?? progress.stage];
        const phase = runtime?.phase || nextPhase;
        const stage = STAGES[phase];
        const bossWave = runtime?.checkpoint ?? (progress.replayStage === 3 ? progress.replayBossWave : progress.bossWave);
        const checkpointWave = phase === 'boss' ? BOSS_ROUTE[BOSS_WAVE_STARTS[bossWave]].wave : '';
        const wave = runtime?.wave || checkpointWave;
        return {
            phase,
            stageIndex: PHASES.indexOf(phase),
            nextPhase,
            checkpointWave,
            canReplay: progress.stage === PHASES.length - 1 && progress.replayStage === null,
            mapReplay: runtime?.mapReplay ?? progress.replayStage !== null,
            title: stage.title,
            hint: WAVES[wave]?.warning || stage.hint,
            wave,
            waveTitle: WAVES[wave]?.title || '',
            waveIndex: wave ? Object.keys(WAVES).indexOf(wave) + 1 : 0,
            passed: runtime?.passed.size || (phase === 'boss' ? BOSS_WAVE_STARTS[bossWave] : 0),
            total: runtime?.route.length || route(phase, progress.seed).length,
            active: !!runtime,
            test: Boolean(runtime?.test),
            attempts: typeof attempts === 'number' ? attempts : 0,
            practiced: progress.stage > 0,
            result
        };
    }

    function secondWindOffer() {
        const progress = read();
        return window.BuboSecondWind?.status({
            phase: PHASES[progress.replayStage ?? progress.stage],
            attempts, mapReplay: Boolean(runtime || progress.replayStage !== null),
            startedOn: progress.onboardingSince
        });
    }

    function createRuntime(phase, gateRoute, checkpoint, mode) {
        const start = phase === 'boss' ? BOSS_WAVE_STARTS[checkpoint] : 0;
        return {
            phase, ...mode, checkpoint, route: gateRoute, issued: start,
            passed: new Set(gateRoute.slice(0, start).map((_, index) => index)),
            wave: phase === 'boss' ? gateRoute[start].wave : '',
            day: typeof playDay === 'string' && playDay ? playDay : todayKey(),
            classic: { lives, stamina, maxLives, startLives, maxStamina, heartOverflow, magicFeathersCaught, featherMaxBonus }
        };
    }

    function setStageForTest(phase) {
        if (!['night', 'dawn', 'boss'].includes(phase) || runtime || gameActive || typeof startOrResumeFlight !== 'function') return false;
        window.BuboCampaignTopics?.resetPreview();
        runtime = createRuntime(phase, route(phase, read().seed), 0, { test: true });
        result = null;
        startOrResumeFlight({ campaign: true });
        notify();
        return true;
    }

    function sceneProgress() {
        return runtime ? { passed: runtime.passed.size, total: runtime.route.length } : null;
    }

    function begin(replay, useWind = false) {
        if (runtime || gameActive || typeof startOrResumeFlight !== 'function') return false;
        const progress = read();
        const mapReplay = !replay && progress.replayStage !== null;
        const phase = replay ? 'training' : PHASES[progress.replayStage ?? progress.stage];
        if (phase === 'complete') return false;
        rewardPending();
        checkDailyReset();
        if (phase !== 'training' && attempts === 0 && !useWind) window.BuboSecondWind?.recover();
        if (phase !== 'training' && attempts <= 0 && !useWind) {
            result = { type: 'no-attempts', phase, title: STAGES[phase].title, reason: 'На сегодня попыток не осталось.' };
            notify();
            return false;
        }
        if (!progress.seed) {
            const current = read();
            const seeded = { ...current, seed: Date.now() % 2147483647 || 1 };
            if (!save(seeded)) {
                result = { type: 'save-error', phase, title: STAGES[phase].title, reason: 'Не удалось сохранить поход. Попробуй ещё раз.' };
                notify();
                return false;
            }
            progress.seed = seeded.seed;
        }
        const checkpoint = phase === 'boss' ? (mapReplay ? progress.replayBossWave : progress.bossWave) : 0;
        const gateRoute = route(phase, mapReplay ? progress.replaySeed : progress.seed);
        const offerContext = { phase, attempts, mapReplay, startedOn: progress.onboardingSince };
        const wind = useWind && attempts === 0 ? window.BuboSecondWind : null;
        const ticket = wind?.consume(offerContext);
        if (useWind && attempts === 0 && !ticket) {
            const offer = wind?.status(offerContext);
            const unavailable = !offer?.available;
            result = {
                type: 'no-attempts', phase, title: STAGES[phase].title,
                reason: unavailable ? 'На сегодня попыток не осталось.' : 'Не удалось сохранить вылет. Попробуй ещё раз.'
            };
            notify();
            return false;
        }
        result = null;
        runtime = createRuntime(phase, gateRoute, checkpoint, { replay, mapReplay, secondWind: ticket?.mode || '' });
        if (ticket) {
            let started = false;
            try {
                startOrResumeFlight({ campaign: true });
                started = wind.markStarted(ticket);
            } catch (e) {}
            if (!started) {
                const restored = wind.refund(ticket);
                returnToHome();
                result = {
                    type: 'no-attempts', phase, title: STAGES[phase].title,
                    reason: restored ? 'Полёт не начался. Попробуй ещё раз.' : 'Полёт не начался. Игра восстанавливает покупку.'
                };
                notify();
                return false;
            }
            window.BuboPlaytest?.record('second_wind:started', {
                mode: ticket.mode, price: ticket.price, phase, balance: window.coinsGet?.()
            });
        } else {
            startOrResumeFlight({ campaign: true });
        }
        notify();
        return true;
    }

    function startMapReplay() {
        if (runtime || gameActive) return false;
        const progress = read();
        if (progress.stage !== PHASES.length - 1) return false;
        if (progress.replayStage !== null) return begin(false);
        const replaySeed = (progress.replaySeed || progress.seed) % 2147483646 + 1;
        if (!save({ ...progress, replayStage: 1, replaySeed, replayBossWave: 0 })) {
            result = { type: 'save-error', phase: 'complete', title: STAGES.complete.title, reason: 'Не удалось начать новый маршрут. Попробуй ещё раз.' };
            notify();
            return false;
        }
        return begin(false);
    }

    function nextPipe() {
        if (!runtime || runtime.issued >= runtime.route.length) return null;
        const index = runtime.issued++;
        const pipe = runtime.route[index];
        const startsWave = pipe.wave && runtime.route[index - 1]?.wave !== pipe.wave;
        return {
            ...pipe, index, phase: runtime.phase, test: Boolean(runtime.test), gapScale: STAGES[runtime.phase].gapScale,
            warning: startsWave ? WAVES[pipe.wave].warning : ''
        };
    }

    function onWave(wave) {
        if (!runtime || !WAVES[wave] || runtime.wave === wave) return false;
        runtime.wave = wave;
        notify();
        return true;
    }

    function checkpointBossWave() {
        let next = 0;
        while (runtime.passed.has(next)) next++;
        const wave = next >= BOSS_WAVE_STARTS[2] ? 2 : next >= BOSS_WAVE_STARTS[1] ? 1 : 0;
        if (wave <= runtime.checkpoint) return true;
        if (runtime.test) {
            runtime.checkpoint = wave;
            return true;
        }
        const progress = read();
        const field = runtime.mapReplay ? 'replayBossWave' : 'bossWave';
        const stage = runtime.mapReplay ? progress.replayStage : progress.stage;
        if (stage === 3 && wave > progress[field] && !save({ ...progress, [field]: wave })) return false;
        runtime.checkpoint = wave;
        return true;
    }

    function onPipePassed(pipe) {
        const gate = pipe?.campaign;
        if (!runtime || !gate || !Number.isInteger(gate.index) || runtime.passed.has(gate.index) || gate.index < 0 || gate.index >= runtime.route.length) return false;
        runtime.passed.add(gate.index);
        const { phase, replay, mapReplay } = runtime;
        if (runtime.passed.size < runtime.route.length) {
            if (phase === 'boss' && !checkpointBossWave()) {
                completeFlight({ type: 'save-error', phase, title: STAGES[phase].title, reason: 'Не удалось сохранить волну. Попробуй ещё раз.' });
                return true;
            }
            notify();
            return false;
        }
        if (runtime.test) {
            completeFlight({ type: 'test-complete', phase, title: STAGES[phase].title, test: true });
            return true;
        }
        const index = PHASES.indexOf(phase);
        const progress = read();
        const firstClear = !replay && !mapReplay && progress.stage === index;
        const replayClear = mapReplay && progress.replayStage === index;
        const reward = firstClear ? STAGES[phase].reward : { xp: 0, coins: 0, spins: 0 };
        const onboardingSince = phase === 'training' && typeof PG !== 'undefined' && PG.introCurve && PG.lvl === 1
            ? todayKey() : progress.onboardingSince;
        const next = firstClear ? {
            ...progress, stage: index + 1, bossWave: 0, onboardingSince, pending: [...progress.pending, index]
        }
            : replayClear ? { ...progress, replayStage: index < 3 ? index + 1 : null, replayBossWave: 0 }
            : null;
        if (next && !save(next)) {
            completeFlight({ type: 'save-error', phase, title: STAGES[phase].title, reason: 'Не удалось сохранить результат. Попробуй ещё раз.' });
            return true;
        }
        completeFlight({
            type: phase === 'boss' ? 'victory' : 'checkpoint',
            phase,
            title: STAGES[phase].title,
            replay,
            mapReplay,
            reward
        });
        return true;
    }

    function consumeGuard() {
        if (!runtime || runtime.phase === 'training' || typeof skRank !== 'function' || skRank('softHit') < 1) return false;
        if (runtime.test) {
            if (runtime.testGuardUsed) return false;
            runtime.testGuardUsed = true;
        } else {
            const progress = read();
            const { day, phase } = runtime;
            if (progress.guardDay > day) return false;
            const guarded = progress.guardDay === day ? progress.guarded : [];
            if (guarded.includes(phase) || !save({ ...progress, guardDay: day, guarded: [...guarded, phase] })) return false;
        }
        if (typeof showGoldBanner === 'function') showGoldBanner('Мягкая посадка', 'fa-feather', '#FFBD80');
        notify();
        return true;
    }

    function learningHint(reason) {
        if (/земл|упал/i.test(reason)) return 'Нажимай снова, когда сова начинает опускаться.';
        if (/верхн|край/i.test(reason)) return 'Дай сове чуть опуститься перед следующим нажатием.';
        return 'Целься в середину проёма. Нажимай короткими тапами.';
    }

    function onFatal(reason) {
        if (!runtime) return false;
        const { phase, checkpoint } = runtime;
        if (runtime.test) {
            completeFlight({ type: 'test-failure', phase, title: STAGES[phase].title, reason, test: true });
            return true;
        }
        const training = phase === 'training';
        if (!training && !runtime.secondWind) attempts = Math.max(0, attempts - 1);
        completeFlight({
            type: training ? 'training-failure' : 'failure',
            phase,
            title: STAGES[phase].title,
            reason,
            hint: training ? learningHint(reason) : STAGES[phase].hint,
            waveTitle: phase === 'boss' ? WAVES[BOSS_ROUTE[BOSS_WAVE_STARTS[checkpoint]].wave].title : ''
        });
        return true;
    }

    function completeFlight(value) {
        const secondWind = runtime?.secondWind || '';
        gameActive = false;
        waitingFirstTap = false;
        returnToHome();
        if (value.test) {
            result = value;
            notify();
            return;
        }
        if (!rewardPending()) value.rewardPending = true;
        window.BuboPlaytest?.record('campaign:result', {
            phase: value.phase, result: value.type, replay: Boolean(value.replay || value.mapReplay),
            rewardPending: Boolean(value.rewardPending), xp: value.reward?.xp || 0, coins: value.reward?.coins || 0,
            spins: value.reward?.spins || 0, balance: window.coinsGet?.(), attempts, secondWind
        });
        result = value;
        notify();
    }

    function leaveFlight() {
        if (!runtime) return false;
        const classic = runtime.classic;
        runtime = null;
        ({ lives, stamina, maxLives, startLives, maxStamina, heartOverflow, magicFeathersCaught, featherMaxBonus } = classic);
        notify();
        return true;
    }

    function dismissResult() {
        result = null;
        notify();
    }

    function reset() {
        try { localStorage.removeItem(KEY); } catch (e) { return false; }
        if (runtime) returnToHome();
        window.BuboSecondWind?.reset();
        window.BuboCampaignTopics?.reset();
        result = null;
        notify();
        return true;
    }

    window.BuboCampaign = {
        start: () => begin(false),
        startSecondWind: () => begin(false, true),
        secondWindOffer,
        trainingReplay: () => begin(true),
        startMapReplay, setStageForTest,
        isActive: () => !!runtime,
        isTestRun: () => Boolean(runtime?.test),
        sceneProgress,
        scene: () => runtime?.phase || '',
        difficultyIndex: () => runtime?.phase === 'dawn' || runtime?.phase === 'boss' ? 1 : 0,
        status, nextPipe, onPipePassed, onWave, onFatal, consumeGuard, leaveFlight, dismissResult, reset,
        classicResources: () => runtime ? { ...runtime.classic } : null,
        settleRewards: rewardPending
    };
    // Невыданная награда сохраняется отдельно от контрольной точки и восстанавливается при загрузке.
    if (typeof document !== 'undefined') {
        const recover = () => { if (read().pending.length) { rewardPending(); notify(); } };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', recover, { once: true });
        else setTimeout(recover, 0);
    }
})();
