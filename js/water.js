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

// ---------- картинки: капля-слеза (острый верх, круглый низ, синий контур, голубая заливка, блик) и голубой пузырёк ----------
let __wDrop = null, __wBub = null;
function waterDropSprite() {
    if (__wDrop) return __wDrop;
    const c = document.createElement('canvas'); c.width = 40; c.height = 56; const g = c.getContext('2d');
    g.translate(20, 36);   // центр круглой части; острый кончик вверху
    const path = () => { g.beginPath(); g.moveTo(0, -33); g.bezierCurveTo(4, -22, 16, -12, 16, 0); g.arc(0, 0, 16, 0, Math.PI); g.bezierCurveTo(-16, -12, -4, -22, 0, -33); g.closePath(); };
    const gr = g.createLinearGradient(-16, -30, 16, 16);
    gr.addColorStop(0, '#B8F0FF'); gr.addColorStop(0.45, '#5CCBF2'); gr.addColorStop(1, '#2C9BDB');
    path(); g.fillStyle = gr; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#1F7FC2'; g.stroke();
    // тень снизу справа и блик слева сверху
    g.fillStyle = 'rgba(20, 100, 180, 0.35)'; g.beginPath(); g.ellipse(5, 6, 8, 7, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.9)'; g.beginPath(); g.ellipse(-7, -4, 3.2, 6, 0.35, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.7)'; g.beginPath(); g.arc(-3, -16, 1.8, 0, Math.PI * 2); g.fill();
    return (__wDrop = c);
}
function waterBubbleSprite() {
    if (__wBub) return __wBub;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const grd = g.createRadialGradient(13, 12, 1, 16, 16, 14);
    grd.addColorStop(0, 'rgba(255,255,255,0.6)'); grd.addColorStop(0.55, 'rgba(56,189,248,0.2)'); grd.addColorStop(1, 'rgba(56,189,248,0.06)');
    g.fillStyle = grd; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160, 230, 255, 0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(11, 10, 3.2, 2, -0.6, 0, Math.PI * 2); g.fill();
    return (__wBub = c);
}
// одна капля: r — радиус круглой части; ang — куда летит (0 — вниз); st — вытягивание от скорости
function waterDrawDrop(x, y, r, ang, st) {
    const spr = waterDropSprite(), k = r / 16, w = 40 * k, h = 56 * k * st;
    if (ang) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(spr, -w / 2, -36 * k * st, w, h); ctx.restore(); }
    else ctx.drawImage(spr, x - w / 2, y - 36 * k * st, w, h);
}
function waterDrawBubble(x, y, r) { const s2 = r * 2.4; ctx.drawImage(waterBubbleSprite(), x - s2 / 2, y - s2 / 2, s2, s2); }
// брызги и пузырьки в общем списке частиц (рисуются поверх совы) — вызывается из drawParticleList
function waterDrawPart(pt) {
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
    if (pt.kind === 'wbub') waterDrawBubble(pt.x, pt.y, pt.size);
    else waterDrawDrop(pt.x, pt.y, pt.size, Math.atan2(-pt.vx, pt.vy), 1 + Math.min(0.5, Math.hypot(pt.vx, pt.vy) * 0.06));
    ctx.globalAlpha = 1;
}
// живая капля: летит, чуть покачивается и «дышит» (сжимается-вытягивается), как капли дождя
function drawWater() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        const x = p.x + s.fx * p.width, y0 = p.top + s.sq, w = s.w;
        // по кромке трубы — тонкая плёнка воды, из неё набухают и срываются капли
        if (s.on || s.drops.length) {
            const fa = s.on ? 1 : Math.min(1, s.drops.length / 20);
            const fg = ctx.createLinearGradient(0, y0, 0, y0 + 4);
            fg.addColorStop(0, `rgba(120, 210, 250, ${0.75 * fa})`); fg.addColorStop(1, 'rgba(120, 210, 250, 0)');
            ctx.fillStyle = fg; ctx.fillRect(x - w * 0.5, y0, w, 4);
            ctx.fillStyle = `rgba(225, 248, 255, ${0.6 * fa})`; ctx.fillRect(x - w * 0.46, y0, w * 0.92, 0.9);
        }
        for (const d of s.drops) {
            const dx = p.x + d.x + Math.sin(t * 0.18 + d.ph) * 0.7;
            const g0 = d.h > 0 ? 1 - d.h / d.h0 : 1;   // висящая капля ещё набухает
            const rr = d.r * (0.35 + 0.65 * g0);
            if (d.b) waterDrawBubble(dx, d.y, rr);
            else waterDrawDrop(dx, d.y, rr, d.h > 0 ? 0 : d.vx * 0.15, d.h > 0 ? 0.9 + 0.35 * g0 : 1 + Math.min(0.3, d.vy * 0.025) + 0.05 * Math.sin(t * 0.3 + d.ph));
        }
        // внизу на шляпке трубы — шапка пены из пузырьков, пока туда льётся вода
        if (s.hitK > 0.03) {
            const yb = height - (p.bottom + s.sq), nf = Math.round(w / 3.2);
            ctx.globalAlpha = Math.min(1, s.hitK * 1.2);
            for (let k = 0; k < nf; k++) {
                const h1 = Math.sin(k * 12.9898 + s.ph) * 43758.5453, rnd = h1 - Math.floor(h1);
                const bx = x + ((k + 0.5) / nf - 0.5) * w * 1.05 + Math.sin(t * 0.21 + k * 1.7) * 1.2;
                const by = yb - 1.5 - rnd * 5 * s.hitK - Math.abs(Math.sin(t * 0.17 + k * 2.3)) * 1.5;
                waterDrawBubble(bx, by, 0.9 + rnd * 1.4);
            }
            ctx.globalAlpha = 1;
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

// брызги: капли-слёзы, летящие веером, вперемешку с пузырьками; на них действует тяжесть
function waterSplash(x, y, n, dir, spread, power, bubK) {
    for (let i = 0; i < n; i++) {
        if (particles.length >= 520) return;
        const a2 = dir + (Math.random() - 0.5) * spread, v = power * (0.5 + Math.random() * 0.8), bub = Math.random() < (bubK === undefined ? 0.4 : bubK);
        particles.push({ kind: bub ? 'wbub' : 'wdrop', x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
            vx: Math.cos(a2) * v, vy: Math.sin(a2) * v, grav: bub ? 0.03 : 0.16, alpha: 0.95, decay: 0.028 + Math.random() * 0.02,
            size: bub ? 1.2 + Math.random() * 2 : 1.1 + Math.random() * 1.9 });
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
    // поток во всю ширину трубы; со сложностью — гуще, быстрее и сильнее давит
    const WK = Math.min(0.96, 0.82 + 0.03 * lv), DENS = 0.04 + lv * 0.011, V0 = 2.6 + lv * 0.5, G = 0.22;
    // импульс одной капли: подобран так, чтобы весь поток давил на сову примерно с силой PUSH за кадр
    const PUSH = 0.045 + 0.06 * lv;   // в начале — лёгкий напор, с каждым уровнем сильнее
    const R = shieldTime > 0 ? owl.radius * 1.4 : owl.radius * 0.95;
    let hits = 0, imp = 0;
    for (let i = waterStreams.length - 1; i >= 0; i--) {
        const s = waterStreams[i], p = s.pipe;
        const W = p.width * WK, RATE = DENS * W, IMP = PUSH / (RATE * Math.min(1, 2 * R / W) * 0.9);
        s.sq = squeeze; s.w = W;
        if (s.on && waterTime <= 0) s.on = false;
        const cx = p.width * s.fx, y0 = p.top + squeeze, yb = height - (p.bottom + squeeze);
        // новые капли из трубы
        if (s.on) {
            s.acc += RATE * dt;
            while (s.acc >= 1) {
                s.acc -= 1;
                const u = (Math.random() + Math.random() - 1);   // гуще к центру
                const b = Math.random() < 0.42;   // капли вперемешку с пузырьками; капли крупнее пузырьков
                const h0 = b ? 1 : 5 + Math.random() * 6;   // капля сначала висит на кромке и набухает, потом срывается
                s.drops.push({ x: cx + (Math.random() - 0.5) * W * 0.7 + u * W * 0.15, y: y0 + 1.5, vx: u * 0.12 + (Math.random() - 0.5) * 0.08, vy: (V0 * 0.45 + Math.random() * 0.8) * (b ? 0.8 : 1), r: b ? 0.9 + Math.random() * 1.1 : 2.2 + Math.random() * 1.8, b, ph: Math.random() * 6.28, h: h0, h0 });
            }
        }
        let hb = 0;
        const D = s.drops;
        for (let k = D.length - 1; k >= 0; k--) {
            const d = D[k];
            if (d.h > 0) { d.h -= dt; d.y = y0 + 1.5 + d.r * 0.35 * (1 - d.h / d.h0); continue; }   // висит на кромке
            d.vy += G * (d.b ? 0.55 : 1) * dt; d.x += d.vx * dt; d.y += d.vy * dt;
            // удар о нижнюю трубу: капля разбивается на брызги
            if (d.y >= yb) {
                hb++;
                if (Math.random() < 0.4) waterSplash(p.x + d.x, yb - 3, 1, -Math.PI / 2, 2.2, 1.2 + d.vy * 0.1, 0.6);   // капля разбивается в брызги и пузырьки
                D.splice(k, 1); continue;
            }
            // удар о сову
            if (gameActive) {
                const wx = p.x + d.x, ddx = wx - owl.x, ddy = d.y - owl.y;
                if (ddx * ddx + ddy * ddy < R * R) {
                    if (shz) { if (Math.random() < 0.15) waterSplash(wx, d.y, 1, -Math.PI / 2, 2.5, 2); continue; }   // ШАЗАМ пробивает воду
                    hits++; imp += IMP;
                    // капля разлетается веером от тела: брызги в стороны и вверх
                    const out = Math.atan2(ddy, ddx);
                    waterSplash(wx, d.y, d.b ? 1 : 2 + (d.r > 3 ? 1 : 0), out < 0 ? out : -Math.PI / 2 + (ddx >= 0 ? 0.9 : -0.9), 1.6, 2.6 + d.vy * 0.25);
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
        let k = imp;
        if (shieldTime > 0) k *= 0.55;            // щит тоже сносит, но слабее
        if (speedBoostTime > 0) k *= 0.4;         // на ускорении сова режет воду
        owl.vy = Math.min(4 + lv * 0.6, owl.vy + k);
        if (owl.vy < 0) owl.vy *= Math.max(0.85, 1 - 0.012 * hits * (speedBoostTime > 0 ? 0.4 : 1));   // взлёт сквозь воду гасится
    }
}
