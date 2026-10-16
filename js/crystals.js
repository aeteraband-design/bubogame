// ===== Эффект «Энергия» (в коде — crystal) =====
// Редкий значок — светящийся красный энергетический шар. Берём — 10 секунд шляпки труб плавно краснеют, а из каждой трубы впереди
// вылетают маленькие красные огоньки (сыплют искрами): одни из верхней трубы вниз, другие из нижней вверх; долетев до противоположной
// трубы, огонёк сплющивается и уходит в неё. Сколько на трубу — по сложности: Суперлайт/Лайт — 1 (по центру), Медиум/Медиум+ — 2, Хард/Хард+ — 3
// (на равном расстоянии по ширине трубы). Попадание снимает пол-жизни. Щит отбивает; в ШАЗАМе не страшны.
// Выпадение (админка «Энергия»): по умолчанию один раз на каждые два уровня сложности; чаще — раз за уровень; максимум — дважды за уровень.
const CRYSTAL = { SEC: 10, COLOR: '#FF4D5E', HIT_DMG: 0.5, PER_PIPE: [1, 1, 2, 2, 3, 3], id: 0, plan: null, planKey: '' };
let crystalTime = 0;          // сколько кадров ещё идёт эффект
let crystals = [];            // летящие кристаллы
let crystalPending = false;   // следующий подходящий значок на пути будет кристаллом
let crystalRedK = 0;          // 0..1 — насколько покраснели трубы (плавно)

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
    try { AudioFX.playStarCollect(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Энергия ${CRYSTAL.SEC}с`, color: CRYSTAL.COLOR, icon: 'svg-crystal' };
}

// ---- рисование ----
// светящийся красный шар: белое горячее ядро, красная оболочка и мягкий ореол
let __orbSpr = null;
function crystalSprite() {
    if (__orbSpr) return __orbSpr;
    const S = 3, W = 40, c = document.createElement('canvas'); c.width = c.height = W * S;
    const g = c.getContext('2d');
    g.scale(S, S); g.translate(W / 2, W / 2);
    const h = g.createRadialGradient(0, 0, 3, 0, 0, W / 2);   // ореол
    h.addColorStop(0, 'rgba(255, 90, 105, 0.75)'); h.addColorStop(0.4, 'rgba(255, 40, 70, 0.28)'); h.addColorStop(1, 'rgba(255, 20, 50, 0)');
    g.fillStyle = h; g.beginPath(); g.arc(0, 0, W / 2, 0, Math.PI * 2); g.fill();
    const b = g.createRadialGradient(-1.6, -1.8, 0.3, 0, 0, 8);   // сам шар
    b.addColorStop(0, '#FFFFFF'); b.addColorStop(0.25, '#FFD0D5'); b.addColorStop(0.55, '#FF4D5E'); b.addColorStop(1, '#C8102E');
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
    return (__orbSpr = c);
}
// значок на пути: крупный пульсирующий шар, вокруг кружат искры
function drawCrystalIcon(g, t, ph) {
    const sp = crystalSprite(), k = 1 + 0.07 * Math.sin(t * 4 + (ph || 0)), s = 46 * k;
    g.drawImage(sp, -s / 2, -s / 2, s, s);
    g.save(); g.fillStyle = '#FFD0D5';
    for (let i = 0; i < 3; i++) {
        const a = t * 2.2 + (ph || 0) + i * 2.094, r = 14 + 1.5 * Math.sin(t * 3 + i);
        g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5 + i * 1.7);
        g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 1.3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
}
function drawCrystals() {
    if (!crystals.length) return;
    const sp = crystalSprite(), ghost = typeof shazamBusy === 'function' && shazamBusy();
    ctx.save();
    for (const c of crystals) {
        const s = 26 * c.s * (1 + 0.08 * Math.sin(c.age * 0.3));
        const sq = c.sq || 0, sx = 1 + 0.6 * sq, sy = 1 - 0.75 * sq;   // уходит в трубу: сплющивается
        ctx.globalAlpha = (ghost ? 0.3 : 1) * Math.min(1, c.age / 6) * (1 - sq * 0.7);
        ctx.drawImage(sp, c.x - s * sx / 2, c.y - s * sy / 2, s * sx, s * sy);
    }
    ctx.restore();
}

// ---- логика ----
function crystalBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.8 + Math.random() * 2.6;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, color: Math.random() < 0.5 ? '#FFD0D5' : '#FF4D5E', alpha: 0.95, size: 1.6 + Math.random() * 1.8, decay: 0.05, isStar: true });
    }
}
// направления кристаллов на трубе: не все в одну сторону (1 — вниз из верхней трубы, -1 — вверх из нижней)
function crystalDirs(n) {
    if (n <= 1) return [Math.random() < 0.5 ? 1 : -1];
    const d = Math.random() < 0.5 ? 1 : -1, a = [d, -d];
    for (let i = 2; i < n; i++) a.push(Math.random() < 0.5 ? 1 : -1);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
// вызывается каждый кадр после движения труб: speed — скорость, с которой уезжают трубы, squeeze — текущее сужение проёма
function crystalUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    if (shz) crystalTime = 0;
    // новая игра (тем снова 0): план выпадения — заново
    if (CRYSTAL.plan && CRYSTAL.plan.some((q) => q.done) && getTotalCollectedThemes() === 0) { CRYSTAL.plan = null; crystalPending = false; }
    crystalRedK = Math.max(0, Math.min(1, crystalRedK + (crystalTime > 0 ? 1 : -1) * dt / 50));   // трубы краснеют и остывают ~0,8 с
    if (crystalTime > 0) {
        crystalTime -= dt;
        let lv = 0; try { lv = getDifficultyIndex(); } catch (e) {}
        const N = CRYSTAL.PER_PIPE[lv] || 1;
        for (const p of pipes) {
            if (p.x + p.width < owl.x + 50 || p.x > width - 10) continue;   // только трубы впереди на экране
            if (p._cId !== CRYSTAL.id) {   // труба впервые попала под эффект: у неё будет ровно N кристаллов
                p._cId = CRYSTAL.id;
                const dirs = crystalDirs(N);
                const t0 = 4 + Math.random() * 12;
                p._cQ = dirs.map((d, k) => ({ t: t0 + k * 10, d, k }));
            }
            if (!p._cQ || !p._cQ.length) continue;
            for (const q of p._cQ) q.t -= dt;
            while (p._cQ.length && p._cQ[0].t <= 0) {
                const q = p._cQ.shift(), fx = (q.k + 1) / (N + 1);   // по центру / на равном расстоянии по ширине трубы
                const x = p.x + fx * p.width;
                if (q.d > 0) crystals.push({ x, y: p.top + squeeze - 3, d: 1, vy: 1.0 + Math.random() * 0.8, s: 0.8 + Math.random() * 0.25, rot: Math.random() * 6.28, vr: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.03), age: 0 });
                else crystals.push({ x, y: height - (p.bottom + squeeze) + 3, d: -1, vy: -(1.0 + Math.random() * 0.8), s: 0.8 + Math.random() * 0.25, rot: Math.random() * 6.28, vr: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.03), age: 0 });
            }
        }
    }
    for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.age += dt; c.x -= speed * dt;
        const rr = 6 * c.s;
        if (c.sq) {   // сплющивается и уходит в трубу
            c.sq = Math.min(1, c.sq + 0.1 * dt);
            if (c.sq >= 1) crystals.splice(i, 1);
            continue;
        }
        c.vy = c.d > 0 ? Math.min(5.6, c.vy + 0.075 * dt) : Math.max(-5.6, c.vy - 0.075 * dt); c.y += c.vy * dt;
        // огонёк сыплет искрами
        if ((c.sp = (c.sp || 0) - dt) <= 0 && particles.length < 400) {
            c.sp = 3 + Math.random() * 3;
            particles.push({ x: c.x + (Math.random() - 0.5) * 6 * c.s, y: c.y, vx: (Math.random() - 0.5) * 1.2 - speed * 0.5, vy: -c.vy * 0.15 + (Math.random() - 0.5) * 0.8, color: Math.random() < 0.5 ? '#FFD0D5' : '#FF4D5E', alpha: 0.9, size: 1 + Math.random() * 1.3, decay: 0.045, isStar: true });
        }
        let gone = c.x < -30 || c.y > height + 20 || c.y < -20;
        if (!gone) {   // долетел до противоположной трубы — уходит в неё
            for (const p of pipes) {
                if (c.x <= p.x || c.x >= p.x + p.width) continue;
                if (c.d > 0 && c.y + rr * 0.4 > height - (p.bottom + squeeze)) { c.y = height - (p.bottom + squeeze); c.sq = 0.01; break; }
                if (c.d < 0 && c.y - rr * 0.4 < p.top + squeeze) { c.y = p.top + squeeze; c.sq = 0.01; break; }
            }
            if (c.sq) continue;
        }
        if (!gone && !shz && gameActive) {
            const d = Math.hypot(owl.x - c.x, owl.y - c.y);
            if (shieldTime > 0) {
                if (d < owl.radius * 1.45 + rr * 0.5) {   // щит отбивает кристалл
                    try { shieldBump(Math.atan2(c.y - owl.y, c.x - owl.x), 0.45); } catch (e) {}
                    crystalBurst(c.x, c.y, 6); gone = true;
                }
            } else if (invulnerableTime <= 0 && d < owl.radius * 0.85 + rr) {
                crystalBurst(c.x, c.y, 9); gone = true;
                crystalHit();
            }
        }
        if (gone) crystals.splice(i, 1);
    }
}
// попадание: свет ранит сову — минус пол-жизни
function crystalHit() {
    try { AudioFX.playHit(); Haptics.hit(); } catch (e) {}
    if (lives <= 1.0 + 1e-6) {   // меньше одной жизни не остаётся — это была последняя
        lives = 0; updateLivesHUD();
        handleRunFailure('Красная энергия ранила сову — это была последняя жизнь.');
        return;
    }
    lives = Math.round((lives - CRYSTAL.HIT_DMG) * 10) / 10;
    invulnerableTime = 70;
    updateLivesHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
    try { spawnFlyingArrivalFX(owl.x, owl.y, 'other', 'Энергия ранит: -0.5 Жизни', CRYSTAL.COLOR, 'fa-heart-crack'); } catch (e) {}
}
