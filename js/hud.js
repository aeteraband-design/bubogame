let pipes = [];
let items = [];
let particles = [];
let stars = [];
let clouds = [
    { x: 40, y: 120, scale: 0.95, speed: 0.25, alpha: 0.35 },
    { x: 260, y: 80, scale: 1.3, speed: 0.17, alpha: 0.3 },
    { x: 440, y: 180, scale: 0.8, speed: 0.32, alpha: 0.32 }
];

let __uiFx = 0;
function uiFx() { return __uiFx || (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx')) || 1); }
function resize(soft) {
    soft = soft === true;   // из события resize приходит объект события — это не мягкий режим
    const cw = container.clientWidth, ch = container.clientHeight;
    // На телефоне масштаб 1, на большом экране мир увеличивается по высоте окна
    // На ПК мир и интерфейс заметно крупнее (ноутбук ~800px по высоте → ×1.33, большой монитор → до ×2)
    // На телефоне всё (мир, сова, панели, шрифты) масштабируется от ширины 360px — картинка одинаковая на любом телефоне и в любом браузере
    const phone = cw <= 520, pgz = phone ? pageZoomFactor() : 1, pz = phone ? phoneZoom(cw * pgz, ch * pgz) : 1;
    document.documentElement.style.setProperty('--phone-zoom', pz.toFixed(3));
    document.documentElement.style.setProperty('--tb', (phone ? Math.max(1, Math.min(1.4, TEXT_TARGET / (measureTextScale() * pgz))) : 1).toFixed(3));
    viewScale = phone ? pz : Math.max(1, Math.min(2.0, ch / 600));
    document.documentElement.style.setProperty('--ui-zoom', String(phone ? pz.toFixed(3) : Math.max(1, Math.min(1.8, viewScale * 1.12)).toFixed(3)));
    // единый множитель для подсказок, летящих шариков и таймеров: один и тот же на любом телефоне и в любом браузере
    // (раньше подсказки масштабировались transform, а таймеры — zoom, и браузеры по-разному считали их размер и позицию)
    const fxStr = String(Math.min(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')) || 1, 1.25).toFixed(3));
    document.documentElement.style.setProperty('--fx', fxStr);
    __uiFx = parseFloat(fxStr) || 1;   // запоминаем — чтобы не спрашивать у браузера стили на каждом подборе
    // нижняя плашка с темами на ПК растёт меньше, чтобы не занимать много места
    document.documentElement.style.setProperty('--hud-zoom', String(phone ? pz.toFixed(3) : Math.max(1, Math.min(1.3, viewScale)).toFixed(3)));
    width = cw / (viewScale * WORLD_K);
    height = ch / (viewScale * WORLD_K);
    renderScale = computeRenderScale();
    canvas.width = Math.round(cw * renderScale);
    canvas.height = Math.round(ch * renderScale);
    __gfxSoft = !!soft;
    if (!soft) { __tokHoldK = 1; try { moonSprite = null; cloudSprite = null; } catch (e) {} } // перерисуются в нужном качестве
    if (soft) {   // мягкое понижение качества: звёзды не перекладываем, лишние просто убираем
        const n = Math.round((gfxQuality === 'low' ? 45 : 75) * Math.max(1, (width * height) / 356000));
        if (stars.length > n) stars.length = n;
    } else {
        stars.length = 0;
        for (let i = 0; i < Math.round((gfxQuality === 'low' ? 45 : 75) * Math.max(1, (width * height) / 356000)); i++) {
            stars.push({
                x: Math.random() * width, y: Math.random() * height,
                size: (Math.random() * 1.15 + 0.4) / (typeof WORLD_K === 'number' ? WORLD_K : 1), alpha: Math.random() * 0.8 + 0.2, twinkleSpeed: Math.random() * 0.04 + 0.01   // как на экране загрузки
            });
        }
    }
}
window.addEventListener('resize', resize);
// На iPhone Safari размеры страницы меняются без события resize (адресная строка, загрузка, поворот) — холст тогда растягивался.
// Следим за реальным размером колонки и пересчитываем, как только он изменился.
(function () {
    let lw = 0, lh = 0;
    const chk = () => { try { const w = container.clientWidth, h = container.clientHeight; if (w && h && (w !== lw || h !== lh)) { lw = w; lh = h; resize(); } } catch (e) {} };
    try { if (window.ResizeObserver) new ResizeObserver(chk).observe(container); } catch (e) {}
    if (window.visualViewport) window.visualViewport.addEventListener('resize', chk);
    window.addEventListener('orientationchange', () => setTimeout(chk, 250));
    window.addEventListener('pageshow', chk);
    setInterval(chk, 700);
    chk();
})();
resize();

function getTotalCollectedThemes() {
    return (collected.music || 0) + (collected.logic || 0) + (collected.kino || 0) + (collected.series || 0) + (collected.cartoons || 0) + (collected.fun || 0);
}

function getDifficultyIndex() {
    const total = getTotalCollectedThemes();
    return Math.max(0, Math.min(DIFF_LEVELS.length - 1, Math.floor(total * DIFF_LEVELS.length / TOTAL_THEMES)));
}

function getDifficultyMultipliers() {
    const idx = getDifficultyIndex();
    const L = DIFF_LEVELS[idx];
    return { speedMult: L.speedMult, targetSqueeze: L.targetSqueeze, musicTempoMult: L.musicTempoMult, level: L.name, color: L.color, idx: idx, negChance: L.negChance };
}

// Большая подсказка по центру экрана
function showFxBanner(html, durMs) {
    if (!fxLayer) return;
    const el = document.createElement('div');
    el.className = 'fx-banner';
    el.style.setProperty('--dur', (durMs / 1000) + 's');
    el.innerHTML = html;
    fxLayer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, durMs + 80);
}

// Подсказка «Штраф: ...» / «Бонус: ...»
function showEffectHint(kind, text, color, icon, durMs) {
    showFxBanner(`<div class="glass-panel rounded-2xl px-4 py-3 flex items-center space-x-3" style="border-color:${color};box-shadow:0 0 26px ${color}88">
        <i class="fa-solid ${icon}" style="color:${color};font-size:24px"></i>
        <div class="text-left">
            <div class="font-black" style="font-size:10px;letter-spacing:.16em;color:${color}">${kind}</div>
            <div class="text-white font-black" style="font-size:13px;line-height:1.25">${text}</div>
        </div></div>`, durMs || 2200);
}

// Красивое событие: открыт новый уровень сложности
// Запас сил вырос до 130%: звук, подсказка и вспышка плашки сил
function triggerMaxStaminaUp() {
    AudioFX.playMaxStaminaChime();
    Haptics.powerup();
    const badge = document.getElementById('staminaBadge');
    if (badge) {
        restartClass(badge, ['stamina-up'], 'stamina-up');
        setTimeout(() => badge.classList.remove('stamina-up'), 1300);
    }
    StorageManager.save();
}

// Золотая плашка с билетиком и надписью в одну строку: вспыхивает, разлетаются звёздочки, и она тает
function showGoldBanner(text, icon, color) {
    if (!fxLayer) return;
    const c = color || '#FFC53D';
    // уведомление о бонусе — в верхнем углу напротив таймеров (там, где пауза): жизни слева — справа, и наоборот
    const right = document.documentElement.classList.contains('hud-ll');
    const el = document.createElement('div');
    el.className = 'bonus-tag ' + (right ? 'on-right' : 'on-left');
    el.style.color = c; el.style.borderColor = c; el.style.boxShadow = `0 0 14px ${c}88`;
    el.style.setProperty('--bx', (right ? 18 : -18) + 'px');
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${sentenceCase(text)}</span>`;
    try {
        const fr = fxLayer.getBoundingClientRect(), uz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')) || 1;
        const th = document.getElementById('topHud'), bb = document.getElementById('buffBar');
        let top = 56 * uz;
        if (bb && bb.offsetParent) top = bb.getBoundingClientRect().top - fr.top;
        else if (th && th.offsetParent) top = th.getBoundingClientRect().bottom - fr.top + 8 * uz;
        const prev = [...fxLayer.querySelectorAll('.bonus-tag.' + (right ? 'on-right' : 'on-left'))].length;   // несколько подряд — столбиком
        el.style.top = (top + prev * 34 * uz) + 'px';
        el.style[right ? 'right' : 'left'] = (14 * uz) + 'px';
    } catch (e) {}
    fxLayer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2700);
}
function showAttemptBanner(n) {
    AudioFX.playAttemptBonus();
    Haptics.powerup();
    showGoldBanner(n > 1 ? `+${n} ПОПЫТКИ` : '+1 ПОПЫТКА', 'fa-rotate-right');
}

function triggerDiffLevelUp(info) {
    launchFireworkShow(info.color, info.idx + 1);   // столько фейерверков, каков номер уровня
    AudioFX.playLevelUp(); AudioFX.playLevelShift();
    // если на новом уровне трубы сжимаются — вместе со звуком уровня играет и звук сжатия труб
    if (info.idx > 0 && DIFF_LEVELS[info.idx].targetSqueeze > DIFF_LEVELS[info.idx - 1].targetSqueeze) {
        AudioFX.playCompressStart();
    }
    Haptics.powerup();
    ['', 'menu'].forEach(prefix => {
        const card = document.getElementById(dId(prefix, 'Card'));
        if (!card || card.offsetParent === null) return;
        card.style.setProperty('--lvl', info.color);
        restartClass(card, ['levelup'], 'levelup');
        setTimeout(() => card.classList.remove('levelup'), 1500);
        const label = document.getElementById(dId(prefix, 'Label'));
        if (label) restartClass(label, ['diff-label-pop'], 'diff-label-pop');
        const bar = card.querySelector('.diff-bar');
        if (bar) {
            for (let i = 0; i < 2; i++) {
                const ring = document.createElement('div');
                ring.className = 'diff-ring';
                ring.style.left = `${(info.idx / DIFF_LEVELS.length) * 100}%`;
                ring.style.animationDelay = `${i * 0.18}s`;
                bar.appendChild(ring);
                setTimeout(() => { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 1400);
            }
        }
    });
}

function updateDifficultyHUD() {
    const total = getTotalCollectedThemes();
    const p = Math.min(100, (total / TOTAL_THEMES) * 100);
    const percent = Math.round(p);
    const info = getDifficultyMultipliers();
    // сила свечения плавно растёт вместе с заполнением шкалы (а значит и с каждым уровнем)
    const g = Math.pow(p / 100, 0.85);
    const rgb = [244, 63, 94]; // правый край заполнения всегда розово-красный
    const edge = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

    ['', 'menu'].forEach(prefix => {
        const label = document.getElementById(dId(prefix, 'Label'));
        const pct = document.getElementById(dId(prefix, 'Percent'));
        const mask = document.getElementById(dId(prefix, 'Mask'));
        const glow = document.getElementById(dId(prefix, 'Glow'));
        const card = document.getElementById(dId(prefix, 'Card'));
        if (label) { label.innerText = info.level; label.style.color = info.color; }
        if (pct) pct.innerText = `${percent}%`;
        if (mask) mask.style.width = `${p}%`;
        if (card) {
            card.style.setProperty('--lvl', info.color);
            card.querySelectorAll('.diff-tick').forEach(t => t.classList.toggle('lit', info.idx >= parseInt(t.dataset.k, 10)));
        }
        if (glow) {
            glow.style.left = `${p}%`;
            glow.style.width = `min(46px, ${p}%)`;
            glow.style.opacity = p < 1 ? '0' : String((0.3 + 0.7 * g).toFixed(2));
            glow.style.setProperty('--glow-color', edge);
            glow.style.setProperty('--glow-dur', `${(2.6 - 1.8 * g).toFixed(2)}s`);
            glow.style.boxShadow = `0 0 ${(3 + 15 * g).toFixed(1)}px ${(0.5 + 3 * g).toFixed(1)}px rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.45 + 0.5 * g).toFixed(2)})`;
        }
    });

    if (lastKnownDiffIdx < 0) {
        lastKnownDiffIdx = info.idx;
    } else if (info.idx !== lastKnownDiffIdx) {
        const wentUp = info.idx > lastKnownDiffIdx;
        lastKnownDiffIdx = info.idx;
        if (wentUp && gameActive) triggerDiffLevelUp(info);
    }
}

function spawnCollectionStarBurst(x, y, color) {
    particles.push({
        x: x, y: y, vx: 0, vy: 0, radius: 6, grow: 2.4, color: color, alpha: 0.9, decay: 0.055, isRing: true
    });

    const count = 10;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.35;
        const speed = 2.0 + Math.random() * 2.8;
        const isWhiteCore = (i % 3 === 0);
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            color: isWhiteCore ? '#FFFFFF' : color,
            alpha: 1.0, size: 3.5 + Math.random() * 2.6, decay: 0.030 + Math.random() * 0.015, isStar: true
        });
    }

    for (let j = 0; j < 4; j++) {
        const spAngle = Math.random() * Math.PI * 2;
        const spSpeed = 0.8 + Math.random() * 1.4;
        particles.push({
            x: x, y: y,
            vx: Math.cos(spAngle) * spSpeed, vy: Math.sin(spAngle) * spSpeed,
            color: '#FFFFFF', alpha: 0.95, size: 2.2, decay: 0.04, isWisp: true
        });
    }
}

// ===== Раскладка подсказок =====
// Подсказка всплывает над совой (над местом подбора): левый край чуть левее её центра, сама плашка тянется вправо — не уходит влево на таймеры
// и не улетает далеко вправо. Если подсказок сразу несколько (подобрали + возник эффект / попытка / рост силы) — они встают столбиком,
// с таким же зазором, как у таймеров: снизу то, что подобрали, над ним — следствие (бонус).
function layoutHintTag(tag, sx, sy, isBonus, toTimer, targetType) {
    const z = uiFx();
    const cw = container.clientWidth, nowT = performance.now();
    const gap = 4 * z;
    // в столбик берём и подсказки, которые ещё стоят на месте перед полётом в таймер (первые 0,45 с)
    window.__tags = (window.__tags || []).filter(q => q.el.parentNode && nowT - q.t < 700 && !(q.timer && nowT - q.t > 420));
    const grp = window.__tags.filter(q => Math.abs(q.ax - sx) < 90 && Math.abs(q.ay - sy) < 90);
    const rec = { el: tag, t: nowT, ax: sx, ay: sy, bonus: isBonus, timer: toTimer, tgt: targetType };
    window.__tags.push(rec);
    grp.push(rec);
    // опорная точка группы — первая подсказка: столбик по центру над кружком подобранного (радиус кружка ≈ 26 единиц мира) с небольшим зазором
    const base = grp[0];
    const SK = viewScale * (typeof WORLD_K === 'number' ? WORLD_K : 1) * ((typeof camZoom === 'number') ? camZoom : 1);
    // низ столбика — выше и кружка подобранного, и головы совы (верх совы ≈ 24 единицы мира над её центром)
    const cz0 = (typeof camZoom === 'number') ? camZoom : 1, SK0 = viewScale * (typeof WORLD_K === 'number' ? WORLD_K : 1);
    const owlTop = ((owl.y - 24 * (1 + 0.16 * (currentOvereatFactor || 0)) - height / 2) * cz0 + height / 2) * SK0;
    const owlX = ((owl.x - width / 2) * cz0 + width / 2) * SK0;
    // подсказки всплывают высоко над совой, как раньше: низ столбика примерно на 80 px выше центра совы (и выше кружка подобранного)
    const owlCY0 = ((owl.y - height / 2) * cz0 + height / 2) * SK0;
    let bottom0 = base.ay - (26 * SK + 6 * z) * 2.2;   // заметно выше кружка (ещё +30%)
    // всегда ровно над кружком подобранного (без привязки к сове)
    // ширина столбика — по самой широкой плашке; не уходим за правый край
    const widths = grp.map(q => q.el.offsetWidth * z);
    const maxW = Math.max(...widths);
    let left = Math.max(8, Math.min(cw - maxW - 8, base.ax - maxW / 2));
    // порядок по направлению: чья цель ниже на экране — та ниже в столбике (попытка летит вниз к «ПОПЫТКИ»),
    // чья выше — та выше (силы, жизни, вопросы — к верхней панели; таймеры — между ними). При равенстве: подобранное ниже следствия
    const tgtRank = (q) => {
        if (q.timer) return 3;                                                      // улетающая в таймер — всегда сверху столбика
        if (q.tgt === 'attempts' || ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'].includes(q.tgt)) return 0;   // нижняя панель
        if (q.tgt === 'stamina' || q.tgt === 'heart' || q.tgt === 'score') return 2;  // верхняя панель
        return 1;
    };
    let order = grp.slice().sort((a2, c2) => (tgtRank(a2) - tgtRank(c2)) || ((a2.bonus ? 1 : 0) - (c2.bonus ? 1 : 0)));
    // столбик целиком
    let heights = order.map(q => q.el.offsetHeight * z);
    const totalH = heights.reduce((s2, h) => s2 + h, 0) + gap * (order.length - 1);
    let top = bottom0 - totalH;
    // сова высоко и столбик залезает под верхнюю панель — ставим подсказки под совой (не налезая на нижнюю панель)
    try {
        const cr = container.getBoundingClientRect();
        const th = document.getElementById('topHud'), bh = document.getElementById('bottomHud');
        const hudTop = th && !th.classList.contains('hidden') ? th.getBoundingClientRect().bottom - cr.top + 6 : 8;
        const hudBot = bh && !bh.classList.contains('hidden') ? bh.getBoundingClientRect().top - cr.top - 6 : cr.height - 8;
        if (top < hudTop) {
            // сова у самого верха — над ней места нет: ставим столбик справа от совы, на уровне её центра (не под ней — иначе
            // подсказка, улетающая в таймер, пересекала бы сову и соседнюю подсказку)
            // кружок у самого верха — над ним места нет: столбик справа от кружка, на его уровне
            left = Math.min(cw - maxW - 8, Math.max(left, base.ax + 26 * SK + 6 * z));
            top = Math.min(Math.max(hudTop, base.ay - totalH / 2), hudBot - totalH);
        }
    } catch (e) {}
    if (top < 8) top = 8;
    // не налезаем на таймеры эффектов справа (по итоговому месту столбика): если пересекаемся — сдвигаем столбик левее таймеров
    try {
        const cr = container.getBoundingClientRect(), bot = top + totalH;
        const tags = [...document.querySelectorAll('#buffBar .buff-tag')].map(t => t.getBoundingClientRect()).filter(r => r.width > 0);
        const hit = tags.filter(r => (r.left - cr.left) < left + maxW + 4 && (r.right - cr.left) > left - 4 && (r.bottom - cr.top) > top - 4 && (r.top - cr.top) < bot + 4);
        if (hit.length) left = Math.min(left, Math.min(...hit.map(r => r.left - cr.left)) - 6 - maxW);
        left = Math.max(8, Math.min(left, cw - maxW - 8));
    } catch (e) {}
    let y = top;
    // сверху вниз: верхние — бонусы, нижние — подобранное
    const topDown = order.slice().reverse();
    const hTD = heights.slice().reverse();
    topDown.forEach((q, i) => {
        if (q.timer) { if (i > 0) q.el.__holdUntil = q.t + 860; else delete q.el.__holdUntil; }   // не верхняя: летит в таймер, только когда верхняя подсказка уже исчезла
        q.el.style.left = left + 'px';
        q.el.style.top = y + 'px';
        y += hTD[i] + gap;
    });
}

// «Щит 10с», «Макс. силы 10с»: первая буква заглавная, остальные строчные
function sentenceCase(s) {
    s = String(s == null ? '' : s).toLowerCase();
    const i = s.search(/[a-zа-яё]/i);
    return i < 0 ? s : s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
}
function findArrivalTarget(targetType) {
    let targetElem = null;
    let isThemeBadge = false;

    // Шарик летит ровно в иконку: вопрос — в значок вопроса, силы/перо — в значок пера, жизнь — в то сердечко, которое наполняется,
    // тема — в значок этой темы в нижней панели
    if (targetType === 'score') {
        targetElem = document.getElementById('scoreIcon') || document.getElementById('scoreBadge');
    } else if (targetType === 'stamina') {
        targetElem = document.getElementById('staminaIcon') || document.getElementById('staminaBadge');
    } else if (targetType === 'heart') {
        const cont = document.getElementById('livesContainer');
        if (cont && cont.classList.contains('lives-compact')) targetElem = cont.querySelector('.lives-compact-heart') || cont;
        else if (cont && cont.children.length) {
            const hi = Math.max(0, Math.min(cont.children.length - 1, Math.ceil(lives - 0.001) - 1));   // 3-я жизнь → 3-е сердце, 6-я → 6-е
            targetElem = cont.children[hi];
        } else targetElem = cont;
    } else if (targetType === 'attempts') {
        targetElem = document.getElementById('attemptsVal');
    } else if (['music', 'logic', 'kino', 'series', 'cartoons', 'fun'].includes(targetType)) {
        targetElem = document.getElementById(`icon_${targetType}`) || document.getElementById(`badge-${targetType}`);
        isThemeBadge = true;
    }

    return { targetElem, isThemeBadge };
}
function spawnFlyingArrivalFX(startX, startY, targetType, textLabel, color, faIcon, isBonus) {
    if (!fxLayer) return;
    // координаты мира → экран: учитываем увеличение мира и приближение камеры, иначе подсказка и шарик появляются левее и выше нужного места
    {
        const SK = viewScale * (typeof WORLD_K === 'number' ? WORLD_K : 1), cz = (typeof camZoom === 'number') ? camZoom : 1;
        startX = ((startX - width / 2) * cz + width / 2) * SK;
        startY = ((startY - height / 2) * cz + height / 2) * SK;
    }

    // цель шарика меряем В САМОМ НАЧАЛЕ, до того как добавим подсказку: тогда браузеру не приходится пересчитывать вёрстку лишний раз
    let preTarget = null;
    if (targetType && targetType !== 'other') {
        preTarget = findArrivalTarget(targetType);
        if (preTarget.targetElem) { preTarget.targetRect = preTarget.targetElem.getBoundingClientRect(); preTarget.containerRect = container.getBoundingClientRect(); }
    }
    let iconHtml = `<i class="fa-solid ${faIcon} text-[10px]" style="color:${color}"></i>`;
    if (faIcon === 'svg-compress') {
        iconHtml = `<svg class="w-3 h-3 inline-block shrink-0" viewBox="0 0 24 24" fill=\"none\" stroke=\"${color}\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2v7.5m-4-3.5L12 9.5l4-3.5M12 22v-7.5m-4 3.5L12 14.5l4 3.5\"/></svg>`;
    } else if (faIcon === 'svg-crystal') {
        iconHtml = `<svg class="w-3 h-3 inline-block shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${color}" opacity="0.35"/><circle cx="12" cy="12" r="7" fill="${color}"/><circle cx="10" cy="10" r="2.6" fill="#FFE4E6"/></svg>`;
    } else if (faIcon === 'svg-infinite-feather') {
        iconHtml = `<div style="position:relative;display:inline-flex;align-items:center;justify-content:flex-start;width:15px;height:14px;margin-right:0;color:${color};flex-shrink:0"><i class="fa-solid fa-feather-pointed" style="font-size:11px"></i><span class="inf-sign" style="position:absolute;right:-1px;bottom:-2px;font-weight:900;color:#fff;line-height:1;text-shadow:0 0 2px #000,0 0 4px #000">∞</span></div>`;
    }

    if (textLabel) {
        const tag = document.createElement('div');
        tag.className = 'fly-label-tag text-[10px] font-black py-0.5 rounded-xl shadow-lg flex items-center border';
        tag.style.padding = '3px 6px 3px 6px';
        tag.style.gap = '3px';
        tag.style.left = `${Math.min(container.clientWidth - 95, Math.max(12, startX - 45))}px`;
        tag.style.top = `${startY - 62}px`;
        tag.style.backgroundColor = 'rgba(20, 3, 38, 0.95)';
        tag.style.color = color;
        tag.style.border = `1.5px solid ${color}`;
        tag.style.boxShadow = `0 0 12px ${color}88`;
        tag.innerHTML = `<span style="display:inline-flex;min-width:11px;height:14px;justify-content:center;align-items:center;flex-shrink:0">${iconHtml}</span><span style="font-weight:900!important;">${sentenceCase(textLabel)}</span>`; // иконки одной ширины — текст подсказок ровно по левому краю
        fxLayer.appendChild(tag);
        tag.style.justifyContent = 'flex-start';
        tag.style.textAlign = 'left';
        const bKey0 = buffKeyForLabel(textLabel);
        if (bKey0) tag.dataset.key = bKey0;   // улетающая подсказка в том же стиле, что и её таймер (вода, огонь)
        const timerEl0 = bKey0 && document.querySelector(`#buffBar [data-key="${bKey0}"]`);
        const refreshing = !!(bKey0 && ((buffRefreshed[bKey0] && performance.now() < buffRefreshed[bKey0]) || (timerEl0 && timerEl0.style.opacity !== '0' && !timerEl0.dataset.leaving)));
        layoutHintTag(tag, startX, startY, !!isBonus, !!bKey0 && !refreshing, targetType);

        const bKey = buffKeyForLabel(textLabel);
        if (bKey && refreshing) {   // таймер уже есть: он просто обновляется (и вздрагивает), а подсказка показывается и тает на месте, никуда не улетая
            delete buffRefreshed[bKey]; delete buffRefreshed[bKey + ':p'];
            try { pulseBuff(bKey); } catch (e) {}
        } else if (bKey) sendTagToTimer(tag, bKey);
        setTimeout(() => {
            if (!tag.__toTimer && tag.parentNode) tag.parentNode.removeChild(tag);
        }, 880);
    }

    if (targetType === 'other' || !targetType) return;

    const { targetElem, isThemeBadge } = preTarget || { targetElem: null, isThemeBadge: false };
    if (!targetElem) return;
    const hudG = hudGroup(targetType);
    hudPending[hudG] = (hudPending[hudG] || 0) + 1;

    const { targetRect, containerRect } = preTarget;

    const endX = targetRect.left - containerRect.left + targetRect.width / 2;
    const endY = targetRect.top - containerRect.top + targetRect.height / 2;

    const orb = document.createElement('div');
    orb.className = 'flying-orb';
    orb.style.width = '20px';
    orb.style.height = '20px';
    orb.style.left = `${startX - 10}px`;
    orb.style.top = `${startY - 10}px`;
    orb.style.backgroundColor = 'rgba(29, 9, 54, 0.95)';
    orb.style.border = `2px solid ${color}`;
    orb.style.boxShadow = `0 0 10px ${color}`;
    
    if (faIcon === 'svg-compress') {
        orb.innerHTML = `<svg class="w-2.5 h-2.5 inline-block shrink-0" viewBox="0 0 24 24" fill=\"none\" stroke=\"${color}\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2v7.5m-4-3.5L12 9.5l4-3.5M12 22v-7.5m-4 3.5L12 14.5l4 3.5\"/></svg>`;
    } else if (faIcon === 'svg-crystal') {
        orb.innerHTML = `<svg class="w-2.5 h-2.5 inline-block shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${color}" opacity="0.35"/><circle cx="12" cy="12" r="7" fill="${color}"/><circle cx="10" cy="10" r="2.6" fill="#FFE4E6"/></svg>`;
    } else if (faIcon === 'svg-infinite-feather') {
        orb.innerHTML = `<div class="relative flex items-center justify-center w-3 h-3" style="color:${color}"><i class="fa-solid fa-feather-pointed text-[9px]"></i><span class="absolute -bottom-1 -right-1 text-[7px] font-black" style="color:#fff;text-shadow:0 0 3px #000">∞</span></div>`;
    } else {
        orb.innerHTML = `<i class="fa-solid ${faIcon} text-[9px]" style="color:${color}"></i>`;
    }
    
    fxLayer.appendChild(orb);

    // полёт — через transform, и каждый кадр шарик целится в ТЕКУЩУЮ позицию иконки (она может сдвигаться или пульсировать),
    // поэтому прилетает точно в иконку. Смещение переводим в систему самого шарика (его масштаб scale: --ui-zoom).
    const orbZ = uiFx();   // шарик масштабирован тем же множителем (scale: var(--fx)) — без запроса стилей у браузера
    orb.style.transition = 'none';   // полёт ведём сами по кадрам — без CSS-перехода
    const flyT0 = performance.now(), FLY_MS = 480;   // полёт заканчивается чуть раньше момента прилёта (500 мс), когда обновляется панель
    let flyStop = false;
    const flyEase = (t) => 1 - Math.pow(1 - t, 3);
    let flyDX = 0, flyDY = 0, ex = endX, ey = endY, flyMeasT = flyT0, flyLate = false;
    const flyTick = (now) => {
        if (flyStop) return;   // после прилёта положение больше не меняем: панель обновляется и иконки сдвигаются, шарик не должен за ними «уезжать»
        const t = Math.min(1, (now - flyT0) / FLY_MS);
        // положение иконки перемеряем раз в 120 мс и ещё раз перед самым прилётом (а не каждый кадр): замер заставляет браузер пересчитывать всю вёрстку — от этого были подёргивания
        if (now - flyMeasT > 120 || (t > 0.8 && !flyLate)) {
            flyMeasT = now; if (t > 0.8) flyLate = true;
            const tr = targetElem.getBoundingClientRect(), cr = container.getBoundingClientRect();
            ex = tr.left - cr.left + tr.width / 2; ey = tr.top - cr.top + tr.height / 2;
        }
        const k = flyEase(t);
        flyDX = ((startX + (ex - startX) * k) - startX) / orbZ;
        flyDY = ((startY + (ey - startY) * k) - startY) / orbZ;
        orb.style.transform = `translate(${flyDX}px, ${flyDY}px) scale(0.8)`;
        if (t < 1 && orb.parentNode) requestAnimationFrame(flyTick);
    };
    requestAnimationFrame(flyTick);

    setTimeout(() => {
        flyStop = true;
        // долетев, шарик не исчезает рывком: плавно растворяется и «уходит» внутрь иконки (на месте прилёта)
        orb.style.transition = 'opacity 0.26s ease-in, transform 0.26s cubic-bezier(0.55, 0, 0.9, 0.4)';   // впитывается: быстро сжимается в центр иконки и гаснет
        orb.style.opacity = '0';
        orb.style.transform = `translate(${flyDX}px, ${flyDY}px) scale(0.05)`;
        setTimeout(() => { if (orb.parentNode) orb.parentNode.removeChild(orb); }, 380);
        hudPending[hudG] = Math.max(0, hudPending[hudG] - 1);
        flushHud(); // цифра на плашке меняется в момент прилёта
        
        if (targetType === 'attempts') {
            // попытка долетела: цифра обновляется и «подпрыгивает»
            updateAttemptsHUD();
            restartClass(targetElem, ['attempt-pop'], 'attempt-pop');
        } else if (isThemeBadge) {
            triggerBadgeAnimation(targetType);
        } else {
            triggerTopHUDPop(targetType);
        }
        
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: endX / viewScale, y: endY / viewScale,
                vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5,
                color: color, alpha: 0.9, size: Math.random() * 2 + 1
            });
        }
    }, 500);
}

function triggerTopHUDPop(type) {
    let elem = null;
    let animClass = '';
    let iconElem = null;

    if (type === 'score') {
        elem = document.getElementById('scoreBadge');
        animClass = 'hud-pop-score';
        iconElem = document.getElementById('scoreIcon');
    } else if (type === 'stamina') {
        elem = document.getElementById('staminaBadge');
        animClass = 'hud-pop-stamina';
        iconElem = document.getElementById('staminaIcon');
    } else if (type === 'heart') {
        elem = document.getElementById('livesContainer');
        animClass = 'hud-pop-heart';
    }

    if (elem) {
        restartClass(elem, ['hud-pop-score', 'hud-pop-stamina', 'hud-pop-heart'], animClass);
        setTimeout(() => { elem.classList.remove(animClass); }, 480);
    }

    if (iconElem) {
        iconElem.style.transform = 'scale(1.4) rotate(15deg)';
        setTimeout(() => { iconElem.style.transform = 'scale(1) rotate(0deg)'; }, 300);
    }
}

// Раскалывающееся сердечко: вспыхивает, трескается по зигзагу, половинки разлетаются, кувыркаются вниз и тают; мелкие осколки сыплются следом
function spawnHeartBreak(slot, glyphPx) {
    try {
        if (!fxLayer || !slot) return;
        const sr = slot.getBoundingClientRect(), cr = container.getBoundingClientRect();
        if (!sr.width) return;
        const k = sr.width / 14;                        // масштаб панели на компьютере
        const size = glyphPx * k;
        const cx = sr.left - cr.left + sr.width / 2, cy = sr.top - cr.top + sr.height / 2;
        const wrap = document.createElement('div');
        wrap.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;z-index:70;pointer-events:none;`;
        const half = (clip, dir) => {
            const h = document.createElement('i');
            h.className = 'fa-solid fa-heart';
            h.style.cssText = `position:absolute;left:${-size * 0.55}px;top:${-size / 2}px;font-size:${size}px;line-height:1;color:#EF4444;` +
                `text-shadow:0 0 ${4 * k}px rgba(239,68,68,0.9);clip-path:${clip};will-change:transform,opacity;`;
            wrap.appendChild(h);
            const sx = dir * 5 * k, fall = 46 * k;
            h.animate([
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1, filter: 'brightness(2.2)', offset: 0.1 },
                { transform: `translate(${sx}px,${-3 * k}px) rotate(${dir * 16}deg)`, opacity: 1, filter: 'brightness(1)', offset: 0.28 },
                { transform: `translate(${sx * 2.2}px,${fall}px) rotate(${dir * 55}deg)`, opacity: 0 }
            ], { duration: 950, easing: 'cubic-bezier(0.45, 0, 0.75, 0.6)', fill: 'forwards' });
        };
        half('polygon(0 0, 52% 0, 44% 30%, 57% 50%, 44% 72%, 50% 100%, 0 100%)', -1);
        half('polygon(52% 0, 100% 0, 100% 100%, 50% 100%, 44% 72%, 57% 50%, 44% 30%)', 1);
        for (let s = 0; s < 6; s++) {                    // осколки
            const d = document.createElement('div');
            const ps = (1.6 + Math.random() * 1.6) * k;
            d.style.cssText = `position:absolute;left:${-ps / 2}px;top:${-ps / 2}px;width:${ps}px;height:${ps}px;background:#F87171;border-radius:1px;box-shadow:0 0 ${3 * k}px rgba(239,68,68,0.8);`;
            wrap.appendChild(d);
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = (6 + Math.random() * 8) * k;
            d.animate([
                { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
                { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0.12 },
                { transform: `translate(${Math.cos(ang) * sp}px,${Math.sin(ang) * sp}px) rotate(90deg)`, opacity: 1, offset: 0.35 },
                { transform: `translate(${Math.cos(ang) * sp * 1.6}px,${Math.sin(ang) * sp + 40 * k}px) rotate(260deg)`, opacity: 0 }
            ], { duration: 900 + Math.random() * 200, easing: 'cubic-bezier(0.4, 0, 0.8, 0.6)', fill: 'forwards' });
        }
        fxLayer.appendChild(wrap);
        setTimeout(() => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1250);
    } catch (e) {}
}

// Левый блок HUD (сердца, сила, вопросы) не должен доходить до кнопок справа: если не помещается
// (6 сердец, трёхзначный счёт) — всё в нём пропорционально уменьшается через --hk, высота плашек та же.
let _hudFitKey = '';
function fitTopHud() {
    const hud = document.getElementById('topHud'); if (!hud) return;
    const left = hud.firstElementChild, right = hud.lastElementChild; if (!left || !right || left === right) return;
    if (!left.offsetWidth) return;
    // размер зависит только от ширины панели, числа сердец и разрядности счёта 
    // пересчёт только когда меняется один из этих параметров — внутри одного разряда ничего не прыгает
    const digits = String(document.getElementById('scoreVal')?.textContent || '').length;
    const key = hud.offsetWidth + '|' + Math.ceil(maxLives) + '|' + digits;
    if (key === _hudFitKey) return;
    let k = 1; hud.style.setProperty('--hk', '1');
    // меряем в координатах самой панели (offset*): у панели свой zoom, getBoundingClientRect тут врёт
    const gap = () => right.offsetLeft - (left.offsetLeft + left.offsetWidth);   // зазор между группами (кнопки слева, показатели справа)
    for (let i = 0; i < 12 && gap() < 8; i++) {
        k = Math.max(0.7, k - 0.03); hud.style.setProperty('--hk', k.toFixed(2));
        if (k <= 0.7) break;
    }
    _hudFitKey = key;
}
(function () {
    const hud = document.getElementById('topHud'); if (!hud || typeof ResizeObserver === 'undefined') return;
    let raf = 0; const run = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fitTopHud(); }); };
    const ro = new ResizeObserver(run); ro.observe(hud); [...hud.querySelectorAll('#livesContainer, #scoreBadge, #scoreVal')].forEach(e => ro.observe(e));
})();

function renderLivesHUD() {
    const cont = document.getElementById('livesContainer');
    if (!cont) return;
    // 5 жизней — рамка мягко светится красным; 1–1.5 жизни — рамка медленно мигает
    cont.classList.toggle('lives-max', lives >= maxLives);
    cont.classList.toggle('lives-danger', lives > 0 && lives <= 1.5);
    // 6 сердец (только из рулетки): ряд остаётся сердечками, но чуть плотнее — класс lives-six
    cont.classList.toggle('lives-six', maxLives >= 6);
    cont.classList.remove('lives-compact');
    // жизнь потеряна: сердечко (целое или половинка) раскалывается и падает вниз
    {
        const prev = window.__livesShown;
        if (typeof prev === 'number' && lives < prev - 0.01) {
            const kids = [...cont.children];
            // Раскалывается целое сердце, которое перестало быть целым (то, что рядом с половинкой слева).
            // Половинка, которая просто «переехала» левее, не раскалывается; маленькая трескается, только если пропала одна половинка
            const fullLost = [], halfLost = [];
            for (let i = 1; i <= Math.ceil(maxLives); i++) {
                const oR = Math.round((prev - (i - 1)) * 10) / 10, nR = Math.round((lives - (i - 1)) * 10) / 10;
                const fo = oR >= 1 ? 1 : (oR >= 0.5 ? 0.5 : 0), fn = nR >= 1 ? 1 : (nR >= 0.5 ? 0.5 : 0);
                if (fo === 1 && fn < 1) fullLost.push(i - 1);
                else if (fo === 0.5 && fn === 0) halfLost.push(i - 1);
            }
            if (fullLost.length) fullLost.forEach(k => kids[k] && spawnHeartBreak(kids[k], 12));
            else halfLost.forEach(k => kids[k] && spawnHeartBreak(kids[k], 6.5));
        }
        window.__livesShown = lives;
    }
    let html = '';   // собираем строку и вставляем один раз (раньше сердечки вставлялись по одному — страница перестраивалась 5–6 раз)
    for (let i = 1; i <= Math.ceil(maxLives); i++) {
        const rem = Math.round((lives - (i - 1)) * 10) / 10;
        if (rem >= 1.0) {
            html += '<div class="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i class="fa-solid fa-heart text-red-500 text-[12px] filter drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]"></i></div>';
        } else if (rem >= 0.5) {
            // половинка: маленькое красное сердце ровно вдвое меньше целого
            html += '<div class="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i class="fa-solid fa-heart text-red-500 half-heart filter drop-shadow-[0_0_3px_rgba(239,68,68,0.9)]"></i></div>';
        } else {
            html += '<div class="w-3.5 h-3.5 flex items-center justify-center shrink-0"><i class="fa-solid fa-heart text-[12px]" style="color: rgba(196, 167, 255, 0.2)"></i></div>';
        }
    }
    if (cont.innerHTML !== html) cont.innerHTML = html;
}

function renderStaminaHUD() {
    const badge = document.getElementById('staminaBadge');
    const icon = document.getElementById('staminaIcon');
    const val = document.getElementById('staminaVal');
    if (!badge || !val || !icon) return;
    const st = Math.round(stamina);
    const infOn = infiniteStaminaTime > 0;
    badge.classList.toggle('stamina-max', infOn); // волшебное перо: плашка сил подсвечена фиолетовым
    const stKey = `${st}|${infOn}`;
    if (stKey === window.__lastStHUD) return;
    window.__lastStHUD = stKey;
    val.innerText = `${st}%`;

    badge.classList.remove('stamina-critical', 'border-yellow-400', 'border-[#22c55e]/60', 'border-[#00F0FF]/60');
    icon.classList.remove('text-red-400', 'text-yellow-400', 'text-[#22c55e]', 'text-[#00F0FF]', 'animate-bounce');

    if (st <= 25) {
        badge.classList.add('stamina-critical');
        icon.classList.add('text-red-400');
    } else if (st <= 50) {
        badge.classList.add('border-yellow-400');
        icon.classList.add('text-yellow-400');
    } else {
        badge.classList.add('border-[#22c55e]/60');
        icon.classList.add('text-[#22c55e]');
    }
    // во время эффекта волшебного пера само перо в плашке — его салатового цвета; без эффекта — обычные цвета по запасу сил
    icon.style.color = infOn ? '#00F0FF' : '';
    icon.style.filter = infOn ? 'drop-shadow(0 0 4px rgba(0, 240, 255, 0.85))' : '';
}

function updateAttemptsHUD() {
    if ((hudPending.attempts || 0) > 0) return; // цифра сменится, когда долетит анимация
    const attVal = document.getElementById('attemptsVal');
    if (attVal) attVal.innerText = `${attempts}`;
}

function triggerBadgeAnimation(key, isLoss) {
    const el = document.getElementById(`badge-${key}`);
    const icon = document.getElementById(`icon_${key}`);
    const col = (CATEGORIES[key] && CATEGORIES[key].color) || '#FE7600';
    if (el) {
        if (isLoss) {
            restartClass(el, ['badge-animate', 'badge-pop', 'badge-loss'], 'badge-loss');
            setTimeout(() => el.classList.remove('badge-loss'), 680);
        } else {
            el.style.setProperty('--pop-col', col);
            restartClass(el, ['badge-animate', 'badge-pop', 'badge-loss'], 'badge-pop');
            setTimeout(() => el.classList.remove('badge-pop'), 480);
        }
    }
    if (icon && !isLoss) {
        // иконка слегка поворачивается и увеличивается, как наверху
        icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        icon.style.display = 'inline-block';
        icon.style.transform = 'scale(1.4) rotate(15deg)';
        setTimeout(() => { icon.style.transform = 'scale(1) rotate(0deg)'; }, 300);
    }
    if (icon && isLoss && fxLayer && el && el.offsetParent !== null) {
        // копия иконки «отваливается» от плашки и падает вниз
        const cr = container.getBoundingClientRect();
        const ir = icon.getBoundingClientRect();
        const cx = ir.left + ir.width / 2 - cr.left, cy = ir.top + ir.height / 2 - cr.top;
        const fall = document.createElement('i');
        fall.className = `fa-solid ${CATEGORIES[key].faClass} icon-fall`;
        fall.style.cssText += `left:${cx}px;top:${cy}px;color:${col};font-size:15px;filter:drop-shadow(0 0 6px ${col});`;
        fxLayer.appendChild(fall);
        const minus = document.createElement('div');
        minus.className = 'loss-minus';
        minus.textContent = '-1';
        minus.style.left = `${cx}px`; minus.style.top = `${cy - 22}px`;
        fxLayer.appendChild(minus);
        setTimeout(() => { fall.remove(); minus.remove(); }, 1100);
    }
    const menuEl = document.getElementById(`menu-badge-${key}`);
    if (menuEl) {
        restartClass(menuEl, ['badge-animate'], 'badge-animate');
    }
}

function renderCollectionHUD() {
    ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'].forEach(key => {
        const count = collected[key] || 0;
        const maxCount = CATEGORIES[key].count;
        const col = CATEGORIES[key].color;

        const badge = document.getElementById(`badge-${key}`);
        const icon = document.getElementById(`icon_${key}`);
        const label = document.getElementById(`label_${key}`);
        const cntEl = document.getElementById(`cnt_${key}`);

        if (cntEl) cntEl.innerText = `${count}/${maxCount}`;

        if (badge && icon && label) {
            if (count === 0) {
                badge.style.backgroundColor = 'rgba(20, 3, 38, 0.9)';
                badge.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                badge.style.boxShadow = 'none';
                icon.style.color = '#6b7280';
                label.style.color = '#6b7280';
                cntEl.style.color = '#9ca3af';
            } else {
                badge.style.backgroundColor = 'rgba(29, 9, 54, 0.95)';
                badge.style.borderColor = col;
                badge.style.boxShadow = (count >= maxCount) ? `0 0 14px ${col}` : 'none';
                icon.style.color = col;
                label.style.color = col;
                cntEl.style.color = '#ffffff';
            }
        }

        const menuBadge = document.getElementById(`menu-badge-${key}`);
        const menuIcon = document.getElementById(`menu-icon_${key}`);
        const menuCnt = document.getElementById(`menu-cnt_${key}`);
        if (menuCnt) menuCnt.innerText = `${count}/${maxCount}`;
        if (menuBadge && menuIcon) {
            const menuLabel = menuBadge.querySelector('.collection-theme-label');
            // те же цвета и подсветка, что у плиток в игре: оба набора выглядят одинаково
            if (count === 0) {
                menuBadge.style.backgroundColor = 'rgba(20, 3, 38, 0.9)';
                menuBadge.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                menuBadge.style.boxShadow = 'none';
                menuIcon.style.color = '#6b7280';
                if (menuLabel) menuLabel.style.color = '#6b7280';
                if (menuCnt) menuCnt.style.color = '#9ca3af';
            } else {
                menuBadge.style.backgroundColor = 'rgba(29, 9, 54, 0.95)';
                menuBadge.style.borderColor = col;
                menuBadge.style.boxShadow = (count >= maxCount) ? `0 0 14px ${col}` : 'none';
                menuIcon.style.color = col;
                if (menuLabel) menuLabel.style.color = col;
                if (menuCnt) menuCnt.style.color = '#ffffff';
            }
        }
    });
    updateDifficultyHUD();
}

function checkVictoryCondition() {
    if (!gameActive) return;
    const isAllCollected = THEME_KEYS_ALL.every(k => (collected[k] || 0) >= CATEGORIES[k].count);
    if (isAllCollected && !hasWonGame) {
        hasWonGame = true;
        StorageManager.save();
        setTimeout(() => {
            triggerVictory();
        }, 600);
    }
}

function updateMenuVisibility() {
    try { rwUpdateUI(); } catch (e) {}
    try { const sb = document.getElementById('startBtnSub'); if (sb) sb.innerText = attempts > 0 ? 'ОСТАЛОСЬ ПОПЫТОК: ' + attempts : 'КУПИТЕ В ЛАВКЕ ИЛИ ЖДИТЕ ЗАВТРА'; } catch (e) {}
    try { const sbt = document.getElementById('startBtn'); if (sbt) sbt.classList.toggle('no-attempts', attempts <= 0); } catch (e) {}
    const statsCard = document.getElementById('statsCard');
    const menuDiffCard = document.getElementById('menuDiffCard');
    const resetProgressBtn = document.getElementById('resetProgressBtn');
    const startBtnLabel = document.getElementById('startBtnLabel');
    const menuAttempts = document.getElementById('menuAttempts');
    const menuScore = document.getElementById('menuScore');
    const menuTokens = document.getElementById('menuTokens');

    const total = getTotalCollectedThemes();
    const hasProgress = hasStartedCampaign || score > 0 || total > 0 || attempts < MAX_ATTEMPTS || isFlightPaused;

    if (startBtnLabel) {
        startBtnLabel.innerText = (attempts <= 0) ? 'ПОПЫТКИ КОНЧИЛИСЬ' : (hasWonGame ? 'НАЧАТЬ НОВЫЙ ПОЛЕТ' : (hasProgress ? 'ПРОДОЛЖИТЬ ПОЛЕТ' : 'НАЧАТЬ ПОЛЕТ'));
    }

    if (statsCard) {
        if (hasProgress) {
            statsCard.classList.remove('hidden');
        } else {
            statsCard.classList.add('hidden');
        }
    }

    if (menuDiffCard) {
        if (hasProgress) {
            menuDiffCard.classList.remove('hidden');
        } else {
            menuDiffCard.classList.add('hidden');
        }
    }

    if (resetProgressBtn) {
        if (hasProgress && attempts > 0) {
            resetProgressBtn.classList.remove('hidden');
        } else {
            resetProgressBtn.classList.add('hidden');
        }
    }

    const menuAttemptsVal = document.getElementById('menuAttemptsVal');
    if (menuAttemptsVal) menuAttemptsVal.textContent = `${attempts}`;
    if (menuScore) menuScore.innerText = score;
    if (menuTokens) menuTokens.innerText = `${total} / ${TOTAL_THEMES}`;

    updateCollectionHUD();
    updateAttemptsHUD();
}

function updateHUDAll() {
    updateLivesHUD();
    updateStaminaHUD();
    updateCollectionHUD();
    updateAttemptsHUD();
    scheduleHud('score');
    updateMenuVisibility();
}

const THEME_P_BY_LEVEL = [0.447, 0.402, 0.38, 0.34, 0.307, 0.291];
const THEME_FORCE_BY_LEVEL = [7, 7, 8, 8, 8, 9];
// Просвет между верхней и нижней трубой растёт с уровнем сложности: на старте 218, к Хард+ — 226
function pipeGapForLevel() {
    const k = Math.min(1, Math.max(0, getDifficultyIndex() / (DIFF_LEVELS.length - 1)));
    return Math.round(218 + (226 - 218) * k);
}
// Где может стоять проём: оранжевые шапки труб не заходят под верхнюю панель (жизни, силы, вопросы) и нижнюю (сложность, темы).
// Отступ от шапки до панели такой же, как отступ самой панели от края экрана (сверху — до верхнего края, снизу — до нижнего).
// Считается по настоящему положению панелей, поэтому одинаково работает и на телефоне, и на ПК.
let hudBoundsCache = null;
function measureHudBounds() {
    const cont = document.getElementById('gameContainer'), th = document.getElementById('topHud'), bh = document.getElementById('bottomHud');
    if (!cont || !th || !bh || th.classList.contains('hidden') || bh.classList.contains('hidden')) return hudBoundsCache;
    const cr = cont.getBoundingClientRect(), tr = th.getBoundingClientRect(), br = bh.getBoundingClientRect();
    if (!cr.width || !tr.height || !br.height) return hudBoundsCache;
    const S = cr.width / width;                                   // CSS-пикселей на единицу мира
    const mTop = tr.top - cr.top, mBot = cr.bottom - br.bottom;   // отступы панелей от краёв экрана
    hudBoundsCache = { top: (tr.bottom - cr.top + mTop) / S, bottom: (br.top - cr.top - mBot) / S };
    return hudBoundsCache;
}
function pipeVerticalBounds(gap) {
    const capH = 19, hb = measureHudBounds();
    let lo, hi;
    // при замедлении камера приближает картинку на 7% от центра — учитываем это, чтобы и тогда шапки не уходили под панели
    const Z = 1.07, c = height / 2;
    if (hb) { lo = c + (hb.top - c) / Z + capH; hi = c + (hb.bottom - c) / Z - capH - gap; }
    else { lo = 60; hi = height - gap - 140; }                    // панели ещё не измерены — прежние отступы
    if (hi < lo) { const mid = (lo + hi) / 2; lo = hi = mid; }    // очень низкий экран — проём ровно посередине между панелями
    return { min: Math.round(lo), max: Math.round(hi) };
}
function spawnPipe(startX) {
    const px = (startX !== undefined) ? startX : width + 25 + Math.ceil(width * 0.03);
    const baseGap = pipeGapForLevel();   // просвет между верхней и нижней трубой: на старте чуть меньше, к Хард+ — как сейчас (234)
    const pipeWidth = 86;   // трубы примерно на 5% у́же (было 90) 
    // Проём выбирается так, чтобы шапки труб никогда не заходили под верхнюю и нижнюю панели (см. pipeVerticalBounds)
    const vb = pipeVerticalBounds(baseGap);
    const topHeight = vb.min + Math.floor(Math.random() * Math.max(1, vb.max - vb.min + 1));
    const bottomHeight = height - (topHeight + baseGap);

    pipes.push({
        x: px,
        width: pipeWidth,
        top: topHeight,
        gap: baseGap,
        bottom: bottomHeight,
        passed: false
    });

    let itemType = 'question';
    const canSpawnFood = lives < maxLives;
    pipesSinceTheme++;

    if (stamina < 30) {
        const sRoll = Math.random();
        if (sRoll < 0.22) itemType = 'stamina';
        else if (sRoll < 0.32) itemType = 'infinite';
        else if (sRoll < 0.52) itemType = 'icecream';
        else if (sRoll < 0.76) itemType = 'drink';
        else itemType = 'mocktail';
    } else {
        // ТЕМЫ: летят по одной, разные, не слишком часто и не слишком редко.
        // Тема, собранная до конца, больше не встречается — но если секретная звезда заберёт одну, она снова появится.
        const themeKeysAll = ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'];
        const openThemes = themeKeysAll.filter(k => (collected[k] || 0) < CATEGORIES[k].count);
        let themeKey = null;
        const tl = Math.min(5, Math.max(0, getDifficultyIndex()));   // с каждым уровнем темы реже: 100% → 96 → 92 → 88 → 84 → 80%
        if (openThemes.length > 0 && pipesSinceTheme >= 3 && (pipesSinceTheme >= THEME_FORCE_BY_LEVEL[tl] || Math.random() < THEME_P_BY_LEVEL[tl])) {
            let pool = openThemes.filter(k => k !== lastThemeKey);
            if (pool.length === 0) pool = openThemes;
            const totalWeight = pool.reduce((acc, k) => acc + CATEGORIES[k].weight, 0);
            let randW = Math.random() * totalWeight;
            themeKey = pool[pool.length - 1];
            for (const k of pool) {
                if (randW < CATEGORIES[k].weight) { themeKey = k; break; }
                randW -= CATEGORIES[k].weight;
            }
        }

        if (themeKey) {
            itemType = themeKey;
            pipesSinceTheme = 0;
            lastThemeKey = themeKey;
        } else {
            // Обычные предметы (без тем). Сжатие, ускорение, замедление и щит идут по своим счётчикам труб:
            // между двумя одинаковыми проходит минимум несколько труб, а шанс на каждую трубу плавно падает от Суперлайта к Хард+ (но не до нуля)
            // Время между одинаковыми эффектами — в секундах игры (frame: 60 = 1 с): сжатие реже всего и не раньше
            // чем через ~30–66 с (от Суперлайта к Хард+), ускорение/замедление/щит — через 14–44 с. После отсчёта шанс
            // на каждую трубу небольшой, так что выпадает не ровно по таймеру, а «когда-нибудь после» — и подряд эффекты не идут.
            const lv = getDifficultyIndex();
            const pickLv = (arr) => arr[Math.min(arr.length - 1, lv)];
            const sec = (s) => s * 60;
            const SPECIAL_TYPES = ['compress', 'speedup', 'slowmo', 'shield'];
            const specials = [
                { t: 'compress', since: frame - lastCompressSpawnTime, gap: sec(pickLv([30, 33, 36, 40, 44, 48])), p: 0.25 },
                { t: 'speedup', since: frame - lastSpeedSpawnTime, gap: sec(pickLv([12, 13, 14, 15, 16, 17])), p: 0.2 },
                { t: 'slowmo', since: frame - lastSlowSpawnTime, gap: sec(pickLv([16, 17, 18, 19, 20, 21])), p: 0.2 },
                { t: 'shield', since: frame - lastShieldSpawnTime, gap: sec(pickLv([22, 24, 26, 28, 30, 32])), p: 0.15 }
            ];
            const afterSpecial = SPECIAL_TYPES.includes(lastSpawnedItemType);   // после эффекта следующий эффект не сразу
            const hit = afterSpecial ? null : specials.find(s => s.since >= s.gap && Math.random() < s.p);
            if (hit) {
                itemType = hit.t;
                if (hit.t === 'compress') lastCompressSpawnTime = frame;
                else if (hit.t === 'speedup') lastSpeedSpawnTime = frame;
                else if (hit.t === 'slowmo') lastSlowSpawnTime = frame;
                else lastShieldSpawnTime = frame;
            } else {
                const r = Math.random();
                if (r < 0.044) itemType = 'infinite';
                else if (r < 0.126) itemType = 'stamina';
                else if (r < 0.62) itemType = 'question';
                else if (r < 0.71) itemType = 'secret';
                else if (r < 0.87 && canSpawnFood) {
                    // сердца и еда (лечат жизнь) — только пока жизней меньше максимума; при полном запасе на пути их нет совсем
                    const hRoll = Math.random();
                    if (hRoll < 0.25) itemType = 'heart';
                    else if (hRoll < 0.50) itemType = 'pizza';
                    else if (hRoll < 0.75) itemType = 'burger';
                    else itemType = 'hotdog';
                }
                else if (r < 0.87) itemType = 'question';
                else {
                    const bRoll = Math.random();
                    if (bRoll < 0.40) itemType = 'drink';
                    else if (bRoll < 0.70) itemType = 'mocktail';
                    else itemType = 'icecream';
                }
            }
        }
    }

    // Мороженое: случайно, для разнообразия — за уровень сложности обычно от 1 до 6 раз.
    // На высоких уровнях реже, чтобы эффектов не было слишком много. Если его долго не было (45 труб) — появится.
    pipesSinceIceCream++;
    {
        const isThemeItem = !!(CATEGORIES[itemType] && CATEGORIES[itemType].count);
        if (!isThemeItem && itemType !== 'secret' && itemType !== 'icecream') {
            const extraIce = [0.045, 0.045, 0.04, 0.032, 0.018, 0.012][getDifficultyIndex()] || 0.03;
            if (Math.random() < extraIce || pipesSinceIceCream >= 45) itemType = 'icecream';
        }
        if (itemType === 'icecream') pipesSinceIceCream = 0;
    }
    // редкий значок — «Опасные трубы» или «Водонапор» (что именно, решает случай): выпадает на месте обычного значка (не темы и не секретной звезды), когда набралось достаточно тем
    if (crystalPending && crystalTime <= 0 && itemType !== 'secret' && !(CATEGORIES[itemType] && CATEGORIES[itemType].count)) { itemType = (typeof registerWater === 'function' && Math.random() < 0.5) ? 'water' : 'crystal'; crystalPending = false; }   // случайно: «Опасные трубы» или «Водонапор»
    if (typeof shazamBlockedType === 'function' && shazamBlockedType(itemType)) itemType = 'question';   // в ШАЗАМе щит, заморозка и т.п. на пути не появляются
    lastSpawnedItemType = itemType;
    const tokenRadius = 26;

    if (itemType === 'stamina' || itemType === 'infinite') {
        items.push({
            x: px + 35, y: topHeight + baseGap / 2, baseY: topHeight + baseGap / 2,
            radius: tokenRadius, type: itemType, isMoving: true, speedX: 1.2, waveAmp: 28, waveSpeed: 0.08, collected: false, floatOffset: Math.random() * Math.PI * 2,
            trail: []
        });
    } else {
        items.push({
            x: px + pipeWidth / 2, y: topHeight + baseGap / 2, baseY: topHeight + baseGap / 2,
            radius: tokenRadius, type: itemType, isMoving: false, collected: false, floatOffset: Math.random() * Math.PI * 2
        });
    }
}

// Стартовые трубы: на том же расстоянии от совы, что и на телефоне, с обычным шагом
function spawnInitialPipes() {
    const spawnLine = width + 25 + Math.ceil(width * 0.03);
    const firstX = Math.min(spawnLine, owl.x + 383);
    let px = firstX, last = firstX;
    while (px <= spawnLine) { spawnPipe(px); last = px; px += 262; }
    pipeDistanceTracker = Math.max(0, spawnLine - last);
}

function createTapRipple(clientX, clientY) {
    const containerRect = container.getBoundingClientRect();
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.width = '36px';
    ripple.style.height = '36px';
    ripple.style.left = `${x - 18}px`;
    ripple.style.top = `${y - 18}px`;
    fxLayer.appendChild(ripple);

    setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 500);
}

function handleTap(e) {
    AudioFX.resume();
    if (e && e.clientX && e.clientY) {
        createTapRipple(e.clientX, e.clientY);
    }

    if (waitingFirstTap) {
        waitingFirstTap = false;
        gameActive = true;
        lastTime = 0; 
        const tapMsg = document.getElementById('tapToStartMsg');
        if (tapMsg) tapMsg.classList.add('hidden');
        
        if (pipes.length === 0) spawnInitialPipes();
        if (typeof shopOnFlightStart === 'function') shopOnFlightStart();   // бонусы, купленные в лавке «на старт»

        owl.flap();
        return;
    }
    if (!gameActive) return;
    if (typeof shazamBlocksTap === 'function' && shazamBlocksTap()) return;   // на зарядке ШАЗАМа сова скачет сама
    if (typeof quizActive === 'function' && quizActive() && QZ.phase === 'read') return;   // в другом мире пока читаешь вопрос — сова парит сама
    owl.flap();
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); handleTap({});
    }
});

container.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#rulesModal') || e.target.closest('#adminModal') || e.target.closest('#gameOverModal') || e.target.closest('#rouletteModal') || e.target.closest('#winModal') || e.target.closest('#resetConfirmModal') || e.target.closest('#startScreen') || e.target.closest('#homeBtn') || e.target.closest('#musicToggleBtn')) return;
    if (!gameActive && !waitingFirstTap) return;
    handleTap(e);
});

// Луна и облака не меняются — рисуем их один раз в готовые картинки и дальше просто ставим на экран
function makeSprite(w, h, k, paint, reuse) {
    const W = Math.ceil(w * k), H = Math.ceil(h * k);
    const c = (reuse && reuse.width === W && reuse.height === H) ? reuse : document.createElement('canvas');
    if (c !== reuse) { c.width = W; c.height = H; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.scale(k, k);
    paint(g);
    return c;
}
