// ===== Эффект «Водопад» (в коде — crystal) =====
// Редкий значок-капля. Берём — 10 секунд шляпки труб плавно синеют, и из верхних труб начинает хлестать вода: струи падают
// через проём в нижнюю трубу, то включаются, то стихают. Попав в струю, сова не ранится, но вода прибивает её вниз — мешает лететь.
// Сколько струй в трубе и как сильно льёт — по сложности: Суперлайт/Лайт — 1, Медиум/Медиум+ — 2, Хард/Хард+ — 3, и с каждым уровнем струи шире и напор сильнее.
// Щит закрывает от воды (струя разбивается о него); в ШАЗАМе сова пробивает воду насквозь.
// Выпадение (админка «Водопад»): по умолчанию один раз на каждые два уровня сложности; чаще — раз за уровень; максимум — дважды за уровень.
const CRYSTAL = { SEC: 10, GAP: [[70, 130], [60, 115], [50, 100], [42, 85], [35, 72], [28, 60]],   // пауза перед новой струёй из трубы, кадры — по уровню (сначала реже)
    COLOR: '#38BDF8', PER_PIPE: [1, 1, 2, 2, 3, 3], id: 0, plan: null, planKey: '' };
let crystalTime = 0;          // сколько кадров ещё идёт эффект
let crystals = [];            // струи воды
let crystalPending = false;   // следующий подходящий значок на пути будет кристаллом
let crystalRedK = 0;          // 0..1 — насколько посинели трубы (плавно)

// план выпадения: в каждом отрезке шкалы сложности — случайная точка (число собранных тем), на которой выпадет значок
function crystalPlanBuild() {
    let f = 0; try { f = ADMIN_CFG.crystalFreq | 0; } catch (e) {}
    const T = Math.max(6, TOTAL_THEMES | 0), key = T + '|' + f;
    if (CRYSTAL.plan && CRYSTAL.planKey === key) return CRYSTAL.plan;
    const lvStart = (i) => Math.ceil(i * T / 6);   // с какого числа тем начинается уровень i
    const segs = [];
    if (f <= 0) for (let i = 0; i < 6; i += 2) segs.push([lvStart(i), lvStart(i + 2)]);
    else for (let i = 0; i < 6; i++) {
        const a = lvStart(i), b = lvStart(i + 1);
        if (f >= 2) { const m = Math.round((a + b) / 2); segs.push([a, m], [m, b]); } else segs.push([a, b]);
    }
    const now = getTotalCollectedThemes();
    CRYSTAL.plan = segs.map(([a, b]) => {
        const lo = Math.max(1, a + 1), hi = Math.max(lo, b - 1);
        const at = lo + Math.floor(Math.random() * (hi - lo + 1));
        return { at, done: at <= now };
    });
    CRYSTAL.planKey = key;
    return CRYSTAL.plan;
}
// после каждой собранной темы: дошли до точки из плана — следующий подходящий значок будет кристаллом
function crystalOnTheme() {
    const plan = crystalPlanBuild(), n = getTotalCollectedThemes();
    for (const p of plan) if (!p.done && n >= p.at) { p.done = true; crystalPending = true; }
}
function crystalReset() { crystalTime = 0; crystals.length = 0; crystalRedK = 0; }

// значок взят: включаем эффект
function registerCrystal() {
    if (typeof shazamBusy === 'function' && shazamBusy()) return null;   // в ШАЗАМе не действует
    crystalTime = CRYSTAL.SEC * 60; CRYSTAL.id++;
    try { AudioFX.playStarCollect(); AudioFX.playPipesHeat(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Водопад ${CRYSTAL.SEC}с`, color: CRYSTAL.COLOR, icon: 'fa-droplet' };
}

// ---- рисование ----
// струя: полупрозрачная синяя лента с колышущимися краями, светлой серединой и бегущими вниз бликами; внизу — пена
function drawCrystals() {
    if (!crystals.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    for (const s of crystals) {
        const p = s.pipe; if (!p) continue;
        const sq = s.sq, x = p.x + s.fx * p.width, y0 = p.top + sq + s.top, y1 = p.top + sq + s.bot;
        if (y1 - y0 < 1) continue;
        const w = s.w, ph = s.ph;
        // тело струи с волнистыми краями
        const edge = (yy, side) => x + side * (w / 2 + 1.1 * Math.sin(yy * 0.09 + t * 0.35 * side + ph) + 0.6 * Math.sin(yy * 0.23 - t * 0.5 + ph * 2));
        ctx.beginPath();
        for (let yy = y0; yy <= y1; yy += 6) ctx.lineTo(edge(yy, -1), yy);
        ctx.lineTo(edge(y1, -1), y1);
        // закруглённый «нос» падающей воды
        ctx.quadraticCurveTo(x, y1 + w * 0.55, edge(y1, 1), y1);
        for (let yy = y1; yy >= y0; yy -= 6) ctx.lineTo(edge(yy, 1), yy);
        ctx.closePath();
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, 'rgba(150, 215, 255, 0.85)'); g.addColorStop(0.3, 'rgba(56, 150, 235, 0.72)'); g.addColorStop(0.6, 'rgba(90, 185, 250, 0.7)'); g.addColorStop(1, 'rgba(170, 225, 255, 0.85)');
        ctx.fillStyle = g; ctx.fill();
        // бегущие вниз блики
        ctx.save(); ctx.clip();
        ctx.strokeStyle = 'rgba(235, 248, 255, 0.75)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
            const off = ((t * (5 + k) + k * 37 + ph * 20) % 60);
            const lx = x + (k - 1) * w * 0.25;
            ctx.beginPath();
            for (let yy = y0 - 60 + off; yy < y1; yy += 60) { ctx.moveTo(lx, Math.max(y0, yy)); ctx.lineTo(lx, Math.min(y1, yy + 18)); }
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();
}
// таймер эффекта — свой вид: синяя «водяная» плашка, по которой бегут волны
(function () {
    try {
        const st = document.createElement('style');
        st.textContent = '.buff-tag[data-key="crystal"]{background:linear-gradient(100deg,rgba(8,47,92,.96) 0%,rgba(20,90,160,.96) 25%,rgba(8,47,92,.96) 50%,rgba(20,90,160,.96) 75%,rgba(8,47,92,.96) 100%)!important;background-size:200% 100%!important;border-color:#7DD3FC!important;color:#E0F6FF!important;animation:waterFlow 1.6s linear infinite,waterGlow 1.8s ease-in-out infinite}'
            + '.buff-tag[data-key="crystal"] i{color:#7DD3FC!important;filter:drop-shadow(0 0 3px #38BDF8)}'
            + '@keyframes waterFlow{from{background-position:0% 0}to{background-position:200% 0}}'
            + '@keyframes waterGlow{0%,100%{box-shadow:0 0 8px #38BDF899}50%{box-shadow:0 0 16px #7DD3FCEE}}';
        document.head.appendChild(st);
    } catch (e) {}
})();

// ---- логика ----
function waterSplash(x, y, n, up) {
    for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 0.8 + Math.random() * 2.4;
        particles.push({ x: x + (Math.random() - 0.5) * 6, y, vx: Math.cos(a) * v, vy: (up ? Math.sin(a) : -Math.sin(a) * 0.4) * v, color: Math.random() < 0.5 ? '#BFE6FF' : '#5AB8F5', alpha: 0.85, size: 0.8 + Math.random() * 1.4, decay: 0.045 + Math.random() * 0.03 });
    }
}
// вызывается каждый кадр после движения труб: speed — скорость, с которой уезжают трубы, squeeze — текущее сужение проёма
function crystalUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    if (shz) crystalTime = 0;
    // новая игра (тем снова 0): план выпадения — заново
    if (CRYSTAL.plan && CRYSTAL.plan.some((q) => q.done) && getTotalCollectedThemes() === 0) { CRYSTAL.plan = null; crystalPending = false; }
    crystalRedK = Math.max(0, Math.min(1, crystalRedK + (crystalTime > 0 ? 1 : -1) * dt / 50));   // трубы синеют и возвращают цвет ~0,8 с
    let lv = 0; try { lv = getDifficultyIndex(); } catch (e) {}
    if (crystalTime > 0) {
        crystalTime -= dt;
        if (crystalTime <= 0 && !shz) { try { AudioFX.playPipesCool(); } catch (e) {} }   // вода стихает
        const N = CRYSTAL.PER_PIPE[lv] || 1;
        for (const p of pipes) {
            if (p.x + p.width < owl.x - 30 || p.x > width - 10) continue;   // трубы на экране впереди и рядом с совой
            // из труб капает вода: с верхней — капли вниз, у нижней — брызги
            if (Math.random() < 0.18 * dt && particles.length < 500) {
                const top = Math.random() < 0.6, sx = p.x + 4 + Math.random() * (p.width - 8), sy = top ? p.top + squeeze + 1 : height - (p.bottom + squeeze) - 1;
                particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 0.3, vy: top ? 0.8 + Math.random() * 1.2 : -(0.6 + Math.random() * 0.9), color: Math.random() < 0.5 ? '#BFE6FF' : '#5AB8F5', alpha: 0.85, size: 0.7 + Math.random() * 0.9, decay: 0.03 + Math.random() * 0.02 });
            }
            if (p._cId !== CRYSTAL.id) { p._cId = CRYSTAL.id; p._cT = 10 + Math.random() * 40; }
            p._cT -= dt;
            if (p._cT > 0) continue;
            const G = CRYSTAL.GAP[lv] || CRYSTAL.GAP[0];
            p._cT = G[0] + Math.random() * (G[1] - G[0]);
            const used = new Set(); for (const s of crystals) if (s.pipe === p && s.on) used.add(s.lane);
            if (used.size >= N) continue;
            const free = []; for (let k = 0; k < N; k++) if (!used.has(k)) free.push(k);
            const lane = free[Math.floor(Math.random() * free.length)];
            crystals.push({ pipe: p, lane, fx: (lane + 1) / (N + 1), top: 0, bot: 0, on: true, life: 45 + Math.random() * 50 + lv * 8,
                w: 7 + lv * 1.6 + Math.random() * 2, push: 0.3 + 0.06 * lv, ph: Math.random() * 6.28, sq: squeeze, splashT: 0 });
        }
    }
    const vFall = 7;   // скорость падения воды, px/кадр
    for (let i = crystals.length - 1; i >= 0; i--) {
        const s = crystals[i], p = s.pipe;
        s.sq = squeeze;
        const gapH = Math.max(10, height - (p.bottom + squeeze) - (p.top + squeeze));
        if (s.on) { s.life -= dt; if (s.life <= 0 || crystalTime <= 0) s.on = false; }
        else s.top += vFall * dt;                         // напор кончился: хвост воды отрывается и падает
        s.bot = Math.min(gapH, s.bot + vFall * dt);       // вода падает до нижней трубы
        if (s.top >= gapH || p.x + p.width < -40) { crystals.splice(i, 1); continue; }
        const x = p.x + s.fx * p.width, y0 = p.top + squeeze + s.top, y1 = p.top + squeeze + s.bot;
        // вода бьёт в нижнюю трубу — брызги
        if (s.bot >= gapH && (s.splashT -= dt) <= 0 && particles.length < 500) { s.splashT = 3; waterSplash(x, y1, 2, true); }
        // сова в струе
        if (!gameActive) continue;
        const r = owl.radius * 0.85, hw = s.w / 2;
        if (owl.x + r > x - hw && owl.x - r < x + hw && owl.y + r > y0 && owl.y - r < y1) {
            if (shz) { if (Math.random() < 0.5 * dt) waterSplash(owl.x, owl.y - r, 3, true); continue; }   // ШАЗАМ пробивает воду
            if (shieldTime > 0) { if (Math.random() < 0.6 * dt) waterSplash(x, owl.y - owl.radius * 1.4, 3, true); continue; }   // вода разбивается о щит
            owl.vy = Math.min(7.5, owl.vy + s.push * dt);   // вода прибивает сову вниз
            if (Math.random() < 0.5 * dt && particles.length < 500) waterSplash(owl.x + (Math.random() - 0.5) * r, owl.y - r * 0.8, 2, true);
            if (typeof STORM !== "undefined") STORM.wet = Math.max(STORM.wet || 0, 0.6);   // сова мокнет
        }
    }
}
