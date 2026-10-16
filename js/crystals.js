// ===== Эффект «Шипы» (в коде — crystal) =====
// Редкий значок «опасность». Берём — 10 секунд шляпки труб плавно краснеют, а из каждой трубы впереди вылетают маленькие
// шипастые шарики: то сверху вниз, то снизу вверх. Сколько на трубу — по сложности: Суперлайт/Лайт — 1, Медиум/Медиум+ — 2, Хард/Хард+ — 3.
// Попадание снимает пол-жизни. Щит шипы отбивает; в ШАЗАМе они не страшны (сова проходит сквозь).
// Выпадение (админка «Шипы»): по умолчанию один раз на каждые два уровня сложности; чаще — раз за уровень; максимум — дважды за уровень.
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
    return { target: 'other', text: `Шипы ${CRYSTAL.SEC}с`, color: CRYSTAL.COLOR, icon: 'fa-triangle-exclamation' };
}

// ---- рисование ----
// шипастый шарик: красное ядро с бликом и 8 острых шипов вокруг (симметричный — как ни крутится, выглядит ровно)
let __spkSpr = null;
function crystalSprite() {
    if (__spkSpr) return __spkSpr;
    const S = 3, W = 30, c = document.createElement('canvas'); c.width = c.height = W * S;
    const g = c.getContext('2d');
    g.scale(S, S); g.translate(W / 2, W / 2);
    const R = 12.5, r0 = 6.4, n = 8;
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r0 : R;
        i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = '#B3122A'; g.fill();
    g.strokeStyle = '#5E0010'; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
    const b = g.createRadialGradient(-2.2, -2.4, 0.5, 0, 0, 7.5);
    b.addColorStop(0, '#FFB3BA'); b.addColorStop(0.35, '#FF4D5E'); b.addColorStop(1, '#8E0A1C');
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 7.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(70, 0, 12, 0.8)'; g.lineWidth = 0.8; g.stroke();
    return (__spkSpr = c);
}
function drawCrystals() {
    if (!crystals.length) return;
    const sp = crystalSprite(), ghost = typeof shazamBusy === 'function' && shazamBusy();
    ctx.save();
    for (const c of crystals) {
        const s = 20 * c.s;
        ctx.globalAlpha = (ghost ? 0.3 : 1) * Math.min(1, c.age / 8);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.drawImage(sp, -s / 2, -s / 2, s, s);
        ctx.restore();
    }
    ctx.restore();
}

// ---- логика ----
function crystalBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.8 + Math.random() * 2.6;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, color: Math.random() < 0.5 ? '#FF8A95' : '#C8102E', alpha: 0.95, size: 1.6 + Math.random() * 1.8, decay: 0.05, isStar: true });
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
                let t = 4 + Math.random() * 14;
                p._cQ = dirs.map((d, k) => { const q = { t, d, k }; t += 22 + Math.random() * 22; return q; });
            }
            if (!p._cQ || !p._cQ.length) continue;
            for (const q of p._cQ) q.t -= dt;
            while (p._cQ.length && p._cQ[0].t <= 0) {
                const q = p._cQ.shift(), fx = (q.k + 0.3 + Math.random() * 0.4) / N;
                const x = p.x + 9 + fx * (p.width - 18);
                if (q.d > 0) crystals.push({ x, y: p.top + squeeze - 3, d: 1, vy: 1.0 + Math.random() * 0.8, s: 0.8 + Math.random() * 0.25, rot: Math.random() * 6.28, vr: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.03), age: 0 });
                else crystals.push({ x, y: height - (p.bottom + squeeze) + 3, d: -1, vy: -(1.0 + Math.random() * 0.8), s: 0.8 + Math.random() * 0.25, rot: Math.random() * 6.28, vr: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.03), age: 0 });
            }
        }
    }
    for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.age += dt; c.x -= speed * dt;
        c.vy = c.d > 0 ? Math.min(5.6, c.vy + 0.075 * dt) : Math.max(-5.6, c.vy - 0.075 * dt); c.y += c.vy * dt; c.rot += c.vr * dt;
        const rr = 6.5 * c.s;
        let gone = c.x < -30 || c.y > height + 20 || c.y < -20;
        if (!gone) {   // долетел до противоположной трубы — разбивается о неё
            for (const p of pipes) {
                if (c.x <= p.x || c.x >= p.x + p.width) continue;
                if ((c.d > 0 && c.y + rr > height - (p.bottom + squeeze)) || (c.d < 0 && c.y - rr < p.top + squeeze)) { crystalBurst(c.x, c.y, 5); gone = true; break; }
            }
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
        handleRunFailure('Шип ранил сову — это была последняя жизнь.');
        return;
    }
    lives = Math.round((lives - CRYSTAL.HIT_DMG) * 10) / 10;
    invulnerableTime = 70;
    updateLivesHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
    try { spawnFlyingArrivalFX(owl.x, owl.y, 'other', 'Шипы ранят: -0.5 Жизни', CRYSTAL.COLOR, 'fa-heart-crack'); } catch (e) {}
}
