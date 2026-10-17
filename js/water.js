// ===== Эффект «Водонапор» =====
// Редкий значок-капля (выпадает вместо «Опасных труб» — какой из двух, решает случай). Берём — 10 секунд из каждой верхней трубы
// непрерывно льётся поток воды вниз, в нижнюю трубу. Вода не ранит: сова, влетев телом в поток, чувствует напор — её сбивает вниз
// и она мокнет. Со сложностью поток шире и напор сильнее: на Суперлайте чуть-чуть, к Хард+ — сильно. Щит тоже сносит, но слабее;
// на ускорении сова режет воду и её почти не сбивает; в ШАЗАМе пробивает поток насквозь. Трубы цвет не меняют.
const WATERFX = { SEC: 10, COLOR: '#38BDF8', id: 0 };
let waterTime = 0;          // сколько кадров ещё идёт эффект
let waterStreams = [];      // потоки воды (каждый — свой набор капель)
let waterK = 0;             // (не используется для цвета труб)
function waterReset() { waterTime = 0; waterStreams.length = 0; waterK = 0; WATERFX.wetT = 0; }
// насколько мокрые все трубы после «Водонапора» (0..1) — плавно высыхают
function waterPipeWet() { return WATERFX.wetT > 0 ? Math.min(0.85, WATERFX.wetT / 600) : 0; }

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
// живая капля, как бусинки дождя на трубах: неровный комочек воды, который в полёте тянется, сплющивается и покачивается
function waterDrawBlob(x, y, r, d, t) {
    // падающая капля: смотрит туда, куда летит; снизу круглая и толще, кверху сужается; на скорости вытягивается;
    // после слияния или разрыва дрожит, потом успокаивается
    const jg = d.jig || 0, w = Math.sin(t * (0.25 + jg * 0.35) + (d.ph || 0)) * (0.07 + 0.3 * jg);
    const sp = Math.hypot(d.vx || 0, d.vy || 0), st = Math.min(0.95, sp * 0.075);   // на скорости вытягивается, как капля, срывающаяся с трубы
    const rx = r * (d.sx || 1) * (1 + w - st * 0.32), ry = r * (1 - w * 0.8 + st);
    const rot = sp > 0.3 ? Math.atan2(-(d.vx || 0), d.vy || 1) : 0;
    const A = ctx.globalAlpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const shape = () => {
        ctx.beginPath();
        // яйцо: широкий круглый низ плавно переходит в более узкий верх
        ctx.moveTo(0, -ry);
        ctx.bezierCurveTo(rx * 0.55, -ry, rx * 0.95, -ry * 0.25, rx, ry * 0.2);
        ctx.bezierCurveTo(rx * 1.02, ry * 0.75, rx * 0.55, ry * 0.95, 0, ry * 0.95);
        ctx.bezierCurveTo(-rx * 0.55, ry * 0.95, -rx * 1.02, ry * 0.75, -rx, ry * 0.2);
        ctx.bezierCurveTo(-rx * 0.95, -ry * 0.25, -rx * 0.55, -ry, 0, -ry);
        ctx.closePath();
    };
    ctx.globalAlpha = A * 0.84; ctx.fillStyle = 'rgb(172, 208, 245)'; shape(); ctx.fill();
    ctx.globalAlpha = A * 0.32; ctx.fillStyle = 'rgb(80, 140, 215)';
    ctx.beginPath(); ctx.ellipse(rx * 0.18, ry * 0.4, rx * 0.6, ry * 0.45, 0, 0, Math.PI * 2); ctx.fill();   // тень внизу справа
    ctx.globalAlpha = A * 0.95; ctx.fillStyle = '#F2FAFF';
    ctx.fillRect(-rx * 0.5, -ry * 0.15, Math.max(0.6, rx * 0.38), Math.max(0.6, ry * 0.32));   // блик
    ctx.restore();
}
// «перемычка» между каплями, которые сливаются или только что разорвались: вода тянется ниточкой
function waterDrawNeck(ax, ay, bx, by, w, A) {
    if (w < 0.25) return;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
    ctx.globalAlpha = A * 0.84; ctx.fillStyle = 'rgb(172, 208, 245)';
    ctx.beginPath(); ctx.moveTo(ax + nx, ay + ny);
    ctx.quadraticCurveTo((ax + bx) / 2 + nx * 0.35, (ay + by) / 2 + ny * 0.35, bx + nx, by + ny);
    ctx.lineTo(bx - nx, by - ny);
    ctx.quadraticCurveTo((ax + bx) / 2 - nx * 0.35, (ay + by) / 2 - ny * 0.35, ax - nx, ay - ny);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = A;
}
function waterDrawPart(pt) {
    ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
    if (pt.kind === 'wbub') waterDrawBubble(pt.x, pt.y, pt.size);
    else { if (!pt.sx) { pt.sx = 0.75 + Math.random() * 0.5; pt.sy = 0.75 + Math.random() * 0.5; pt.rot = Math.random() * 3; pt.ph = Math.random() * 6.28; } const a0 = ctx.globalAlpha; ctx.save(); ctx.globalAlpha = a0; waterDrawBlob(pt.x, pt.y, pt.size, pt, typeof frame === 'number' ? frame : 0); ctx.restore(); }
    ctx.globalAlpha = 1;
}
// ---------- живой поток ----------
// Вода выходит прямо из трубы: капли-слёзы и пузырьки рождаются внутри шляпки (их прикрывает труба) и вываливаются наружу,
// летят вниз, покачиваясь. Между ними проносятся тонкие штрихи, как у дождя, — видно, куда и как быстро несётся вода.
// Сова — препятствие: всё, что в неё попадает, разбивается брызгами. Внизу на шляпке — шапка пены и водяная пыль
// (их рисуем поверх труб, чтобы ничего не обрезалось).
let __wMist = null;
function waterMistSprite() {
    if (__wMist) return __wMist;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(215, 245, 255, 0.5)'); gr.addColorStop(0.5, 'rgba(160, 220, 250, 0.18)'); gr.addColorStop(1, 'rgba(160, 220, 250, 0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (__wMist = c);
}
// за трубами: штрихи потока, капли, пузырьки
function drawWater() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        // штрихи-«дождь» внутри потока: светлая голова, хвост растворяется вверх
        for (const k of s.streaks) {
            const x = p.x + k.x, L = k.len;
            const g = ctx.createLinearGradient(0, k.y - L, 0, k.y);
            g.addColorStop(0, 'rgba(170, 230, 255, 0)'); g.addColorStop(1, `rgba(200, 240, 255, ${k.a})`);
            ctx.strokeStyle = g; ctx.lineWidth = k.w;
            ctx.beginPath(); ctx.moveTo(x, k.y - L); ctx.lineTo(x, k.y); ctx.stroke();
        }
        // перемычки: сливающиеся пары и только что разорвавшиеся
        for (const d of s.drops) {
            if (d.lk) waterDrawNeck(p.x + d.x, d.y, p.x + d.lk.x, d.lk.y, Math.min(d.r, d.lk.r) * (0.45 + 0.4 * Math.min(1, d.lkT / 6)), 1);
            if (d.sep && d.sepT > 0) waterDrawNeck(p.x + d.x, d.y, p.x + d.sep.x, d.sep.y, Math.min(d.r, d.sep.r) * 0.55 * (d.sepT / 9), 1);
        }
        for (const d of s.drops) {
            const dx = p.x + d.x + (d.b ? Math.sin(t * 0.18 + d.ph) * 0.6 : 0);
            if (d.b) waterDrawBubble(dx, d.y, d.r);
            else waterDrawBlob(dx, d.y, d.r, d, t);
        }
    }
    ctx.restore();
}
// поверх труб: шапка пены на нижней шляпке и водяная пыль
function drawWaterFront() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    const mist = waterMistSprite();
    ctx.save();
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        const x = p.x + s.fx * p.width, w = s.w;
        for (const m of s.mist) {
            ctx.globalAlpha = Math.max(0, m.a);
            ctx.drawImage(mist, p.x + m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
        }
        ctx.globalAlpha = 1;
        // кольца от ударов капель по воде на нижней шляпке
        if (s.rip.length) {
            const yb = height - (p.bottom + s.sq);
            ctx.lineWidth = 0.9;
            for (const q of s.rip) {
                ctx.strokeStyle = `rgba(210, 245, 255, ${Math.max(0, q.a)})`;
                ctx.beginPath(); ctx.ellipse(p.x + q.x, yb - 1, q.r, q.r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
            }
        }
        // пена: живые пузырьки у выхода из верхней трубы и на нижней шляпке — расползаются в стороны, покачиваются, лопаются
        for (const f of s.foam) {
            ctx.globalAlpha = Math.max(0, Math.min(1, f.a));
            waterDrawBubble(p.x + f.x + Math.sin(t * 0.3 + f.ph) * 0.5, f.y, f.r);
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}
// таймер эффекта — синяя «водяная» плашка: по ней бегут волны и поднимаются пузырьки
(function () {
    try {
        const st = document.createElement('style');
        // плашка таймера и улетающая подсказка «Водонапор» — одного стиля: внутри течёт вода и поднимаются пузырьки,
        // по контуру бегает голубой градиент; текст остаётся хорошо читаемым
        const W = '.buff-tag[data-key="water"],.fly-label-tag[data-key="water"]';
        const Wi = '.buff-tag[data-key="water"] i,.fly-label-tag[data-key="water"] i';
        const Wa = '.buff-tag[data-key="water"]::after,.fly-label-tag[data-key="water"]::after';
        st.textContent = W + '{position:relative;overflow:hidden;border:1.5px solid transparent!important;'
            + 'background:linear-gradient(100deg,rgba(6,42,88,.97) 0%,rgba(18,96,170,.97) 25%,rgba(6,42,88,.97) 50%,rgba(18,96,170,.97) 75%,rgba(6,42,88,.97) 100%) padding-box,'
            + 'linear-gradient(90deg,#0EA5E9,#E0F7FF,#38BDF8,#1D4ED8,#7DD3FC,#0EA5E9) border-box!important;'
            + 'background-size:200% 100%,300% 100%!important;color:#E6F7FF!important;text-shadow:0 1px 2px rgba(0,20,50,.8);animation:wtrFlow 1.6s linear infinite,wtrGlow 1.8s ease-in-out infinite}'
            + Wi + '{color:#9BE3FF!important;filter:drop-shadow(0 0 3px #38BDF8)}'
            + W + '>*{position:relative;z-index:1}'
            + Wa + '{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.8;background-image:radial-gradient(circle,rgba(255,255,255,.7) 0 1.1px,transparent 1.6px),radial-gradient(circle,rgba(255,255,255,.5) 0 0.9px,transparent 1.4px),radial-gradient(circle,rgba(255,255,255,.55) 0 1.3px,transparent 1.8px);background-size:23px 18px,31px 22px,41px 26px;background-position:3px 0,14px 6px,27px 11px;animation:wtrBubbles 2.2s linear infinite}'
            + '@keyframes wtrFlow{from{background-position:0% 0,0% 0}to{background-position:200% 0,300% 0}}'
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
    owl._wWet = Math.min(1, Math.max(owl._wWet || 0, 0.5) + 0.02);   // мокнет только сова, на трубы капли не ложатся
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
    let lv0 = 0; try { lv0 = getDifficultyIndex(); } catch (e) {}
    // сила по ступеням: Суперлайт/Лайт — слабый напор, Медиум/Медиум+ — средний, Хард/Хард+ — сильный (внутри ступени чуть растёт)
    const lv = [0, 0.4, 2.2, 2.7, 4.5, 5][Math.max(0, Math.min(5, lv0))];
    if (waterTime > 0) {
        waterTime -= dt;
        if (waterTime <= 0) { WATERFX.wetT = 900; if (!shz) { try { AudioFX.playWaterEnd(); } catch (e) {} } }   // после «Водонапора» трубы ещё ~15 с мокрые, как после дождя
        for (const p of pipes) {
            if (p.x + p.width < -40 || p.x > width + 40) continue;
            if (p._wId !== WATERFX.id) {
                p._wId = WATERFX.id;
                waterStreams.push({ pipe: p, fx: 0.5, on: true, ph: Math.random() * 6.28, sq: squeeze, drops: [], streaks: [], mist: [], foam: [], rip: [], hitK: 0, acc: 0, sacc: 0 });
            }
        }
    }
    // поток во всю ширину трубы; со сложностью — гуще, быстрее и сильнее давит
    const WK = Math.min(0.95, 0.55 + 0.08 * lv), DENS = 0.016 + lv * 0.02, V0 = 2.6 + lv * 0.45, G = 0.22;
    const PUSH = 0.035 + 0.045 * lv;   // в начале — лёгкий напор, к Хард+ сильный, но пролететь можно
    const R = shieldTime > 0 ? owl.radius * 1.4 : owl.radius * 0.95;
    let imp = 0, hits = 0;
    for (let i = waterStreams.length - 1; i >= 0; i--) {
        const s = waterStreams[i], p = s.pipe;
        const W = p.width * WK, RATE = DENS * W, IMP = PUSH / (RATE * Math.min(1, 2 * R / W) * 1.8);
        s.sq = squeeze; s.w = W;
        if (s.on && waterTime <= 0) s.on = false;
        const cx = p.width * s.fx, y0 = p.top + squeeze, yb = height - (p.bottom + squeeze);
        if (s.on) {
            // капли и пузырьки рождаются внутри трубы, над краем шляпки — наружу они выходят уже целыми
            s.acc += RATE * dt;
            while (s.acc >= 1) {
                s.acc -= 1;
                const b = Math.random() < 0.55;
                s.drops.push({ x: cx + (Math.random() - 0.5) * W, y: y0 - 4 - Math.random() * 10, vx: (Math.random() - 0.5) * 0.18, vy: V0 * (0.55 + Math.random() * 0.5) * (b ? 0.85 : 1), r: b ? 1.1 + Math.random() * 1.8 : 1 + Math.pow(Math.random(), 1.7) * 3.4, sx: 0.85 + Math.random() * 0.3, b, ph: Math.random() * 6.28 });   // капли разные: мелкие, крупные, круглые и вытянутые
            }
            // штрихи «дождя» в потоке
            s.sacc += (0.4 + lv * 0.3) * dt;
            while (s.sacc >= 1) {
                s.sacc -= 1;
                s.streaks.push({ x: cx + (Math.random() - 0.5) * W * 0.95, y: y0 - Math.random() * 6, vy: V0 * 2 + 3 + Math.random() * 3, len: 18 + Math.random() * 22, w: 0.6 + Math.random() * 0.6, a: 0.16 + Math.random() * 0.18 });
            }
        }
        let hb = 0;
        const D = s.drops;
        // значки в проёме — тоже препятствия: вода их обтекает
        const obst = [];
        if (typeof items !== 'undefined') for (const it of items) if (!it.collected && Math.abs(it.x - (p.x + cx)) < W / 2 + (it.radius || 16) + 6) obst.push(it);
        for (let k = D.length - 1; k >= 0; k--) {
            const d = D[k];
            if (d.b) { d.vy += G * 0.45 * dt; d.vy *= Math.pow(0.992, dt); d.x += (d.vx + Math.sin(d.y * 0.06 + d.ph) * 0.35) * dt; }   // пузырёк покачивается из стороны в сторону
            else { d.vy += G * dt; d.vy *= Math.pow(0.996, dt); d.x += d.vx * dt; }   // капле немного мешает воздух
            d.y += d.vy * dt;
            if (d.y >= yb) {
                hb++;
                // брызги летят в свою сторону: упала слева — плещет влево и стекает за край, справа — вправо
                const rel = (d.x - cx) / (W / 2), side = rel < 0 ? -1 : 1;
                if (Math.random() < 0.45) waterSplash(p.x + d.x, yb - 2, 1, -Math.PI / 2 + side * (0.75 + Math.abs(rel) * 0.45), 0.7, 1.8 + d.vy * 0.14 + Math.abs(rel) * 0.8, 0.3);
                // от удара по воде на шляпке расходится кольцо
                // на шляпке рождается пузырёк пены и ползёт к краю
                if (Math.random() < 0.35 && s.foam.length < 60) s.foam.push({ x: d.x, y: yb - 1.5, vx: side * (0.25 + Math.random() * 0.55) + rel * 0.2, vy: -0.4 - Math.random() * 0.5, r: 0.8 + Math.random() * 1.4, a: 0.95, life: 50 + Math.random() * 50, bot: true, ph: Math.random() * 6.28 });
                if (Math.random() < 0.05 && s.mist.length < 12) s.mist.push({ x: d.x + (Math.random() - 0.5) * 10, y: yb - 8, r: 9 + Math.random() * 8, a: 0.3, vy: -0.22 - Math.random() * 0.2 });
                D.splice(k, 1); continue;
            }
            // значок под струёй: вода чуть-чуть стекает по нему в стороны (капля лишь немного отклоняется и летит дальше)
            if (!d.nudged) for (const it of obst) {
                const ox = p.x + d.x - it.x, oy = d.y - it.y, rr = (it.radius || 16) + d.r * 0.5;
                if (ox * ox + oy * oy < rr * rr) { d.nudged = true; d.vx += (ox >= 0 ? 1 : -1) * (0.18 + Math.random() * 0.22); d.vy *= 0.92; break; }
            }
            if (gameActive) {
                const wx = p.x + d.x, ddx = wx - owl.x, ddy = d.y - owl.y;
                if (ddx * ddx + ddy * ddy < R * R) {
                    if (shz) { if (Math.random() < 0.1) waterSplash(wx, d.y, 1, -Math.PI / 2, 2.5, 2); continue; }   // ШАЗАМ пробивает воду
                    hits++; imp += IMP;
                    const out = Math.atan2(ddy, ddx);
                    waterSplash(wx, d.y, d.b ? 1 : 2, out < 0 ? out : -Math.PI / 2 + (ddx >= 0 ? 0.9 : -0.9), 1.6, 2.4 + d.vy * 0.25);
                    if (Math.random() < 0.03 && s.mist.length < 12) s.mist.push({ x: d.x, y: d.y, r: 7 + Math.random() * 6, a: 0.28, vy: -0.2 });
                    if (shieldTime <= 0) waterWetOwl(wx, d.y);
                    D.splice(k, 1); continue;
                }
            }
        }
        // живая вода: близкие капли притягиваются и тянутся друг к другу ниточкой, через миг сливаются в одну (она дрожит);
        // крупная капля на скорости иногда вытягивается и рвётся надвое — половинки расходятся, между ними тает перемычка
        {
            const idx = [];
            let links = 0;
            for (let k = 0; k < D.length; k++) {
                const d = D[k]; if (d.b) continue; idx.push(k);
                if (d.jig) d.jig = Math.max(0, d.jig - 0.035 * dt);
                if (d.sepT > 0) d.sepT -= dt;
                if (d.lk) links++;
            }
            idx.sort((a, b) => D[a].y - D[b].y);
            const dead = new Set();
            // новые пары
            for (let a = 0; a < idx.length && links < 6; a++) {
                const A = D[idx[a]]; if (A.lk || A.lkd) continue;
                for (let b = a + 1; b < idx.length; b++) {
                    const B = D[idx[b]]; if (B.y - A.y > 10) break; if (B.lk || B.lkd) continue;
                    const dx = B.x - A.x, dy = B.y - A.y, rr = (A.r + B.r) * 1.25;
                    if (dx * dx + dy * dy < rr * rr && Math.random() < 0.35) { A.lk = B; A.lkT = 0; B.lkd = true; links++; break; }
                }
            }
            // пары тянутся друг к другу и сливаются
            for (const k of idx) {
                const A = D[k], B = A.lk; if (!B) continue;
                const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy);
                if (dist > (A.r + B.r) * 2.4) { A.lk = null; B.lkd = false; continue; }   // разошлись
                A.lkT += dt;
                const pull = 0.06 * dt; A.vx += dx * pull * 0.5; A.vy += dy * pull * 0.5; B.vx -= dx * pull * 0.5; B.vy -= dy * pull * 0.5;
                if (A.lkT >= 6 || dist < Math.max(A.r, B.r) * 0.7) {
                    const ma = A.r * A.r * A.r, mb = B.r * B.r * B.r, m = ma + mb;
                    A.x = (A.x * ma + B.x * mb) / m; A.y = (A.y * ma + B.y * mb) / m;
                    A.vx = (A.vx * ma + B.vx * mb) / m; A.vy = (A.vy * ma + B.vy * mb) / m;
                    A.r = Math.min(5.2, Math.cbrt(m)); A.jig = 1; A.lk = null;
                    const bi = D.indexOf(B); if (bi >= 0) dead.add(bi);
                }
            }
            if (dead.size) for (let k = D.length - 1; k >= 0; k--) if (dead.has(k)) D.splice(k, 1);
            // разрыв
            for (let k = D.length - 1; k >= 0; k--) {
                const d = D[k];
                if (!d.b && !d.lk && !d.lkd && d.r > 3.6 && d.vy > 4 && Math.random() < 0.01 * dt) {
                    const r2 = d.r / 1.26; d.r = r2; d.vx -= 0.3; d.jig = 1;
                    const c = { x: d.x + 0.5, y: d.y - r2 * 1.6, vx: d.vx + 0.6, vy: d.vy * 0.93, r: r2, sx: d.sx, b: false, ph: d.ph + 1, jig: 1 };
                    D.push(c); d.sep = c; d.sepT = 9;
                }
            }
        }
        // штрихи летят быстрее капель; о сову и нижнюю трубу просто гаснут
        for (let k = s.streaks.length - 1; k >= 0; k--) {
            const m = s.streaks[k];
            m.y += m.vy * dt;
            let gone = m.y - m.len > yb;
            if (!gone && m.y > yb) m.len = Math.max(0, m.len - (m.y - yb)), m.y = yb;
            if (!gone && gameActive && !shz) { const ddx = p.x + m.x - owl.x, ddy = m.y - owl.y; if (ddx * ddx + ddy * ddy < R * R) gone = true; }
            if (!gone) for (const it of obst) { const ox = p.x + m.x - it.x, oy = m.y - it.y, rr = (it.radius || 16); if (ox * ox + oy * oy < rr * rr) { gone = true; break; } }   // о значок штрих гаснет
            if (gone || m.len <= 0) s.streaks.splice(k, 1);
        }
        s.hitK += ((hb > 0 ? 1 : 0) - s.hitK) * Math.min(1, 0.15 * dt);
        if (s.hitK > 0.3) p._wet = 1;   // нижняя труба после воды остаётся мокрой: на шляпке капли, с неё капает
        p._wFlow = s.on;
        // пузырьки у выхода сверху: выскакивают из трубы, расходятся в стороны и тают
        if (s.on && s.foam.length < 60 && Math.random() < (0.6 + lv * 0.1) * dt) s.foam.push({ x: cx + (Math.random() - 0.5) * W, y: y0 + 1, vx: (Math.random() - 0.5) * 0.7, vy: 0.15 + Math.random() * 0.35, r: 0.5 + Math.random() * 0.8, a: 0.95, life: 22 + Math.random() * 26, bot: false, ph: Math.random() * 6.28 });
        for (let k = s.foam.length - 1; k >= 0; k--) {
            const f = s.foam[k];
            f.life -= dt;
            if (f.bot) {
                const onCap = Math.abs(f.x - cx) < p.width / 2 + 5;
                if (onCap && !f.fall) {
                    // прыгает и садится на шляпку, ползёт к краю
                    f.vy += 0.12 * dt; f.y += f.vy * dt;
                    if (f.y > yb - f.r) { f.y = yb - f.r; f.vy = -Math.abs(f.vy) * 0.3; }
                    f.vx *= Math.pow(0.985, dt);
                } else { f.fall = true; f.vy += 0.18 * dt; f.y += f.vy * dt; }   // с края — вниз
                f.x += f.vx * dt;
            } else { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(0.97, dt); f.vy += 0.01 * dt; }
            if (f.life < 15) f.a = Math.max(0, f.life / 15);
            if (f.life <= 0 || f.y > height) s.foam.splice(k, 1);
        }
        for (let k = s.rip.length - 1; k >= 0; k--) { const q = s.rip[k]; q.r += 0.45 * dt; q.a -= 0.035 * dt; if (q.a <= 0) s.rip.splice(k, 1); }
        // водяная пыль по всей высоте потока
        if (s.on && Math.random() < (0.24 + lv * 0.12) * dt && s.mist.length < 20 + lv * 5) s.mist.push({ x: cx + (Math.random() - 0.5) * W, y: y0 + 15 + Math.random() * (yb - y0 - 15), r: 8 + Math.random() * 8, a: 0.18 + lv * 0.015, vy: -0.05 - Math.random() * 0.08, vx: (Math.random() - 0.5) * 0.25 });
        // вода переливается через края нижней шляпки и стекает каплями по бокам
        if (s.hitK > 0.3 && Math.random() < 0.3 * s.hitK * dt && particles.length < 520) {
            const side = Math.random() < 0.5 ? -1 : 1;
            particles.push({ kind: Math.random() < 0.3 ? 'wbub' : 'wdrop', x: p.x + cx + side * (p.width / 2 + 4 + Math.random() * 2), y: yb + 4 + Math.random() * 10, vx: side * (0.3 + Math.random() * 0.5), vy: 0.5 + Math.random(), grav: 0.14, alpha: 0.95, decay: 0.02, size: 1.1 + Math.random() * 1.3 });
        }
        for (let k = s.mist.length - 1; k >= 0; k--) {
            const m = s.mist[k];
            m.y += m.vy * dt; m.x += (m.vx || 0) * dt; m.r += 0.18 * dt; m.a -= 0.004 * dt;
            if (m.a <= 0) s.mist.splice(k, 1);
        }
        if ((!s.on && !D.length && !s.streaks.length && !s.mist.length && !s.foam.length && !s.rip.length) || p.x + p.width < -60) { waterStreams.splice(i, 1); continue; }
    }
    if (owl._wWet) owl._wWet = Math.max(0, owl._wWet - 0.0015 * dt);
    if (WATERFX.wetT > 0) WATERFX.wetT = Math.max(0, WATERFX.wetT - dt);   // сова понемногу обсыхает
    if (hits && gameActive && !shz) {
        let k = imp;
        if (shieldTime > 0) k *= 0.55;            // щит тоже сносит, но слабее
        if (speedBoostTime > 0) k *= 0.4;         // на ускорении сова режет воду
        owl.vy = Math.min(4 + lv * 0.5, owl.vy + k);
        if (owl.vy < 0) owl.vy *= Math.max(0.85, 1 - 0.012 * hits * (speedBoostTime > 0 ? 0.4 : 1));   // взлёт сквозь воду гасится
    }
}
