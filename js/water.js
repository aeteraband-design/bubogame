// ===== Эффект «Водонапор» =====
// Редкий значок-капля (выпадает вместо «Опасных труб» — какой из двух, решает случай). Берём — 10 секунд из каждой верхней трубы
// непрерывно льётся поток воды вниз, в нижнюю трубу. Вода не ранит: сова, влетев телом в поток, чувствует напор — её сбивает вниз
// и она мокнет. Со сложностью поток шире и напор сильнее: на Суперлайте чуть-чуть, к Хард+ — сильно. Щит тоже сносит, но слабее;
// на ускорении сова режет воду и её почти не сбивает; в ШАЗАМе пробивает поток насквозь. Трубы цвет не меняют.
const WATERFX = { SEC: 10, COLOR: '#38BDF8', id: 0 };
let waterTime = 0;          // сколько кадров ещё идёт эффект
let waterStreams = [];      // потоки воды
let waterK = 0;             // (не используется для цвета труб)
function waterReset() { waterTime = 0; waterStreams.length = 0; waterK = 0; }

// значок взят: включаем эффект
function registerWater() {
    if (typeof shazamBusy === 'function' && shazamBusy()) return null;
    waterTime = WATERFX.SEC * 60; WATERFX.id++;
    try { AudioFX.playStarCollect(); AudioFX.playWaterStart(); Haptics.powerup(); } catch (e) {}
    return { target: 'other', text: `Водонапор ${WATERFX.SEC}с`, color: WATERFX.COLOR, icon: 'fa-droplet' };
}

// поток: прозрачная голубая вода, светлые края, внутри светлые блики, по бокам срываются капли; сверху у трубы и внизу — короны брызг
function drawWater() {
    if (!waterStreams.length) return;
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save();
    for (const s of waterStreams) {
        const p = s.pipe; if (!p) continue;
        const sq = s.sq, x = p.x + s.fx * p.width, y0 = p.top + sq + s.top, y1 = p.top + sq + s.bot;
        if (y1 - y0 < 1) continue;
        const w = s.w, ph = s.ph;
        // поток чуть сужается книзу и колышется
        const half = (yy) => w / 2 * (1 - 0.12 * Math.min(1, (yy - y0) / 120)) + 1.2 * Math.sin(yy * 0.07 + t * 0.3 + ph);
        const cxAt = (yy) => x + 1.4 * Math.sin(yy * 0.045 - t * 0.12 + ph);
        ctx.beginPath();
        for (let yy = y0; yy <= y1; yy += 5) ctx.lineTo(cxAt(yy) - half(yy), yy);
        ctx.quadraticCurveTo(cxAt(y1), y1 + w * 0.45, cxAt(y1) + half(y1), y1);
        for (let yy = y1; yy >= y0; yy -= 5) ctx.lineTo(cxAt(yy) + half(yy), yy);
        ctx.closePath();
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, 'rgba(170, 235, 255, 0.92)'); g.addColorStop(0.18, 'rgba(90, 200, 245, 0.78)'); g.addColorStop(0.5, 'rgba(60, 170, 235, 0.7)');
        g.addColorStop(0.8, 'rgba(110, 215, 250, 0.8)'); g.addColorStop(1, 'rgba(200, 245, 255, 0.95)');
        ctx.fillStyle = g; ctx.fill();
        // светлые блики, бегущие вниз, и пузырьки внутри
        ctx.save(); ctx.clip();
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
            const off = ((t * (5 + k * 1.5) + k * 41 + ph * 20) % 70), lx = x + (k - 1) * w * 0.28;
            ctx.strokeStyle = k === 1 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(225, 248, 255, 0.4)'; ctx.lineWidth = k === 1 ? 1.6 : 1.1;
            ctx.beginPath();
            for (let yy = y0 - 70 + off; yy < y1; yy += 70) { ctx.moveTo(lx, Math.max(y0, yy)); ctx.lineTo(lx, Math.min(y1, yy + 26)); }
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(235, 250, 255, 0.7)';
        for (let k = 0; k < 6; k++) {
            const by = y0 + ((t * 3 + k * 53 + ph * 30) % Math.max(20, y1 - y0)), bx = x + Math.sin(k * 2.1 + ph) * w * 0.3;
            ctx.beginPath(); ctx.arc(bx, by, 0.9 + (k % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // корона брызг у верхней трубы
        ctx.fillStyle = 'rgba(190, 240, 255, 0.85)';
        for (let k = 0; k < 4; k++) {
            const sx = x + (k - 1.5) * w * 0.32, sh = 2 + 2 * Math.abs(Math.sin(t * 0.25 + k * 1.3 + ph));
            ctx.beginPath(); ctx.ellipse(sx, y0 + 2, 1.6, sh, 0, 0, Math.PI * 2); ctx.fill();
        }
        // корона брызг внизу, где вода бьёт в трубу
        if (s.hit) {
            for (let k = 0; k < 5; k++) {
                const a = -Math.PI / 2 + (k - 2) * 0.55, L = 4 + 3 * Math.abs(Math.sin(t * 0.3 + k * 1.7 + ph));
                ctx.strokeStyle = 'rgba(200, 242, 255, 0.85)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * w * 0.4, y1); ctx.lineTo(x + Math.cos(a) * (w * 0.4 + L), y1 + Math.sin(a) * L); ctx.stroke();
            }
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
function waterUpdate(speed, squeeze) {
    const dt = dtMult, shz = typeof shazamBusy === 'function' && shazamBusy();
    if (shz) waterTime = 0;
    let lv = 0; try { lv = getDifficultyIndex(); } catch (e) {}
    if (waterTime > 0) {
        waterTime -= dt;
        if (waterTime <= 0 && !shz) { try { AudioFX.playWaterEnd(); } catch (e) {} }
        for (const p of pipes) {
            if (p.x + p.width < -40 || p.x > width + 40) continue;
            if (p._wId !== WATERFX.id) {   // у трубы — один непрерывный поток по центру
                p._wId = WATERFX.id;
                waterStreams.push({ pipe: p, fx: 0.5, top: 0, bot: 0, on: true, ph: Math.random() * 6.28, sq: squeeze, splashT: 0, dripT: 0 });
            }
        }
    }
    // со сложностью поток шире и напор сильнее: Суперлайт — тонкая струя и лёгкий напор, Хард+ — широкий поток и сильный напор
    const W = 12 + lv * 4.5, PUSH = 0.1 + 0.07 * lv, vFall = 5 + lv * 0.8;
    for (let i = waterStreams.length - 1; i >= 0; i--) {
        const s = waterStreams[i], p = s.pipe;
        s.sq = squeeze; s.w = W;
        const gapH = Math.max(10, height - (p.bottom + squeeze) - (p.top + squeeze));
        if (s.on && waterTime <= 0) s.on = false;
        if (!s.on) s.top += vFall * 1.4 * dt;           // напор кончился: хвост воды падает
        s.bot = Math.min(gapH, s.bot + vFall * 1.4 * dt);
        s.hit = s.bot >= gapH;
        if (s.top >= gapH || p.x + p.width < -40) { waterStreams.splice(i, 1); continue; }
        const x = p.x + s.fx * p.width, y0 = p.top + squeeze + s.top, y1 = p.top + squeeze + s.bot;
        if (s.hit && (s.splashT -= dt) <= 0 && particles.length < 500) { s.splashT = 4; waterSplash(x, y1, 2); }
        // по бокам потока срываются капли
        if ((s.dripT -= dt) <= 0 && particles.length < 500 && y1 - y0 > 20) {
            s.dripT = 8 + Math.random() * 10;
            const side = Math.random() < 0.5 ? -1 : 1;
            particles.push({ x: x + side * W * 0.55, y: y0 + Math.random() * (y1 - y0) * 0.7, vx: side * (0.3 + Math.random() * 0.4), vy: 1.2 + Math.random(), color: '#BDEBFF', alpha: 0.85, size: 1 + Math.random() * 0.8, decay: 0.03 });
        }
        if (!gameActive) continue;
        // сова телом в потоке: пересечение круга совы с потоком
        const R = shieldTime > 0 ? owl.radius * 1.4 : owl.radius * 0.9, hw = W / 2;
        const nx = Math.max(x - hw, Math.min(owl.x, x + hw)), ny = Math.max(y0, Math.min(owl.y, y1));
        if ((owl.x - nx) * (owl.x - nx) + (owl.y - ny) * (owl.y - ny) > R * R) continue;
        if (shz) { if (Math.random() < 0.5 * dt) waterSplash(owl.x, owl.y - R, 3); continue; }   // ШАЗАМ пробивает поток
        // доля тела в потоке — чем глубже влетела, тем сильнее напор
        const depth = Math.min(1, (Math.min(owl.x + R, x + hw) - Math.max(owl.x - R, x - hw)) / Math.min(2 * R, W));
        let k = PUSH * (0.35 + 0.65 * depth);
        if (shieldTime > 0) k *= 0.55;                                          // щит тоже сносит, но слабее
        if (speedBoostTime > 0) k *= 0.4;                                       // на ускорении сова режет воду
        owl.vy = Math.min(4 + lv * 0.6, owl.vy + k * dt);                       // напор сбивает вниз
        if (owl.vy < 0) owl.vy *= Math.pow(1 - 0.05 * depth * (speedBoostTime > 0 ? 0.4 : 1), dt);   // взлёт сквозь воду гасится
        if (Math.random() < 0.6 * dt && particles.length < 500) waterSplash(owl.x + (Math.random() - 0.5) * R, owl.y - R * 0.8, 2);
        if (typeof STORM !== 'undefined') STORM.wet = Math.max(STORM.wet || 0, 0.85);   // сова мокнет — на ней капли
    }
}
