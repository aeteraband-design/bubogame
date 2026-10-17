// ===== ШАЗАМ (тестовая фишка) =====
// Каждое второе взятое ускорение само включает ШАЗАМ (без кнопки). Щит не участвует.
// Зарядка ~1 с прямо в полёте: сова летит как обычно (тапать можно), искры стягиваются к ней, игра плавно разгоняется.
// Потом вспышка, и 15 секунд сова мчится заметно быстрее обычного ускорения, пролетает трубы то за ними, то перед ними,
// а все значки впереди сами притягиваются к ней, как магнитом.
const SHZ = {
    count: 0, state: 'idle', t: 0, left: 0, armUntil: 0,
    INTRO: 60, DUR: 900, FADE: 300,   // всего 20 с: 15 с в полную силу + 5 с плавного спада (скорость и свечение снижаются, звучат «дзинь»)
      // FADE — после 15 с ещё 2,5 с эффект гаснет (молнии затухают), сова всё ещё пролетает трубы
                  // кадры (60 в секунду): 1 с зарядки и 15 с эффекта
    k: 0, shieldK: 0, blur: 0, slow: 1, dx: 0,
    depthBack: 0, depthFront: 0, sideN: 0,
    b: null, lastHalf: 0,
    streaks: [], rings: [], bolts: [], boltT: 0, sparks: [], magOn: 0
};
function shazamActive() { return SHZ.state === 'active'; }
function shazamBusy() { return SHZ.state === 'intro' || SHZ.state === 'active'; }
function shazamBlocksTap() { return false; }   // сова всегда слушается тапов
function shazamSecLeft() { return SHZ.state === 'active' ? Math.ceil(Math.max(0, SHZ.left) / 60) : (SHZ.state === 'intro' ? Math.ceil((SHZ.DUR + SHZ.FADE) / 60) : 0); }
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
let shzBtnSig = '';
function shazamSyncBtn() {
    const sig = SHZ.state;
    if (sig === shzBtnSig && shzBtn) return;   // ничего не поменялось — интерфейс не трогаем (вызывается каждый кадр)
    shzBtnSig = sig;
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
function shzEvery() { return Math.max(1, (typeof ADMIN_CFG !== 'undefined' && ADMIN_CFG.shazamEvery) || 4); }   // меняется в админке
function shazamOnSpeedup() {
    if (shazamBusy()) { speedBoostTime = 0; return false; }   // во время ШАЗАМа ускорения не считаются
    SHZ.count++;
    if (SHZ.count % shzEvery() === 0 && SHZ.state === 'idle') { shazamStart(); return true; }
    return false;
}
// следующее взятое ускорение включит ШАЗАМ — такие значки на пути искрят молниями
function shazamNextCharged() { return SHZ.state === 'idle' && gameActive && (SHZ.count + 1) % shzEvery() === 0; }
// контур значка «молния» (fa-bolt-lightning, 23px) — от него искрят разряды
const SHZ_GLYPH = [[-1.5, -10.5], [-4.5, -3], [6.5, -3], [-2.5, 10.5]];
function shzGlyphPoint() {
    const k = Math.floor(Math.random() * 3), t = Math.random(), A = SHZ_GLYPH[k], B = SHZ_GLYPH[k + 1];
    return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
}
function shazamDrawItemCharge(it) {
    // разряды: короткий треск прямо по молнии + дуга от молнии к кольцу значка (как в плазменном шаре)
    const now = performance.now(), Rr = it.radius - 1.5;
    if (!it.shzBolts || now > (it.shzBoltT || 0)) {
        it.shzBoltT = now + 55 + Math.random() * 75;
        it.shzBolts = [];
        // треск вокруг молнии
        for (let i = 0; i < 2; i++) {
            let [x, y] = shzGlyphPoint();
            const a = Math.random() * Math.PI * 2, pts = [[x, y]];
            for (let k = 1; k <= 3; k++) { x += Math.cos(a) * 2.4 + (Math.random() - 0.5) * 2.6; y += Math.sin(a) * 2.4 + (Math.random() - 0.5) * 2.6; pts.push([x, y]); }
            it.shzBolts.push({ pts, w: 0.9 });
        }
        // дуга к кольцу
        if (Math.random() < 0.75) {
            const [x0, y0] = shzGlyphPoint(), a = Math.atan2(y0, x0) + (Math.random() - 0.5) * 0.8;
            const x1 = Math.cos(a) * Rr, y1 = Math.sin(a) * Rr, pts = [];
            for (let k = 0; k <= 5; k++) { const t = k / 5, j = (k && k < 5) ? (Math.random() - 0.5) * 3.2 : 0; pts.push([x0 + (x1 - x0) * t - (y1 - y0) / Rr * j, y0 + (y1 - y0) * t + (x1 - x0) / Rr * j]); }
            it.shzBolts.push({ pts, w: 1.1 });
        }
    }
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = '#FF7A00'; ctx.shadowBlur = 7;
    for (const b of it.shzBolts) {
        ctx.globalAlpha = 0.65 + 0.35 * Math.random();
        ctx.strokeStyle = '#FFF1D6'; ctx.lineWidth = b.w;
        ctx.beginPath();
        b.pts.forEach(([x, y], k) => { if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
    }
    ctx.restore();
}

function shazamStart() {
    SHZ.state = 'intro'; SHZ.t = 0;
    shazamClearEffects();   // ШАЗАМ отменяет все текущие эффекты — их таймеры тают
    try { AudioFX.playShazamCharge(); Haptics.powerup(); } catch (e) {}
    shazamSyncBtn();
}

function shazamLaunch() {
    SHZ.state = 'active'; SHZ.left = SHZ.DUR + SHZ.FADE; SHZ.t = 0; SHZ.sideN = 0;
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
    // трубы, которые уже рядом (сова их облетала или вот-вот облетит), до конца пролетаются насквозь — врезаться можно только в новые
    for (const p of pipes) if (p.x < owl.x + 220) p.shzPass = true;
    try { AudioFX.playShazamPowerDown(); AudioFX.onSpeedChanged(); } catch (e) {}   // эффект кончился совсем — последний звук
}

function shazamReset() {
    SHZ.state = 'idle'; SHZ.t = 0; SHZ.left = 0; SHZ.k = 0; SHZ.shieldK = 0; SHZ.blur = 0; SHZ.slow = 1; SHZ.dx = 0;
    SHZ.depthBack = SHZ.depthFront = 0; SHZ.streaks.length = 0; SHZ.rings.length = 0; SHZ.bolts.length = 0; SHZ.sparks.length = 0; SHZ.magOn = 0;
    shazamSyncBtn();
}

// множитель скорости игры на время зарядки (почти стоп) и цель ускорения на время эффекта
function shazamSpeedMul() { return SHZ.slow; }
function shazamGsTarget() {   // в спаде скорость ступеньками по 0,1 плавно сходит с 2,0 до 1,3
    if (SHZ.state !== 'active') return 0;
    return Math.round((2.0 - 0.7 * (SHZ.warn || 0)) * 10) / 10;
}   // обычное ускорение — 1,3

function shazamAddStreak(burst) {
    SHZ.streaks.push({ x: width + Math.random() * width * (burst ? 0.6 : 0.2), y: height * (0.08 + Math.random() * 0.84),
        len: 40 + Math.random() * 90, v: 18 + Math.random() * 14, a: (burst ? 0.35 : 0.18) * (0.5 + Math.random() * 0.5) });
}

// все таймерные эффекты — в ноль (в ШАЗАМе он один)
function shazamClearEffects() {
    shieldTime = 0; shieldAppearAnim = 0; infiniteStaminaTime = 0; compressionTime = 0;
    speedBoostTime = 0; slowMotionTime = 0; overeatTime = 0; drunkTime = 0; freezeTime = 0;   // «Опасные трубы» и «Водонапор» не сбрасываются: ШАЗАМ сбивает огоньки и прорезает воду
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
        // последние 5 с — «дзинь» каждую секунду (всё ниже), а когда эффект кончился совсем — звук «выключения» (в shazamEnd)
        const l0 = SHZ.left + dtMult;
        for (let n = 5; n >= 1; n--) { const at = n * 60; if (l0 > at && SHZ.left <= at) { try { AudioFX.playShazamWarn(n); } catch (e) {} SHZ.blink = 1; } }
        if (SHZ.left <= 0) shazamEnd();
    }
    // спад: 0 → 1 за последние 5 с
    SHZ.warn = SHZ.state === 'active' ? Math.max(0, Math.min(1, 1 - SHZ.left / SHZ.FADE)) : 0;
    SHZ.blink = Math.max(0, (SHZ.blink || 0) - dtMult / 14);

    // плавные величины для рисования
    const on = SHZ.state === 'active', intro = SHZ.state === 'intro';
    const ease = (v, tgt, sp) => v + (tgt - v) * Math.min(1, sp * dtMult);
    // к концу свечение слабеет и на каждой из последних секунд коротко «проседает» — видно, что заряд кончается
    const kOn = (1 - 0.85 * SHZ.warn) * (1 - 0.5 * SHZ.blink);
    SHZ.k = ease(SHZ.k, on ? kOn : (intro ? 0.35 + 0.65 * Math.min(1, SHZ.t / SHZ.INTRO) : 0), SHZ.warn > 0 ? 0.3 : (on || intro ? 0.08 : 0.04));
    SHZ.shieldK = 0;   // щит в ШАЗАМе не меняется
    SHZ.blur = ease(SHZ.blur, on ? (SHZ.t < 50 ? 1 : 0.55 * (1 - SHZ.warn)) : 0, on ? 0.1 : 0.04);

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
    shazamUpdateSparks();
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
    shazamDrawSparks();
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
    if (it.x < owl.x - 30 || it.x > owl.x + width * 0.95) { it.mag = 0; return; }
    if (d > 165) {
        // значок уже виден, но ещё далеко: он стоит на месте, а от него к сове понемногу тянутся звёздочки — чем ближе, тем больше
        it.mag = 0;
        const near = Math.max(0, Math.min(1, 1 - (d - 165) / Math.max(60, width * 0.95 - 165)));
        it.shzSpT = (it.shzSpT || 0) - dtMult;
        if (it.shzSpT <= 0 && SHZ.sparks.length < 110) {
            it.shzSpT = 14 - 10 * near + Math.random() * 4;
            const side = (Math.random() - 0.5) * it.radius * 1.2, nx = -dy / d, ny = dx / d;
            shazamAddSpark(it.x + nx * side, it.y + ny * side, dx / d, dy / d, 0.8 + 0.8 * near, 0.45 + 0.55 * near, shzItemCol(it));
        }
        if (near > 0.5) { SHZ.magOn = Math.max(SHZ.magOn, 3); SHZ.magCol = shzItemCol(it); }
        return;
    }
    it.mag = Math.min(1, (it.mag || 0) + 0.035 * dtMult);
    const step = Math.min(d, (0.8 + 6.5 * it.mag * it.mag) * dtMult);   // разгоняется к сове плавно
    const mx = dx / (d || 1) * step, my = dy / (d || 1) * step;
    it.x += mx; it.y += my; it.baseY = (it.baseY || it.y) + my;
    it.centerX = it.x; it.centerY = it.y;
    // сова — магнит: от значка к сове тянется поток звёздочек, и сами звёздочки стягиваются к сове со всех сторон
    it.shzSpT = (it.shzSpT || 0) - dtMult;
    if (it.shzSpT <= 0 && SHZ.sparks.length < 110) {
        it.shzSpT = 1.6 - 0.8 * it.mag;
        const t = Math.random() * 0.35, side = (Math.random() - 0.5) * it.radius * 1.4;
        const nx = -dy / (d || 1), ny = dx / (d || 1);
        shazamAddSpark(it.x + dx * t + nx * side, it.y + dy * t + ny * side, dx / (d || 1), dy / (d || 1), 1.6 + 1.4 * it.mag, 1, shzItemCol(it));
    }
    SHZ.magCol = shzItemCol(it);
    SHZ.magOn = 6;   // пока хоть что-то притягивается — вокруг совы тоже стягиваются искры
}
// звёздочки притяжения — в цвет значка (часть чуть светлее, чтобы мерцали)
function shzItemCol(it) {
    if (it.type === 'speedup' && typeof shazamNextCharged === 'function' && shazamNextCharged()) return '#FF7A00';
    return ((typeof CATEGORIES !== 'undefined' && CATEGORIES[it.type]) || {}).color || '#FFB25C';
}
const __shzLight = {};
function shzLight(c) {
    if (__shzLight[c]) return __shzLight[c];
    const n = parseInt(c.slice(1), 16), m = (v) => Math.round(v + (255 - v) * 0.55);
    return (__shzLight[c] = 'rgb(' + m(n >> 16 & 255) + ',' + m(n >> 8 & 255) + ',' + m(n & 255) + ')');
}
function shazamAddSpark(x, y, ux, uy, sp, al, col) {
    col = col || '#FFB25C';
    SHZ.sparks.push({ a: al || 1, hc: col,
        x, y, vx: ux * sp + (Math.random() - 0.5) * 0.8, vy: uy * sp + (Math.random() - 0.5) * 0.8,
        s: 2 + Math.random() * 1.8, life: 1, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
        c: Math.random() < 0.4 ? shzLight(col) : col
    });
}
function shazamUpdateSparks() {
    // кольцо стягивающихся к сове искр, пока работает магнит
    if (SHZ.magOn > 0) {
        SHZ.magOn -= dtMult;
        if (SHZ.sparks.length < 110 && Math.random() < 0.55 * dtMult) {
            const a = Math.random() * Math.PI * 2, r = owl.radius * (2.1 + Math.random() * 0.9);
            shazamAddSpark(owl.x + Math.cos(a) * r, owl.y + Math.sin(a) * r, -Math.cos(a), -Math.sin(a), 0.9, 1, SHZ.magCol);
        }
    }
    const sp = SHZ.sparks, R0 = owl.radius * 0.55;
    for (let i = sp.length - 1; i >= 0; i--) {
        const p = sp[i];
        // каждую звёздочку тянет к сове всё сильнее
        const dx = owl.x - p.x, dy = owl.y - p.y, d = Math.hypot(dx, dy) || 1;
        const acc = 0.55 * dtMult;
        p.vx = (p.vx + dx / d * acc) * Math.pow(0.93, dtMult);
        p.vy = (p.vy + dy / d * acc) * Math.pow(0.93, dtMult);
        p.x += p.vx * dtMult; p.y += p.vy * dtMult; p.rot += p.vr * dtMult;
        p.life -= 0.012 * dtMult;
        if (d < R0) p.life -= 0.25 * dtMult;   // долетела до совы — гаснет в ней
        if (p.life <= 0) { sp[i] = sp[sp.length - 1]; sp.pop(); }
    }
}
// звёздочка с четырьмя лучами (без кружков), мерцает и тает
function shazamDrawSparks() {
    const sp = SHZ.sparks; if (!sp.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of sp) {
        const k = p.life, tw = 0.75 + 0.25 * Math.sin(p.rot * 9), s = p.s * (0.5 + 0.5 * k) * tw, w = s * 0.22;
        ctx.globalAlpha = Math.min(1, k * 2) * 0.95 * (p.a || 1);
        if (typeof tokenHalo === 'function') { const g = s * 2.6; ctx.globalAlpha *= 0.55; ctx.drawImage(tokenHalo(p.hc), p.x - g, p.y - g, g * 2, g * 2); ctx.globalAlpha /= 0.55; }
        ctx.fillStyle = p.c;
        const c = Math.cos(p.rot), si = Math.sin(p.rot);
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
            const a = j * Math.PI / 4, r = (j % 2 === 0) ? s : w;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            const X = p.x + x * c - y * si, Y = p.y + x * si + y * c;
            if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}
