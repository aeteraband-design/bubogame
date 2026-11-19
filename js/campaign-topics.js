(function () {
    const KEY = 'bubo_campaign_topics_v1:';
    const CHANGED = 'bubo:campaign-topics';
    const BY_PHASE = new Map([
        ['night', ['music', 'kino', 'series', 'games', 'hp']],
        ['dawn', ['nature', 'geo', 'sport', 'food', 'art']]
    ]);
    const ICON_CODES = {
        music: '\uf001', kino: '\uf008', series: '\ue131', games: '\uf11b', hp: '\uf6e8',
        nature: '\uf6ed', geo: '\uf7a2', sport: '\uf1e3', food: '\uf805', art: '\uf53f'
    };
    const DISTRICTS = new Map([
        ['dawn', { native: ['logic'], quiz: ['nature', 'geo'] }],
        ['music', { native: ['music'], quiz: ['music', 'art'] }],
        ['magic', { native: ['fun'], quiz: ['hp', 'series'] }],
        ['jungle', { native: ['cartoons'], quiz: ['food', 'sport'] }],
        ['night', { native: ['kino', 'series'], quiz: ['kino', 'games'] }]
    ]);
    const districtByTopic = new Map();
    for (const [district, group] of DISTRICTS) for (const id of group.quiz) districtByTopic.set(id, district);
    const topics = [...BY_PHASE].flatMap(([phase, ids]) => ids.map(id => ({ id, phase, district: districtByTopic.get(id) })));
    const topicIds = new Set(topics.map(topic => topic.id));
    const slots = [0, 1];
    const previewStamps = new Set();
    const visuals = new Map();

    function slotKey(id, slot) { return KEY + id + ':' + slot; }

    function hasSlot(id, slot, test) {
        const key = slotKey(id, slot);
        return test ? previewStamps.has(key) : BuboSaveStorage.getItem(key) === '1';
    }

    function count(id, test = false) {
        return slots.filter(slot => hasSlot(id, slot, test)).length;
    }

    function progress(id) {
        if (!topicIds.has(id)) return 0;
        try { return count(id); } catch (e) { return 0; }
    }

    function visual(id) {
        if (!topicIds.has(id) || typeof qzTheme !== 'function') return null;
        if (!visuals.has(id)) {
            const quiz = qzTheme(id);
            visuals.set(id, { name: quiz.name, color: quiz.col, faClass: quiz.icon, iconCode: ICON_CODES[id] });
        }
        return visuals.get(id);
    }

    function missing(id, test) {
        try { return { id, slots: slots.filter(slot => !hasSlot(id, slot, test)) }; }
        catch (e) { return { id, slots: [...slots] }; }
    }

    function forGate({ phase, index, test } = {}) {
        const id = BY_PHASE.get(phase)?.[index];
        return id ? missing(id, test) : null;
    }

    function forDistrict(district, turn = 0) {
        const ids = DISTRICTS.get(district)?.quiz;
        if (!ids) return null;
        for (let offset = 0; offset < ids.length; offset++) {
            const topic = missing(ids[(turn + offset) % ids.length]);
            if (topic.slots.length) return topic;
        }
        return null;
    }

    function nativeThemesForDistrict(district) {
        return DISTRICTS.get(district)?.native || [];
    }

    function notify(detail) {
        window.dispatchEvent(new CustomEvent(CHANGED, { detail }));
    }

    function collect(id, slot, test = false) {
        if (!topicIds.has(id) || !slots.includes(slot)) return null;
        let result;
        try {
            if (hasSlot(id, slot, test)) return { changed: false, progress: count(id, test) };
            const key = slotKey(id, slot);
            if (test) previewStamps.add(key);
            else BuboSaveStorage.setItem(key, '1');
            const progress = count(id, test);
            result = { changed: true, progress, unlocked: progress === slots.length };
        } catch (e) { return null; }
        if (!test) notify({ id, ...result });
        return result;
    }

    function reset() {
        previewStamps.clear();
        try {
            for (const { id } of topics) for (const slot of slots) BuboSaveStorage.removeItem(slotKey(id, slot));
        } catch (e) { return false; }
        notify();
        return true;
    }

    window.addEventListener('storage', event => {
        if (event.key === null || event.key.startsWith(BuboLocalProfiles.storageKey(KEY))) notify();
    });

    window.BuboCampaignTopics = {
        list: () => topics.map(topic => ({ ...topic })),
        progress, isUnlocked: id => progress(id) === slots.length,
        forGate, forDistrict, nativeThemesForDistrict, collect, visual, reset, resetPreview: () => previewStamps.clear()
    };
})();
