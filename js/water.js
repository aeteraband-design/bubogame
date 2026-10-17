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
// ---------- живой поток ----------
// Вода — это несколько струй-лент. Каждый кадр из-под шляпки трубы в каждую струю добавляется новая точка воды; точки падают
// под тяжестью и несут с собой покачивание, поэтому по ленте бегут волны. Ленты соединяют соседние точки: сверху толстые и сплошные,
// ниже утончаются и рвутся на капли-слёзы и пузырьки. Если на пути сова — точки разбиваются о неё, и лента под ней обрывается.
// Внизу вода бьёт в шляпку: шапка пены, брызги и облачка водяной пыли.
let __wMist = null;
function waterMistSprite() {
    if (__wMist) return __wMist;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(215, 245, 255, 0.55)'); gr.addColorStop(0.45, 'rgba(160, 220, 250, 0.22)'); gr.addColorStop(1, 'rgba(160, 220, 250, 0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (__wMist = c);
}
function drawWater() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const mist = waterMistSprite();
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        const x = p.x + s.fx * p.width, y0 = p.top + s.sq, w = s.w, span = Math.max(1, s.breakY - y0);
        // водяная пыль — позади всего
        for (const m of s.mist) {
            ctx.globalAlpha = Math.max(0, m.a) * 0.9;
            ctx.drawImage(mist, p.x + m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
        }
        ctx.globalAlpha = 1;
        // мягкое голубое свечение вокруг сплошной части потока
        if (s.flow > 0.02) {
            const gl = ctx.createLinearGradient(x - w * 0.7, 0, x + w * 0.7, 0);
            gl.addColorStop(0, 'rgba(90, 200, 250, 0)'); gl.addColorStop(0.5, `rgba(90, 200, 250, ${0.13 * s.flow})`); gl.addColorStop(1, 'rgba(90, 200, 250, 0)');
            ctx.fillStyle = gl; ctx.save();
            ctx.beginPath(); ctx.moveTo(x - w * 0.5, y0); ctx.lineTo(x + w * 0.5, y0); ctx.lineTo(x + w * 0.75, s.breakY + 30); ctx.lineTo(x - w * 0.75, s.breakY + 30); ctx.closePath();
            ctx.clip(); ctx.fillRect(x - w, y0, w * 2, s.breakY + 30 - y0); ctx.restore();
        }
        // ленты: три толщины (сверху толще) × два прохода — тело и светлая бегущая сердцевина
        for (let band = 0; band < 3; band++) {
            const lo = band / 3, hi = (band + 1) / 3, wid = (3.2 - band * 0.9) * s.th;
            ctx.beginPath();
            for (const st of s.strands) {
                const P = st.pts;
                for (let i = 1; i < P.length; i++) {
                    const a1 = P[i - 1], a2 = P[i]; if (a1.dead || a2.dead) continue;
                    const u = (a2.y - y0) / span; if (u < lo || u >= hi) continue;
                    if (a2.y - a1.y > 18 || Math.abs(a2.x - a1.x) > 6) continue;   // разрыв ленты
                    ctx.moveTo(p.x + a1.x, a1.y); ctx.lineTo(p.x + a2.x, a2.y);
                }
            }
            ctx.strokeStyle = `rgba(48, 150, 225, ${0.6 - band * 0.1})`; ctx.lineWidth = wid; ctx.stroke();
            ctx.strokeStyle = `rgba(150, 225, 255, ${0.75 - band * 0.12})`; ctx.lineWidth = wid * 0.55; ctx.stroke();
            ctx.save();
            ctx.setLineDash([5 + band * 2, 9 + band * 3]); ctx.lineDashOffset = -t * (5 + band);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 - band * 0.15})`; ctx.lineWidth = Math.max(0.6, wid * 0.22); ctx.stroke();
            ctx.restore();
        }
        // выход воды из трубы: выпуклый «язык» под шляпкой, из него начинаются ленты
        if (s.flow > 0.02) {
            const bh = (3 + 1.2 * Math.sin(t * 0.2 + s.ph)) * s.flow;
            const mg = ctx.createLinearGradient(0, y0 - 1, 0, y0 + bh + 2);
            mg.addColorStop(0, `rgba(205, 245, 255, ${0.95 * s.flow})`); mg.addColorStop(1, `rgba(70, 175, 235, ${0.75 * s.flow})`);
            ctx.fillStyle = mg;
            ctx.beginPath(); ctx.moveTo(x - w * 0.5, y0 - 1);
            ctx.quadraticCurveTo(x - w * 0.42, y0 + bh, x, y0 + bh + 1);
            ctx.quadraticCurveTo(x + w * 0.42, y0 + bh, x + w * 0.5, y0 - 1);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * s.flow})`; ctx.fillRect(x - w * 0.3, y0, w * 0.6, 0.9);
        }
        // капли и пузырьки, на которые распались ленты
        for (const d of s.drops) {
            const dx = p.x + d.x + Math.sin(t * 0.18 + d.ph) * 0.6;
            if (d.b) waterDrawBubble(dx, d.y, d.r);
            else waterDrawDrop(dx, d.y, d.r, d.vx * 0.15, 1 + Math.min(0.3, d.vy * 0.025) + 0.05 * Math.sin(t * 0.3 + d.ph));
        }
        // внизу на шляпке трубы — шапка пены из пузырьков
        if (s.hitK > 0.03) {
            const yb = height - (p.bottom + s.sq), nf = Math.round(w / 3);
            ctx.globalAlpha = Math.min(1, s.hitK * 1.2);
            const fg = ctx.createLinearGradient(0, yb - 7, 0, yb);
            fg.addColorStop(0, 'rgba(150, 225, 255, 0)'); fg.addColorStop(1, 'rgba(150, 225, 255, 0.55)');
            ctx.fillStyle = fg; ctx.fillRect(x - w * 0.6, yb - 7, w * 1.2, 7);
            for (let k = 0; k < nf; k++) {
                const h1 = Math.sin(k * 12.9898 + s.ph) * 43758.5453, rnd = h1 - Math.floor(h1);
                const bx = x + ((k + 0.5) / nf - 0.5) * w * 1.1 + Math.sin(t * 0.21 + k * 1.7) * 1.2;
                const by = yb - 1.5 - rnd * 6 * s.hitK - Math.abs(Math.sin(t * 0.17 + k * 2.3)) * 1.6;
                waterDrawBubble(bx, by, 0.9 + rnd * 1.5);
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
    const t = (typeof frame === 'number' ? frame : 0);
    if (waterTime > 0) {
        waterTime -= dt;
        if (waterTime <= 0 && !shz) { try { AudioFX.playWaterEnd(); } catch (e) {} }
        for (const p of pipes) {
            if (p.x + p.width < -40 || p.x > width + 40) continue;
            if (p._wId !== WATERFX.id) {
                p._wId = WATERFX.id;
                waterStreams.push({ pipe: p, fx: 0.5, on: true, ph: Math.random() * 6.28, sq: squeeze, strands: [], drops: [], mist: [], hitK: 0, flow: 0, th: 1, breakY: 0, acc: 0 });
            }
        }
    }
    // поток во всю ширину трубы; со сложностью — больше струй, быстрее и сильнее давит
    const WK = Math.min(0.96, 0.82 + 0.03 * lv), V0 = 2.4 + lv * 0.45, G = 0.2;
    const PUSH = 0.045 + 0.06 * lv;   // в начале — лёгкий напор, с каждым уровнем сильнее
    const R = shieldTime > 0 ? owl.radius * 1.4 : owl.radius * 0.95;
    let imp = 0, hits = 0;
    for (let i = waterStreams.length - 1; i >= 0; i--) {
        const s = waterStreams[i], p = s.pipe;
        const W = p.width * WK;
        s.sq = squeeze; s.w = W;
        if (s.on && waterTime <= 0) s.on = false;
        s.flow += ((s.on ? 1 : 0) - s.flow) * Math.min(1, 0.12 * dt);
        s.th = 0.85 + lv * 0.07;
        const cx = p.width * s.fx, y0 = p.top + squeeze, yb = height - (p.bottom + squeeze), gap = Math.max(20, yb - y0);
        s.breakY = y0 + gap * (0.42 + 0.04 * lv);   // ниже этой линии ленты рвутся на капли
        // струи: их число растёт с шириной и уровнем
        const ns = Math.max(4, Math.round(W / (8.5 - lv * 0.5)));
        while (s.strands.length < ns) s.strands.push({ off: 0, ph: Math.random() * 6.28, pts: [] });
        const IMP = PUSH / (ns * Math.min(1, 2 * R / W) * 0.85);
        // новые точки воды у кромки — по одной в каждую струю за кадр
        if (s.on) {
            s.acc += dt;
            while (s.acc >= 1) {
                s.acc -= 1;
                for (let k = 0; k < s.strands.length; k++) {
                    const st = s.strands[k], u = (k + 0.5) / s.strands.length - 0.5;
                    const wob = Math.sin(t * 0.09 + st.ph) * 1.6 + Math.sin(t * 0.23 + st.ph * 2) * 0.7;
                    st.pts.push({ x: cx + u * W * 0.86 + wob, y: y0 + 1, vx: u * 0.22 + (Math.random() - 0.5) * 0.05, vy: V0 * (0.85 + Math.random() * 0.2) });
                }
            }
        }
        // точки падают; ниже линии разрыва превращаются в капли и пузырьки
        for (const st of s.strands) {
            const P = st.pts;
            for (let k = P.length - 1; k >= 0; k--) {
                const d = P[k];
                d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt;
                if (d.y >= s.breakY + Math.sin(k * 1.7 + st.ph) * 10) {
                    if (d.dead) { P.splice(k, 1); continue; }
                    const r = Math.random();
                    if (r < 0.3) s.drops.push({ x: d.x, y: d.y, vx: d.vx, vy: d.vy, r: 1.9 + Math.random() * 1.8, b: false, ph: Math.random() * 6.28 });
                    else if (r < 0.5) s.drops.push({ x: d.x, y: d.y, vx: d.vx * 0.6, vy: d.vy * 0.75, r: 0.9 + Math.random() * 1.2, b: true, ph: Math.random() * 6.28 });
                    if (Math.random() < 0.02 && s.mist.length < 14) s.mist.push({ x: d.x, y: d.y, r: 8 + Math.random() * 8, a: 0.25, vy: -0.15 });
                    P.splice(k, 1); continue;
                }
                if (gameActive && !d.dead) {
                    const wx = p.x + d.x, ddx = wx - owl.x, ddy = d.y - owl.y;
                    if (ddx * ddx + ddy * ddy < R * R) {
                        if (shz) { if (Math.random() < 0.05) waterSplash(wx, d.y, 1, -Math.PI / 2, 2.5, 2); continue; }   // ШАЗАМ пробивает воду
                        hits++; imp += IMP;
                        const out = Math.atan2(ddy, ddx);
                        if (Math.random() < 0.45) waterSplash(wx, d.y, 1, out < 0 ? out : -Math.PI / 2 + (ddx >= 0 ? 0.9 : -0.9), 1.6, 2.4 + d.vy * 0.25);
                        if (Math.random() < 0.04 && s.mist.length < 14) s.mist.push({ x: d.x, y: d.y, r: 7 + Math.random() * 6, a: 0.3, vy: -0.2 });
                        if (shieldTime <= 0 && Math.random() < 0.5) waterWetOwl(wx, d.y);
                        d.dead = true;   // лента под совой обрывается
                    }
                }
            }
        }
        // капли и пузырьки летят дальше; о нижнюю трубу разбиваются
        let hb = 0;
        const D = s.drops;
        for (let k = D.length - 1; k >= 0; k--) {
            const d = D[k];
            d.vy += G * (d.b ? 0.55 : 1) * dt; d.x += d.vx * dt; d.y += d.vy * dt;
            if (d.y >= yb) {
                hb++;
                if (Math.random() < 0.35) waterSplash(p.x + d.x, yb - 3, 1, -Math.PI / 2, 2.2, 1.2 + d.vy * 0.1, 0.6);
                if (Math.random() < 0.06 && s.mist.length < 14) s.mist.push({ x: d.x + (Math.random() - 0.5) * 10, y: yb - 4, r: 9 + Math.random() * 10, a: 0.35, vy: -0.25 - Math.random() * 0.2 });
                D.splice(k, 1); continue;
            }
            if (gameActive) {
                const wx = p.x + d.x, ddx = wx - owl.x, ddy = d.y - owl.y;
                if (ddx * ddx + ddy * ddy < R * R) {
                    if (shz) continue;
                    hits++; imp += IMP * 0.8;
                    const out = Math.atan2(ddy, ddx);
                    waterSplash(wx, d.y, d.b ? 1 : 2, out < 0 ? out : -Math.PI / 2 + (ddx >= 0 ? 0.9 : -0.9), 1.6, 2.6 + d.vy * 0.25);
                    if (shieldTime <= 0) waterWetOwl(wx, d.y);
                    D.splice(k, 1); continue;
                }
            }
        }
        s.hitK += ((hb > 0 ? 1 : 0) - s.hitK) * Math.min(1, 0.15 * dt);
        // водяная пыль: поднимается, расплывается и тает
        for (let k = s.mist.length - 1; k >= 0; k--) {
            const m = s.mist[k];
            m.y += m.vy * dt; m.r += 0.25 * dt; m.a -= 0.006 * dt; m.x += Math.sin(t * 0.03 + k) * 0.1 * dt;
            if (m.a <= 0) s.mist.splice(k, 1);
        }
        let live = D.length + s.mist.length;
        for (const st of s.strands) live += st.pts.length;
        if ((!s.on && !live) || p.x + p.width < -60) { waterStreams.splice(i, 1); continue; }
    }
    // напор: каждая струйка, попавшая в сову, толкает её вниз
    if (hits && gameActive && !shz) {
        let k = imp;
        if (shieldTime > 0) k *= 0.55;            // щит тоже сносит, но слабее
        if (speedBoostTime > 0) k *= 0.4;         // на ускорении сова режет воду
        owl.vy = Math.min(4 + lv * 0.6, owl.vy + k);
        if (owl.vy < 0) owl.vy *= Math.max(0.85, 1 - 0.01 * hits * (speedBoostTime > 0 ? 0.4 : 1));   // взлёт сквозь воду гасится
    }
}
