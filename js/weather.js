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
    RAMP: 20, FADE: 30,          // нарастание (~20 с тучи плавно наплывают сбоку) и уход (тучи медленно тают), с
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
    if (WX.left < 0 && STORM.pausedWx) {   // вернулись из меню — погода ровно та же, что была в момент паузы
        const sv = STORM.pausedWx; STORM.pausedWx = null;
        WX.on = sv.on; WX.left = sv.left; WX.peak = sv.peak;
        stormCover = sv.cover; stormIntensity = sv.si; STORM.fade = sv.fade; STORM.wet = sv.wet; STORM.ice = sv.ice;
        STORM.cl = null; STORM.sndFast = stormIntensity > 0.2;
        return;
    }
    if (WX.left < 0) {
        // продолжение сохранённой игры: погода — та же, что была, когда вышли (дождём внезапно не начинается)
        let themes = 0; try { themes = getTotalCollectedThemes(); } catch (e) {}
        if (themes > 0) {
            let sv = null; try { sv = JSON.parse(localStorage.getItem('bubo_wx') || 'null'); } catch (e) {}
            if (sv && typeof sv.left === 'number') {
                WX.on = !!sv.on; WX.left = sv.left; WX.peak = sv.peak || 0.7;
                stormCover = sv.cover || 0; stormIntensity = sv.si || 0; STORM.fade = sv.fade || 0; STORM.wet = sv.wet || 0;
                STORM.cl = null; STORM.sndFast = stormIntensity > 0.2;
            } else WX.left = wxRand(F.first[0], F.first[1]);   // старое сохранение без погоды — ясно, гроза позже, как обычно
            return;
        }
        try { localStorage.removeItem('bubo_wx'); } catch (e) {}   // новая игра — своя случайная погода
        if (Math.random() < F.none) WX.left = 1e9;   // в этой игре грозы не будет
        else if (Math.random() < F.start) {
            wxStart(); stormCover = 1; stormIntensity = WX.peak; STORM.fade = 1;
            STORM.cl = null; STORM.sndFast = true; STORM.wet = 1;   // тучи расставятся сразу по всему небу, звук — без нарастания
        }
        else WX.left = wxRand(F.first[0], F.first[1]);
        return;
    }
    if (!gameActive) return;   // дальше время грозы идёт только в полёте
    // раз в ~2 с запоминаем погоду, чтобы при продолжении игры она была той же
    if ((STORM.saveT = (STORM.saveT || 0) + dt) > 2) {
        STORM.saveT = 0;
        try { localStorage.setItem('bubo_wx', JSON.stringify({ on: WX.on, left: WX.left, peak: WX.peak, cover: stormCover, si: Math.max(0, stormIntensity), fade: STORM.fade || 0, wet: STORM.wet || 0 })); } catch (e) {}
    }
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
    STORM.cl = { low: mkL(32, 0.7, 1.05, 24, 32), far: mkL(20, 0.75, 1.05, 19, 25), near: mkL(16, 1.35, 1.9, 15, 19), init: false };   // плывут спокойно
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
    // тучи плывут ровно справа налево, без рывков; новая туча выплывает из-за правого края и плавно проявляется,
    // при уходе туча не убегает, а продолжает плыть и медленно тает (цвет при этом возвращается к сиреневому)
    const wind = 0.6 * (1 + 0.2 * si) * dtMult / 60;
    alpha *= 0.55 + 0.45 * stormSmooth(0.3, 1, cv);   // сначала тучи полупрозрачные, как обычные облака; потом сгущаются
    for (const c of list) {
        const thr = c.t + lag, cw = CLOUD_W * c.k;
        if (first) c.on = cv >= thr;                       // игра началась уже в грозу — тучи сразу на месте
        if (!c.on && cv >= thr) { c.on = true; c.go = false; c.a = first ? 1 : 0; c.x = width + CLOUD_OX * c.k + Math.random() * width * 0.25; }   // выплывает из-за правого края
        if (c.on && (cv < thr - 0.04 || cv < 0.002)) c.go = true;           // тучи расходятся: эта больше не возвращается справа
        if (!c.on) continue;
        if (first && c.a == null) c.a = 1;
        c.a = c.go ? Math.max(0, (c.a == null ? 1 : c.a) - dtMult / 60 / 9) : Math.min(1, (c.a == null ? 0 : c.a) + dtMult / 60 / 4);   // проявляется ~4 с, тает ~9 с
        if (c.go && c.a <= 0) { c.on = false; continue; }
        c.x -= (width + cw) / c.tc * wind;
        if (c.x < -cw) {
            if (c.go) { c.on = false; continue; }
            c.x = width + CLOUD_OX * c.k + Math.random() * 60;
        }
        const y = yOf(c.yr);
        const dx = c.x - CLOUD_OX * c.k, dy = y - CLOUD_OY * c.k, dh = CLOUD_H * c.k;
        const al0 = alpha; alpha = al0 * c.a;
        ctx.globalAlpha = alpha;
        // цвет как у обычных облаков: пока тучи собираются — сиреневые облачка постепенно сереют до грозовых, при уходе — обратно
        const sk = stormSmooth(0, 0.85, cv);
        if (sk < 0.999 && typeof cloudSprite !== 'undefined' && cloudSprite) { ctx.globalAlpha = alpha * (1 - sk); ctx.drawImage(cloudSprite, dx, dy, cw, dh); }
        if (sk > 0.001) { ctx.globalAlpha = alpha * sk; ctx.drawImage(spr, dx, dy, cw, dh); }
        if (lit) { const m = stormMoonLit(c.x + cw * 0.15, y); if (m > 0.02) { ctx.globalAlpha = alpha * m * 0.8; ctx.drawImage(lit, dx, dy, cw, dh); } }
        alpha = al0;
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
        const lk = stormSmooth(0, 0.85, cv);   // освещение луной и тень нарастают вместе с грозой
        stormLitLayer(0.85 * lk, () => {
            stormDrawCloudLayer(L.low, spr.far, (r) => height * (0.34 + r * 0.17), cv, si, 0.9, 0, first, null);   // за домами, у горизонта
            stormDrawCloudLayer(L.far, spr.far, (r) => 20 + r * Math.max(10, yb - 70), cv, si, 0.9, 0, first, null);
        });
        // зарница внутри туч и сам разряд — между дальним и ближним слоем туч
        if (STORM.flash > 0.01) stormDrawFlashBack(yb);
        stormLitLayer(lk, () => stormDrawCloudLayer(L.near, spr.near, (r) => -12 + r * Math.max(10, yb - 40), cv, si, 0.97, 0, first, null));
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
// в дождь краски приглушаются: сова и трубы становятся серее и чуть темнее (фон и так серый — его почти не трогает)
function stormGradeK() { return Math.min(1, Math.max(0, STORM.wet || 0) * 1.2) * Math.min(1, stormCover || 0); }
function stormGrade() {
    const k = stormGradeK();
    if (k < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${(0.42 * k).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(178,184,200,${(0.5 * k).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}
// в дождь значки не тускнеют: рисуются поверх серой «пелены» в полную яркость и мягко светят вокруг, как огоньки в темноте.
// Сова, подлетая к значку, плавно возвращает свои цвета и окрашивается его светом с той стороны, где значок.
let __owlLitCv = null;
function stormDrawLitTokens(k, cz) {
    if (!items.length) return;
    ctx.save();
    if (Math.abs(cz - 1) > 0.0005) { ctx.translate(width / 2, height / 2); ctx.scale(cz, cz); ctx.translate(-width / 2, -height / 2); }
    const lowQ = gfxQuality === 'low';
    let best = null, bestA = 0;
    ctx.globalCompositeOperation = 'lighter';
    for (const it of items) {
        if ((it.scale !== undefined && it.scale <= 0.01) || it.x < -80 || it.x > width + 80) continue;
        const col = (CATEGORIES[it.type] || CATEGORIES.question).color, sc = (it.scale !== undefined ? it.scale : 1);
        if (!lowQ) { const R = it.radius * 3.2 * sc; ctx.globalAlpha = 0.26 * k; ctx.drawImage(tokenHalo(col), it.x - R, it.y - R, R * 2, R * 2); }   // мягкий свет вокруг
        if (owl && owl.visible && !it.collected) {
            const dist = Math.hypot(it.x - owl.x, it.y - owl.y), D = 190;
            if (dist < D) { const a = Math.pow(1 - dist / D, 1.4); if (a > bestA) { bestA = a; best = { col, dx: it.x - owl.x, dy: it.y - owl.y, dist }; } }
        }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // сова у значка: поверх серой — та же сова в цвете (тем сильнее, чем ближе), с цветным бликом со стороны значка
    if (best && bestA > 0.02 && (currentFreezeFactor || 0) < 0.05 && owl.visible) {
        try {
            const S = viewScale * renderScale, box = 150, px = Math.ceil(box * S);
            if (!__owlLitCv || __owlLitCv.width !== px) { __owlLitCv = document.createElement('canvas'); __owlLitCv.width = __owlLitCv.height = px; }
            const fc = __owlLitCv.getContext('2d'), main = ctx;
            fc.setTransform(1, 0, 0, 1, 0, 0); fc.globalCompositeOperation = 'source-over'; fc.globalAlpha = 1; fc.clearRect(0, 0, px, px);
            fc.setTransform(S, 0, 0, S, (box / 2 - owl.x) * S, (box / 2 - owl.y) * S);
            ctx = fc; try { owl.draw(); } finally { ctx = main; }
            fc.setTransform(1, 0, 0, 1, 0, 0); fc.globalCompositeOperation = 'source-atop';
            const ux = best.dx / (best.dist || 1), uy = best.dy / (best.dist || 1);
            const gx = px / 2 + ux * px * 0.16, gy = px / 2 + uy * px * 0.16;
            const g = fc.createRadialGradient(gx, gy, 0, gx, gy, px * 0.3);
            g.addColorStop(0, best.col + '73'); g.addColorStop(1, best.col + '00');   // цветной свет от значка
            fc.fillStyle = g; fc.fillRect(0, 0, px, px);
            fc.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(0.85, bestA * k * 1.1);
            ctx.drawImage(__owlLitCv, owl.x - box / 2, owl.y - box / 2, box, box);
            ctx.globalAlpha = 1;
        } catch (e) {}
    }
    items.forEach(drawToken);   // сами значки — в полную яркость
    ctx.restore();
}
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
        // толщина — не тоньше ~1,2 экранного пикселя: иначе при пониженном качестве косые штрихи «рвутся» лесенкой
        const S = Math.max(0.5, (typeof viewScale === 'number' ? viewScale : 1) * renderScale * (typeof WORLD_K === 'number' ? WORLD_K : 1));
        const lw = Math.max(pass ? 1.1 : 0.8, (pass ? 1.5 : 1.2) / S);
        ctx.globalAlpha = (pass ? (0.2 + 0.28 * heavy) : (0.14 + 0.22 * heavy)) * Math.min(1, (pass ? 1.1 : 0.8) / lw * 1.15);
        ctx.lineWidth = lw;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// ---------- мокрая сова: крошечные капли лежат прямо на контуре совы (как бусинки на трубах), медленно стекают вниз и срываются ----------
// вызывается из owl.draw в координатах тела совы; контур — тот же, что у тела (OWL_BODY_PTS)
function stormDrawOwlWet(g, o) {
    const wet = Math.max(STORM.wet || 0, o._wWet || 0), P = (typeof OWL_BODY_PTS !== 'undefined') ? OWL_BODY_PTS.p : null;   // мокнет в дождь или под «Водонапором»
    const B = o._wb || (o._wb = []);
    if (!P || (wet < 0.03 && !B.length && !(o._wbb && o._wbb.length))) return;
    const n = P.length, dt = (typeof dtMult === 'number' ? dtMult : 1);
    const at = (t) => { const i = ((Math.floor(t) % n) + n) % n, j = (i + 1) % n, f = t - Math.floor(t); return [P[i][0] + (P[j][0] - P[i][0]) * f, P[i][1] + (P[j][1] - P[i][1]) * f, i, j]; };
    // новые капли — на верхней половине контура (голова, спина, грудка)
    if (wet > 0.1 && B.length < 6 + Math.round(wet * 8) && Math.random() < 0.05 * wet * dt) {
        let t = 0, tries = 0;
        do { t = Math.random() * n; tries++; } while (at(t)[1] > 3 && tries < 8);
        if (at(t)[1] <= 3) B.push({ t, r: 0.4 + Math.random() * 1.15, age: 0, v: 0 });
    }
    // капли и на самом теле: на голове, боку, крыле — разного размера, медленно сползают вниз и пропадают
    const BB = o._wbb || (o._wbb = []);
    const inBody = (x, y) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    if (wet > 0.1 && BB.length < 3 + Math.round(wet * 7) && Math.random() < 0.04 * wet * dt) {
        for (let tr = 0; tr < 10; tr++) {
            const x = -13 + Math.random() * 24, y = -13 + Math.random() * 24;
            if (inBody(x, y) && Math.hypot(x - 5.2, y + 4) > 6.5) { BB.push({ x, y, r: 0.35 + Math.random() * 1.0, age: 0, v: 0.004 + Math.random() * 0.012 }); break; }
        }
    }
    for (let k = BB.length - 1; k >= 0; k--) {
        const b = BB[k]; b.age += dt;
        b.v = Math.min(0.09, b.v + 0.00012 * dt * b.r);   // крупная капля сползает быстрее
        b.y += b.v * dt; b.x -= b.v * 0.15 * dt;          // чуть назад по ходу полёта
        const life = Math.min(1, b.age / 25) * (wet < 0.02 ? 0 : 1);
        if (!inBody(b.x, b.y + b.r) || b.age > 700 || life <= 0) { BB.splice(k, 1); continue; }
        const r = b.r * (0.5 + 0.5 * Math.min(1, b.age / 30)), st = 1 + Math.min(0.5, b.v * 8);   // в движении чуть вытягивается
        g.save(); g.translate(b.x, b.y);
        g.globalAlpha = 0.55 * Math.min(1, wet * 2) * life; g.fillStyle = 'rgb(150, 196, 240)';
        g.beginPath(); g.ellipse(0, 0, r, r * st, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.5 * Math.min(1, wet * 2) * life; g.strokeStyle = 'rgba(90, 140, 200, 0.9)'; g.lineWidth = Math.max(0.12, r * 0.18);
        g.beginPath(); g.ellipse(0, 0, r, r * st, 0, 0.2, Math.PI - 0.2); g.stroke();   // тень снизу
        g.globalAlpha = 0.95 * Math.min(1, wet * 2) * life; g.fillStyle = '#F4FBFF';
        g.beginPath(); g.arc(-r * 0.35, -r * 0.35 * st, Math.max(0.15, r * 0.28), 0, Math.PI * 2); g.fill();   // блик
        g.restore();
    }
    g.save();
    for (let k = B.length - 1; k >= 0; k--) {
        const b = B[k]; b.age += dt;
        // стекает вниз по контуру: в сторону соседней точки, которая ниже; набирая вес, чуть быстрее
        const [x0, y0] = at(b.t), yF = at(b.t + 0.5)[1], yB = at(b.t - 0.5)[1];
        const dir = yF > yB ? 1 : -1, slope = Math.abs(yF - yB);
        b.v = Math.min(0.06, b.v + 0.0006 * dt * (0.3 + slope)) * (slope < 0.15 ? 0.9 : 1);
        b.t += dir * b.v * dt;
        const [x, y, i, j] = at(b.t);
        // внизу капля срывается
        if ((y > 13 && slope > 0.3) || b.age > 900 || wet < 0.02) {
            if (y > 13 && gameActive && typeof particles !== 'undefined') particles.push({ x: o.x + x * 1.29, y: o.y + (y + 2.7) * 1.29, vx: -0.2, vy: 1.2, color: '#ACD0F5', alpha: 0.8, size: 0.9, decay: 0.03 });
            B.splice(k, 1); continue;
        }
        // капля лежит на контуре: купол наружу, плоское основание по линии контура
        const tx = P[j][0] - P[i][0], ty = P[j][1] - P[i][1], ang = Math.atan2(ty, tx);
        let nx = -ty, ny = tx; if (nx * (x + 1) + ny * (y - 3) < 0) { nx = -nx; ny = -ny; }   // нормаль наружу (от центра тела)
        const out = Math.atan2(ny, nx), gr = Math.min(1, b.age / 30), r = b.r * (0.5 + 0.5 * gr);
        g.save(); g.translate(x, y); g.rotate(out + Math.PI / 2);
        g.globalAlpha = 0.75 * Math.min(1, wet * 2); g.fillStyle = 'rgb(172, 208, 245)';
        g.beginPath(); g.ellipse(0, 0, r, r * 1.1, 0, Math.PI, 0); g.ellipse(0, 0, r, r * 0.35, 0, 0, Math.PI); g.fill();
        g.globalAlpha = 0.9 * Math.min(1, wet * 2); g.fillStyle = '#F2FAFF';
        g.fillRect(-r * 0.45, -r * 0.8, Math.max(0.18, r * 0.4), Math.max(0.18, r * 0.4));
        g.restore();
    }
    g.restore();
}
