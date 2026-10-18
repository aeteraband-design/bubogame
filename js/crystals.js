// ===== Эффект «Опасные трубы» (в коде — crystal) =====
// Редкий значок с огнём. Берём — 10 секунд шляпки труб плавно краснеют, и из труб начинают вылетать яркие огненные шары:
// из верхней трубы вниз или из нижней вверх, пролетают проём и уходят в противоположную трубу. Вылетают случайно, раз за разом —
// в них можно врезаться. Сколько одновременно летит в одной трубе — по сложности: Суперлайт/Лайт — 1, Медиум/Медиум+ — 2, Хард/Хард+ — 3
// (дорожки на равном расстоянии по ширине трубы). Попадание снимает пол-жизни. Щит отбивает, ШАЗАМ сдувает.
// Выпадение (админка «Опасные трубы»): по умолчанию Суперлайт и Лайт — по 1 разу, Медиум и Медиум+ — по 2, Хард и Хард+ — по 3 (огонь или вода вперемешку); чаще — раз за уровень; максимум — дважды за уровень.
const CRYSTAL = { SEC: 10, GAP: [[80, 140], [65, 120], [55, 100], [45, 85], [36, 70], [28, 58]],   // пауза между шарами из одной трубы, кадры — по уровню сложности (сначала реже)
    COLOR: '#FF4A3D', HIT_DMG: 0.5, PER_PIPE: [1, 1, 2, 2, 3, 3], id: 0, plan: null, planKey: '' };
let crystalTime = 0;          // сколько кадров ещё идёт эффект
let crystals = [];            // огненные шары
let crystalPending = false;   // следующий подходящий значок на пути будет «Опасными трубами»
let crystalRedK = 0;          // 0..1 — насколько покраснели трубы (плавно)

// план выпадения: в каждом отрезке шкалы сложности — случайная точка (число собранных тем), на которой выпадет значок
function crystalPlanBuild() {
    let f = 0; try { f = ADMIN_CFG.crystalFreq | 0; } catch (e) {}
    const T = Math.max(6, TOTAL_THEMES | 0), key = T + '|' + f;
    if (CRYSTAL.plan && CRYSTAL.planKey === key) return CRYSTAL.plan;
    const lvStart = (i) => Math.ceil(i * T / 6);   // с какого числа тем начинается уровень i
    const segs = [];
    // по умолчанию: Суперлайт+Лайт — 1 раз, Медиум+Медиум+ — 2 раза, Хард+Хард+ — 3 раза; точки разнесены по отрезку
    // по умолчанию: Суперлайт — 1, Лайт — 1, Медиум — 2, Медиум+ — 2, Хард — 3, Хард+ — 3; точки разнесены по уровню
    if (f <= 0) [1, 1, 2, 2, 3, 3].forEach((k, j) => {
        const a = lvStart(j), b = lvStart(j + 1);
        for (let q = 0; q < k; q++) segs.push([Math.round(a + (b - a) * q / k), Math.round(a + (b - a) * (q + 1) / k)]);
    });
    else for (let i = 0; i < 6; i++) {
        const a = lvStart(i), b = lvStart(i + 1);
        if (f >= 2) { const m = Math.round((a + b) / 2); segs.push([a, m], [m, b]); } else segs.push([a, b]);
    }
    // огонь / вода — поровну и вперемешку, одно и то же не больше двух раз подряд (чаще чередуются)
    const kinds = segs.map((_, i) => i % 2 ? 'water' : 'crystal');
    if (Math.random() < 0.5) kinds.reverse();
    for (let t = 0; t < 50; t++) {
        for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
        if (!kinds.some((k, i) => i >= 2 && k === kinds[i - 1] && k === kinds[i - 2])) break;
    }
    const now = getTotalCollectedThemes();
    CRYSTAL.plan = segs.map(([a, b], i) => {
        const lo = Math.max(1, a + 1), hi = Math.max(lo, b - 1);
        const at = lo + Math.floor(Math.random() * (hi - lo + 1));
        return { at, done: at <= now, kind: kinds[i] };
    });
    CRYSTAL.planKey = key;
    return CRYSTAL.plan;
}
// после каждой собранной темы: дошли до точки из плана — следующий подходящий значок будет кристаллом
function crystalOnTheme() {
    const plan = crystalPlanBuild(), n = getTotalCollectedThemes();
    for (const p of plan) if (!p.done && n >= p.at) { p.done = true; crystalPending = p.kind || true; }
}
function crystalReset() { crystalTime = 0; crystals.length = 0; crystalRedK = 0; }

// значок взят: включаем эффект
function registerCrystal() {
    crystalTime = CRYSTAL.SEC * 60; CRYSTAL.id++;
    try { AudioFX.playStarCollect(); AudioFX.playPipesHeat(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Опасные трубы ${CRYSTAL.SEC}с`, color: CRYSTAL.COLOR, icon: 'fa-fire' };
}

// ---- рисование ----
// огненный шар: внутри раскалённый жёлто-оранжевый, к краям красный, вокруг ореол (рисуется «светом» — режим lighter)
let __orbSpr = null;
function crystalSprite() {
    if (__orbSpr) return __orbSpr;
    const S = 3, W = 48, c = document.createElement('canvas'); c.width = c.height = W * S;
    const g = c.getContext('2d');
    g.scale(S, S); g.translate(W / 2, W / 2);
    const h = g.createRadialGradient(0, 0, 2, 0, 0, W / 2);
    h.addColorStop(0, 'rgba(255, 140, 50, 0.95)'); h.addColorStop(0.22, 'rgba(255, 70, 40, 0.55)'); h.addColorStop(0.55, 'rgba(230, 20, 40, 0.18)'); h.addColorStop(1, 'rgba(200, 0, 30, 0)');
    g.fillStyle = h; g.beginPath(); g.arc(0, 0, W / 2, 0, Math.PI * 2); g.fill();
    const b = g.createRadialGradient(0, 0, 0.3, 0, 0, 7.5);
    b.addColorStop(0, '#FFF6C8'); b.addColorStop(0.2, '#FFD35A'); b.addColorStop(0.45, '#FF9A2E'); b.addColorStop(0.72, '#FF4A2A'); b.addColorStop(1, 'rgba(210, 20, 40, 0)');
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 7.5, 0, Math.PI * 2); g.fill();
    return (__orbSpr = c);
}
function drawCrystals() {
    if (!crystals.length) return;
    const sp = crystalSprite();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of crystals) {
        ctx.globalAlpha = c.kn ? Math.min(1, c.kl / 25) : 1;
        const s = 34 * (1 + 0.12 * Math.sin(c.age * 0.45 + c.ph));   // мерцает
        ctx.drawImage(sp, c.x - s / 2, c.y - s / 2, s, s);
    }
    ctx.restore();
}
// таймер эффекта — красно-оранжевая плашка с пульсирующим огненным свечением
(function () {
    try {
        const st = document.createElement('style');
        const C = '.buff-tag[data-key="crystal"],.fly-label-tag[data-key="crystal"]';
        // обычная плашка своего цвета; иногда по контуру по кругу пробегает светлый блик (как у плашки сил при увеличении максимума).
        // Свою animation у плашки не трогаем (у улетающей подсказки это её полёт)
        st.textContent = '@property --dngA{syntax:"<angle>";inherits:false;initial-value:0deg}'
            + '#buffBar .buff-tag[data-key="crystal"]{position:relative}'
            + C.split(',').map(x => x + '::after').join(',') + '{content:"";position:absolute;inset:-1.5px;border-radius:inherit;padding:1.5px;pointer-events:none;'
            + 'background:conic-gradient(from var(--dngA),transparent 0deg,rgba(255,255,255,.95) 30deg,#FF4A3D 62deg,transparent 105deg,transparent 360deg);'
            + '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;'
            + 'animation:dngRun 5s linear infinite}'
            + '@keyframes dngRun{0%{--dngA:0deg;opacity:1}24%{--dngA:360deg;opacity:1}27%{--dngA:360deg;opacity:0}100%{--dngA:360deg;opacity:0}}';
        document.head.appendChild(st);
    } catch (e) {}
})();

// ---- логика ----
function crystalBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.8 + Math.random() * 2.6;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, color: Math.random() < 0.5 ? '#FFD27A' : '#FF4A3D', alpha: 0.95, size: 1.6 + Math.random() * 1.8, decay: 0.05, isStar: true });
    }
}
// вызывается каждый кадр после движения труб: speed — скорость, с которой уезжают трубы, squeeze — текущее сужение проёма
function crystalUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    // новая игра (тем снова 0): план выпадения — заново
    if (CRYSTAL.plan && CRYSTAL.plan.some((q) => q.done) && getTotalCollectedThemes() === 0) { CRYSTAL.plan = null; crystalPending = false; }
    crystalRedK = Math.max(0, Math.min(1, crystalRedK + (crystalTime > 0 ? 1 : -1) * dt / 50));   // трубы краснеют и остывают ~0,8 с
    if (crystalTime > 0) {
        crystalTime -= dt;
        if (crystalTime <= 0 && !shz) { try { AudioFX.playPipesCool(); } catch (e) {} }   // трубы остывают
        let lv = 0; try { lv = getDifficultyIndex(); } catch (e) {}
        const N = CRYSTAL.PER_PIPE[lv] || 1;
        for (const p of pipes) {
            if (p.x + p.width < owl.x - 30 || p.x > width - 10) continue;   // трубы на экране впереди и рядом с совой
            if (p._cId !== CRYSTAL.id) { p._cId = CRYSTAL.id; p._cT = 10 + Math.random() * 50; }
            // из устьев труб всё время вылетают крошечные огненные искорки
            if (Math.random() < 0.3 * dt && particles.length < 500) {
                const top = Math.random() < 0.5, sx = p.x + 4 + Math.random() * (p.width - 8), sy = top ? p.top + squeeze + 1 : height - (p.bottom + squeeze) - 1;
                particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 0.25 - speed, vy: (top ? 1 : -1) * (0.7 + Math.random() * 1.1), color: Math.random() < 0.5 ? '#FFD27A' : (Math.random() < 0.6 ? '#FF4A3D' : '#FFFFFF'), alpha: 0.95, size: 0.6 + Math.random() * 0.9, decay: 0.03 + Math.random() * 0.025, isStar: true });
            }
            p._cT -= dt;
            if (p._cT > 0) continue;
            const G = CRYSTAL.GAP[lv] || CRYSTAL.GAP[0];
            p._cT = G[0] + Math.random() * (G[1] - G[0]);   // случайно; с ростом сложности — чаще
            const used = new Set(); for (const o of crystals) if (o.pipe === p && !o.kn) used.add(o.lane);
            if (used.size >= N) continue;   // в трубе уже летит столько, сколько можно
            const free = []; for (let k = 0; k < N; k++) if (!used.has(k)) free.push(k);
            const lane = free[Math.floor(Math.random() * free.length)], d = Math.random() < 0.5 ? 1 : -1;
            const x = p.x + (lane + 1) / (N + 1) * p.width;
            crystals.push({ pipe: p, lane, x, y: d > 0 ? p.top + squeeze - 20 : height - (p.bottom + squeeze) + 20, d, vy: d * (1.6 + Math.random() * 0.8), age: 0, ph: Math.random() * 6.28 });
        }
    }
    for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.age += dt; c.x -= speed * dt;
        const rr = 6;
        if (c.kn) {   // отбит щитом или сдут ШАЗАМом: улетает прочь, сыпля искрами, и гаснет
            c.x += c.kvx * dt; c.y += c.kvy * dt; c.kvy += 0.06 * dt; c.kvx *= Math.pow(0.985, dt); c.kl -= dt;
            if (particles.length < 450 && Math.random() < 0.8 * dt) particles.push({ x: c.x, y: c.y, vx: -c.kvx * 0.15 + (Math.random() - 0.5) * 0.6, vy: -c.kvy * 0.15 + (Math.random() - 0.5) * 0.6, color: Math.random() < 0.5 ? '#FFD27A' : '#FF4A3D', alpha: 0.9, size: 0.8 + Math.random() * 1.1, decay: 0.07, isStar: true });
            if (c.kl <= 0 || c.x < -40 || c.x > width + 40 || c.y < -40 || c.y > height + 40) crystals.splice(i, 1);
            continue;
        }
        c.vy = c.d > 0 ? Math.min(6, c.vy + 0.07 * dt) : Math.max(-6, c.vy - 0.07 * dt); c.y += c.vy * dt;
        // в проёме между трубами? (внутри труб шар скрыт за ними)
        let inGap = true;
        if (c.pipe) { const p = c.pipe; inGap = c.y > p.top + squeeze && c.y < height - (p.bottom + squeeze); }
        // шар сыплет искрами, они летят строго назад — короткий искрящийся хвост
        if (inGap && particles.length < 450) {
            c.sp = (c.sp || 0) - dt;
            while (c.sp <= 0) {
                c.sp += 1.3 + Math.random() * 1.5;   // искр меньше, хвост — рассыпчатый, а не тонкая струйка
                particles.push({ x: c.x + (Math.random() - 0.5) * 7, y: c.y - c.d * Math.random() * 4, vx: -speed + (Math.random() - 0.5) * 0.9,   /* искры едут вместе с трубой и чуть разлетаются в стороны */ vy: -c.vy * (0.04 + Math.random() * 0.32) + (Math.random() - 0.5) * 0.5, color: Math.random() < 0.55 ? '#FFD27A' : (Math.random() < 0.5 ? '#FF4A3D' : '#FFFFFF'), alpha: 1, size: 0.7 + Math.random() * 2, decay: 0.05 + Math.random() * 0.06, isStar: true });
            }
        }
        // пролетел проём и скрылся в противоположной трубе
        if (c.pipe) {
            const p = c.pipe, edge = c.d > 0 ? height - (p.bottom + squeeze) : p.top + squeeze;
            if (c.d > 0 ? c.y > edge + 22 : c.y < edge - 22) { crystals.splice(i, 1); continue; }
        }
        let gone = c.x < -40 || c.y > height + 30 || c.y < -30;
        if (!inGap) { if (gone) crystals.splice(i, 1); continue; }
        const knock = (pow) => {
            const a = Math.atan2(c.y - owl.y, c.x - owl.x);
            c.kn = true; c.kl = 60; c.kvx = Math.cos(a) * pow + (shz ? 2 : 0); c.kvy = Math.sin(a) * pow - 1;
            crystalBurst(c.x, c.y, shz ? 8 : 5);
        };
        if (!gone && gameActive && shz) {
            if (Math.hypot(owl.x - c.x, owl.y - c.y) < owl.radius * 2.4) knock(9);   // ШАЗАМ сдувает шары
        } else if (!gone && gameActive) {
            const d = Math.hypot(owl.x - c.x, owl.y - c.y);
            if (shieldTime > 0) {
                if (d < owl.radius * 1.45 + rr * 0.5) { try { shieldBump(Math.atan2(c.y - owl.y, c.x - owl.x), 0.45); } catch (e) {} knock(5); }
            } else if (invulnerableTime <= 0 && d < owl.radius * 0.85 + rr) {
                crystalBurst(c.x, c.y, 9); gone = true;
                crystalHit();
            }
        }
        if (gone) crystals.splice(i, 1);
    }
}
// попадание: огонь обжигает сову — минус пол-жизни
function crystalHit() {
    try { AudioFX.playHit(); Haptics.hit(); } catch (e) {}
    if (lives <= 1.0 + 1e-6) {
        lives = 0; updateLivesHUD();
        handleRunFailure('Огонь из трубы обжёг сову — это была последняя жизнь.');
        return;
    }
    lives = Math.round((lives - CRYSTAL.HIT_DMG) * 10) / 10;
    invulnerableTime = 70;
    updateLivesHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
    try { spawnFlyingArrivalFX(owl.x, owl.y, 'other', 'Обжёгся: -0.5 Жизни', CRYSTAL.COLOR, 'fa-heart-crack'); } catch (e) {}
}
