(() => {
    const campaign = window.BuboCampaign;
    if (!campaign) return;
    const $ = id => document.getElementById(id);
    const exit = $('campaignResultHome');
    const modal = $('campaignResult');
    const world = $('gameContainer');
    const hud = $('campaignHUD');
    const classicStart = $('startBtn');
    const campaignStart = $('campaignStartBtn');
    const classicHelp = $('goCampaignHelpBtn');
    const cancelWind = $('campaignSecondWindConfirm');
    let shownResult = null;
    let confirmingWind = false;
    let recoveryTimer = 0;
    function untilReset() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const minutes = Math.max(1, Math.ceil((tomorrow - now) / 60000));
        const hours = Math.floor(minutes / 60);
        return (hours ? hours + ' ч ' : '') + minutes % 60 + ' мин';
    }
    function windDetail(offer) {
        const reset = 'Попытки обновятся через ' + untilReset() + '.';
        if (!offer || offer.reason === 'stage' || offer.reason === 'attempts') return reset;
        if (offer.reason === 'free-limit') return 'Два бесплатных вылета использованы. Покупка откроется на 4-й день. ' + reset;
        if (offer.reason === 'used') return 'Второе дыхание на сегодня уже использовано. ' + reset;
        if (offer.reason === 'clock') return 'Проверь дату устройства. ' + reset;
        if (offer.reason === 'storage') return 'Не удалось прочитать сохранение. ' + reset;
        if (offer.reason === 'pending') return offer.retryAfterMs > 0
            ? 'Восстанавливаем вылет. Подожди немного.' : 'Проверь сохранение, открыв Поход ещё раз.';
        if (offer.mode === 'free') {
            const wind = window.BuboSecondWind;
            const remaining = wind.FREE_LIMIT - offer.freeUsed;
            return 'День ' + offer.onboardingDay + ' из ' + wind.MAX_FREE_DAYS
                + '. Ещё ' + remaining + ' ' + ruPlural(remaining, ['бесплатный вылет', 'бесплатных вылета', 'бесплатных вылетов'])
                + ', по одному в день.';
        }
        const wallet = 'В кошельке ' + offer.balance + ' ' + ruPlural(offer.balance, ['монета', 'монеты', 'монет']) + '.';
        if (confirmingWind && offer.available) return wallet + ' После оплаты сразу откроется текущий этап.';
        if (offer.missing > 0) return 'Второе дыхание стоит ' + offer.price + ' монет. ' + wallet + ' Не хватает ' + offer.missing + '. ' + reset;
        return wallet + ' Один вылет на текущем этапе.';
    }
    function action(button, fn) {
        button.addEventListener('click', event => { event.stopPropagation(); fn(); });
    }
    action(campaignStart, () => {
        if (campaign.status().canReplay) campaign.startMapReplay();
        else campaign.start();
    });
    action($('campaignReplayBtn'), () => campaign.trainingReplay());
    action(exit, () => { campaign.dismissResult(); campaignStart.focus({ preventScroll: true }); });

    const actionButton = $('campaignResultNext');
    action(actionButton, () => {
        const state = campaign.status();
        const result = state.result;
        if (!result) return;
        if (result.test) {
            campaign.setStageForTest(result.phase);
        } else if (result.type === 'victory') {
            if (result.mapReplay) campaign.startMapReplay();
            else {
                campaign.dismissResult();
                openRoulette({ victory: true });
            }
        } else if (state.attempts === 0 && !['training-failure', 'checkpoint', 'save-error'].includes(result.type)) {
            const offer = campaign.secondWindOffer();
            if (!offer?.available) { refresh(); return; }
            if (offer.mode === 'paid' && !confirmingWind) {
                confirmingWind = true;
                renderResult(state);
                return;
            }
            confirmingWind = false;
            campaign.startSecondWind();
        } else if (result.type === 'save-error' && state.canReplay) campaign.startMapReplay();
        else if (result.type === 'training-failure' && state.practiced) campaign.trainingReplay();
        else campaign.start();
    });
    action(cancelWind, () => {
        confirmingWind = false;
        renderResult(campaign.status());
        actionButton.focus({ preventScroll: true });
    });
    action($('campaignResultQuiz'), () => { campaign.dismissResult(); openQuiz(); });
    action($('campaignResultSkill'), () => { campaign.dismissResult(); openProfile('skills'); });
    action($('campaignResultReplay'), () => campaign.trainingReplay());

    action($('goQuizBtn'), () => { returnToHome(); openQuiz(); });
    action(classicHelp, () => { returnToHome(); campaign.start(); });
    const classicEnd = $('gameOverModal');
    function refreshEnd() {
        const exhausted = !classicEnd.classList.contains('hidden') && attempts === 0;
        $('goQuizBtn').hidden = !exhausted;
        classicHelp.hidden = !exhausted || !campaign.secondWindOffer()?.available;
        const detail = $('goAttemptDetail');
        detail.hidden = !exhausted;
        detail.textContent = exhausted ? 'Попытки обновятся через ' + untilReset() + '.' : '';
    }
    new MutationObserver(refreshEnd).observe(classicEnd, { attributes: true, attributeFilter: ['class'] });

    function topicSummary(phase) {
        const topics = window.BuboCampaignTopics;
        const stage = topics?.list().filter(topic => topic.phase === phase);
        return stage?.length ? { open: stage.filter(topic => topics.isUnlocked(topic.id)).length, total: stage.length } : null;
    }

    function renderHud(state) {
        hud.hidden = !state.active;
        world.classList.toggle('camp-active', state.active);
        world.classList.toggle('camp-day', state.active && state.phase === 'dawn');
        if (!state.active) return;

        $('campaignHudTitle').textContent = state.waveTitle
            ? state.title + ' · ' + state.waveIndex + '/3 · ' + state.waveTitle
            : state.title;
        $('campaignHudGates').textContent = state.passed + ' / ' + state.total;
        $('campaignHudHint').textContent = state.test ? 'Предпросмотр · ' + state.hint : state.hint;
        const summary = !state.test && topicSummary(state.phase);
        const counter = $('campaignHudTopics');
        counter.hidden = !summary;
        counter.textContent = summary ? 'Темы ' + summary.open + '/' + summary.total : '';
        const meter = $('campaignProgress');
        meter.setAttribute('aria-valuemax', state.total);
        meter.setAttribute('aria-valuenow', state.passed);
        meter.firstElementChild.style.width = (100 * state.passed / Math.max(1, state.total)) + '%';
        updateCombat();
    }
    function updateCombat() {
        const counter = $('campaignHudPower');
        const state = window.BuboCampaignCombat?.status();
        const cold = state?.wave === 'fire' && state.coldGuard > 0;
        const fast = state?.wave === 'shazam' && state.shazamActive;
        counter.hidden = !(cold || fast);
        counter.textContent = cold ? 'Ледяной щит ×' + state.coldGuard : fast ? 'ШАЗАМ' : '';
    }
    function addReward(list, amount, word, icon) {
        if (!amount) return;
        const pill = document.createElement('span');
        const mark = document.createElement('i');
        mark.className = 'fa-solid ' + icon;
        mark.setAttribute('aria-hidden', 'true');
        pill.append(mark, (amount === 1 && word === 'вращение') ? '+1 вращение' : '+' + amount + ' ' + word);
        list.append(pill);
    }
    function renderResult(state) {
        const result = state.result;
        modal.hidden = !result;
        clearTimeout(recoveryTimer);
        if (!result) { shownResult = null; confirmingWind = false; return; }
        if (result !== shownResult) confirmingWind = false;
        const won = result.type === 'victory';
        const checkpoint = result.type === 'checkpoint';
        const trainingFailure = result.type === 'training-failure';
        const noAttempts = state.attempts <= 0 && (result.type === 'no-attempts' || result.type === 'failure');
        const offer = noAttempts ? campaign.secondWindOffer() : null;
        const confirmingPurchase = noAttempts && offer?.mode === 'paid' && offer.available && confirmingWind;
        if (offer?.reason === 'pending' && offer.retryAfterMs > 0) {
            recoveryTimer = setTimeout(() => { window.BuboSecondWind?.recover(); refresh(); }, offer.retryAfterMs + 50);
        }
        modal.dataset.result = result.type;
        $('campaignResultTitle').textContent = result.test ? 'Предпросмотр завершён' : won ? 'Смотритель побеждён'
            : checkpoint ? result.replay ? 'Разминка завершена'
                : result.phase === 'training' ? 'Три трубы пройдены' : result.title + ' пройден'
            : trainingFailure ? 'Попробуй ещё раз' : noAttempts ? 'Попытки закончились' : result.title;
        $('campaignResultMessage').textContent = result.test ? (result.reason || result.title + ' пройден.')
            : result.rewardPending
            ? result.reward?.spins && typeof rouletteSpins === 'number' && rouletteSpins >= 99
                ? 'В запасе 99 вращений. Награда добавится, когда освободится место.'
                : 'Награда сохранена и ждёт начисления.'
            : won ? (result.mapReplay ? 'Карта снова пройдена.' : 'Карта завершена. Вращение ждёт в рулетке.')
            : checkpoint ? (result.replay ? 'Можно возвращаться к походу.'
                : result.phase === 'training' ? 'Открыт Ночной город.' : 'Контрольная точка сохранена.')
            : trainingFailure ? result.hint : result.reason;

        const reward = $('campaignReward');
        reward.replaceChildren();
        if (checkpoint || won) {
            addReward(reward, result.reward?.xp, 'опыта', 'fa-star');
            addReward(reward, result.reward?.coins, 'монет', 'fa-coins');
            addReward(reward, result.reward?.spins, 'вращение', 'fa-dice');
        }
        reward.hidden = !reward.childElementCount;
        const topics = checkpoint && topicSummary(result.phase);
        const topicNote = $('campaignTopicSummary');
        topicNote.hidden = !topics;
        topicNote.textContent = topics ? 'Темы викторины открыты: ' + topics.open + ' из ' + topics.total : '';
        const detail = $('campaignAttemptDetail');
        detail.hidden = !noAttempts;
        detail.textContent = noAttempts ? windDetail(offer) : '';
        actionButton.hidden = (noAttempts && !offer?.available) || (result.replay && state.phase === 'complete');
        cancelWind.hidden = !confirmingPurchase;
        actionButton.textContent = result.test ? 'Повторить предпросмотр' : won ? (result.mapReplay ? 'Повторить поход' : 'Открыть рулетку')
            : noAttempts ? !offer?.available ? '' : offer.mode === 'free' ? 'Второе дыхание · бесплатно'
                : (confirmingWind ? 'Начать за ' : 'Второе дыхание · ') + offer.price + ' монет'
            : trainingFailure || result.type === 'save-error' ? 'Ещё раз' : 'Продолжить поход';
        $('campaignResultQuiz').hidden = confirmingPurchase || !(noAttempts || (checkpoint && result.phase !== 'training'));
        $('campaignResultReplay').hidden = confirmingPurchase || !noAttempts;
        exit.hidden = confirmingPurchase;
        const chooseSkill = checkpoint && result.phase === 'night' && !result.mapReplay;
        $('campaignResultSkill').hidden = !chooseSkill;
        if (chooseSkill) {
            const softHit = PF_SK.find(skill => skill.k === 'softHit');
            const cost = pfSkCost(softHit, 0);
            const affordable = !skRank('softHit') && PG.pts >= cost.pts && coinsGet() >= cost.coins;
            $('campaignResultSkillLabel').textContent = affordable
                ? softHit.name + ' · ' + cost.coins + ' монет'
                : 'Выбрать навык';
        }
        if (result !== shownResult) {
            shownResult = result;
            const quiz = $('campaignResultQuiz');
            const target = !actionButton.hidden ? actionButton : !quiz.hidden ? quiz : exit;
            target.focus({ preventScroll: true });
        }
    }

    function refresh() {
        const state = campaign.status();
        $('campaignActions').hidden = false;
        $('startScreen').classList.toggle('camp-intro', !state.practiced);
        const labels = campaignStart.querySelectorAll('strong, small');
        campaignStart.hidden = state.phase === 'complete' && !state.canReplay;
        labels[0].textContent = state.canReplay ? 'Повторить поход' : state.practiced ? 'Продолжить поход' : 'Начать поход';
        const waves = { fire: 'Огонь', water: 'Водонапор', shazam: 'ШАЗАМ' };
        const checkpoint = waves[state.checkpointWave];
        labels[1].textContent = state.canReplay ? 'Новый маршрут'
            : state.practiced ? state.title + (checkpoint ? ' · ' + checkpoint : '') : 'Три учебные трубы';
        $('campaignReplayBtn').hidden = !state.practiced;
        renderHud(state);
        renderResult(state);
        refreshEnd();
    }

    new MutationObserver(() => {
        const label = $('startBtnLabel');
        if (label.textContent !== 'Свободный полёт') label.textContent = 'Свободный полёт';
    }).observe($('startBtnLabel'), { childList: true, subtree: true, characterData: true });
    $('startBtnLabel').textContent = 'Свободный полёт';
    classicStart.setAttribute('aria-label', 'Свободный полёт');
    window.addEventListener('bubo:campaign-change', refresh);
    window.addEventListener('bubo:campaign-combat', updateCombat);
    window.addEventListener('bubo:campaign-topics', () => { if (campaign.isActive() || !modal.hidden) refresh(); });
    window.addEventListener('bubo:second-wind-change', () => { if (!modal.hidden || !classicEnd.classList.contains('hidden')) refresh(); });
    window.addEventListener('bubo:daily-reset', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || modal.hidden) return;
        if (!cancelWind.hidden) cancelWind.click();
        else campaign.dismissResult();
    });
    campaign.settleRewards();
    refresh();
})();
