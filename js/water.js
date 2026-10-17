// ===== Эффект «Водонапор» =====
// Редкий значок-капля (выпадает вместо «Опасных труб» — какой из двух, решает случай). Берём — 10 секунд из каждой верхней трубы
// непрерывно льётся поток воды вниз, в нижнюю трубу. Вода не ранит: сова, влетев телом в поток, чувствует напор — её сбивает вниз
// и она мокнет. Со сложностью поток шире и напор сильнее: на Суперлайте чуть-чуть, к Хард+ — сильно. Щит тоже сносит, но слабее;
// на ускорении сова режет воду и её почти не сбивает; в ШАЗАМе пробивает поток насквозь. Трубы цвет не меняют.
const WATERFX = { SEC: 10, COLOR: '#38BDF8', id: 0 };
let waterTime = 0;          // сколько кадров ещё идёт эффект
let waterStreams = [];      // потоки воды (каждый — свой набор капель)
let waterK = 0;             // (не используется для цвета труб)
function waterReset() { waterTime = 0; waterStreams.length = 0; waterK = 0; }

// значок взят: включаем эффект
function registerWater() {
    if (typeof shazamBusy === 'function' && shazamBusy()) return null;
    waterTime = WATERFX.SEC * 60; WATERFX.id++;
    try { AudioFX.playStarCollect(); AudioFX.playWaterStart(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Водонапор ${WATERFX.SEC}с`, color: WATERFX.COLOR, icon: 'fa-droplet' };
}

// поток из частиц: у трубы — плотная струя, ниже она распадается на капли-штрихи, которые падают и разбиваются о нижнюю трубу.
// Капли — настоящие: если на пути сова, они бьются об неё, разлетаются брызгами, а под совой остаётся «тень» без воды.
function drawWater() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        const x = p.x + s.fx * p.width, y0 = p.top + s.sq, w = s.w;
        // струя на выходе из трубы: короткий сплошной язык воды, книзу рвётся
        if (s.on) {
            const L = 16 + w * 0.6;
            const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
            g.addColorStop(0, 'rgba(190, 240, 255, 0.85)'); g.addColorStop(0.25, 'rgba(80, 190, 240, 0.7)'); g.addColorStop(0.6, 'rgba(60, 165, 230, 0.65)'); g.addColorStop(1, 'rgba(210, 248, 255, 0.9)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(x - w * 0.42, y0);
            for (let k = 0; k <= 6; k++) { const yy = y0 + L * k / 6; ctx.lineTo(x - w * (0.42 - 0.12 * k / 6) + Math.sin(t * 0.4 + k + s.ph) * 1.2 * k / 6, yy); }
            for (let k = 6; k >= 0; k--) { const yy = y0 + L * k / 6; ctx.lineTo(x + w * (0.42 - 0.12 * k / 6) + Math.sin(t * 0.37 + k * 1.3 + s.ph) * 1.2 * k / 6, yy); }
            ctx.closePath();
            ctx.save(); ctx.clip();
            ctx.fillRect(x - w, y0, w * 2, L);
            ctx.restore();
            // корона брызг на кромке трубы
            ctx.fillStyle = 'rgba(200, 244, 255, 0.85)';
            for (let k = 0; k < 4; k++) {
                const sx = x + (k - 1.5) * w * 0.3, sh = 1.5 + 1.8 * Math.abs(Math.sin(t * 0.25 + k * 1.3 + s.ph));
                ctx.beginPath(); ctx.ellipse(sx, y0 + 2, 1.4, sh, 0, 0, Math.PI * 2); ctx.fill();
            }
        }
        // капли: тёмно-голубой штрих (тело) + светлая сердцевина + белая головка — три прохода, чтобы не менять стиль на каждую каплю
        const D = s.drops;
        ctx.strokeStyle = 'rgba(56, 160, 230, 0.55)';
        ctx.beginPath();
        for (const d of D) { const dx = p.x + d.x, len = Math.min(16, d.vy * 1.7); ctx.moveTo(dx, d.y - len); ctx.lineTo(dx, d.y); }
        ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(175, 232, 255, 0.8)';
        ctx.beginPath();
        for (const d of D) { if (d.r < 0.9) continue; const dx = p.x + d.x, len = Math.min(13, d.vy * 1.4); ctx.moveTo(dx - 0.3, d.y - len); ctx.lineTo(dx - 0.3, d.y - 0.5); }
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(240, 252, 255, 0.95)';
        ctx.beginPath();
        for (const d of D) { const dx = p.x + d.x; ctx.moveTo(dx + d.r, d.y); ctx.arc(dx, d.y, d.r, 0, Math.PI * 2); }
        ctx.fill();
        // лужица брызг там, где вода бьёт в нижнюю трубу
        if (s.hitK > 0.05) {
            const yb = height - (p.bottom + s.sq);
            ctx.strokeStyle = `rgba(205, 244, 255, ${0.8 * s.hitK})`; ctx.lineWidth = 1.3;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a2 = -Math.PI / 2 + (k - 2.5) * 0.45, L2 = 3 + 4 * Math.abs(Math.sin(t * 0.35 + k * 1.7 + s.ph));
                const bx = x + (k - 2.5) * w * 0.12;
                ctx.moveTo(bx, yb); ctx.lineTo(bx + Math.cos(a2) * L2, yb + Math.sin(a2) * L2);
            }
            ctx.stroke();
        }
    }
    ctx.restore();
}
// таймер эффекта — синяя «водяная» плашка: по ней бегут волны и поднимаются пузырьки
(function () {
    try {
        const st = document.createElement('style');
        st.textContent = '.buff-tag[data-key="water"]{position:relative;overflow:hidden;background:linear-gradient(100deg,rgba(8,50,100,.96) 0%,rgba(24,110,185,.96) 25%,rgba(8,50,100,.96) 50%,rgba(24,110,185,.96) 75%,rgba(8,50,100,.96) 100%)!important;background-size:200% 100%!important;border-color:#7DD3FC!important;color:#E6F7FF!important;animation:wtrFlow 1.6s linear infinite,wtrGlow 1.8s ease-in-out infinite}'
            + '.buff-tag[data-key="water"] i{color:#9BE3FF!important;filter:drop-shadow(0 0 3px #38BDF8)}'
            + '.buff-tag[data-key="water"]::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.75) 0 1.1px,transparent 1.6px),radial-gradient(circle,rgba(255,255,255,.55) 0 0.9px,transparent 1.4px),radial-gradient(circle,rgba(255,255,255,.6) 0 1.3px,transparent 1.8px);background-size:23px 18px,31px 22px,41px 26px;background-position:3px 0,14px 6px,27px 11px;animation:wtrBubbles 2.2s linear infinite}'
            + '@keyframes wtrFlow{from{background-position:0% 0}to{background-position:200% 0}}'
            + '@keyframes wtrBubbles{from{background-position:3px 18px,14px 28px,27px 37px}to{background-position:3px 0,14px 6px,27px 11px}}'
            + '@keyframes wtrGlow{0%,100%{box-shadow:0 0 8px #38BDF899}50%{box-shadow:0 0 16px #7DD3FCEE}}';
        document.head.appendChild(st);
    } catch (e) {}
})();

function waterSplash(x, y, n) {
    for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 0.8 + Math.random() * 2.4;
        particles.push({ x: x + (Math.random() - 0.5) * 8, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: Math.random() < 0.5 ? '#D6F4FF' : '#5CC8F5', alpha: 0.85, size: 0.8 + Math.random() * 1.4, decay: 0.045 + Math.random() * 0.03 });
    }
}
// капля попала в сову: на теле появляется бусинка воды в месте удара (контур OWL_BODY_PTS, масштаб тела 1.29)
function waterWetOwl(hx, hy) {
    if (typeof STORM !== 'undefined') STORM.wet = Math.min(1, Math.max(STORM.wet || 0, 0.5) + 0.02);
    const P = (typeof OWL_BODY_PTS !== 'undefined') ? OWL_BODY_PTS.p : null; if (!P) return;
    const B = owl._wb || (owl._wb = []); if (B.length >= 16 || Math.random() > 0.35) return;
    const lx = (hx - owl.x) / 1.29, ly = (hy - owl.y) / 1.29;
    let bi = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) { const d = (P[i][0] - lx) ** 2 + (P[i][1] - ly) ** 2; if (d < bd) { bd = d; bi = i; } }
    B.push({ t: bi + Math.random() * 0.8, r: 0.3 + Math.random() * 0.35, age: 0, v: 0 });
}
function waterUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    if (shz) waterTime = 0;
    let lv = 0; try { lv = getDifficultyIndex(); } catch (e) {}
    if (waterTime > 0) {
        waterTime -= dt;
        if (waterTime <= 0 && !shz) { try { AudioFX.playWaterEnd(); } catch (e) {} }
        for (const p of pipes) {
            if (p.x + p.width < -40 || p.x > width + 40) continue;
            if (p._wId !== WATERFX.id) {   // у трубы — один поток по центру
                p._wId = WATERFX.id;
                waterStreams.push({ pipe: p, fx: 0.5, on: true, ph: Math.random() * 6.28, sq: squeeze, drops: [], acc: 0, hitK: 0 });
            }
        }
    }
    // со сложностью поток шире, капель больше и бьют они сильнее: Суперлайт — тонкая струйка, Хард+ — широкий тяжёлый поток
    const W = 12 + lv * 4.5, RATE = 1.6 + lv * 0.65, V0 = 3.2 + lv * 0.5, G = 0.32;
    // импульс одной капли: подобран так, чтобы весь поток давил на сову примерно с силой PUSH за кадр
    const PUSH = 0.1 + 0.07 * lv, IMP = PUSH / (RATE * 0.55);
    const R = shieldTime > 0 ? owl.radius * 1.4 : owl.radius * 0.95;
    let hits = 0;
    for (let i = waterStreams.length - 1; i >= 0; i--) {
        const s = waterStreams[i], p = s.pipe;
        s.sq = squeeze; s.w = W;
        if (s.on && waterTime <= 0) s.on = false;
        const cx = p.width * s.fx, y0 = p.top + squeeze, yb = height - (p.bottom + squeeze);
        // новые капли из трубы
        if (s.on) {
            s.acc += RATE * dt;
            while (s.acc >= 1) {
                s.acc -= 1;
                const u = (Math.random() + Math.random() - 1);   // гуще к центру
                s.drops.push({ x: cx + u * W * 0.42, y: y0 + Math.random() * 6, vx: u * 0.12 + (Math.random() - 0.5) * 0.08, vy: V0 + Math.random() * 1.2, r: 0.6 + Math.random() * 0.9 });
            }
        }
        let hb = 0;
        const D = s.drops;
        for (let k = D.length - 1; k >= 0; k--) {
            const d = D[k];
            d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt;
            // удар о нижнюю трубу: капля разбивается на брызги
            if (d.y >= yb) {
                hb++;
                if (Math.random() < 0.3 && particles.length < 500) {
                    const a2 = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 0.8 + Math.random() * 1.8;
                    particles.push({ x: p.x + d.x, y: yb - 1, vx: Math.cos(a2) * v, vy: Math.sin(a2) * v, color: Math.random() < 0.5 ? '#D6F4FF' : '#5CC8F5', alpha: 0.85, size: 0.7 + Math.random() * 1.1, decay: 0.05 + Math.random() * 0.03 });
                }
                D.splice(k, 1); continue;
            }
            // удар о сову
            if (gameActive) {
                const wx = p.x + d.x, ddx = wx - owl.x, ddy = d.y - owl.y;
                if (ddx * ddx + ddy * ddy < R * R) {
                    if (shz) { if (Math.random() < 0.15 && particles.length < 500) particles.push({ x: wx, y: d.y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), color: '#D6F4FF', alpha: 0.8, size: 1, decay: 0.06 }); continue; }   // ШАЗАМ пробивает воду
                    hits++;
                    // капля отскакивает от тела в сторону и вверх — брызги
                    if (Math.random() < 0.55 && particles.length < 500) {
                        const side = ddx >= 0 ? 1 : -1, v = 0.8 + Math.random() * 1.6;
                        particles.push({ x: wx, y: d.y, vx: side * v * (0.6 + Math.random()), vy: -v * (0.4 + Math.random() * 0.8), color: Math.random() < 0.5 ? '#E2F7FF' : '#6CCFF7', alpha: 0.9, size: 0.7 + Math.random() * 1.1, decay: 0.045 + Math.random() * 0.03 });
                    }
                    if (shieldTime <= 0) waterWetOwl(wx, d.y);   // без щита сова мокнет
                    D.splice(k, 1); continue;
                }
            }
        }
        s.hitK += ((hb > 0 ? 1 : 0) - s.hitK) * Math.min(1, 0.2 * dt);
        if ((!s.on && !D.length) || p.x + p.width < -40) { waterStreams.splice(i, 1); continue; }
    }
    // напор: каждая капля толкает сову вниз
    if (hits && gameActive && !shz) {
        let k = IMP * hits;
        if (shieldTime > 0) k *= 0.55;            // щит тоже сносит, но слабее
        if (speedBoostTime > 0) k *= 0.4;         // на ускорении сова режет воду
        owl.vy = Math.min(4 + lv * 0.6, owl.vy + k);
        if (owl.vy < 0) owl.vy *= Math.max(0.85, 1 - 0.012 * hits * (speedBoostTime > 0 ? 0.4 : 1));   // взлёт сквозь воду гасится
    }
}
