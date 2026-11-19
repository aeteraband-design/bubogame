// A document keeps its save slot for its whole lifetime, including background saves.
const BuboLocalProfiles = (() => {
    const profileKey = 'bubo_profile';
    const selectionKey = 'bubo_local_selection_v1';
    const handoffKey = 'bubo_local_handoff_v1';
    const testKey = 'bubo_test_flight_v1';
    const testPrefix = 'bubo_test_flight:';
    const prefix = 'bubo_local_slot:';
    const idPattern = /^[a-f\d]{32}$/;
    const validSelection = value => ['legacy', 'guest', 'login', 'ask'].includes(value) || idPattern.test(value || '');

    function get(storage, key) {
        try { return window[storage].getItem(key); } catch (error) { return null; }
    }

    const testFlight = new URLSearchParams(window.location.search).get('test-flight') === '1'
        && get('sessionStorage', testKey) === '1';

    function accountKey(id) {
        return id === 'legacy' ? profileKey : prefix + id + ':' + profileKey;
    }

    function account(id) {
        if (testFlight || id !== 'legacy' && !idPattern.test(id || '')) return null;
        try {
            const data = JSON.parse(get('localStorage', accountKey(id)));
            return !data?.guest && ['nick', 'mail', 'ph'].every(key => typeof data?.[key] === 'string' && data[key])
                ? { id, data } : null;
        } catch (error) { return null; }
    }

    const tabSelection = get('sessionStorage', selectionKey);
    const rememberedSelection = get('localStorage', selectionKey);
    const legacy = account('legacy');
    const selection = testFlight ? 'guest' : validSelection(tabSelection) ? tabSelection
        : validSelection(rememberedSelection) ? rememberedSelection : legacy ? 'legacy' : 'ask';
    const activeId = account(selection)?.id || '';
    const slot = activeId || (legacy ? 'guest' : 'legacy');

    // Pin tabs independently. Switching accounts in one tab cannot alter another tab's save slot.
    if (!testFlight) {
        try { window.sessionStorage.setItem(selectionKey, selection); } catch (error) {}
    }

    function storageKey(key) {
        return testFlight ? testPrefix + key : slot === 'legacy' ? key : prefix + slot + ':' + key;
    }

    function accounts() {
        const entries = [];
        if (testFlight) return entries;
        const original = account('legacy');
        if (original) entries.push(original);
        try {
            const storage = window.localStorage;
            for (let index = 0; index < storage.length; index++) {
                const key = storage.key(index);
                if (!key?.startsWith(prefix) || !key.endsWith(':' + profileKey)) continue;
                const id = key.slice(prefix.length, -profileKey.length - 1);
                const entry = account(id);
                if (entry) entries.push(entry);
            }
        } catch (error) {}
        return entries;
    }

    function writeAccount(id, data) {
        if (testFlight) return false;
        try {
            window.localStorage.setItem(accountKey(id), JSON.stringify(data));
            return true;
        } catch (error) { return false; }
    }

    function select(next, handoff = false) {
        if (testFlight) return next === 'guest' || next === 'ask';
        if (!validSelection(next) || (idPattern.test(next) || next === 'legacy') && !account(next)) return false;
        let saved = false;
        for (const storage of ['sessionStorage', 'localStorage']) {
            try {
                window[storage].setItem(selectionKey, next);
                saved = true;
            } catch (error) {}
        }
        if (saved && handoff) {
            try { window.sessionStorage.setItem(handoffKey, '1'); } catch (error) {}
        }
        return saved;
    }

    function consumeHandoff() {
        if (get('sessionStorage', handoffKey) !== '1') return false;
        try { window.sessionStorage.removeItem(handoffKey); } catch (error) { return false; }
        return true;
    }

    function openTestFlight(saves) {
        const tab = window.open('about:blank', '_blank');
        if (!tab) return false;
        try {
            for (const [key, value] of Object.entries(saves)) {
                tab.sessionStorage.setItem(testPrefix + key, value);
            }
            tab.sessionStorage.setItem(testKey, '1');
            tab.sessionStorage.setItem(handoffKey, '1');
            const url = new URL(window.location.pathname, window.location.href);
            url.searchParams.set('test-flight', '1');
            tab.opener = null;
            tab.location.replace(url.href);
            return true;
        } catch (error) {
            tab.close();
            return false;
        }
    }

    return { activeId, selection, account, accounts, writeAccount, select, storageKey, consumeHandoff, testFlight, openTestFlight };
})();

const BuboSaveStorage = (() => {
    const store = () => BuboLocalProfiles.testFlight ? window.sessionStorage : window.localStorage;
    return {
        getItem(key) { return store().getItem(BuboLocalProfiles.storageKey(key)); },
        setItem(key, value) { store().setItem(BuboLocalProfiles.storageKey(key), value); },
        removeItem(key) { store().removeItem(BuboLocalProfiles.storageKey(key)); }
    };
})();
