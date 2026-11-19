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
    const topics = [...DISTRICTS].flatMap(([district, ids]) => ids.map((id, slot) => ({ id, phase: district, district, slot })));
    const topicsById = new Map(topics.map(topic => [topic.id, topic]));
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

    function collection(id) {
        const topic = topicsById.get(id);
        const journey = window.BuboJourney;
        if (!topic || !journey) return null;
        return journey.themeCollection(topic.district, journey.themeKeys()[topic.slot]);
    }

    function isUnlocked(id) {
        const progress = collection(id);
        return Boolean(progress && progress.amount === progress.required);
    }

    function visual(id) {
        if (!topicsById.has(id) || typeof qzTheme !== 'function') return null;
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
        if (!topicsById.has(id) || !stamps.includes(slot)) return null;
        try {
            if (hasSlot(id, slot, test)) return { changed: false, progress: count(id, test) };
            const key = slotKey(id, slot);
            if (test) previewStamps.add(key);
            else BuboSaveStorage.setItem(key, '1');
            return { changed: true, progress: count(id, test) };
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

    window.BuboCampaignTopics = {
        list, districtTopics, collection, isUnlocked,
        forGate, collect, visual, reset, resetPreview: () => previewStamps.clear()
    };
})();
