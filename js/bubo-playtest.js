// Локальные замеры для сравнения сборок с бонусами и без них.
(function () {
    const key = 'bubo_playtest_v1';
    const limit = 500;
    const fields = {
        flight_start: ['score', 'points', 'durationMs', 'reason', 'day'],
        flight_end: ['score', 'points', 'pickupCoins', 'milestoneCoins', 'durationMs', 'reason', 'day', 'district', 'collected', 'attemptsLeft', 'balance'],
        'journey:district': ['from', 'to', 'collected', 'score'],
        bonus_earned: ['count', 'score', 'day'],
        'quiz:answered': ['mode', 'correct', 'timedOut', 'elapsedMs', 'level', 'coins'],
        'campaign:result': ['phase', 'result', 'replay', 'rewardPending', 'xp', 'coins', 'spins', 'balance', 'attempts', 'secondWind'],
        'second_wind:started': ['phase', 'mode', 'price', 'balance'],
        'shop:purchase': ['item', 'price', 'balance'],
        'skill:purchase': ['item', 'rank', 'price', 'balance'],
        experiment: ['enabled', 'thematic']
    };

    function read() {
        try {
            const rows = JSON.parse(BuboSaveStorage.getItem(key) || '[]');
            return Array.isArray(rows) ? rows : [];
        } catch (e) { return []; }
    }

    function record(event, details = {}) {
        if (!Object.hasOwn(fields, event)) return;
        try {
            const now = new Date();
            const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
            const flag = typeof FlightQuizBonus !== 'undefined' ? FlightQuizBonus.status().enabled : undefined;
            const entry = { event, at: now.toISOString(), date, bonusEnabled: flag };
            for (const field of fields[event]) {
                const value = details[field];
                if (typeof value === 'boolean' || Number.isFinite(value)) entry[field] = value;
                if (typeof value === 'string') entry[field] = value.slice(0, 24);
            }
            const rows = read().slice(1 - limit);
            rows.push(entry);
            BuboSaveStorage.setItem(key, JSON.stringify(rows));
        } catch (e) {}
    }

    window.BuboPlaytest = {
        record,
        export() { return JSON.stringify({ version: 1, events: read() }, null, 2); }
    };
})();
