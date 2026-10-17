// ===== Графика «Ультра» (тестовый режим) =====
// Включается в настройках. Добавляет поверх обычной графики: мягкое свечение всего яркого (bloom), затемнение по краям экрана,
// объёмные трубы и шляпки-кольца с бликами от луны и фиолетовым засветом слева, мягкую ауру вокруг совы, объёмный логотип.
// Обычные режимы (низкая / средняя / высокая) не меняются.
function isUltra() { return gfxQuality === 'ultra'; }

// ---------- объёмный логотип и кнопки (CSS) ----------
(function () {
    try {
        const st = document.createElement('style');
        st.textContent =
            'html.gfx-ultra #menuLogo .ul-a{color:#FF8A1E!important;text-shadow:0 1px 0 #d96200,0 2px 0 #b85200,0 3px 0 #963f00,0 4px 0 #7a3300,0 6px 10px rgba(0,0,0,.55),0 0 22px rgba(254,118,0,.55)}'
          + 'html.gfx-ultra #menuLogo .ul-b{color:#B977FF!important;text-shadow:0 1px 0 #8e48e6,0 2px 0 #7633cf,0 3px 0 #5f22b0,0 4px 0 #4a178f,0 6px 10px rgba(0,0,0,.55),0 0 22px rgba(168,85,247,.55)}'
          + 'html.gfx-ultra #menuLogo .ul-ico{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -5px 10px rgba(60,0,90,.45),0 6px 14px rgba(0,0,0,.45),0 0 26px rgba(254,118,0,.45)!important}'
          + 'html.gfx-ultra #menuLogo .ul-ico i{filter:drop-shadow(0 2px 0 rgba(0,0,0,.25))}'
          + 'html.gfx-ultra #blLogo .bl-txt span:first-child{text-shadow:0 1px 0 #d96200,0 2px 0 #b85200,0 3px 0 #963f00,0 5px 8px rgba(0,0,0,.5),0 0 20px rgba(254,118,0,.5)}'
          + 'html.gfx-ultra #blLogo .bl-txt span:last-child{text-shadow:0 1px 0 #8e48e6,0 2px 0 #7633cf,0 3px 0 #5f22b0,0 5px 8px rgba(0,0,0,.5),0 0 20px rgba(168,85,247,.5)}';
        document.head.appendChild(st);
    } catch (e) {}
})();

// ---------- труба: объём, фиолетовый засвет слева, мягкий блик и лунный кант справа ----------
const ULTRA_STEM = {};
function ultraStem(pw, y, h) {
    let G = ULTRA_STEM[pw];
    if (!G) {
        const g = ctx.createLinearGradient(0, 0, pw, 0);
        g.addColorStop(0, 'rgba(185, 125, 255, 0.42)'); g.addColorStop(0.04, 'rgba(175, 115, 255, 0.5)'); g.addColorStop(0.1, 'rgba(150, 95, 245, 0.18)');
        g.addColorStop(0.2, 'rgba(10, 0, 30, 0.1)'); g.addColorStop(0.36, 'rgba(10, 0, 30, 0.16)'); g.addColorStop(0.52, 'rgba(10, 0, 30, 0)');
        g.addColorStop(0.62, 'rgba(255, 220, 255, 0)'); g.addColorStop(0.74, 'rgba(255, 225, 255, 0.24)'); g.addColorStop(0.77, 'rgba(255, 240, 255, 0.38)'); g.addColorStop(0.8, 'rgba(255, 225, 255, 0.2)');
        g.addColorStop(0.88, 'rgba(255, 225, 255, 0)'); g.addColorStop(0.95, 'rgba(225, 205, 255, 0)'); g.addColorStop(0.98, 'rgba(225, 205, 255, 0.22)'); g.addColorStop(1, 'rgba(225, 205, 255, 0.06)');
        const halo = ctx.createLinearGradient(pw, 0, pw + 9, 0);
        halo.addColorStop(0, 'rgba(210, 190, 255, 0.14)'); halo.addColorStop(1, 'rgba(210, 190, 255, 0)');
        const halo2 = ctx.createLinearGradient(0, 0, -7, 0);
        halo2.addColorStop(0, 'rgba(170, 110, 255, 0.12)'); halo2.addColorStop(1, 'rgba(170, 110, 255, 0)');
        G = ULTRA_STEM[pw] = { g, halo, halo2 };
    }
    ctx.fillStyle = G.g; ctx.fillRect(0, y, pw, h);
    ctx.fillStyle = G.halo; ctx.fillRect(pw, y, 9, h);
    ctx.fillStyle = G.halo2; ctx.fillRect(-7, y, 7, h);
}

// ---------- шляпка-кольцо (как на референсе): скруглённые торцы, тень сверху, светлая губа снизу, кант справа ----------
function drawUltraCap(capX, capY, capW, capH, r, rimY, pw, red) {
    const devR = tokDevScale(ctx), hw = capW / 2 + 1, hh = capH / 2 + 1;
    const spr = tokSprite(`capU|${red ? red : ''}|${pw}|${capW}|${capH}|${r}|${rimY}|${devR}`, devR, hw, hh, (g) => {
        g.translate(-(capX + capW / 2), -capH / 2);
        const R = Math.min(capH * 0.42, r + 2);
        const path = () => {
            g.beginPath();
            g.moveTo(capX + R, 0); g.lineTo(capX + capW - R, 0);
            g.quadraticCurveTo(capX + capW, 0, capX + capW, R);
            g.lineTo(capX + capW, capH - R);
            g.quadraticCurveTo(capX + capW, capH, capX + capW - R, capH);
            g.lineTo(capX + R, capH);
            g.quadraticCurveTo(capX, capH, capX, capH - R);
            g.lineTo(capX, R);
            g.quadraticCurveTo(capX, 0, capX + R, 0);
            g.closePath();
        };
        const P = red === 'w' ? ['#4a2000', '#7a3a00', '#c06a10', '#ffa23a', '#ffc070', '#f5d8a8', '#8a4a10']
            : red ? ['#4e000c', '#80081a', '#c81a2e', '#ff4a5a', '#ff8088', '#ffc0c4', '#7a0a18']
            : ['#7a2208', '#a8380a', '#e06810', '#ff9a2e', '#ffb54e', '#ffd9a0', '#9a4410'];
        const cg = g.createLinearGradient(capX, 0, capX + capW, 0);
        [0, 0.14, 0.46, 0.74, 0.88, 0.955, 1].forEach((q, i) => cg.addColorStop(q, P[i]));
        g.fillStyle = cg; path(); g.fill();
        g.save(); path(); g.clip();
        const vg = g.createLinearGradient(0, 0, 0, capH);
        vg.addColorStop(0, 'rgba(70, 12, 0, 0.42)'); vg.addColorStop(0.2, 'rgba(70, 12, 0, 0.12)'); vg.addColorStop(0.34, 'rgba(70, 12, 0, 0)');
        vg.addColorStop(0.7, 'rgba(255, 210, 140, 0)'); vg.addColorStop(0.84, 'rgba(255, 215, 150, 0.32)'); vg.addColorStop(0.92, 'rgba(255, 215, 150, 0.12)');
        vg.addColorStop(1, 'rgba(70, 14, 0, 0.35)');
        g.fillStyle = vg; g.fillRect(capX - 1, -1, capW + 2, capH + 2);
        const tl = g.createLinearGradient(capX, 0, capX + capW, 0);
        tl.addColorStop(0, 'rgba(255, 200, 150, 0.1)'); tl.addColorStop(0.75, 'rgba(255, 230, 190, 0.45)'); tl.addColorStop(1, 'rgba(255, 220, 180, 0.15)');
        g.fillStyle = tl; g.fillRect(capX, 0.5, capW, 0.9);
        const eg = g.createLinearGradient(capX, 0, capX + capW, 0);
        eg.addColorStop(0, 'rgba(50, 6, 0, 0.4)'); eg.addColorStop(0.03, 'rgba(200, 140, 255, 0.18)'); eg.addColorStop(0.06, 'rgba(50, 6, 0, 0)');
        eg.addColorStop(0.965, 'rgba(255, 235, 200, 0)'); eg.addColorStop(0.985, 'rgba(255, 235, 200, 0.35)'); eg.addColorStop(1, 'rgba(80, 20, 0, 0.3)');
        g.fillStyle = eg; g.fillRect(capX - 1, -1, capW + 2, capH + 2);
        g.restore();
        g.strokeStyle = red ? 'rgba(255, 140, 150, 0.25)' : 'rgba(255, 190, 120, 0.22)'; g.lineWidth = 0.7; path(); g.stroke();
    });
    ctx.drawImage(spr.c, capX + capW / 2 + spr.x, capY + capH / 2 + spr.y, spr.w, spr.h);
}

// ---------- мягкая аура вокруг совы ----------
let __ultraAura = null;
function ultraOwlAura() {
    if (!owl || !owl.visible) return;
    if (!__ultraAura) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(190, 130, 255, 0.35)'); gr.addColorStop(0.45, 'rgba(150, 90, 245, 0.14)'); gr.addColorStop(1, 'rgba(150, 90, 245, 0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        __ultraAura = c;
    }
    const R = owl.radius * 3.2;
    ctx.drawImage(__ultraAura, owl.x - R, owl.y - R, R * 2, R * 2);
}

// ---------- после кадра: свечение всего яркого (bloom) и мягкое затемнение по краям ----------
let __ulB1 = null, __ulB2 = null, __ulVig = null, __ulVigKey = '';
function ultraPost() {
    const W = canvas.width, H = canvas.height; if (!W || !H) return;
    const m = canvas.getContext('2d');
    if (!__ulB1) { __ulB1 = document.createElement('canvas'); __ulB2 = document.createElement('canvas'); }
    const w1 = Math.max(8, Math.round(W / 6)), h1 = Math.max(8, Math.round(H / 6)), w2 = Math.max(4, Math.round(W / 14)), h2 = Math.max(4, Math.round(H / 14));
    if (__ulB1.width !== w1 || __ulB1.height !== h1) { __ulB1.width = w1; __ulB1.height = h1; }
    if (__ulB2.width !== w2 || __ulB2.height !== h2) { __ulB2.width = w2; __ulB2.height = h2; }
    const b1 = __ulB1.getContext('2d'), b2 = __ulB2.getContext('2d');
    b1.imageSmoothingEnabled = true; b1.imageSmoothingQuality = 'high'; b2.imageSmoothingEnabled = true;
    b1.globalCompositeOperation = 'copy'; b1.drawImage(canvas, 0, 0, w1, h1);
    b2.globalCompositeOperation = 'copy'; b2.drawImage(__ulB1, 0, 0, w2, h2);
    m.save();
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.imageSmoothingEnabled = true;
    // складываем размытую копию поверх — яркое (окна, значки, луна, шляпки) начинает светиться, тёмное почти не меняется
    m.globalCompositeOperation = 'lighter';
    m.globalAlpha = 0.14; m.drawImage(__ulB1, 0, 0, W, H);
    m.globalAlpha = 0.16; m.drawImage(__ulB2, 0, 0, W, H);
    // затемнение по краям
    const vk = W + 'x' + H;
    if (__ulVigKey !== vk) {
        __ulVigKey = vk; __ulVig = document.createElement('canvas'); __ulVig.width = 256; __ulVig.height = Math.max(64, Math.round(256 * H / W));
        const g = __ulVig.getContext('2d'), vw = __ulVig.width, vh = __ulVig.height;
        const gr = g.createRadialGradient(vw / 2, vh * 0.45, Math.min(vw, vh) * 0.35, vw / 2, vh * 0.5, Math.max(vw, vh) * 0.75);
        gr.addColorStop(0, 'rgba(10, 0, 30, 0)'); gr.addColorStop(1, 'rgba(10, 0, 30, 0.42)');
        g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    }
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
    m.drawImage(__ulVig, 0, 0, W, H);
    m.restore();
}
