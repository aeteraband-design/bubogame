// ===== Эффект «Кристаллы» =====
// Очень редкий значок (кристалл с шипами). Берём — 10 секунд из верхних труб падают светящиеся кристаллы.
// Совы — ночные, свет ранит: попадание снимает пол-жизни. Щит кристаллы отбивает; в ШАЗАМе они не страшны (сова проходит сквозь).
// Выпадение: за каждую собранную тему — небольшой шанс; если за 30 тем значок не выпал, он выпадет обязательно.
const CRYSTAL = { SEC: 10, THEME_CHANCE: 0.02, FORCE_AFTER: 30, COLOR: '#8FE9FF', HIT_DMG: 0.5 };
let crystalTime = 0;          // сколько кадров ещё идёт эффект
let crystals = [];            // падающие кристаллы
let crystalThemeCount = 0;    // тем собрано с прошлого значка
let crystalPending = false;   // следующий подходящий значок на пути будет кристаллом

// каждую собранную тему считаем: шанс небольшой, но не реже одного раза за FORCE_AFTER тем
function crystalOnTheme() {
    if (crystalPending || crystalTime > 0) return;
    crystalThemeCount++;
    if (crystalThemeCount >= CRYSTAL.FORCE_AFTER || Math.random() < CRYSTAL.THEME_CHANCE) { crystalPending = true; crystalThemeCount = 0; }
}
function crystalReset() { crystalTime = 0; crystals.length = 0; }

// значок взят: включаем эффект
function registerCrystal() {
    if (typeof shazamBusy === 'function' && shazamBusy()) return null;   // в ШАЗАМе не действует
    crystalTime = CRYSTAL.SEC * 60;
    try { AudioFX.playStarCollect(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Кристаллы ${CRYSTAL.SEC}с`, color: CRYSTAL.COLOR, icon: 'svg-crystal' };
}

// ---- рисование ----
// кристалл с шипами: вытянутая восьмиконечная «звезда» с гранями (светлые и тёмные треугольники)
function crystalPoints(r) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        const k = i % 2 ? 0.34 : (i % 4 === 0 ? 1.0 : 0.62);
        pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
    }
    return pts;
}
function crystalDrawShape(g, r) {
    const p = crystalPoints(r);
    for (let i = 0; i < 8; i++) {
        const a = p[i], b = p[(i + 1) % 8];
        g.fillStyle = i % 2 ? '#7FE3FF' : (i < 4 ? '#F4FEFF' : '#BDF3FF');
        g.beginPath(); g.moveTo(0, 0); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(255, 255, 255, 0.9)'; g.lineWidth = Math.max(0.5, r * 0.07); g.lineJoin = 'round';
    g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke();
}
let __crySpr = null;
function crystalSprite() {
    if (__crySpr) return __crySpr;
    const S = 3, W = 40, c = document.createElement('canvas'); c.width = c.height = W * S;
    const g = c.getContext('2d');
    g.scale(S, S); g.translate(W / 2, W / 2);
    const h = g.createRadialGradient(0, 0, 2, 0, 0, W / 2);    // ореол — как будто он светится сам
    h.addColorStop(0, 'rgba(210, 252, 255, 0.85)'); h.addColorStop(0.35, 'rgba(120, 225, 255, 0.4)'); h.addColorStop(1, 'rgba(80, 190, 255, 0)');
    g.fillStyle = h; g.beginPath(); g.arc(0, 0, W / 2, 0, Math.PI * 2); g.fill();
    crystalDrawShape(g, 9.5);
    return (__crySpr = c);
}
// значок на пути и в предпросмотре: пульсирующий светящийся кристалл (вызывается из drawToken, начало координат — центр значка)
function drawCrystalIcon(c, t, ph) {
    const sp = crystalSprite(), k = 1 + 0.06 * Math.sin(t * 3 + (ph || 0)), s = 31 * k;
    c.save(); c.rotate(Math.sin(t * 1.3 + (ph || 0)) * 0.12);
    c.drawImage(sp, -s / 2, -s / 2, s, s);
    c.restore();
}
function drawCrystals() {
    if (!crystals.length) return;
    const sp = crystalSprite(), ghost = typeof shazamBusy === 'function' && shazamBusy();
    ctx.save();
    for (const c of crystals) {
        const s = 22 * c.s;
        ctx.globalAlpha = (ghost ? 0.3 : 1) * Math.min(1, c.age / 8);
        // световой след сверху: кристалл падает, оставляя за собой тающую полоску света
        const len = Math.min(46, 8 + c.vy * 7) * c.s;
        const tg = ctx.createLinearGradient(0, c.y - len, 0, c.y);
        tg.addColorStop(0, 'rgba(160, 240, 255, 0)'); tg.addColorStop(1, 'rgba(190, 248, 255, 0.55)');
        ctx.fillStyle = tg; ctx.fillRect(c.x - 1.2 * c.s, c.y - len, 2.4 * c.s, len);
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
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, color: Math.random() < 0.5 ? '#E8FDFF' : '#7FE3FF', alpha: 0.95, size: 1.6 + Math.random() * 1.8, decay: 0.05, isStar: true });
    }
}
// вызывается каждый кадр после движения труб: speed — скорость, с которой уезжают трубы, squeeze — текущее сужение проёма
function crystalUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    if (shz) crystalTime = 0;
    if (crystalTime > 0) {
        crystalTime -= dt;
        for (const p of pipes) {
            if (p.x + p.width < owl.x - 30 || p.x > width - 10) continue;   // только трубы впереди на экране
            if (p._cT === undefined) p._cT = 6 + Math.random() * 30;
            p._cT -= dt;
            if (p._cT <= 0) {
                p._cT = 26 + Math.random() * 44;   // примерно раз в 0,5–1,2 с с каждой трубы
                crystals.push({ x: p.x + 9 + Math.random() * (p.width - 18), y: p.top + squeeze - 3, vy: 1.0 + Math.random() * 0.8, s: 0.85 + Math.random() * 0.5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.12, age: 0 });
            }
        }
    }
    for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.age += dt; c.x -= speed * dt;
        c.vy = Math.min(5.6, c.vy + 0.075 * dt); c.y += c.vy * dt; c.rot += c.vr * dt;
        const rr = 6.5 * c.s;
        let gone = c.x < -30 || c.y > height + 20;
        if (!gone) {   // долетел до нижней трубы — разбивается о неё
            for (const p of pipes) {
                if (c.x > p.x && c.x < p.x + p.width && c.y + rr > height - (p.bottom + squeeze)) { crystalBurst(c.x, c.y, 5); gone = true; break; }
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
        handleRunFailure('Свет кристалла ранил сову — это была последняя жизнь.');
        return;
    }
    lives = Math.round((lives - CRYSTAL.HIT_DMG) * 10) / 10;
    invulnerableTime = 70;
    updateLivesHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
    try { spawnFlyingArrivalFX(owl.x, owl.y, 'other', 'Свет ранит: -0.5 Жизни', '#8FE9FF', 'fa-heart-crack'); } catch (e) {}
}
