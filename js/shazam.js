// ===== ШАЗАМ (тестовая фишка) =====
// Каждое второе взятое ускорение даёт кнопку «ШАЗАМ» (пока идёт это ускорение). 1-й тап — «ПУСК», 2-й — запуск. Щит не участвует.
// Зарядка 1,6 с: игра почти замирает, сова дрожит и набирает энергию (искры стягиваются к ней, вокруг молнии).
// Потом рывок вперёд, и 10 секунд сова мчится заметно быстрее обычного ускорения, пролетает трубы то за ними, то перед ними,
// а все значки впереди сами притягиваются к ней, как магнитом.
const SHZ = {
    count: 0, state: 'idle', t: 0, left: 0, armUntil: 0,
    INTRO: 96, DUR: 600,               // кадры (60 в секунду): 1,6 с зарядки и 10 с эффекта
    k: 0, shieldK: 0, blur: 0, slow: 1, dx: 0,
    depthBack: 0, depthFront: 0, sideN: 0,
    b: null, lastHalf: 0,
    streaks: [], rings: [], bolts: [], boltT: 0
};
function shazamActive() { return SHZ.state === 'active'; }
function shazamBusy() { return SHZ.state === 'intro' || SHZ.state === 'active'; }
function shazamBlocksTap() { return SHZ.state === 'intro'; }
function shazamSecLeft() { return SHZ.state === 'active' ? Math.ceil(SHZ.left / 60) : 0; }
function shazamOwlBehind() { return SHZ.depthBack > 0.02; }

// ---- кнопка ----
let shzBtn = null;
function shazamBtnEl() {
    if (shzBtn) return shzBtn;
    const host = document.getElementById('bottomHud'); if (!host) return null;
    shzBtn = document.createElement('button');
    shzBtn.id = 'shazamBtn'; shzBtn.type = 'button'; shzBtn.className = 'shz-btn';
    shzBtn.innerHTML = '<i class="fa-solid fa-bolt"></i><span class="shz-lbl">ШАЗАМ</span>';
    const stop = (e) => { e.stopPropagation(); };
    shzBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); shazamTap(); });
    ['touchstart', 'mousedown', 'click'].forEach(ev => shzBtn.addEventListener(ev, stop));
    host.appendChild(shzBtn);
    return shzBtn;
}
function shazamSyncBtn() {
    const b = shazamBtnEl(); if (!b) return;
    const show = gameActive && (SHZ.state === 'ready' || SHZ.state === 'armed');
    b.classList.toggle('show', show);
    b.classList.toggle('armed', SHZ.state === 'armed');
    const lbl = b.querySelector('.shz-lbl'), txt = SHZ.state === 'armed' ? 'ПУСК' : 'ШАЗАМ';
    if (lbl && lbl.textContent !== txt) lbl.textContent = txt;
}
function shazamTap() {
    if (!gameActive) return;
    if (SHZ.state === 'ready') {
        SHZ.state = 'armed'; SHZ.armUntil = performance.now() + 3500;   // не нажали второй раз за 3,5 с — кнопка снова «спит»
        try { AudioFX.playShazamArm(); Haptics.vibrate(10); } catch (e) {}
    } else if (SHZ.state === 'armed') {
        shazamStart();
    }
    shazamSyncBtn();
}

// ускорение взяли: каждое второе даёт кнопку
function shazamOnSpeedup() {
    SHZ.count++;
    if (SHZ.count % 2 === 0 && SHZ.state === 'idle') { SHZ.state = 'ready'; shazamSyncBtn(); }
}

function shazamStart() {
    SHZ.state = 'intro'; SHZ.t = 0;
    SHZ.b = { y0: Math.max(owl.radius * 2, Math.min(height - owl.radius * 2, owl.y)) };   // сова зависает на месте и заряжается
    try { AudioFX.playShazamCharge(); Haptics.powerup(); } catch (e) {}
    shazamSyncBtn();
}

function shazamLaunch() {
    SHZ.state = 'active'; SHZ.left = SHZ.DUR; SHZ.t = 0; SHZ.sideN = 0;
    owl.vy = -1.6; SHZ.dx = 18;
    SHZ.rings.push({ x: owl.x, y: owl.y, r: owl.radius * 1.2, a: 0.9 }, { x: owl.x, y: owl.y, r: owl.radius * 0.8, a: 0.6, slow: 1 });
    for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.55 + Math.random() * 0.9), v = 2 + Math.random() * 3.5;
        particles.push({ x: owl.x, y: owl.y, vx: Math.cos(a) * v - 1.5, vy: Math.sin(a) * v * 0.7, color: Math.random() < 0.5 ? '#FFB347' : '#FF7A00', alpha: 0.95, size: 3 + Math.random() * 2.5, decay: 0.035, isStar: true });
    }
    for (let i = 0; i < 10; i++) shazamAddStreak(true);
    try { AudioFX.playShazamLaunch(); AudioFX.onSpeedChanged(); Haptics.powerup(); } catch (e) {}
}

function shazamEnd() {
    SHZ.state = 'idle'; SHZ.left = 0;
    // если эффект кончился, когда сова внутри трубы, — даём секунду неуязвимости, чтобы спокойно вылететь
    for (const p of pipes) if (owl.x + owl.radius > p.x && owl.x - owl.radius < p.x + p.width) { invulnerableTime = Math.max(invulnerableTime, 60); p.shieldPass = true; }
    try { AudioFX.playShazamEnd(); AudioFX.onSpeedChanged(); } catch (e) {}
}

function shazamReset() {
    SHZ.state = 'idle'; SHZ.t = 0; SHZ.left = 0; SHZ.k = 0; SHZ.shieldK = 0; SHZ.blur = 0; SHZ.slow = 1; SHZ.dx = 0;
    SHZ.depthBack = SHZ.depthFront = 0; SHZ.streaks.length = 0; SHZ.rings.length = 0; SHZ.bolts.length = 0;
    shazamSyncBtn();
}

// множитель скорости игры на время зарядки (почти стоп) и цель ускорения на время эффекта
function shazamSpeedMul() { return SHZ.slow; }
function shazamGsTarget() { return SHZ.state === 'active' ? 2.0 : 0; }   // обычное ускорение — 1,3

function shazamAddStreak(burst) {
    SHZ.streaks.push({ x: width + Math.random() * width * (burst ? 0.6 : 0.2), y: height * (0.08 + Math.random() * 0.84),
        len: 40 + Math.random() * 90, v: 18 + Math.random() * 14, a: (burst ? 0.35 : 0.18) * (0.5 + Math.random() * 0.5) });
}

function shazamUpdate() {
    if (!gameActive) { shazamSyncBtn(); return; }
    const st = SHZ.state;
    if ((st === 'ready' || st === 'armed') && speedBoostTime <= 0) { SHZ.state = 'idle'; }   // ускорение кончилось — кнопка уходит
    if (st === 'armed' && performance.now() > SHZ.armUntil) SHZ.state = 'ready';

    if (st === 'intro') {
        SHZ.t += dtMult;
        const T = Math.min(1, SHZ.t / SHZ.INTRO);
        // зарядка: сова висит и мелко дрожит всё сильнее, искры со всех сторон стягиваются к ней
        owl.vy = 0;
        owl.y = SHZ.b.y0 + Math.sin(SHZ.t * 0.9) * (0.6 + 2.2 * T);
        if (Math.random() < (0.35 + 0.9 * T) * dtMult) {
            const a = Math.random() * Math.PI * 2, R = 60 + Math.random() * 50, sp = 0.06 + 0.05 * T;
            particles.push({ x: owl.x + Math.cos(a) * R, y: owl.y + Math.sin(a) * R, vx: -Math.cos(a) * R * sp, vy: -Math.sin(a) * R * sp,
                color: Math.random() < 0.5 ? '#FFD08A' : '#FF7A00', alpha: 0.95, size: 2 + Math.random() * 2, decay: 0.06, isStar: true });
        }
        SHZ.slow += (0.1 - SHZ.slow) * Math.min(1, 0.18 * dtMult);   // игра почти замирает
        SHZ.dx += (-10 * Math.min(1, SHZ.t / 40) - SHZ.dx) * Math.min(1, 0.15 * dtMult);   // сова чуть оттягивается назад перед рывком
        if (SHZ.t >= SHZ.INTRO) shazamLaunch();
    } else {
        SHZ.slow += (1 - SHZ.slow) * Math.min(1, 0.12 * dtMult);
        SHZ.dx += (0 - SHZ.dx) * Math.min(1, 0.06 * dtMult);
    }
    if (SHZ.state === 'active') {
        SHZ.left -= dtMult; SHZ.t += dtMult;
        if (SHZ.left <= 0) shazamEnd();
    }

    // плавные величины для рисования
    const on = SHZ.state === 'active', intro = SHZ.state === 'intro';
    const ease = (v, tgt, sp) => v + (tgt - v) * Math.min(1, sp * dtMult);
    SHZ.k = ease(SHZ.k, on ? 1 : (intro ? 0.35 + 0.65 * Math.min(1, SHZ.t / SHZ.INTRO) : 0), on || intro ? 0.08 : 0.04);
    SHZ.shieldK = 0;   // щит в ШАЗАМе не меняется
    SHZ.blur = ease(SHZ.blur, on ? (SHZ.t < 50 ? 1 : 0.55) : 0, on ? 0.1 : 0.04);

    // трубы: по очереди — за трубой, перед трубой
    SHZ.depthBack = 0; SHZ.depthFront = 0;
    if (on) {
        let best = null, bd = 1e9;
        for (const p of pipes) {
            if (!p.shzSide && p.x < owl.x + 220 && p.x + p.width > owl.x - 20) p.shzSide = (SHZ.sideN++ % 2 === 0) ? 'back' : 'front';
            const d = Math.abs(p.x + p.width / 2 - owl.x);
            if (p.shzSide && d < bd) { bd = d; best = p; }
        }
        if (best) {
            const W = best.width / 2 + owl.radius + 46;
            let w = Math.max(0, 1 - bd / W); w = w * w * (3 - 2 * w);
            if (best.shzSide === 'back') SHZ.depthBack = w; else SHZ.depthFront = w;
        }
    }

    // полосы скорости и кольца рывка
    if (SHZ.blur > 0.05 && Math.random() < 0.35 * SHZ.blur * dtMult) shazamAddStreak(false);
    for (let i = SHZ.streaks.length - 1; i >= 0; i--) { const s = SHZ.streaks[i]; s.x -= s.v * dtMult; if (s.x + s.len < 0) SHZ.streaks.splice(i, 1); }
    for (let i = SHZ.rings.length - 1; i >= 0; i--) { const r = SHZ.rings[i]; r.r += (r.slow ? 3 : 5.5) * dtMult; r.a -= 0.045 * dtMult; if (r.a <= 0) SHZ.rings.splice(i, 1); }
    shazamSyncBtn();
}

// полосы скорости поверх города
function shazamDrawStreaks() {
    if (!SHZ.streaks.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1.3;
    for (const s of SHZ.streaks) {
        ctx.globalAlpha = s.a * Math.max(0.3, SHZ.blur);
        ctx.strokeStyle = '#FFC48A';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
    }
    ctx.restore();
}
// кольца рывка — поверх совы
function shazamDrawFx() {
    if (!SHZ.rings.length) return;
    ctx.save();
    for (const r of SHZ.rings) {
        ctx.globalAlpha = Math.max(0, r.a); ctx.strokeStyle = '#FF9A3C'; ctx.lineWidth = 2.2; ctx.shadowColor = '#FF7A00'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.25, r.r, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}

// молнии по контуру щита (в координатах совы, вокруг центра щита)
function shazamDrawShieldBolts(R, alpha, rotOff) {
    if (SHZ.k < 0.05) return;
    SHZ.boltT -= dtMult;
    if (SHZ.boltT <= 0 || !SHZ.bolts.length) {
        SHZ.boltT = 3 + Math.random() * 3;
        SHZ.bolts = [];
        const n = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
            const a0 = Math.random() * Math.PI * 2, len = 0.7 + Math.random() * 0.9, pts = [];
            for (let k = 0; k <= 7; k++) { const a = a0 + len * k / 7; pts.push([a, (Math.random() - 0.5) * 5]); }
            SHZ.bolts.push(pts);
        }
    }
    ctx.save();
    ctx.globalAlpha = alpha * SHZ.k * (0.6 + 0.4 * Math.random());
    ctx.strokeStyle = '#FFE6C2'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.shadowColor = '#FF7A00'; ctx.shadowBlur = 8;
    for (const pts of SHZ.bolts) {
        ctx.beginPath();
        pts.forEach(([a, j], k) => { const rr = R + j; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
    }
    ctx.restore();
}
// форма щита: спереди шире, сзади уже
function shazamShieldR(R, a) { return R * (1 + 0.22 * SHZ.shieldK * Math.cos(a)) * (1 - 0.08 * SHZ.shieldK * Math.abs(Math.sin(a)) * (Math.cos(a) < 0 ? 1 : 0)); }
function shazamShieldColor() {
    const k = SHZ.shieldK; if (k < 0.01) return '#22C55E';
    const a = [0x22, 0xC5, 0x5E], b = [0xFF, 0x7A, 0x00];
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')';
}

// для проверки из консоли: shazamTest() — сразу даёт кнопку (со щитом)
function shazamTest() { if (speedBoostTime <= 0) { speedBoostTime = ADMIN_CFG.speedSec * 60; AudioFX.onSpeedChanged(); } SHZ.state = 'ready'; shazamSyncBtn(); }

// магнит: в ШАЗАМе все значки впереди сами летят к сове
function shazamMagnet(it) {
    if (SHZ.state !== 'active' || it.collected) return;
    if (it.x < owl.x - 40 || it.x > owl.x + width * 0.75) return;
    it.mag = Math.min(1, (it.mag || 0) + 0.05 * dtMult);
    const f = Math.min(1, 0.16 * it.mag * dtMult), dx = (owl.x - it.x) * f, dy = (owl.y - it.y) * f;
    it.x += dx; it.y += dy; it.baseY = (it.baseY || it.y) + dy;
    it.centerX = it.x; it.centerY = it.y;
}
