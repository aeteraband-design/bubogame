(() => {
    const campaign = window.BuboCampaign;
    if (!campaign) return;
    const journey = window.BuboJourney;
    const $ = id => document.getElementById(id);
    const exit = $('campaignResultHome');
    const modal = $('campaignResult');
    const world = $('gameContainer');
    const hud = $('campaignHUD');
    const tapLabel = $('tapToStartLabel');
    const flightTapCopy = tapLabel.textContent;
    const campaignStart = $('campaignStartBtn');
    const classicHelp = $('goCampaignHelpBtn');
    const cancelWind = $('campaignSecondWindConfirm');
    let shownResult = null;
    let confirmingWind = false;
    let recoveryTimer = 0;
    const picker = $('journeyPicker');
    const pickerStart = $('journeyPickerStart');
    const pickerReturn = $('journeyPickerReturn');
    const districts = journey.districts();
    const previewUrl = district => 'assets/levels/' + district.id + '.webp?v=0.18.8';
    const levels = districts.map((district, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'journey-level';
        button.dataset.district = district.id;
        const art = document.createElement('img');
        art.className = 'journey-level-art';
        art.alt = '';
        art.decoding = 'async';
        art.loading = 'lazy';
        art.fetchPriority = 'low';
        const number = document.createElement('span');
        number.className = 'journey-level-number';
        number.textContent = index + 1;
        const label = document.createElement('span');
        label.className = 'journey-level-name';
        label.textContent = district.shortName || district.name;
        const icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');
        const stars = document.createElement('span');
        stars.className = 'journey-level-stars';
        stars.setAttribute('aria-hidden', 'true');
        button.append(art, number, label, icon, stars);
        item.append(button);
        $('journeyPickerLevels').append(item);
        action(button, () => {
            selectedLevel = index;
            refreshPicker();
        });
        return { district, button, icon, art, stars };
    });
    let selectedLevel = 0;

    function playableLevel() {
        return journey.hasDefeatedBoss() ? 0 : journey.completedCount();
    }
    function refreshPicker() {
        const current = playableLevel();
        const completedCount = journey.completedCount();
        const completedRoute = journey.hasDefeatedBoss();
        const awaitingPrize = Boolean(journey.prizeDistrictId());
        const bossReady = journey.isBossReady();
        const { passed, total } = journey.regionProgress();
        const progress = $('journeyPickerProgress');
        const selectedDistrict = levels[selectedLevel].district;
        const selectedTotal = journey.districtTotal(selectedDistrict.id);
        progress.textContent = completedRoute ? 'Все районы пройдены'
            : selectedLevel === current ? passed + ' / ' + total + ' значков'
                : 'Цель района · ' + selectedTotal + ' ' + ruPlural(selectedTotal, ['значок', 'значка', 'значков']);
        levels.forEach(({ district, button, icon, stars }, index) => {
            const passedLevel = index < completedCount;
            const status = passedLevel ? 'Пройдено' : index === current ? 'Доступно' : 'Закрыто';
            button.dataset.status = index === current ? 'current' : passedLevel ? 'passed' : 'upcoming';
            button.setAttribute('aria-pressed', String(index === selectedLevel));
            const rating = journey.starsFor(district.id);
            stars.hidden = !passedLevel || !rating;
            stars.textContent = '★'.repeat(rating) + '☆'.repeat(3 - rating);
            button.setAttribute('aria-label', (index + 1) + '. ' + district.name + '. ' + status
                + (!stars.hidden ? '. Звёзды: ' + rating + ' из 3' : ''));
            icon.className = 'fa-solid ' + (index === current ? 'fa-play' : passedLevel ? 'fa-check' : 'fa-lock');
            if (index === current) button.setAttribute('aria-current', 'step');
            else button.removeAttribute('aria-current');
            if (index === selectedLevel) {
                picker.dataset.status = button.dataset.status;
                $('journeyPickerLevelStatus').textContent = index === current && awaitingPrize ? 'Приз готов' : status;
            }
        });
        const selected = selectedDistrict;
        picker.dataset.district = selected.id;
        const preview = $('journeyPickerImage');
        const source = previewUrl(selected);
        if (preview.getAttribute('src') !== source) preview.src = source;
        $('journeyPickerLevelNumber').textContent = 'Район ' + (selectedLevel + 1);
        $('journeyPickerLevelName').textContent = selected.name;
        const canStart = selectedLevel === current;
        pickerStart.disabled = !canStart;
        pickerStart.hidden = !canStart;
        pickerReturn.hidden = canStart;
        pickerStart.textContent = completedRoute ? 'Начать новый маршрут' : awaitingPrize ? 'Забрать приз'
            : bossReady ? 'К Смотрителю' : passed > 0 ? 'Продолжить полёт' : 'В полёт';
        let hint = '';
        if (completedRoute && canStart) hint = 'Новый маршрут начнётся в Ночном городе.';
        else if (selectedLevel > current && !completedRoute) hint = 'Победи Смотрителя и забери приз в предыдущем районе.';
        else if (canStart && awaitingPrize) hint = 'Приз откроет следующий район.';
        else if (canStart && bossReady) hint = 'Три волны. Победа даёт вращение в рулетке.';
        const topics = window.BuboCampaignTopics.districtTopics(selected.id);
        document.getElementById('journeyPickerTopics').textContent = topics.map(theme => theme.name).join(' · ');
        $('journeyPickerHint').textContent = hint;
    }
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
        if (journey.reloadIfOutdated()) return;
        if (!campaign.status().practiced) {
            journey.start();
            return;
        }
        selectedLevel = playableLevel();
        refreshPicker();
        campaignStart.focus({ preventScroll: true });
        picker.showModal();
        window.logoAnimStop?.();
        for (const { district, art } of levels) {
            if (!art.hasAttribute('src')) art.src = previewUrl(district);
        }
        levels[selectedLevel].button.focus();
    });
    action($('journeyPickerClose'), () => picker.close());
    action(pickerReturn, () => {
        selectedLevel = playableLevel();
        refreshPicker();
        levels[selectedLevel].button.focus();
    });
    action(pickerStart, () => {
        if (selectedLevel !== playableLevel()) return;
        picker.close();
        journey.start();
    });
    action(exit, () => { campaign.dismissResult(); campaignStart.focus({ preventScroll: true }); });

    const actionButton = $('campaignResultNext');
    action(actionButton, () => {
        const state = campaign.status();
        const result = state.result;
        if (!result) return;
        if (result.test) {
            campaign.setStageForTest(result.previewKey || result.phase);
        } else if (result.type === 'victory' || result.type === 'journey-win') {
            if (result.mapReplay) campaign.startMapReplay();
            else {
                campaign.dismissResult();
                openRoulette({ victory: true });
            }
        } else if (result.type === 'journey-district-cleared' || isTrainingComplete(result)) {
            campaign.dismissResult();
            campaignStart.click();
        } else if (result.journey && state.attempts === 0) {
            const offer = journey.offer();
            if (!offer?.available) { refresh(); return; }
            if (offer.mode === 'paid' && !confirmingWind) {
                confirmingWind = true;
                renderResult(state);
                return;
            }
            confirmingWind = false;
            journey.start(true);
        } else if (result.journey || result.type === 'checkpoint') journey.start();
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

    action($('goQuizBtn'), () => { returnToHome(); openQuiz(); });
    action(classicHelp, () => { returnToHome(); journey.start(); });
    const classicEnd = $('gameOverModal');
    function refreshEnd() {
        const exhausted = !classicEnd.classList.contains('hidden') && attempts === 0;
        $('goQuizBtn').hidden = !exhausted;
        classicHelp.hidden = !exhausted || !journey.offer()?.available;
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
        const training = state.active && state.phase === 'training';
        hud.hidden = !state.active;
        world.classList.toggle('camp-active', state.active);
        world.classList.toggle('camp-training', training);
        const tapCopy = training ? 'Коснись, чтобы взлететь' : flightTapCopy;
        if (tapLabel.textContent !== tapCopy) tapLabel.textContent = tapCopy;
        world.classList.toggle('camp-day', state.active && state.phase === 'dawn');
        if (!state.active) return;

        $('campaignHudTitle').textContent = state.waveTitle
            ? state.title + ' · ' + state.waveIndex + '/3 · ' + state.waveTitle
            : state.title;
        $('campaignHudGates').textContent = state.passed + ' / ' + state.total + (training ? ' трубы' : '');
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
    function isTrainingComplete(result) {
        return result.type === 'checkpoint' && result.phase === 'training';
    }

    function renderResult(state) {
        const result = state.result;
        modal.hidden = !result;
        clearTimeout(recoveryTimer);
        if (!result) { shownResult = null; confirmingWind = false; return; }
        if (result !== shownResult) confirmingWind = false;
        const won = result.type === 'victory' || result.type === 'journey-win';
        const checkpoint = result.type === 'checkpoint';
        const trainingFailure = result.type === 'training-failure';
        const districtCleared = result.type === 'journey-district-cleared';
        const noAttempts = state.attempts <= 0 && result.journey && !won && !districtCleared;
        const offer = noAttempts ? journey.offer() : null;
        const confirmingPurchase = noAttempts && offer?.mode === 'paid' && offer.available && confirmingWind;
        if (offer?.reason === 'pending' && offer.retryAfterMs > 0) {
            recoveryTimer = setTimeout(() => { window.BuboSecondWind?.recover(); refresh(); }, offer.retryAfterMs + 50);
        }
        modal.dataset.result = result.type;
        $('campaignResultTitle').textContent = result.test ? 'Предпросмотр завершён' : won ? result.title + ' побеждён' : districtCleared ? 'Район пройден'
            : checkpoint ? result.replay ? 'Разминка завершена'
                : result.phase === 'training' ? 'Обучение пройдено' : result.title + ' пройден'
            : trainingFailure ? 'Попробуй ещё раз' : noAttempts ? 'Попытки закончились' : result.title;
        $('campaignResultMessage').textContent = result.test ? (result.reason || result.title + ' пройден.')
            : result.rewardPending
            ? result.reward?.spins && typeof rouletteSpins === 'number' && rouletteSpins >= 99
                ? 'В запасе 99 вращений. Награда добавится, когда освободится место.'
                : 'Награда сохранена и ждёт начисления.'
            : districtCleared ? result.reason
            : won ? (result.mapReplay ? 'Карта снова пройдена.' : 'Забери приз в рулетке, чтобы продолжить маршрут.')
            : checkpoint ? (result.replay ? 'Можно возвращаться к походу.'
                : result.phase === 'training' ? 'Начни путешествие с Ночного города.' : 'Контрольная точка сохранена.')
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
        actionButton.hidden = noAttempts && !offer?.available;
        cancelWind.hidden = !confirmingPurchase;
        actionButton.textContent = result.test ? 'Повторить предпросмотр' : won ? (result.mapReplay ? 'Повторить поход' : 'Открыть рулетку')
            : districtCleared || isTrainingComplete(result) ? 'К карте районов'
            : noAttempts ? !offer?.available ? '' : offer.mode === 'free' ? 'Второе дыхание · бесплатно'
                : (confirmingWind ? 'Начать за ' : 'Второе дыхание · ') + offer.price + ' монет'
            : result.type === 'journey-ready' ? 'К Смотрителю' : result.type === 'journey-failure' ? 'Вернуться к башне'
            : trainingFailure || result.type.endsWith('save-error') ? 'Ещё раз' : 'Продолжить полёт';
        $('campaignResultQuiz').hidden = confirmingPurchase || !(noAttempts || (checkpoint && result.phase !== 'training'));
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
        if (picker.open) refreshPicker();
        renderHud(state);
        renderResult(state);
        refreshEnd();
    }

    window.addEventListener('bubo:campaign-change', refresh);
    window.addEventListener('bubo:journey-change', refresh);
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
    journey.syncTopicUnlocks();
    journey.settleRewards();
    refresh();
})();
