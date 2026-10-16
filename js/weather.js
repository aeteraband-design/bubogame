// ===== Погода: случайная гроза =====
// stormCover — сколько туч собралось (небо, тучи); stormIntensity (0..1) — сила дождя и молний. Цель задают случайные «грозы»:
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

// расписание гроз (время идёт только в полёте). Гроза: 15 с тучи собираются (облака темнеют, из-за правого края их наплывает всё больше,
// под конец начинается дождь) → 30–45 с дождь с молниями → 15 с уходит (дождь слабеет, молнии всё реже, тучи уплывают влево)
const WX = {
    RAMP: 24, FADE: 24,          // нарастание и уход, с — тучи налетают и уходят медленно
    DUR_MIN: 54, DUR_MAX: 69,    // сколько гроза «включена» (24 с нарастания + 30–45 с грозы), с
    // частота (настройка в админке): шанс начать игру сразу в дождь, первая пауза, пауза между грозами, с
    FREQ: [
        { none: 0.45, start: 0.08, first: [120, 700], gap: [400, 900] },   // редко
        { none: 0.25, start: 0.2, first: [30, 420], gap: [220, 520] },     // по умолчанию: случайно, нечасто, а бывает — ни разу за игру
        { none: 0, start: 0.4, first: [10, 70], gap: [40, 100] },        // часто
        { none: 0, start: 0.7, first: [3, 20], gap: [15, 35] }           // очень часто
    ],
    on: false, left: -1, peak: 0
};
let stormCover = 0;   // 0..1: сколько туч собралось (темнеют облака, небо, наплывают тучи)
function wxRand(a, b) { return a + Math.random() * (b - a); }
function wxFreq() { let f = 1; try { f = ADMIN_CFG.stormFreq; } catch (e) {} return WX.FREQ[Math.max(0, Math.min(3, f | 0))] || WX.FREQ[1]; }
function wxStart() { WX.on = true; WX.peak = wxRand(0.55, 1); WX.left = wxRand(WX.DUR_MIN, WX.DUR_MAX); }
function wxDt() {   // настоящие секунды с прошлого кадра (замедление и прочие эффекты на длительность грозы не влияют)
    const now = performance.now(), d = STORM.lastT ? (now - STORM.lastT) / 1000 : 0;
    STORM.lastT = now; STORM.rdt = Math.min(0.1, Math.max(0, d));
    return STORM.rdt;
}
function wxTick() {
    if (document.hidden) return;
    const dt = STORM.rdt, F = wxFreq();
    // решаем сразу, как только открылся экран игры (ещё до первого тапа): если игра начинается в дождь —
    // тучи уже на месте, дождь идёт и шумит с первой секунды
    if (WX.left < 0) {
        if (Math.random() < F.none) WX.left = 1e9;   // в этой игре грозы не будет
        else if (Math.random() < F.start) {
            wxStart(); stormCover = 1; stormIntensity = WX.peak; STORM.fade = 1;
            STORM.cl = null; STORM.sndFast = true; STORM.wet = 1;   // тучи расставятся сразу по всему небу, звук — без нарастания
        }
        else WX.left = wxRand(F.first[0], F.first[1]);
        return;
    }
    if (!gameActive) return;   // дальше время грозы идёт только в полёте
    WX.left -= dt;
    if (WX.left > 0) return;
    if (WX.on) { WX.on = false; WX.left = wxRand(F.gap[0], F.gap[1]) + WX.FADE + 5; }
    else wxStart();
}

// в главном меню погода всегда ясная; каждая игра начинается с чистого неба и своего случайного расписания гроз
function stormInMenu() {
    const el = STORM.menuEl || (STORM.menuEl = document.getElementById('startScreen'));
    return !!el && !el.classList.contains('hidden');
}
function stormClearNow() {
    stormIntensity = 0; stormCover = 0; STORM.fade = 0; STORM.drops.length = 0; STORM.flashT0 = -1; STORM.flash = 0; STORM.bolt = null; STORM.nextAt = 0; STORM.wet = 0;
    STORM.cl = null; WX.on = false; WX.left = -1;
}
function stormUpdate() {
    if (stormInMenu()) {
        if (stormIntensity !== 0 || stormCover !== 0 || WX.left >= 0) stormClearNow();
        if (STORM.sndRain || STORM.sndWind) { STORM.sndRain = STORM.sndWind = 0; try { AudioFX.weatherSet(0, 0); } catch (e) {} }
        return;
    }
    if (stormIntensity < 0) stormIntensity = 0;
    const dt = wxDt();
    wxTick();
    const test = 0;   // ручная «проверка грозы» убрана: для теста — «Частота гроз: очень часто»
    if (test > 0) {   // проверка из админки: тучи сразу, сила вручную
        stormCover = Math.min(1, stormCover + dt / 3); STORM.fade = 1;
        stormIntensity += (test / 100 * stormSmooth(0.5, 1, stormCover) - stormIntensity) * Math.min(1, 0.05 * dtMult);
    } else if (WX.on) {
        // нарастание: 15 с собираются тучи, дождь начинается в последние ~5 с
        stormCover = Math.min(1, stormCover + dt / WX.RAMP); STORM.fade = 1;
        stormIntensity = WX.peak * stormSmooth(0.65, 1, stormCover);
    } else {
        // уход, 15 с: дождь и молнии стихают (за ~10 с), тучи светлеют и уплывают за левый край
        STORM.fade = Math.max(0, (STORM.fade || 0) - dt / WX.FADE);
        const fr = stormSmooth(0.3, 1, STORM.fade);
        stormIntensity = Math.min(stormIntensity, WX.peak * fr);
        stormCover = Math.min(stormCover, stormSmooth(0.25, 1, STORM.fade));   // тучи перестают подходить и уплывают
    }
    const si = stormIntensity;
    // намокание: крыши мокнут вслед за дождём и медленно сохнут
    const rainK = stormRainK(si);
    STORM.wet += ((rainK > 0 ? Math.min(1, rainK * 1.4) : 0) - STORM.wet) * Math.min(1, 0.004 * dtMult);

// молнии: случайный таймер, только при сильной грозе
    const now = performance.now();
    const pk = WX.on || STORM.fade >= 1 ? si : WX.peak;   // при затихании молнии зависят от силы грозы, а не от остатка дождя
    const fd = STORM.fade || 0;
    if (pk > STORM.LIGHT_FROM && fd > 0.4 && stormCover > 0.9) {
        const k = (pk - STORM.LIGHT_FROM) / (1 - STORM.LIGHT_FROM);
        // при затихании паузы между разрядами растут, удары слабее
        const nextDelay = () => Math.max(STORM.LIGHT_MIN, Math.min(STORM.LIGHT_MAX, STORM.LIGHT_MIN + (1 - k) * 6 + Math.random() * 4)) * 1000 / Math.max(0.2, (fd - 0.3) / 0.7);
        if (!STORM.nextAt) STORM.nextAt = now + 2500 + Math.random() * 3000;
        if (now >= STORM.nextAt && !document.hidden) { stormStrike(k * Math.max(0.4, fd)); STORM.nextAt = now + nextDelay(); }
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
        const on = (gameActive || (typeof waitingFirstTap !== 'undefined' && waitingFirstTap)) && !document.hidden;
        // звук затихает вместе с видимым дождём: почти нет капель — звука нет совсем
        const dropsK = Math.min(1, STORM.drops.length / 40);
        const r = on ? rainK * dropsK : 0, w = on ? stormSmooth(0.2, 1, si) * Math.min(1, dropsK + (si > 0.5 ? 1 : 0)) : 0;
        if (Math.abs(r - STORM.sndRain) > 0.002 || Math.abs(w - STORM.sndWind) > 0.002 || (r === 0 && STORM.sndRain !== 0)) {
            STORM.sndRain = r; STORM.sndWind = w;
            try { AudioFX.weatherSet(r, w, STORM.sndFast && r > 0); if (r > 0) STORM.sndFast = false; } catch (e) {}
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
    STORM.flashPow = (0.65 + 0.35 * Math.random()) * Math.max(0.5, Math.min(1, STORM.fade || 1));
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
function stormCloudBottom() { const c = stormSmooth(0.05, 0.9, stormCover); return 90 + c * height * 0.2; }
function stormBuildClouds() {
    const S = Math.max(1, viewScale * renderScale), key = S.toFixed(2) + '|' + gfxQuality;
    if (STORM.cloudSpr && STORM.cloudKey === key) return STORM.cloudSpr;
    STORM.cloudKey = key;
    // в том же стиле, что обычные облака игры: мягкие края (размытие), полупрозрачные, без контура
    const mk = (c0, c1, glow) => makeSprite(CLOUD_W, CLOUD_H, S, (c) => {
        c.translate(CLOUD_OX, CLOUD_OY);
        const g = c.createLinearGradient(0, -30, 0, 30);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        c.fillStyle = g;
        c.shadowColor = glow; c.shadowBlur = gfxQuality === 'low' ? 0 : 12 * S;
        c.beginPath();
        c.arc(0, 0, 26, 0, Math.PI * 2); c.arc(26, -10, 32, 0, Math.PI * 2); c.arc(58, -4, 24, 0, Math.PI * 2); c.arc(38, 10, 22, 0, Math.PI * 2);
        c.fill();
    });
    // серо-фиолетовые, в тон миру; «lit» — та же туча, подсвеченная луной (мягко накладывается тем сильнее, чем ближе к луне)
    STORM.cloudSpr = {
        far: mk('rgba(118, 96, 156, 0.74)', 'rgba(66, 48, 98, 0.62)', 'rgba(110, 84, 160, 0.5)'),
        near: mk('rgba(100, 80, 138, 0.86)', 'rgba(52, 38, 82, 0.76)', 'rgba(90, 66, 140, 0.5)'),
        farLit: mk('rgba(222, 208, 246, 0.6)', 'rgba(150, 130, 192, 0.42)', 'rgba(200, 180, 240, 0.4)'),
        nearLit: mk('rgba(214, 198, 240, 0.66)', 'rgba(140, 118, 184, 0.48)', 'rgba(200, 180, 240, 0.4)')
    };
    return STORM.cloudSpr;
}
// набор туч: у каждой свой порог stormCover, с которого она выплывает из-за правого края; когда тучи расходятся — уплывает за левый
function stormCloudSet() {
    if (STORM.cl && STORM.clW === width) return STORM.cl;
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const mkL = (n, kMin, kMax, tMin, tMax) => {   // tMin..tMax — за сколько секунд туча пересекает экран
        const a = [];
        for (let i = 0; i < n; i++) a.push({ x: (i + r() * 0.8) / n * (width + 360) - 180, yr: r(), k: kMin + r() * (kMax - kMin), tc: tMin + r() * (tMax - tMin), t: 0, on: false, go: false });
        return a;
    };
    // low — дальний слой у горизонта (самые маленькие), far — средний, near — ближние вверху (крупнее, сплошь затягивают верх неба)
    STORM.cl = { low: mkL(32, 0.7, 1.05, 16, 22), far: mkL(20, 0.75, 1.05, 12, 16), near: mkL(16, 1.35, 1.9, 9, 12), init: false };
    // порядок появления общий для всех слоёв: сначала одна тучка, потом вторая, третья… — постепенно всё больше
    const all = [...STORM.cl.far, ...STORM.cl.near, ...STORM.cl.low];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    all.forEach((c, i) => { c.t = 0.03 + (i / all.length) * 0.82; });
    STORM.clW = width;
    return STORM.cl;
}
function stormCloudsAny(L) { for (const n of ['low', 'far', 'near']) for (const c of L[n]) if (c.on) return true; return false; }
// подсветка луной: у луны тучи светлее, к краям экрана — темнее
function stormMoonLit(x, y) {
    const mp = window.__moonPos; if (!mp) return 0;
    const d = Math.hypot(x - (mp[0] + mp[2] / 2), (y - (mp[1] + mp[2] / 2)) * 1.4);
    return Math.exp(-d / Math.max(140, width * 0.45));
}
function stormDrawCloudLayer(list, spr, yOf, cv, si, alpha, lag = 0, first = false, lit = null) {
    // пока тучи собираются — ветер сильный, потом тучи плывут спокойнее; уходят — быстро
    const gather = WX.on && cv < 0.999, wind = (gather ? 0.85 : 0.5) * (1 + 0.3 * si) * dtMult / 60;
    alpha *= 0.55 + 0.45 * stormSmooth(0.3, 1, cv);   // сначала тучи полупрозрачные, как обычные облака; потом сгущаются
    for (const c of list) {
        const thr = c.t + lag, cw = CLOUD_W * c.k;
        if (first) c.on = cv >= thr;                       // игра началась уже в грозу — тучи сразу на месте
        if (!c.on && cv >= thr) { c.on = true; c.go = false; c.x = width + CLOUD_OX * c.k + Math.random() * width * 0.2; }   // выплывает из-за правого края
        if (c.on && (cv < thr - 0.04 || cv < 0.002)) c.go = true;           // тучи расходятся: эта больше не возвращается справа
        if (!c.on) continue;
        c.x -= (width + cw) / (c.go ? 9 : c.tc) * (c.go ? dtMult / 60 : wind);
        if (c.x < -cw) {
            if (c.go) { c.on = false; continue; }
            c.x = width + CLOUD_OX * c.k + Math.random() * 60;
        }
        const y = yOf(c.yr);
        const dx = c.x - CLOUD_OX * c.k, dy = y - CLOUD_OY * c.k, dh = CLOUD_H * c.k;
        ctx.globalAlpha = alpha;
        ctx.drawImage(spr, dx, dy, cw, dh);
        if (lit) { const m = stormMoonLit(c.x + cw * 0.15, y); if (m > 0.02) { ctx.globalAlpha = alpha * m * 0.8; ctx.drawImage(lit, dx, dy, cw, dh); } }
    }
}

// Грозовое небо: цвета неба плавно уходят в глубокие сине-серые тона (сам градиент неба пересобирается при заметном изменении — без лишнего слоя поверх)
function stormSkyGrad() {
    const si = Math.max(0, stormCover), q = Math.round(stormSmooth(0, 1, si) * 40) / 40;
    if (STORM.skyGrad && STORM.skyH === height && STORM.skyQ === q) return STORM.skyGrad;
    const mix = (a, b) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * q * 0.85)).join(',') + ')';
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, mix([30, 8, 66], [28, 14, 52]));
    g.addColorStop(0.5, mix([20, 3, 38], [22, 10, 42]));
    g.addColorStop(1, mix([9, 1, 23], [12, 5, 26]));
    STORM.skyGrad = g; STORM.skyH = height; STORM.skyQ = q;
    return g;
}
function stormStarK() { return 1 - 0.85 * stormSmooth(0, 0.85, stormCover); }

// Задний план: грозовое небо, тучи, зарницы и разряды (всё позади домов). Вызывается после луны, до города
// Освещение луной: слой туч рисуется на отдельный холст, поверх (только по самим тучам) — тень везде,
// светлое лунное пятно вокруг луны (сторона туч к луне светлее) и затемнение книзу. Потом слой целиком кладётся на сцену.
function stormLitLayer(k, drawFn) {
    const main = ctx, cv = main.canvas;
    let L = STORM.litCv;
    if (!L) { L = STORM.litCv = document.createElement('canvas'); STORM.litCtx = L.getContext('2d'); }
    if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
    const g = STORM.litCtx, T = main.getTransform();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, L.width, L.height);
    g.setTransform(T);
    ctx = g;
    try { drawFn(); } finally { ctx = main; }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-atop';
    // общая тень
    g.fillStyle = `rgba(22, 12, 42, ${0.45 * k})`; g.fillRect(-50, -50, width + 100, height + 100);
    // лунный свет: мягкое светлое пятно с центром в луне
    const mp = window.__moonPos;
    const mx = mp ? mp[0] + mp[2] / 2 : width * 0.8, my = mp ? mp[1] + mp[2] / 2 : height * 0.18;
    const R = Math.max(width, height) * 0.75;
    const rg = g.createRadialGradient(mx, my, 0, mx, my, R);
    rg.addColorStop(0, `rgba(236, 226, 255, ${0.82 * k})`); rg.addColorStop(0.18, `rgba(206, 190, 240, ${0.62 * k})`);
    rg.addColorStop(0.45, `rgba(150, 128, 200, ${0.3 * k})`); rg.addColorStop(1, 'rgba(120, 100, 170, 0)');
    g.fillStyle = rg; g.fillRect(-50, -50, width + 100, height + 100);
    // книзу тучи темнее
    const vg = g.createLinearGradient(0, height * 0.12, 0, height * 0.6);
    vg.addColorStop(0, 'rgba(18, 8, 34, 0)'); vg.addColorStop(1, `rgba(18, 8, 34, ${0.55 * k})`);
    g.fillStyle = vg; g.fillRect(-50, -50, width + 100, height + 100);
    g.globalCompositeOperation = 'source-over';
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.drawImage(L, 0, 0); main.restore();
}
function stormDrawBack() {
    const si = Math.max(0, stormIntensity), cv = stormCover;
    if (cv < 0.005 && !(STORM.cl && stormCloudsAny(STORM.cl))) return;
    const ck = Math.max(0.3, stormSmooth(0.05, 0.9, cv));
    {
        const spr = stormBuildClouds(), L = stormCloudSet(), yb = stormCloudBottom(), first = !L.init; L.init = true;
        // тучи рисуются слоями на отдельный холст и освещаются луной целиком: у луны светлые, к краям и вниз темнеют
        stormLitLayer(0.85, () => {
            stormDrawCloudLayer(L.low, spr.far, (r) => height * (0.34 + r * 0.17), cv, si, 0.9, 0, first, null);   // за домами, у горизонта
            stormDrawCloudLayer(L.far, spr.far, (r) => 20 + r * Math.max(10, yb - 70), cv, si, 0.9, 0, first, null);
        });
        // зарница внутри туч и сам разряд — между дальним и ближним слоем туч
        if (STORM.flash > 0.01) stormDrawFlashBack(yb);
        stormLitLayer(1, () => stormDrawCloudLayer(L.near, spr.near, (r) => -12 + r * Math.max(10, yb - 40), cv, si, 0.97, 0, first, null));
        // луна сквозь плотные тучи лишь иногда проглядывает: то чуть видна, то почти скрыта
        const mp = window.__moonPos;
        if (mp && moonSprite && cv > 0.01) {
            const tt = performance.now() / 1000, peek = 0.5 + 0.5 * Math.sin(tt * 0.21) * Math.sin(tt * 0.13 + 1.3);
            ctx.globalAlpha = stormSmooth(0.05, 0.9, cv) * (0.08 + 0.42 * peek * peek);
            ctx.drawImage(moonSprite, mp[0], mp[1], mp[2], mp[2]);
        }
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
    const si = Math.max(0, stormCover);
    if ((si < 0.01 && STORM.flash < 0.01 && STORM.wet < 0.03) || !citySprites) return;
    const sk = stormSmooth(0, 1, si);
    const cityTop = height * 0.3;
    if (!STORM.cityGrad || STORM.cityGradH !== height) {   // мягкий переход сверху — без видимой границы
        const g = ctx.createLinearGradient(0, cityTop, 0, height * 0.62);
        g.addColorStop(0, 'rgba(16, 6, 30, 0)'); g.addColorStop(1, 'rgba(16, 6, 30, 1)');
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

// ---------- мокрая сова: сверху на голове блестят капельки, снизу висят и срываются капли (как на трубах) ----------
// вызывается из owl.draw в координатах тела совы
const OWL_WET = { top: [[-11, -16.5, 1.0], [-4, -19, 1.25], [3.5, -18.8, 1.1], [10, -15.5, 0.9], [-15, -9, 0.8]],
                  hang: [[-8, 17.5], [1.5, 19.5], [9, 16.5]] };
function stormDrawOwlWet(g, owlObj) {
    const wet = STORM.wet || 0;
    if (wet < 0.05) return;
    g.save();
    for (const [x, y, r] of OWL_WET.top) {   // капельки на голове и спине
        const rr = r * (0.75 + 0.25 * wet);
        g.globalAlpha = 0.85 * wet;
        g.fillStyle = 'rgba(190, 220, 255, 0.55)'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.32, 0, Math.PI * 2); g.fill();
    }
    OWL_WET.hang.forEach(([x, y], i) => {   // висячие капли растут и срываются
        const u = ((frame || 0) * 0.008 * (0.6 + wet) + i * 0.37) % 1, s = 0.5 + 1.6 * u;
        g.globalAlpha = 0.9 * wet;
        g.fillStyle = 'rgba(190, 220, 255, 0.7)';
        g.beginPath(); g.moveTo(x - s * 0.55, y); g.quadraticCurveTo(x, y - s * 0.6, x + s * 0.55, y);
        g.arc(x, y + s * 0.35, s * 0.6, 0, Math.PI); g.closePath(); g.fill();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x - s * 0.2, y + s * 0.25, s * 0.18, 0, Math.PI * 2); g.fill();
        const key = '_wd' + i;
        if (u > 0.95 && !owlObj[key] && gameActive && typeof particles !== 'undefined') {   // капля сорвалась
            owlObj[key] = true;
            particles.push({ x: owlObj.x + x * 1.29, y: owlObj.y + (y + s) * 1.29, vx: -0.3, vy: 1.4, color: '#BFDDFF', alpha: 0.85 * wet, size: 1.3, decay: 0.03 });
        } else if (u < 0.5) owlObj[key] = false;
    });
    g.restore();
}
