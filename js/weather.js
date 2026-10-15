// ===== Погода: от ясной ночи (Суперлайт) к грозе (Хард+) =====
// Одно число stormIntensity (0 — ясная ночь, 1 — пик грозы) плавно тянется к цели по прогрессу сложности.
// От него зависят: тёмное грозовое небо, тучи, дождь, брызги, мокрые крыши, зарницы с подсветкой домов и звук (ветер, дождь, гром).
let stormIntensity = -1;   // -1 — ещё не задано: в первом кадре сразу ставим цель (без «наплыва» грозы при загрузке)
const STORM = {
    LIGHT_FROM: 0.6,           // молнии начинаются выше этой силы
    LIGHT_MIN: 8, LIGHT_MAX: 18, // пауза между разрядами, секунды (при максимальной грозе чаще, при слабой — реже)
    flashT0: -1, flashX: 0, flashPow: 1, flash: 0, bolt: null, nextAt: 0,
    drops: [], splashes: [], pipeSplashes: [],
    clouds: null, cloudKey: '', offFar: 0, offNear: 0, wet: 0,
    sndT: 0, sndRain: -1, sndWind: -1
};
const stormClamp = (v) => Math.max(0, Math.min(1, v));
function stormSmooth(a, b, x) { const t = stormClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

// цель: Суперлайт — 0, начало Хард+ — 1, между ними плавно (по числу собранных тем). В админке можно задать вручную для проверки
function stormTarget() {
    try { const t = ADMIN_CFG.stormTest | 0; if (t > 0) return t / 100; } catch (e) {}
    try {
        const p = getTotalCollectedThemes() / Math.max(1, TOTAL_THEMES), L = DIFF_LEVELS.length;
        return stormClamp((p - 1 / L) / ((L - 2) / L));
    } catch (e) { return 0; }
}

function stormUpdate() {
    const tg = stormTarget();
    if (stormIntensity < 0) stormIntensity = tg;
    stormIntensity += (tg - stormIntensity) * Math.min(1, 0.006 * dtMult);   // ~3 с на переход
    if (Math.abs(tg - stormIntensity) < 0.0005) stormIntensity = tg;
    const si = stormIntensity;
    // намокание: крыши мокнут вслед за дождём и медленно сохнут
    const rainK = stormRainK(si);
    STORM.wet += ((rainK > 0 ? Math.min(1, rainK * 1.4) : 0) - STORM.wet) * Math.min(1, 0.004 * dtMult);

    // молнии: случайный таймер, только при сильной грозе
    const now = performance.now();
    if (si > STORM.LIGHT_FROM) {
        const k = (si - STORM.LIGHT_FROM) / (1 - STORM.LIGHT_FROM);
        const nextDelay = () => Math.max(STORM.LIGHT_MIN, Math.min(STORM.LIGHT_MAX, STORM.LIGHT_MIN + (1 - k) * 6 + Math.random() * 4)) * 1000;
        if (!STORM.nextAt) STORM.nextAt = now + 2500 + Math.random() * 3000;
        if (now >= STORM.nextAt && !document.hidden) { stormStrike(k); STORM.nextAt = now + nextDelay(); }
    } else STORM.nextAt = 0;
    // яркость вспышки: быстрый подъём (~0,07 с), дрожание, мягкое затухание (~0,55 с)
    if (STORM.flashT0 >= 0) {
        const t = (now - STORM.flashT0) / 1000;
        let v;
        if (t < 0.07) v = t / 0.07;
        else if (t < 0.25) { const fl = [1, 0.55, 0.92, 0.62, 1, 0.8]; v = fl[Math.min(fl.length - 1, Math.floor((t - 0.07) / 0.03))]; }
        else if (t < 0.8) { const u = 1 - (t - 0.25) / 0.55; v = u * u; }
        else { v = 0; STORM.flashT0 = -1; STORM.bolt = null; }
        STORM.flash = v * STORM.flashPow;
    } else STORM.flash = 0;

    // звук: ветер и дождь плавно нарастают с грозой (только в полёте)
    if ((STORM.sndT -= dtMult) <= 0) {
        STORM.sndT = 12;
        const on = gameActive && !document.hidden;
        const r = on ? rainK : 0, w = on ? stormSmooth(0.08, 1, si) : 0;
        if (Math.abs(r - STORM.sndRain) > 0.01 || Math.abs(w - STORM.sndWind) > 0.01) {
            STORM.sndRain = r; STORM.sndWind = w;
            try { AudioFX.weatherSet(r, w); } catch (e) {}
        }
    }
}
// сила дождя: до 0,2 — нет; 0,2–0,5 — морось (до 0,25); 0,5–1 — до ливня (1)
function stormRainK(si) {
    if (si < 0.2) return 0;
    if (si < 0.5) return 0.25 * stormSmooth(0.2, 0.5, si);
    return 0.25 + 0.75 * stormSmooth(0.5, 1, si);
}

function stormStrike(k) {
    STORM.flashT0 = performance.now();
    STORM.flashX = width * (0.12 + Math.random() * 0.76);
    STORM.flashPow = 0.65 + 0.35 * Math.random();
    STORM.bolt = Math.random() < 0.6 ? stormMakeBolt(STORM.flashX) : null;   // иногда — только зарница в тучах, без видимого разряда
    if (gameActive) {
        const dist = Math.random();   // дальше — позже и тише гром
        try { AudioFX.playThunder(0.7 + dist * 2.0, (0.55 + 0.45 * k) * (1 - 0.45 * dist)); } catch (e) {}
    }
}
// силуэт разряда: ломаная от низа туч к горизонту (сам низ спрячется за домами), с одной-двумя ветками
function stormMakeBolt(x0) {
    const y0 = stormCloudBottom() - 30, y1 = height * (0.6 + Math.random() * 0.12);
    const main = [[x0, y0]];
    let x = x0, y = y0;
    const steps = 9 + Math.floor(Math.random() * 4), dy = (y1 - y0) / steps;
    for (let i = 0; i < steps; i++) { x += (Math.random() - 0.5) * 34; y += dy * (0.7 + Math.random() * 0.6); main.push([x, y]); }
    const branches = [];
    for (let b = 0; b < 1 + (Math.random() < 0.5 ? 1 : 0); b++) {
        const s = main[2 + Math.floor(Math.random() * Math.max(1, main.length - 5))], br = [s.slice()];
        let bx = s[0], by = s[1]; const dir = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < 4; i++) { bx += dir * (8 + Math.random() * 16); by += 12 + Math.random() * 16; br.push([bx, by]); }
        branches.push(br);
    }
    return { main, branches };
}

// ---------- тучи ----------
function stormCloudBottom() { const c = stormSmooth(0.05, 0.9, Math.max(0, stormIntensity)); return 90 + c * height * 0.2; }
function stormBuildClouds() {
    const S = Math.max(1, viewScale * renderScale), key = S.toFixed(2) + '|' + gfxQuality;
    if (STORM.clouds && STORM.cloudKey === key) return STORM.clouds;
    STORM.cloudKey = key;
    const W = 900, H = 240, mk = (seed, col, n, rMin, rMax) => {
        const c = document.createElement('canvas'); c.width = Math.ceil(W * S); c.height = Math.ceil(H * S);
        const g = c.getContext('2d'); g.scale(S, S);
        let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < n; i++) {
            const x = r() * W, y = 40 + r() * (H - 110), rad = rMin + r() * (rMax - rMin);
            for (const dx of [-W, 0, W]) {   // по краям — копии, чтобы лента склеивалась без шва
                if (x + dx + rad < 0 || x + dx - rad > W) continue;
                const gr = g.createRadialGradient(x + dx, y, rad * 0.1, x + dx, y, rad);
                gr.addColorStop(0, col[0]); gr.addColorStop(0.55, col[1]); gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y, rad, 0, Math.PI * 2); g.fill();
            }
        }
        return { c, W, H };
    };
    STORM.clouds = {
        far: mk(11, ['rgba(92, 106, 140, 0.9)', 'rgba(58, 70, 100, 0.55)'], 50, 45, 95),
        near: mk(29, ['rgba(58, 68, 96, 0.95)', 'rgba(32, 40, 60, 0.7)'], 44, 55, 120)
    };
    return STORM.clouds;
}
function stormDrawCloudLayer(L, off, yBottom, sy, alpha) {
    const h = L.H * sy, y = yBottom - h + 30 * sy;
    ctx.globalAlpha = alpha;
    const o = ((off % L.W) + L.W) % L.W;
    for (let x = -o; x < width; x += L.W) ctx.drawImage(L.c, x, y, L.W, h);
}

// Грозовое небо: цвета неба плавно уходят в глубокие сине-серые тона (сам градиент неба пересобирается при заметном изменении — без лишнего слоя поверх)
function stormSkyGrad() {
    const si = Math.max(0, stormIntensity), q = Math.round(stormSmooth(0, 1, si) * 40) / 40;
    if (STORM.skyGrad && STORM.skyH === height && STORM.skyQ === q) return STORM.skyGrad;
    const mix = (a, b) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * q * 0.85)).join(',') + ')';
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, mix([30, 8, 66], [12, 20, 36]));
    g.addColorStop(0.5, mix([20, 3, 38], [16, 26, 44]));
    g.addColorStop(1, mix([9, 1, 23], [10, 15, 28]));
    STORM.skyGrad = g; STORM.skyH = height; STORM.skyQ = q;
    return g;
}
function stormStarK() { return 1 - 0.85 * stormSmooth(0, 0.85, Math.max(0, stormIntensity)); }

// Задний план: грозовое небо, тучи, зарницы и разряды (всё позади домов). Вызывается после луны, до города
function stormDrawBack() {
    const si = stormIntensity;
    if (si < 0.01) return;
    const ck = stormSmooth(0.05, 0.9, si);
    if (ck > 0.01) {
        const C = stormBuildClouds(), yb = stormCloudBottom(), sy = 0.7 + 0.5 * ck;
        STORM.offFar += (0.08 + 0.3 * si) * dtMult; STORM.offNear += (0.16 + 0.6 * si) * dtMult;
        stormDrawCloudLayer(C.far, STORM.offFar, yb - 26, sy * 0.9, 0.85 * ck);
        // зарница внутри туч и сам разряд — между дальним и ближним слоем туч
        if (STORM.flash > 0.01) stormDrawFlashBack(yb);
        stormDrawCloudLayer(C.near, STORM.offNear, yb, sy, 0.92 * ck);
        // луна видна всегда: поверх туч рисуем её ещё раз — тучи закрывают её не больше чем на ~30%
        const mp = window.__moonPos;
        if (mp && moonSprite) { ctx.globalAlpha = Math.min(1, ck * 0.75); ctx.drawImage(moonSprite, mp[0], mp[1], mp[2], mp[2]); }
        // вспышка подсвечивает и ближние тучи
        if (STORM.flash > 0.01) {
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(STORM.flashX, yb - 40, 10, STORM.flashX, yb - 40, 300);
            g.addColorStop(0, `rgba(150, 225, 255, ${0.28 * STORM.flash})`); g.addColorStop(1, 'rgba(150, 225, 255, 0)');
            ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(STORM.flashX - 300, yb - 340, 600, 600);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
    }
}
function stormDrawFlashBack(yb) {
    const f = STORM.flash, x = STORM.flashX;
    ctx.globalCompositeOperation = 'lighter';
    // широкая мягкая зарница: небо и тучи вокруг разряда загораются холодным светом
    const g = ctx.createRadialGradient(x, yb - 20, 20, x, yb - 20, 420);
    g.addColorStop(0, `rgba(120, 210, 255, ${0.42 * f})`); g.addColorStop(0.5, `rgba(80, 150, 230, ${0.16 * f})`); g.addColorStop(1, 'rgba(60, 120, 220, 0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x - 420, yb - 440, 840, 840);
    ctx.globalCompositeOperation = 'source-over';
    const b = STORM.bolt;
    if (!b) return;
    const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 * f; ctx.strokeStyle = 'rgb(120, 220, 255)'; ctx.lineWidth = 7; line(b.main);   // ореол без размытия (дёшево)
    ctx.globalAlpha = 0.9 * f; ctx.strokeStyle = '#E8FBFF'; ctx.lineWidth = 2; line(b.main);
    ctx.lineWidth = 1.1; ctx.globalAlpha = 0.7 * f; b.branches.forEach(line);
    ctx.globalAlpha = 1;
}

// Город: в грозу темнее и холоднее, крыши блестят от воды, вспышка мягко подсвечивает фасады и контуры крыш. После drawCity
function stormDrawCityLight() {
    const si = Math.max(0, stormIntensity);
    if (si < 0.01 || !citySprites) return;
    const sk = stormSmooth(0, 1, si);
    const cityTop = height * 0.3;
    ctx.globalAlpha = 0.28 * sk; ctx.fillStyle = 'rgb(8, 14, 28)';
    ctx.fillRect(0, cityTop, width, height - cityTop);
    ctx.globalAlpha = 1;
    const f = STORM.flash, wet = STORM.wet;
    if (f < 0.01 && wet < 0.03) return;
    citySprites.forEach((L, li) => {
        if (!L.bodies) return;
        const off = ((cityOffset * L.speed) % L.tileW + L.tileW) % L.tileW, y0 = height - L.H, near = li === citySprites.length - 1;
        for (let x = -off; x < width; x += L.tileW) {
            for (let bi = 0; bi < L.bodies.length; bi++) {
                const bd = L.bodies[bi], bx = x + bd.x, top = y0 + (L.H - bd.h);
                if (bx + bd.w < 0 || bx > width) continue;
                // мокрая крыша: тонкий холодный блик по краю
                if (wet > 0.03 && near) { ctx.globalAlpha = 0.22 * wet; ctx.fillStyle = 'rgb(170, 200, 255)'; ctx.fillRect(bx, top, bd.w, 1.1); }
                if (f > 0.01) {
                    const cx = bx + bd.w / 2, k = f * (0.3 + 0.7 * Math.exp(-Math.abs(cx - STORM.flashX) / 380)) * (near ? 1 : 0.7);
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.1 * k; ctx.fillStyle = 'rgb(90, 170, 210)'; ctx.fillRect(bx, top, bd.w, bd.h);   // фасад слегка озаряется
                    ctx.globalAlpha = 0.75 * k; ctx.fillStyle = 'rgb(190, 245, 255)'; ctx.fillRect(bx, top - 0.5, bd.w, 1.6);   // контур крыши
                    const side = cx < STORM.flashX ? bx + bd.w - 1.8 : bx;   // грань, обращённая к вспышке
                    ctx.globalAlpha = 0.5 * k; ctx.fillRect(side, top, 1.8, bd.h * 0.7);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
        }
    });
    ctx.globalAlpha = 1;
}

// ---------- дождь ----------
function stormDrawRain(front) {
    const si = Math.max(0, stormIntensity), rk = stormRainK(si);
    const lowQ = gfxQuality === 'low', N = lowQ ? 150 : 300;
    const n = Math.round(N * rk);
    const D = STORM.drops;
    if (!front) {
        while (D.length < n) D.push({ x: Math.random() * (width + 120), y: Math.random() * height, z: 0.4 + Math.random() * 0.6 });
        if (D.length > n) D.length = n;
    }
    if (!D.length && !STORM.splashes.length) return;
    const heavy = stormSmooth(0.5, 1, si), wind = -(0.12 + 0.3 * si);
    if (!front) {
        for (const d of D) {
            const v = (8 + 10 * heavy) * (0.6 + 0.4 * d.z);
            d.y += v * dtMult; d.x += v * wind * dtMult;
            if (d.y > height + 20 || d.x < -40) { d.y = -Math.random() * 60; d.x = Math.random() * (width + 120); }
        }
    }
    // дальние капли — за трубами, немногие ближние — поверх (тонкие и прозрачные, чтобы не мешать игре)
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(185, 210, 240)';
    for (let pass = 0; pass < 2; pass++) {
        const nearPass = pass === 1;
        if (front && !nearPass) continue;
        if (!front && nearPass) continue;
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < D.length; i++) {
            const d = D[i];
            if ((i % 7 === 0) !== front) continue;   // каждая седьмая капля — «ближняя»
            const len = (4 + 20 * heavy) * d.z * (front ? 1.4 : 1);
            ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - len * wind, d.y - len); any = true;
        }
        if (any) {
            ctx.globalAlpha = front ? (0.1 + 0.16 * heavy) : (0.16 + 0.3 * heavy);
            ctx.lineWidth = front ? 1.3 : 0.9;
            ctx.stroke();
        }
    }
    if (!front) stormRoofSplashes(heavy);
    ctx.globalAlpha = 1;
}
// брызги на крышах ближних домов
function stormRoofSplashes(heavy) {
    const S = STORM.splashes, L = citySprites && citySprites[citySprites.length - 1];
    if (L && L.bodies && heavy > 0.05 && Math.random() < heavy * 1.6 * dtMult) {
        const off = ((cityOffset * L.speed) % L.tileW + L.tileW) % L.tileW, y0 = height - L.H;
        for (let tries = 0; tries < 3; tries++) {
            const bd = L.bodies[Math.floor(Math.random() * L.bodies.length)];
            let bx = -off + bd.x; if (bx + bd.w < 0) bx += L.tileW;
            if (bx > width || bx + bd.w < 0) continue;
            S.push({ x: bx + Math.random() * bd.w, y: y0 + (L.H - bd.h), t: 0, s: 0.8 + Math.random() * 0.6, sp: L.speed });
            break;
        }
    }
    stormDrawSplashList(S);
}
// брызги на шляпках нижних труб (в слое камеры, после труб)
function stormDrawPipeSplashes() {
    const heavy = stormSmooth(0.5, 1, Math.max(0, stormIntensity)), S = STORM.pipeSplashes;
    if (heavy > 0.05 && Math.random() < heavy * 1.2 * dtMult) {
        const vis = pipes.filter(p => p.x + p.width > 0 && p.x < width);
        const p = vis[Math.floor(Math.random() * vis.length)];
        if (p) S.push({ p, dx: 4 + Math.random() * (p.width - 8), t: 0, s: 1 + Math.random() * 0.5 });
    }
    if (!S.length) return;
    for (const sp of S) { sp.x = sp.p.x + sp.dx; sp.y = sp.p.top + sp.p.gap; }
    stormDrawSplashList(S);
}
function stormDrawSplashList(S) {
    if (!S.length) return;
    ctx.strokeStyle = 'rgb(200, 225, 250)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = S.length - 1; i >= 0; i--) {
        const s = S[i];
        s.t += dtMult / 14;
        if (s.t >= 1) { S[i] = S[S.length - 1]; S.pop(); continue; }
        const u = s.t, h = 4.5 * s.s * Math.sin(u * Math.PI), w = 3.5 * s.s * u;
        ctx.moveTo(s.x - w, s.y - h); ctx.lineTo(s.x - w * 0.4, s.y - h * 0.3);
        ctx.moveTo(s.x + w, s.y - h); ctx.lineTo(s.x + w * 0.4, s.y - h * 0.3);
    }
    ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
}
