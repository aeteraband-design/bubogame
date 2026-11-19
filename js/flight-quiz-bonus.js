(() => {
    const KEY = 'bubo_flight_bonus_v1';
    const THRESHOLDS = [50, 100, 150, 200, 250];
    const CARRY_LIMIT = 2;
    const THEME_LIMIT = 2;
    const THEME_KEYS = ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'];
    const changeEvent = 'bubo:flight-bonus-change';

    function localDate(date = new Date()) {
        return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
            .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('-');
    }

    function dayAfter(day) {
        const date = new Date(day + 'T12:00:00');
        date.setDate(date.getDate() + 1);
        return localDate(date);
    }

    function count(value, max) {
        return Number.isSafeInteger(value) ? Math.min(max, Math.max(0, value)) : 0;
    }

    function read() {
        let saved = {};
        try { saved = JSON.parse(BuboSaveStorage.getItem(KEY)) || {}; } catch (e) {}
        const persisted = /^\d{4}-\d{2}-\d{2}$/.test(saved.day || '');
        const earnedToday = count(saved.earnedToday, THRESHOLDS.length);
        const available = count(saved.available, THRESHOLDS.length + CARRY_LIMIT);
        const held = saved.reserved;
        const reserved = available && typeof held?.id === 'string' && held.id && typeof held.day === 'string'
            ? { id: held.id, day: held.day, theme: THEME_KEYS.includes(held.theme) ? held.theme : '' } : null;
        return {
            day: persisted ? saved.day : localDate(),
            persisted,
            earnedToday,
            milestonesSeen: Math.max(earnedToday, count(saved.milestonesSeen, THRESHOLDS.length)),
            available,
            reserved,
            receipts: Array.isArray(saved.receipts) ? saved.receipts.filter(id => typeof id === 'string').slice(-64) : [],
            completed: Array.isArray(saved.completed) ? THEME_KEYS.filter(key => saved.completed.includes(key)) : [],
            played: Array.isArray(saved.played) ? THEME_KEYS.filter(key => saved.played.includes(key)) : [],
            enabled: saved.enabled !== false,
            thematicEnabled: saved.thematicEnabled === true
        };
    }

    let current = read();
    let flight = null;
    let queued = 0;

    function notify() {
        window.dispatchEvent(new Event(changeEvent));
    }

    function write(data, announce = true) {
        const saved = { ...data, persisted: true };
        try { BuboSaveStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { return false; }
        current = saved;
        if (announce) notify();
        return true;
    }

    function sync(day = flight?.day || localDate(), reload = false) {
        if (reload) current = read();
        if (day > current.day) {
            write({
                ...current,
                day,
                earnedToday: 0,
                milestonesSeen: 0,
                available: dayAfter(current.day) === day
                    ? Math.min(current.available, CARRY_LIMIT)
                    : Number(Boolean(current.reserved)),
                completed: [],
                played: []
            }, false);
        }
        return current;
    }

    function status(points = flight?.points || 0) {
        const data = sync();
        const nextPoints = THRESHOLDS[data.milestonesSeen] ?? null;
        const lastPoints = THRESHOLDS[data.milestonesSeen - 1] ?? 0;
        return {
            day: data.day,
            enabled: data.enabled,
            thematicEnabled: data.thematicEnabled,
            available: data.available,
            earnedToday: data.earnedToday,
            firstPoints: THRESHOLDS[0],
            nextPoints,
            remainingPoints: nextPoints === null ? 0 : Math.max(0, nextPoints - points),
            progress: nextPoints === null ? 1 : Math.min(1, Math.max(0, (points - lastPoints) / (nextPoints - lastPoints)))
        };
    }

    function thresholdsAt(points) {
        return THRESHOLDS.filter(threshold => points >= threshold).length;
    }

    function configure(config) {
        const data = sync(undefined, true);
        const enabled = typeof config.enabled === 'boolean' ? config.enabled : data.enabled;
        const thematicEnabled = typeof config.thematic === 'boolean' ? config.thematic : data.thematicEnabled;
        if (enabled === data.enabled && thematicEnabled === data.thematicEnabled) return true;
        // Рубежи, пройденные в контрольной группе, не выдаются при включении теста посреди дня.
        const points = enabled && !data.enabled && typeof score === 'number' && typeof playDay === 'string' && playDay === data.day
            ? thresholdsAt(score) : 0;
        return write({ ...data, enabled, thematicEnabled, milestonesSeen: Math.max(data.milestonesSeen, points) });
    }

    function observeScore(points, roundDay) {
        if (flight) flight.points = points;
        const day = flight?.day || roundDay || localDate();
        const data = sync(day);
        if (!data.enabled || data.day !== day || points < (THRESHOLDS[data.milestonesSeen] ?? Infinity)) return 0;
        const stored = sync(day, true);
        if (!stored.enabled || stored.day !== day) return 0;
        const milestonesSeen = thresholdsAt(points);
        const gained = milestonesSeen - stored.milestonesSeen;
        if (gained <= 0 || !write({
            ...stored,
            milestonesSeen,
            earnedToday: stored.earnedToday + gained,
            available: stored.available + gained
        })) return 0;
        queued += gained;
        window.BuboPlaytest?.record('bonus_earned', { count: gained, score: points, day });
        return gained;
    }

    function observeTheme(themeKey, roundDay) {
        const day = flight?.day || roundDay || localDate();
        const data = sync(day);
        if (!data.enabled || !data.thematicEnabled || data.day !== day || !THEME_KEYS.includes(themeKey) || data.completed.includes(themeKey)) return false;
        const stored = sync(day, true);
        if (!stored.enabled || !stored.thematicEnabled || stored.day !== day || stored.completed.includes(themeKey)) return false;
        return write({ ...stored, completed: [...stored.completed, themeKey] });
    }

    function eligibleThemes(data) {
        if (!data.enabled || !data.thematicEnabled || data.played.length >= THEME_LIMIT) return [];
        return THEME_KEYS.filter(key => data.completed.includes(key) && !data.played.includes(key));
    }

    function themes() {
        return eligibleThemes(sync());
    }

    function reserve(attemptId, themeKey = '') {
        themeKey ||= '';
        if (typeof attemptId !== 'string' || !attemptId) return false;
        const data = sync(undefined, true);
        if (data.reserved) return data.reserved.id === attemptId && data.reserved.theme === themeKey;
        if (!data.enabled || !data.available || data.receipts.includes(attemptId)) return false;
        if (themeKey && !eligibleThemes(data).includes(themeKey)) return false;
        return write({ ...data, reserved: { id: attemptId, theme: themeKey, day: data.day } }, false);
    }

    function release(attemptId) {
        const data = sync(undefined, true);
        if (data.reserved?.id !== attemptId || !data.reserved) return false;
        const expired = data.day > dayAfter(data.reserved.day);
        return write({ ...data, reserved: null, available: data.available - Number(expired) });
    }

    function spend(attemptId, themeKey = '') {
        themeKey ||= '';
        if (typeof attemptId !== 'string' || !attemptId) return false;
        const data = sync(undefined, true);
        if (data.receipts.includes(attemptId)) return true;
        if (!data.available) return false;
        const held = data.reserved;
        if (held ? (held.id !== attemptId || held.theme !== themeKey) : (themeKey && !eligibleThemes(data).includes(themeKey))) {
            return false;
        }
        const countThemeToday = themeKey && (!held || held.day === data.day);
        return write({
            ...data,
            available: data.available - 1,
            reserved: null,
            receipts: [...data.receipts, attemptId].slice(-64),
            played: countThemeToday ? [...data.played, themeKey] : data.played
        });
    }

    function reset() {
        const data = sync(undefined, true);
        if (!write({ ...data, available: 0, earnedToday: 0, milestonesSeen: 0, receipts: [], completed: [], played: [], reserved: null })) {
            return false;
        }
        queued = 0;
        return true;
    }

    function takeAward() {
        const count = queued;
        queued = 0;
        return count;
    }

    function beginFlight(day, points) {
        if (flight) return;
        const data = sync(day, true);
        if (!data.persisted && data.day === day && points >= THRESHOLDS[0]) {
            // При обновлении игры начинаем с ближайшего нового рубежа текущего полёта.
            write({ ...data, milestonesSeen: thresholdsAt(points) });
        }
        flight = { day, started: performance.now(), startPoints: points, points, pickupCoins: 0, milestoneCoins: 0 };
        window.BuboPlaytest?.record('flight_start', { score: points, day });
    }

    function recordCoins(source, amount) {
        if (!flight) return;
        if (source === 'pickup') flight.pickupCoins += amount;
        if (source === 'milestone') flight.milestoneCoins += amount;
    }

    function endFlight(points, reason, attemptsLeft = attempts) {
        if (!flight) return;
        const session = flight;
        flight = null;
        window.BuboPlaytest?.record('flight_end', {
            score: points,
            points: Math.max(0, points - session.startPoints),
            pickupCoins: session.pickupCoins,
            milestoneCoins: session.milestoneCoins,
            durationMs: Math.round(performance.now() - session.started),
            day: session.day,
            reason,
            district: window.BuboJourney?.region()?.id,
            collected: getTotalCollectedThemes(),
            attemptsLeft,
            balance: coinsGet()
        });
        sync();
        notify();
        return session.pickupCoins + session.milestoneCoins;
    }

    window.FlightQuizBonus = {
        status, configure, observeScore, observeTheme, themes, reserve, release, spend, reset,
        takeAward, beginFlight, recordCoins, endFlight
    };
    window.addEventListener('storage', event => {
        if (event.key === BuboLocalProfiles.storageKey(KEY) || event.key === null) {
            sync(undefined, true);
            notify();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const start = document.getElementById('startBtn');
        const quiz = document.getElementById('openQuizBtn');
        const badge = document.getElementById('scoreBadge');
        const end = document.querySelector('#goWin .go-btns');
        if (!start || !quiz || !badge || !end) return;

        const menuCallout = document.createElement('div');
        menuCallout.className = 'bubo-flight-bonus-callout';
        start.after(menuCallout);

        const startHint = document.createElement('span');
        startHint.className = 'bubo-flight-bonus-caption';
        menuCallout.append(startHint);

        const menuBadge = document.createElement('span');
        menuBadge.className = 'bubo-flight-bonus-count';
        menuBadge.setAttribute('aria-hidden', 'true');
        quiz.append(menuBadge);

        const progressRing = document.createElement('span');
        progressRing.className = 'bubo-flight-bonus-ring';
        progressRing.setAttribute('aria-hidden', 'true');
        badge.classList.add('bubo-flight-bonus-score');
        badge.append(progressRing);

        function makeButton(location, node) {
            const button = document.createElement('button');
            button.className = 'bubo-flight-bonus-button';
            button.type = 'button';
            const mark = document.createElement('i');
            mark.className = 'fa-solid fa-comments bubo-flight-bonus-button-icon';
            mark.setAttribute('aria-hidden', 'true');

            const body = document.createElement('span');
            body.className = 'bubo-flight-bonus-button-body';
            const label = document.createElement('span');
            label.className = 'bubo-flight-bonus-button-label';
            label.textContent = 'Бонусные вопросы';
            const available = document.createElement('span');
            available.className = 'bubo-flight-bonus-button-available';
            body.append(label, available);

            const arrow = document.createElement('i');
            arrow.className = 'fa-solid fa-chevron-right bubo-flight-bonus-button-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            button.append(mark, body, arrow);
            node.before(button);
            button.addEventListener('click', event => {
                event.stopPropagation();
                const data = status();
                if (typeof openQuizBonus !== 'function' || !data.enabled || !data.available) return;
                if (location === 'end') returnToHome();
                openQuizBonus(event);
            });
            return { button, available };
        }

        const menuAction = makeButton('menu', startHint);
        const endAction = makeButton('end', end.children[1] || end.firstElementChild);

        function paintProgress(data) {
            progressRing.hidden = !data.enabled;
            progressRing.style.setProperty('--fb-progress', data.progress * 100 + '%');
            progressRing.classList.toggle('is-complete', data.nextPoints === null);
            const next = data.nextPoints === null ? 'Дневной лимит достигнут' : 'До следующего: ' + data.remainingPoints + ' «?»';
            badge.title = data.enabled ? 'Бонус за полёт. ' + next : '';
        }

        function refresh() {
            const points = typeof score === 'number' ? score : 0;
            const data = status(points);
            const haveBonus = data.enabled && data.available > 0;
            const finished = data.nextPoints === null;
            const next = finished ? 'Дневной лимит достигнут' : 'До следующего: ' + data.remainingPoints + ' «?»';
            menuCallout.hidden = !data.enabled || (!haveBonus && finished);
            startHint.hidden = !data.enabled || haveBonus || finished;
            startHint.textContent = points > 0 ? next : data.firstPoints + ' «?» в полёте открывают бонусный вопрос';
            menuBadge.hidden = !haveBonus;
            menuBadge.textContent = String(data.available);
            quiz.setAttribute('aria-label', haveBonus ? 'Вопросы дня, бонусных вопросов: ' + data.available : 'Вопросы дня');
            paintProgress(data);
            for (const action of [menuAction, endAction]) {
                action.button.hidden = !haveBonus;
                action.available.textContent = 'Доступно: ' + data.available;
                action.button.setAttribute('aria-label', 'Перейти к бонусным вопросам. Доступно: ' + data.available);
            }
        }

        window.refreshFlightBonusUI = refresh;
        window.refreshFlightBonusHUD = () => paintProgress(status(typeof score === 'number' ? score : 0));
        window.addEventListener(changeEvent, refresh);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
        refresh();
    });
})();
