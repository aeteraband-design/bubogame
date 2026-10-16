// ===== Погода: случайная гроза =====
// Одно число stormIntensity (0 — ясная ночь, 1 — пик грозы) плавно тянется к цели. Цель задают случайные «грозы»:
// в любой момент полёта может начаться дождь (иногда сразу в начале игры, иногда ни разу за игру), идёт 30–45 с и проходит.
// Сила каждой грозы своя: от мороси до ливня с молниями. От сложности не зависит.
// От stormIntensity зависят: тёмное небо, тучи, дождь, мокрые крыши, зарницы с подсветкой домов и звук (ветер, дождь, гром).
let stormIntensity = -1;   // -1 — ещё не задано: в первом кадре сразу ставим цель (без «наплыва» грозы при загрузке)
const STORM = {
    LIGHT_FROM: 0.6,           // молнии начинаются выше этой силы
    LIGHT_MIN: 8, LIGHT_MAX: 18, // пауза между разрядами, секунды (при максимальной грозе чаще, при слабой — реже)
    flashT0: -1, flashX: 0, flashPow: 1, flash: 0, bolt: null, nextAt: 0,
    drops: [],
    clouds: null, cloudKey: '', offFar: 0, offNear: 0, wet: 0,
    sndT: 0, sndRain: -1, sndWind: -1
};
const stormClamp = (v) => Math.max(0, Math.min(1, v));
function stormSmooth(a, b, x) { const t = stormClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

// расписание гроз (время идёт только в полёте)
const WX = {
    START_CHANCE: 0.3,           // шанс, что дождь начнётся в самом начале игры
    DUR_MIN: 30, DUR_MAX: 45,    // сколько идёт гроза, с
    GAP_MIN: 40, GAP_MAX: 160,   // пауза между грозами, с
    on: false, left: -1, peak: 0
};
function wxRand(a, b) { return a + Math.random() * (b - a); }
function wxTick() {
    if (!gameActive || document.hidden) return;
    const dt = dtMult / 60;
    if (WX.left < 0) {   // первый полёт: либо дождь сразу, либо случайная пауза (может и не дождаться за всю игру)
        WX.left = Math.random() < WX.START_CHANCE ? wxRand(1, 6) : wxRand(20, WX.GAP_MAX);
        return;
    }
    WX.left -= dt;
    if (WX.left > 0) return;
    if (WX.on) { WX.on = false; WX.left = wxRand(WX.GAP_MIN, WX.GAP_MAX); }
    else { WX.on = true; WX.peak = wxRand(0.35, 1); WX.left = wxRand(WX.DUR_MIN, WX.DUR_MAX); }
}
function stormTarget() {
    try { const t = ADMIN_CFG.stormTest | 0; if (t > 0) return t / 100; } catch (e) {}
    return WX.on ? WX.peak : 0;
}

// в главном меню погода всегда ясная; каждая игра начинается с чистого неба и своего случайного расписания гроз
function stormInMenu() {
    const el = STORM.menuEl || (STORM.menuEl = document.getElementById('startScreen'));
    return !!el && !el.classList.contains('hidden');
}
function stormClearNow() {
    stormIntensity = 0; STORM.drops.length = 0; STORM.flashT0 = -1; STORM.flash = 0; STORM.bolt = null; STORM.nextAt = 0; STORM.wet = 0;
    WX.on = false; WX.left = -1;
}
function stormUpdate() {
    if (stormInMenu()) {
        if (stormIntensity !== 0 || WX.left >= 0) stormClearNow();
        if (STORM.sndRain || STORM.sndWind) { STORM.sndRain = STORM.sndWind = 0; try { AudioFX.weatherSet(0, 0); } catch (e) {} }
        return;
    }
    wxTick();
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
        // звук затихает вместе с видимым дождём: почти нет капель — звука нет совсем
        const dropsK = Math.min(1, STORM.drops.length / 40);
        const r = on ? rainK * dropsK : 0, w = on ? stormSmooth(0.2, 1, si) * Math.min(1, dropsK + (si > 0.5 ? 1 : 0)) : 0;
        if (Math.abs(r - STORM.sndRain) > 0.002 || Math.abs(w - STORM.sndWind) > 0.002 || (r === 0 && STORM.sndRain !== 0)) {
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
// Тучи — те же облака, что плывут по небу в игре (тот же силуэт), только тёмные и крупнее; чем сильнее гроза, тем их больше и гуще
function stormCloudBottom() { const c = stormSmooth(0.05, 0.9, Math.max(0, stormIntensity)); return 90 + c * height * 0.2; }
function stormBuildClouds() {
    const S = Math.max(1, viewScale * renderScale), key = S.toFixed(2) + '|' + gfxQuality;
    if (STORM.cloudSpr && STORM.cloudKey === key) return STORM.cloudSpr;
    STORM.cloudKey = key;
    const mk = (c0, c1) => makeSprite(CLOUD_W, CLOUD_H, S, (c) => {
        c.translate(CLOUD_OX, CLOUD_OY);
        const g = c.createLinearGradient(0, -30, 0, 30);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, 26, 0, Math.PI * 2); c.arc(26, -10, 32, 0, Math.PI * 2); c.arc(58, -4, 24, 0, Math.PI * 2); c.arc(38, 10, 22, 0, Math.PI * 2);
        c.fill();
    });
    STORM.cloudSpr = { far: mk('rgba(84, 96, 140, 0.95)', 'rgba(52, 62, 100, 0.9)'), near: mk('rgba(56, 66, 104, 0.98)', 'rgba(30, 38, 66, 0.95)') };
    return STORM.cloudSpr;
}
// набор туч: у каждой своя «пороговая» сила грозы, с которой она появляется; положение и размер заданы заранее
function stormCloudSet() {
    if (STORM.cl && STORM.clW === width) return STORM.cl;
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const mkL = (n, kMin, kMax, spMin, spMax) => {
        const a = [];
        for (let i = 0; i < n; i++) a.push({ x: (i + r() * 0.8) / n * (width + 360) - 180, yr: r(), k: kMin + r() * (kMax - kMin), sp: spMin + r() * (spMax - spMin), t: (i % n) / n * 0.8 * (0.6 + r() * 0.4) });
        return a;
    };
    // low — густой слой у горизонта, за небоскрёбами; far и near — тучи в верхней части неба
    STORM.cl = { low: mkL(17, 1.8, 2.8, 0.06, 0.13), far: mkL(15, 1.1, 1.8, 0.10, 0.2), near: mkL(12, 1.5, 2.4, 0.2, 0.38) };
    STORM.clW = width;
    return STORM.cl;
}
function stormDrawCloudLayer(list, spr, yOf, ck, si, alpha) {
    const spd = 1 + 2.2 * si;
    for (const c of list) {
        c.x -= c.sp * spd * dtMult;
        if (c.x < -CLOUD_W * c.k) c.x = width + 60 + Math.random() * 60;
        const a = alpha * stormSmooth(c.t, c.t + 0.18, ck);
        if (a < 0.01) continue;
        const y = yOf(c.yr);
        ctx.globalAlpha = a;
        ctx.drawImage(spr, c.x - CLOUD_OX * c.k, y - CLOUD_OY * c.k, CLOUD_W * c.k, CLOUD_H * c.k);
    }
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
        const spr = stormBuildClouds(), L = stormCloudSet(), yb = stormCloudBottom();
        stormDrawCloudLayer(L.low, spr.far, (r) => height * (0.34 + r * 0.17), ck, si, 0.92);   // за домами, у горизонта
        stormDrawCloudLayer(L.far, spr.far, (r) => 20 + r * Math.max(10, yb - 70), ck, si, 0.9);
        // зарница внутри туч и сам разряд — между дальним и ближним слоем туч
        if (STORM.flash > 0.01) stormDrawFlashBack(yb);
        stormDrawCloudLayer(L.near, spr.near, (r) => 20 + r * Math.max(10, yb - 50), ck, si, 0.95);
        // луна видна всегда: поверх туч рисуем её ещё раз — тучи закрывают её не больше чем на ~30%
        const mp = window.__moonPos;
        if (mp && moonSprite) { ctx.globalAlpha = Math.min(1, ck * 0.8); ctx.drawImage(moonSprite, mp[0], mp[1], mp[2], mp[2]); }
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
    if (!STORM.cityGrad || STORM.cityGradH !== height) {   // мягкий переход сверху — без видимой границы
        const g = ctx.createLinearGradient(0, cityTop, 0, height * 0.62);
        g.addColorStop(0, 'rgba(8, 14, 28, 0)'); g.addColorStop(1, 'rgba(8, 14, 28, 1)');
        STORM.cityGrad = g; STORM.cityGradH = height;
    }
    ctx.globalAlpha = 0.28 * sk; ctx.fillStyle = STORM.cityGrad;
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

// ---------- дождь (поверх всего: труб, значков и совы) ----------
function stormDrawRain() {
    const si = Math.max(0, stormIntensity), rk = stormRainK(si);
    const lowQ = gfxQuality === 'low', N = lowQ ? 110 : 220;
    const n = Math.round(N * rk);
    const D = STORM.drops;
    while (D.length < n) D.push({ x: Math.random() * (width + 120), y: Math.random() * height, z: 0.4 + Math.random() * 0.6 });
    if (D.length > n) D.length = n;
    if (!D.length) return;
    const heavy = stormSmooth(0.5, 1, si), wind = -(0.12 + 0.3 * si);
    for (const d of D) {
        const v = (8 + 10 * heavy) * (0.6 + 0.4 * d.z);
        d.y += v * dtMult; d.x += v * wind * dtMult;
        if (d.y > height + 20 || d.x < -40) { d.y = -Math.random() * 60; d.x = Math.random() * (width + 120); }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(185, 210, 240)';
    for (let pass = 0; pass < 2; pass++) {   // дальние капли тоньше и прозрачнее, ближние — чуть ярче
        ctx.beginPath();
        for (const d of D) {
            if ((d.z > 0.75) !== (pass === 1)) continue;
            const len = (4 + 20 * heavy) * d.z;
            ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - len * wind, d.y - len);
        }
        ctx.globalAlpha = pass ? (0.2 + 0.28 * heavy) : (0.14 + 0.22 * heavy);
        ctx.lineWidth = pass ? 1.1 : 0.8;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}
