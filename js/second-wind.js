(() => {
    const KEY = 'bubo_second_wind_v1';
    const CHANGED = 'bubo:second-wind-change';
    const PRICE = 350, FREE_LIMIT = 2, MAX_FREE_DAYS = 3;
    const LEASE_MS = 15000;
    const STAGES = ['night', 'dawn', 'boss'];
    const CHARGE = 'wind:charge:', REFUND = 'wind:refund:';

    function dayNumber(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
        const ms = Date.parse(value + 'T00:00:00Z');
        return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms / 86400000 : NaN;
    }

    function isDay(value) {
        return Number.isFinite(dayNumber(value));
    }

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw === null) return { version: 1, day: '', usedDay: '', freeUsed: 0, pending: null, last: null };
            const value = JSON.parse(raw);
            if (value?.version !== 1 || !(value.day === '' || isDay(value.day))
                || !(value.usedDay === '' || isDay(value.usedDay)) || value.usedDay > value.day
                || !Number.isInteger(value.freeUsed) || value.freeUsed < 0 || value.freeUsed > FREE_LIMIT) return null;
            const p = value.pending;
            if (p !== null && (!p || typeof p.id !== 'string' || !p.id || !isDay(p.day) || p.day !== value.day
                || !STAGES.includes(p.phase) || !Number.isSafeInteger(p.createdAt) || p.createdAt < 0
                || !((p.mode === 'free' && p.price === 0) || (p.mode === 'paid' && p.price === PRICE)))) return null;
            const last = value.last;
            if (last !== null && (!last || typeof last.id !== 'string' || !last.id
                || !['started', 'refunded'].includes(last.outcome))) return null;
            return value;
        } catch (e) { return null; }
    }

    function save(value) {
        try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch (e) { return false; }
    }

    function notify() {
        window.dispatchEvent(new Event(CHANGED));
    }

    function remaining(ticket) {
        const elapsed = Date.now() - ticket.createdAt;
        return elapsed < 0 ? 0 : Math.max(0, LEASE_MS - elapsed);
    }

    function assess({ phase, attempts, mapReplay, startedOn = '' }, ledger) {
        const day = todayKey();
        const balance = coinsGet();
        const difference = startedOn === '' ? 0 : dayNumber(day) - dayNumber(startedOn) + 1;
        const onboardingDay = Number.isFinite(difference) && difference > 0 ? difference : 0;
        const free = onboardingDay > 0 && onboardingDay <= MAX_FREE_DAYS;
        const price = free ? 0 : PRICE;
        const result = {
            available: false, reason: null, mode: free ? 'free' : 'paid', price, balance,
            missing: Math.max(0, price - balance), day, onboardingDay,
            freeUsed: ledger?.freeUsed ?? 0, freeRemaining: FREE_LIMIT - (ledger?.freeUsed ?? 0),
            retryAfterMs: 0
        };

        if (mapReplay || !STAGES.includes(phase)) {
            result.reason = 'stage';
            result.mode = null;
            result.price = result.missing = 0;
        } else if (attempts !== 0) result.reason = 'attempts';
        else if (!ledger) result.reason = 'storage';
        else if (!isDay(day) || day < ledger.day || (startedOn !== '' && (!onboardingDay || day < startedOn))) result.reason = 'clock';
        else if (ledger.pending) {
            result.reason = 'pending';
            result.retryAfterMs = remaining(ledger.pending);
        } else if (ledger.usedDay === day) result.reason = 'used';
        else if (free && ledger.freeUsed >= FREE_LIMIT) result.reason = 'free-limit';
        else if (result.missing) result.reason = 'funds';
        else result.available = true;
        return result;
    }

    function status(context = {}) {
        return assess(context, read());
    }

    function saveWallet(amount, receipts) {
        try { localStorage.setItem(COINS_KEY, [amount, ...receipts].join('|')); } catch (e) { return false; }
        try { shopSyncBtn(); } catch (e) {}
        return true;
    }

    function debit(ticket) {
        if (!ticket.price) return true;
        try {
            const wallet = coinsWallet();
            if (wallet.receipts.includes(REFUND + ticket.id)) return false;
            if (wallet.receipts.includes(CHARGE + ticket.id)) return true;
            if (wallet.amount < ticket.price) return false;
            // Одновременно удерживается только одна покупка «Второго дыхания».
            const receipts = wallet.receipts.filter(r => !r.startsWith(CHARGE) && !r.startsWith(REFUND));
            return saveWallet(wallet.amount - ticket.price, [...receipts, CHARGE + ticket.id]);
        } catch (e) { return false; }
    }

    function refundPayment(ticket) {
        if (!ticket.price) return true;
        try {
            const wallet = coinsWallet();
            if (!wallet.receipts.includes(CHARGE + ticket.id) || wallet.receipts.includes(REFUND + ticket.id)) return true;
            return saveWallet(wallet.amount + ticket.price, [...wallet.receipts, REFUND + ticket.id]);
        } catch (e) { return false; }
    }

    function consume(context = {}) {
        if (!recover()) return null;
        const ledger = read(), offer = assess(context, ledger);
        if (!offer.available) return null;
        const id = window.crypto?.randomUUID?.()
            || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        const ticket = {
            id, day: offer.day, phase: context.phase, mode: offer.mode, price: offer.price, createdAt: Date.now()
        };
        if (!save({ ...ledger, day: offer.day, pending: ticket }) || read()?.pending?.id !== ticket.id) return null;
        if (!debit(ticket)) {
            refund(ticket);
            return null;
        }
        if (read()?.pending?.id !== ticket.id) {
            refundPayment(ticket);
            return null;
        }
        return { ...ticket };
    }

    function markStarted(ticket) {
        const ledger = read();
        if (!ledger || typeof ticket?.id !== 'string') return false;
        if (ledger.last?.id === ticket.id) return ledger.last.outcome === 'started';
        const p = ledger.pending;
        if (p?.id !== ticket.id || p.day !== todayKey() || !remaining(p)) return false;
        if (p.price) {
            try {
                const { receipts } = coinsWallet();
                if (!receipts.includes(CHARGE + p.id) || receipts.includes(REFUND + p.id)) return false;
            } catch (e) { return false; }
        }
        if (p.mode === 'free' && ledger.freeUsed >= FREE_LIMIT) return false;
        const committed = save({
            ...ledger, usedDay: p.day, freeUsed: ledger.freeUsed + Number(p.mode === 'free'),
            pending: null, last: { id: p.id, outcome: 'started' }
        });
        if (committed) notify();
        return committed;
    }

    function refund(ticket) {
        const ledger = read();
        if (!ledger || typeof ticket?.id !== 'string') return false;
        if (ledger.last?.id === ticket.id) return ledger.last.outcome === 'refunded';
        const pending = ledger.pending;
        if (pending?.id !== ticket.id || !refundPayment(pending)) return false;
        const cleared = save({ ...ledger, pending: null, last: { id: pending.id, outcome: 'refunded' } });
        if (cleared) notify();
        return cleared;
    }

    function recover() {
        const ledger = read();
        if (!ledger) return false;
        const pending = ledger.pending;
        return !pending || (!remaining(pending) && refund(pending));
    }

    function reset() {
        const pending = read()?.pending;
        if (pending && !refund(pending)) return false;
        try { localStorage.removeItem(KEY); } catch (e) { return false; }
        notify();
        return true;
    }

    window.BuboSecondWind = {
        PRICE, FREE_LIMIT, MAX_FREE_DAYS, status, consume, markStarted, refund, recover, reset
    };
    window.addEventListener('storage', event => {
        if (event.key === KEY || event.key === COINS_KEY || event.key === null) notify();
    });
})();
