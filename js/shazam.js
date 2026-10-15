// ===== ШАЗАМ (тестовая фишка) =====
// Каждое второе взятое ускорение само включает ШАЗАМ (без кнопки). Щит не участвует.
// Зарядка ~1 с прямо в полёте: сова летит как обычно (тапать можно), искры стягиваются к ней, игра плавно разгоняется.
// Потом вспышка, и 15 секунд сова мчится заметно быстрее обычного ускорения, пролетает трубы то за ними, то перед ними,
// а все значки впереди сами притягиваются к ней, как магнитом.
const SHZ = {
    count: 0, state: 'idle', t: 0, left: 0, armUntil: 0,
    INTRO: 60, DUR: 900,               // кадры (60 в секунду): 1 с зарядки и 15 с эффекта
    k: 0, shieldK: 0, blur: 0, slow: 1, dx: 0,
    depthBack: 0, depthFront: 0, sideN: 0,
    b: null, lastHalf: 0,
    streaks: [], rings: [], bolts: [], boltT: 0
};
function shazamActive() { return SHZ.state === 'active'; }
function shazamBusy() { return SHZ.state === 'intro' || SHZ.state === 'active'; }
function shazamBlocksTap() { return false; }   // сова всегда слушается тапов
function shazamSecLeft() { return SHZ.state === 'active' ? Math.ceil(SHZ.left / 60) : (SHZ.state === 'intro' ? Math.ceil(SHZ.DUR / 60) : 0); }
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
    const show = false;   // кнопка пока не используется — ШАЗАМ включается сам
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

// ускорение взяли: каждое N-е само включает ШАЗАМ
const SHZ_EVERY = 2;
function shazamOnSpeedup() {
    if (shazamBusy()) { speedBoostTime = 0; return false; }   // во время ШАЗАМа ускорения не считаются
    SHZ.count++;
    if (SHZ.count % SHZ_EVERY === 0 && SHZ.state === 'idle') { shazamStart(); return true; }
    return false;
}
// следующее взятое ускорение включит ШАЗАМ — такие значки на пути искрят молниями
function shazamNextCharged() { return SHZ.state === 'idle' && gameActive && (SHZ.count + 1) % SHZ_EVERY === 0; }
function shazamDrawItemCharge(it) {
    // искры внутри значка, вокруг молнии
    const R = it.radius * 0.62, now = performance.now();
    if (!it.shzBolts || now > (it.shzBoltT || 0)) {
        it.shzBoltT = now + 60 + Math.random() * 70;
        it.shzBolts = [];
        const n = 1 + (Math.random() < 0.6 ? 1 : 0);
        for (let i = 0; i < n; i++) {
            const a0 = Math.random() * Math.PI * 2, len = 0.6 + Math.random() * 0.7, pts = [];
            for (let k = 0; k <= 5; k++) pts.push([a0 + len * k / 5, (Math.random() - 0.5) * 3.5]);
            it.shzBolts.push(pts);
        }
        it.shzSparks = [];
        for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, rr = it.radius * (0.35 + Math.random() * 0.4); it.shzSparks.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.8 + Math.random() * 1.1]); }
    }
    ctx.save();
    ctx.shadowColor = '#FF7A00'; ctx.shadowBlur = 7;
    ctx.globalAlpha = 0.7 + 0.3 * Math.random();
    ctx.strokeStyle = '#FFE6C2'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
    for (const pts of it.shzBolts) {
        ctx.beginPath();
        pts.forEach(([a, j], k) => { const rr = R + j; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
    }
    ctx.fillStyle = '#FFD08A';
    for (const [x, y, s] of it.shzSparks) { ctx.globalAlpha = 0.5 + 0.5 * Math.random(); ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}

function shazamStart() {
    SHZ.state = 'intro'; SHZ.t = 0;
    shazamClearEffects();   // ШАЗАМ отменяет все текущие эффекты — их таймеры тают
    try { AudioFX.playShazamCharge(); Haptics.powerup(); } catch (e) {}
    shazamSyncBtn();
}

function shazamLaunch() {
    SHZ.state = 'active'; SHZ.left = SHZ.DUR; SHZ.t = 0; SHZ.sideN = 0;
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

// все таймерные эффекты — в ноль (в ШАЗАМе он один)
function shazamClearEffects() {
    shieldTime = 0; shieldAppearAnim = 0; infiniteStaminaTime = 0; compressionTime = 0;
    speedBoostTime = 0; slowMotionTime = 0; overeatTime = 0; drunkTime = 0; freezeTime = 0;
}
// эти значки во время ШАЗАМа не появляются на пути, а взятые — не дают эффекта
const SHZ_BLOCKED = ['shield', 'slowmo', 'compress', 'speedup', 'icecream'];
function shazamBlockedType(t) { return shazamBusy() && SHZ_BLOCKED.includes(t); }

function shazamUpdate() {
    if (!gameActive) { shazamSyncBtn(); return; }
    if (shazamBusy()) shazamClearEffects();   // и всё, что могло прийти во время ШАЗАМа (например из рулетки), тоже не действует
    const st = SHZ.state;
    if ((st === 'ready' || st === 'armed') && speedBoostTime <= 0) { SHZ.state = 'idle'; }   // ускорение кончилось — кнопка уходит
    if (st === 'armed' && performance.now() > SHZ.armUntil) SHZ.state = 'ready';

    if (st === 'intro') {
        SHZ.t += dtMult;
        const T = Math.min(1, SHZ.t / SHZ.INTRO);
        // зарядка в полёте: искры со всех сторон стягиваются к сове, сзади тянется огненный хвост, игра уже разгоняется
        if (Math.random() < (0.35 + 0.9 * T) * dtMult) {
            const a = Math.random() * Math.PI * 2, R = 55 + Math.random() * 45, sp = 0.07 + 0.05 * T;
            particles.push({ x: owl.x + Math.cos(a) * R, y: owl.y + Math.sin(a) * R, vx: -Math.cos(a) * R * sp - 1, vy: -Math.sin(a) * R * sp + owl.vy * 0.5,
                color: Math.random() < 0.5 ? '#FFD08A' : '#FF7A00', alpha: 0.95, size: 2 + Math.random() * 2, decay: 0.06, isStar: true });
        }
        if (Math.random() < (0.3 + 0.7 * T) * dtMult) {
            particles.push({ x: owl.x - owl.radius * 0.8, y: owl.y + (Math.random() - 0.5) * owl.radius, vx: -2 - Math.random() * 3 * T, vy: (Math.random() - 0.5) * 0.6,
                color: Math.random() < 0.5 ? '#FFB347' : '#FF7A00', alpha: 0.85, size: 2 + Math.random() * 2.5, decay: 0.045, isStar: true });
        }
        if (Math.random() < 0.25 * T * dtMult) shazamAddStreak(false);
        if (SHZ.t >= SHZ.INTRO) shazamLaunch();
    }
    SHZ.slow = 1; SHZ.dx = 0;   // сова не замирает и не дёргается
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
        // облёт только когда сова реально летит в тело трубы; в проём — летит как обычно
        const r = owl.radius * 0.8;
        for (const p of pipes) {
            if (p.x > owl.x + 200 || p.x + p.width < owl.x - owl.radius - 30) { p.shzW = 0; continue; }
            const ahead = Math.max(0, p.x - owl.x) / Math.max(1, 2.24 * gameSpeedFactor);   // кадров до трубы
            const y = owl.y + owl.vy * Math.min(ahead, 10);   // чуть смотрим вперёд по траектории
            const hit = (y - r < p.top) || (y + r > p.top + p.gap) || (owl.y - r < p.top) || (owl.y + r > p.top + p.gap);
            if (hit && !p.shzSide) p.shzSide = (SHZ.sideN++ % 2 === 0) ? 'back' : 'front';
            p.shzW = (p.shzW || 0) + ((hit ? 1 : 0) - (p.shzW || 0)) * Math.min(1, 0.3 * dtMult);
            if (!p.shzSide) continue;
            const d = Math.abs(p.x + p.width / 2 - owl.x), W = p.width / 2 + owl.radius + 46;
            let w = Math.max(0, 1 - d / W); w = w * w * (3 - 2 * w); w *= p.shzW;
            if (p.shzSide === 'back') SHZ.depthBack = Math.max(SHZ.depthBack, w); else SHZ.depthFront = Math.max(SHZ.depthFront, w);
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
    const dx = owl.x - it.x, dy = owl.y - it.y, d = Math.hypot(dx, dy);
    if (d > 165 || it.x < owl.x - 30) { it.mag = 0; return; }   // притягивает, только когда сова подлетела поближе
    it.mag = Math.min(1, (it.mag || 0) + 0.035 * dtMult);
    const step = Math.min(d, (0.8 + 6.5 * it.mag * it.mag) * dtMult);   // разгоняется к сове плавно
    const mx = dx / (d || 1) * step, my = dy / (d || 1) * step;
    it.x += mx; it.y += my; it.baseY = (it.baseY || it.y) + my;
    it.centerX = it.x; it.centerY = it.y;
}
