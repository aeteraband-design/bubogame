// Живой логотип в главном меню: время от времени джойстик превращается в сову — каждый раз в одном из её состояний
// (обычная, замёрзшая, пьяная с крутящимися глазами, объевшаяся, в ШАЗАМе), а потом снова в джойстик
(function () {
    const wrap = document.querySelector('#startScreen > .menu-logo-wrap');
    if (!wrap) return;
    const icon = wrap.querySelector('.fa-gamepad'), tile = icon && icon.parentElement;
    if (!icon || !tile) return;
    wrap.style.position = 'relative';
    const cv = document.createElement('canvas');
    cv.className = 'logo-fx';
    wrap.appendChild(cv);
    const g = cv.getContext('2d');
    const st = document.createElement('style');
    st.textContent = '#startScreen > .menu-logo-wrap .logo-fx{position:absolute;left:0;right:0;top:-120px;bottom:-100px;width:100%;height:calc(100% + 220px);pointer-events:none;z-index:3}'
        + '#startScreen > .menu-logo-wrap .fa-gamepad{display:inline-block;will-change:transform}'
        // пока идёт превращение — по обводке плитки бежит блик цвета состояния совы (как рамка таймера ШАЗАМа), линия одна
        + '@property --lgA{syntax:"<angle>";inherits:false;initial-value:0deg}'
        + '#startScreen > .menu-logo-wrap .lg-tile{position:relative;transition:border-color .5s,box-shadow .5s}'
        + '#startScreen > .menu-logo-wrap .lg-tile::before{content:"";position:absolute;inset:-1.5px;border-radius:inherit;padding:1.5px;pointer-events:none;opacity:0;transition:opacity .5s;'
        + 'background:conic-gradient(from var(--lgA),color-mix(in srgb,var(--lc) 55%,transparent) 0deg 190deg,var(--lc) 240deg,#fff 265deg,var(--lc) 290deg,color-mix(in srgb,var(--lc) 55%,transparent) 340deg 360deg);'
        + '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:lgRun 1.6s linear infinite}'
        + '#startScreen > .menu-logo-wrap .lg-tile.lg-on.lg-on.lg-on{border-color:transparent!important;box-shadow:0 0 14px color-mix(in srgb,var(--lc) 55%,transparent),0 6px 14px rgba(0,0,0,.3)!important}'
        + '#startScreen > .menu-logo-wrap .lg-tile.lg-on::before{opacity:1}'
        + '@keyframes lgRun{to{--lgA:360deg}}'
        // надпись: по словам пробегает белый блик (цвета BUBO/GAME и их свечение остаются своими); сила блика (--lgk) плавно нарастает и угасает
        + '#startScreen > .menu-logo-wrap .lg-txt.lg-on > span{color:transparent!important;-webkit-background-clip:text;background-clip:text;background-size:280% 100%;animation:lgShine 2.1s linear infinite;'
        + 'background-image:linear-gradient(105deg,var(--wc) 0%,var(--wc) 36%,color-mix(in srgb,#fff calc(var(--lgk,0) * 92%),var(--wc)) 47%,color-mix(in srgb,#fff calc(var(--lgk,0) * 55%),var(--wc)) 52%,var(--wc) 63%,var(--wc) 100%)}'
        + '#startScreen > .menu-logo-wrap .lg-txt > span:nth-child(1){--wc:#FE7600}#startScreen > .menu-logo-wrap .lg-txt > span:nth-child(2){--wc:#A855F7}'
        + '#startScreen > .menu-logo-wrap .lg-txt.lg-on > span:nth-child(2){animation-delay:.35s}'
        + '@keyframes lgShine{from{background-position:100% 0}to{background-position:0 0}}';
    tile.classList.add('lg-tile');
    // размер логотипа под экран: на высоких экранах крупнее (до 1,4×), на низких — уменьшается; всегда по центру между верхом и блоками меню
    const logo = wrap.firstElementChild;
    function fitLogo() {
        if (!logo) return;
        // считаем в экранных пикселях: ширина логотипа — до трети с небольшим ширины экрана (на ПК крупно), но не шире блоков меню;
        // по высоте — не больше чем ~55% свободного места между верхней панелью и блоками, чтобы сверху и снизу оставался воздух
        const cur = window.__logoScale || 1, lr = logo.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), cs = getComputedStyle(wrap);
        const k = wrap.offsetHeight ? wr.height / wrap.offsetHeight : 1;
        const baseW = lr.width / cur, baseH = lr.height / cur;
        const availH = (wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * k;
        if (!baseW || !baseH || availH <= 0) return;
        const wantW = window.innerWidth > 700 ? Math.min(window.innerWidth * 0.36, wr.width * 0.9) : wr.width * 0.86;   // телефон — почти во всю ширину блоков, ПК — около трети экрана
        let sc = Math.min(wantW / baseW, (availH * 0.62) / baseH, 2.6);
        sc = Math.max(0.6, sc);
        if (Math.abs(sc - cur) < 0.005) return;
        logo.style.transform = 'scale(' + sc.toFixed(3) + ')';
        window.__logoScale = sc;
    }
    logo && (logo.style.transformOrigin = '50% 50%');
    try { new ResizeObserver(fitLogo).observe(wrap); } catch (e) {}
    window.addEventListener('resize', fitLogo);
    setTimeout(fitLogo, 0); setTimeout(fitLogo, 600);
    try { new ResizeObserver(() => spanCanvas()).observe(wrap); } catch (e) {}
    // надпись: блик пробегает по словам целиком
    const txt = wrap.querySelector('.tracking-tight');
    if (txt) txt.classList.add('lg-txt');
    const lgOn = (on) => { tile.classList.toggle('lg-on', on); };
    const txtK = (k) => { if (!txt) return; txt.style.setProperty('--lgk', k.toFixed(3)); txt.classList.toggle('lg-on', k > 0.001); };
    document.head.appendChild(st);

    // состояния совы и цвет подсветки за ней
    const STATES = [
        { id: 'normal', glow: '168,85,247', line: '#C4A1FF' },
        { id: 'freeze', glow: '125,211,252', line: '#7DD3FC' },
        { id: 'drunk', glow: '45,212,191', line: '#5EEAD4' },
        { id: 'fat', glow: '244,114,182', line: '#F9A8D4' },
        { id: 'shazam', glow: '254,118,0', line: '#FFA733' }
    ];
    let order = [], dpr = 1;
    function nextState() {
        if (!order.length) { order = STATES.slice().sort(() => Math.random() - 0.5); }
        return order.shift();
    }

    // рисуем сову игры прямо в холст логотипа в нужном состоянии; все значения игры сразу возвращаем на место
    function drawOwlState(x, y, size, state, rot, wing, now) {
        if (typeof owl === 'undefined' || !owl.draw || typeof ctx === 'undefined') return;
        const keys = ['x', 'y', 'rotation', 'visible', 'wing', 'lean', 'boostK', 'spinAngle'];
        const save = {}; keys.forEach(k => save[k] = owl[k]);
        const main = ctx, ga = gameActive, wft = waitingFirstTap, dm = dtMult, fr = frame,
            d = currentDrunkFactor, fz = currentFreezeFactor, ov = currentOvereatFactor, vs = viewScale, rs = renderScale;
        const hasShz = typeof SHZ !== 'undefined', shk = hasShz ? SHZ.k : 0;
        try {
            const k = size / 96 * dpr;
            g.setTransform(k, 0, 0, k, x * dpr, y * dpr);
            gameActive = false; waitingFirstTap = false; dtMult = 1; frame = now / 16.67;
            currentDrunkFactor = state.id === 'drunk' ? 1 : 0;
            currentFreezeFactor = state.id === 'freeze' ? 1 : 0;
            currentOvereatFactor = state.id === 'fat' ? 1 : 0;
            if (hasShz) SHZ.k = state.id === 'shazam' ? 1 : 0;
            owl.x = 0; owl.y = 0; owl.rotation = rot; owl.visible = true; owl.wing = state.id === 'freeze' ? 0 : wing; owl.lean = 0; owl.boostK = 0; owl.spinAngle = 0;
            ctx = g;
            if (state.id === 'freeze' && typeof drawFrozenOwl === 'function') { viewScale = k; renderScale = 1; drawFrozenOwl(); }
            else owl.draw();
        } catch (e) {}
        finally {
            ctx = main; gameActive = ga; waitingFirstTap = wft; dtMult = dm; frame = fr;
            currentDrunkFactor = d; currentFreezeFactor = fz; currentOvereatFactor = ov; viewScale = vs; renderScale = rs;
            if (hasShz) SHZ.k = shk;
            keys.forEach(k => owl[k] = save[k]);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const back = (t) => { t = Math.max(0, Math.min(1, t)); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const DUR = 4.2;
    let state = null, t0 = 0, raf = 0, nextAt = performance.now() + 5000, sparks = [], flags = {}, lastT = 0;

    function canRun() {
        const ss = document.getElementById('startScreen');
        if (!ss || ss.classList.contains('hidden') || document.hidden) return false;
        if (document.documentElement.classList.contains('booting') || window.__booting) return false;
        const cs = getComputedStyle(ss);
        if (cs.visibility === 'hidden' || +cs.opacity < 0.5) return false;
        // открыто окно поверх меню — не отвлекаем
        return !['#quizModal', '#shopModal', '#rouletteModal', '#settingsModal', '#rulesModal', '#adminModal'].some(s => { const m = document.querySelector(s); return m && !m.classList.contains('hidden') && m.offsetParent !== null; });
    }
    // холст свечения — ровно во всю ширину экрана меню: свечение не обрезается у логотипа и не создаёт прокрутку вбок
    function spanCanvas() {
        const ss = document.getElementById('startScreen'); if (!ss) return;
        const wr = wrap.getBoundingClientRect(), sr = ss.getBoundingClientRect(), k = wrap.offsetWidth ? wr.width / wrap.offsetWidth : 1;
        if (!sr.width || !k) return;
        cv.style.left = ((sr.left - wr.left) / k).toFixed(1) + 'px';
        cv.style.right = 'auto';
        cv.style.width = (ss.clientWidth * (sr.width / ss.offsetWidth || 1) / k).toFixed(1) + 'px';
    }
    window.addEventListener('resize', spanCanvas);
    function sizeCanvas() {
        spanCanvas();
        const r = cv.getBoundingClientRect(), k = cv.offsetWidth ? r.width / cv.offsetWidth : 1;
        dpr = Math.min(2.5, window.devicePixelRatio || 1) * k;
        const W = Math.round(cv.offsetWidth * dpr), H = Math.round(cv.offsetHeight * dpr);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const tr = tile.getBoundingClientRect();
        return { w: cv.offsetWidth, h: cv.offsetHeight, tx: (tr.left - r.left + tr.width / 2) / k, ty: (tr.top - r.top + tr.height / 2) / k, ts: tr.width / k };
    }
    function glow(x, y, r, a, col) {
        if (a <= 0.01) return;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${col},${(0.55 * a).toFixed(3)})`); gr.addColorStop(0.5, `rgba(${col},${(0.22 * a).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    function burst(x, y, n, col) {
        for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n + Math.random() * 0.4, v = 40 + Math.random() * 50; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.55 + Math.random() * 0.3, col, s: 5 + Math.random() * 5 }); }
    }
    function drawSparks(dt) {
        sparks = sparks.filter(p => (p.life += dt) < p.max);
        sparks.forEach(p => {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95;
            const k = 1 - p.life / p.max;
            g.save(); g.globalAlpha = k; g.fillStyle = p.col; g.shadowColor = p.col; g.shadowBlur = 8;
            g.font = `900 ${(p.s * (0.6 + k * 0.6)).toFixed(1)}px Onest,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('✦', p.x, p.y); g.restore();
        });
    }
    function setIcon(sx, sy, op) {
        icon.style.transform = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
        icon.style.opacity = op == null ? '' : String(op);
    }
    function resetIcon() { icon.style.transform = ''; icon.style.opacity = ''; }
    const sparkCol = (s) => s.id === 'freeze' ? '#BAE6FD' : s.id === 'drunk' ? '#5EEAD4' : s.id === 'fat' ? '#F9A8D4' : s.id === 'shazam' ? '#FFB45C' : '#C4A1FF';

    function tick(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
        if (!state) {
            if (now < nextAt) return;
            if (!canRun()) { nextAt = now + 2000; return; }
            state = nextState(); t0 = now; flags = {}; sparks = [];
            tile.style.setProperty('--lc', state.line); lgOn(true);
        }
        if (!canRun()) { stop(); return; }
        const L = sizeCanvas(), t = (now - t0) / 1000, { tx, ty, ts } = L;
        g.clearRect(0, 0, L.w, L.h);
        const OS = ts * 1.3, col = state.glow;
        if (t < 0.45) {   // 1) джойстик сжимается и исчезает со вспышкой
            const k = t / 0.45;
            const sx = k < 0.5 ? 1 + 0.25 * ease(k * 2) : lerp(1.25, 0, ease((k - 0.5) * 2)), sy = k < 0.5 ? 1 - 0.35 * ease(k * 2) : lerp(0.65, 0, ease((k - 0.5) * 2));
            setIcon(sx, sy);
            glow(tx, ty, ts * 1.4, ease(k) * 0.8, col);
        } else if (t < DUR - 0.65) {   // 2) появляется сова в своём состоянии, в мягкой размытой подсветке
            setIcon(0, 0, 0);
            if (!flags.pop) { flags.pop = 1; burst(tx, ty, 10, sparkCol(state)); }
            const k = t - 0.45;
            const s = back(Math.min(1, k / 0.4)), bob = Math.sin(k * 4.2) * 2.5, pulse = 0.85 + 0.15 * Math.sin(k * 5);
            glow(tx, ty, ts * 1.5 * pulse, 0.9, col);
            glow(tx, ty, ts * 0.9, 0.5, '255,220,170');
            const wing = state.id === 'shazam' ? Math.max(0, Math.sin(now / 90)) : (k < 0.4 ? 1 : Math.max(0, Math.sin(k * 9)) * (k < 1.6 ? 1 : 0.4));
            const rot = state.id === 'drunk' ? Math.sin(k * 3.2) * 0.18 : Math.sin(k * 3) * 0.05;
            drawOwlState(tx, ty + (state.id === 'freeze' ? 0 : bob) - 2, OS * s, state, rot, wing, now);
        } else {   // 3) сова сжимается — джойстик возвращается
            const k = (t - (DUR - 0.65)) / 0.65;
            const os = 1 - ease(Math.min(1, k / 0.45));
            glow(tx, ty, ts * 1.5, 0.9 * (1 - k), col);
            if (os > 0.01) drawOwlState(tx, ty - 2, OS * os, state, 0, 0.5, now);
            if (k > 0.2) lgOn(false);
            if (k > 0.35) { if (!flags.back) { flags.back = 1; burst(tx, ty, 8, '#FFE08A'); } const s = back((k - 0.35) / 0.65); setIcon(s, s, 1); }
            else setIcon(0, 0, 0);
        }
        // плавное появление и угасание эффекта на надписи
        txtK(t < 0.6 ? ease(t / 0.6) : t > DUR - 1 ? ease((DUR - t) / 1) : 1);
        drawSparks(dt);
        if (t >= DUR) { stop(); return; }
        raf = requestAnimationFrame(tick);
    }
    function stop() {
        state = null; resetIcon(); sparks = []; lgOn(false); txtK(0);
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        nextAt = performance.now() + 9000 + Math.random() * 4000;
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
    setInterval(() => { if (!state && !raf) schedule(); }, 1000);
    schedule();
    window.logoAnimPlay = (id) => { const s = STATES.find(x => x.id === id); if (s) order.unshift(s); nextAt = 0; schedule(); };
})();
