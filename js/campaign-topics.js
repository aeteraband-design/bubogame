(function () {
    const KEY = 'bubo_campaign_topics_v1:';
    const CHANGED = 'bubo:campaign-topics';
    const DISTRICTS = new Map([
        ['night', ['kino', 'series', 'space', 'games', 'memes']],
        ['dawn', ['geo', 'history', 'food', 'architecture', 'transport']],
        ['music', ['music', 'art', 'humor', 'instruments', 'dance']],
        ['magic', ['hp', 'lit', 'chem', 'phys', 'mythology']],
        ['jungle', ['nature', 'sport', 'cartoons', 'animals', 'exploration']]
    ]);
    const ICON_CODES = {
        kino: '\uf008', series: '\ue131', space: '\uf135',
        geo: '\uf7a2', history: '\uf66f', food: '\uf805',
        music: '\uf001', art: '\uf53f', humor: '\uf586',
        hp: '\uf6e8', lit: '\uf518', chem: '\uf0c3',
        nature: '\uf6ed', sport: '\uf1e3', cartoons: '\uf1b0',
        games: '\uf11b', memes: '\uf59b', architecture: '\uf1ad', transport: '\uf238',
        instruments: '\uf7a6', dance: '\uf54b', phys: '\uf5d2', mythology: '\uf6d5',
        animals: '\uf700', exploration: '\uf14e'
    };
    const topics = [...DISTRICTS].flatMap(([district, ids]) => ids.map(id => ({ id, phase: district, district })));
    const topicIds = new Set(topics.map(topic => topic.id));
    const HUD_LABELS = {
        cartoons: 'Мультики', hp: 'Поттер', lit: 'Книги', architecture: 'Здания',
        instruments: 'Инструм.', exploration: 'Походы'
    };
    const stamps = [0, 1];
    const previewStamps = new Set();
    const visuals = new Map();

    function slotKey(id, slot) { return KEY + id + ':' + slot; }

    function hasSlot(id, slot, test) {
        const key = slotKey(id, slot);
        return test ? previewStamps.has(key) : BuboSaveStorage.getItem(key) === '1';
    }

    function count(id, test = false) {
        return stamps.filter(slot => hasSlot(id, slot, test)).length;
    }

    function progress(id) {
        if (!topicIds.has(id)) return 0;
        try { return count(id); } catch (e) { return 0; }
    }

    function isUnlocked(id) {
        return progress(id) === stamps.length;
    }

    function visual(id) {
        if (!topicIds.has(id) || typeof qzTheme !== 'function') return null;
        if (!visuals.has(id)) {
            const quiz = qzTheme(id);
            if (quiz.id !== id) return null;
            visuals.set(id, {
                id, name: quiz.name, label: HUD_LABELS[id] || quiz.name,
                color: quiz.col, faClass: quiz.icon, iconCode: ICON_CODES[id]
            });
        }
        return visuals.get(id);
    }

    function districtTopics(district) {
        return (DISTRICTS.get(district) || []).map(visual).filter(Boolean);
    }

    function list() {
        return topics.map(topic => ({ ...topic }));
    }

    function missing(id, test) {
        try { return { id, slots: stamps.filter(slot => !hasSlot(id, slot, test)) }; }
        catch (e) { return { id, slots: [...stamps] }; }
    }

    function forGate({ phase, district, index, test } = {}) {
        const id = DISTRICTS.get(district || phase)?.[index];
        return id ? missing(id, test) : null;
    }

    function notify(detail) {
        window.dispatchEvent(new CustomEvent(CHANGED, { detail }));
    }

    function collect(id, slot, test = false) {
        if (!topicIds.has(id) || !stamps.includes(slot)) return null;
        try {
            if (hasSlot(id, slot, test)) return { changed: false, progress: count(id, test), unlocked: false };
            const key = slotKey(id, slot);
            if (test) previewStamps.add(key);
            else BuboSaveStorage.setItem(key, '1');
            const progress = count(id, test);
            const result = { changed: true, progress, unlocked: progress === stamps.length };
            if (!test) notify({ id, ...result });
            return result;
        } catch (e) { return null; }
    }

    function collectDistrictToken(district, tokenKey, tokens) {
        const id = DISTRICTS.get(district)?.[window.BuboJourney.themeKeys().indexOf(tokenKey)];
        if (!id || !Number.isInteger(tokens) || tokens < 1) return null;
        try {
            const collected = stamps.filter(slot => hasSlot(id, slot, false));
            const previous = collected.length;
            const target = Math.min(tokens, stamps.length);
            for (const slot of stamps) {
                if (collected.length >= target) break;
                if (collected.includes(slot)) continue;
                BuboSaveStorage.setItem(slotKey(id, slot), '1');
                collected.push(slot);
            }
            const progress = collected.length;
            const changed = progress > previous;
            const result = { id, changed, progress, unlocked: changed && progress === stamps.length };
            if (changed) notify(result);
            return result;
        } catch (e) { return null; }
    }

    function reset() {
        previewStamps.clear();
        try {
            for (const { id } of topics) for (const slot of stamps) BuboSaveStorage.removeItem(slotKey(id, slot));
        } catch (e) { return false; }
        notify();
        return true;
    }

    window.addEventListener('storage', event => {
        if (event.key === null || event.key.startsWith(BuboLocalProfiles.storageKey(KEY))) notify();
    });

    window.BuboCampaignTopics = {
        list, districtTopics, collectDistrictToken, progress, isUnlocked, required: stamps.length,
        forGate, collect, visual, reset, resetPreview: () => previewStamps.clear()
    };
})();
