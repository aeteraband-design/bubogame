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
        const pc = document.documentElement.classList.contains('menu-pc');
        let sc = Math.min(wantW / baseW, (availH * (pc ? 0.7 : 0.62)) / baseH, 2.6);
        sc = Math.max(0.6, sc);
        if (Math.abs(sc - cur) < 0.005) return;
        logo.style.transform = 'scale(' + sc.toFixed(3) + ')';
        window.__logoScale = sc;
    }
    // ПК: логотип прижат к верху, на одной линии с кнопками по бокам, и крупный
    function pcMode() {
        const pc = window.innerWidth > 700 && window.innerWidth > window.innerHeight;
        document.documentElement.classList.toggle('menu-pc', pc);
        if (logo) logo.style.transformOrigin = '50% 50%';
    }
    pcMode(); window.addEventListener('resize', () => { pcMode(); fitLogo(); });
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
        { id: 'shazam', glow: '254,118,0', line: '#FFA733' },
        { id: 'speed', glow: '250,204,21', line: '#FDE047' },
        { id: 'dizzy', glow: '196,167,255', line: '#E9D5FF' }   // ударилась о трубу: звёздочки над головой — только в этом состоянии
    ];
    let order = [], dpr = 1, lastId = '';
    function nextState() {
        // все состояния по разу в случайном порядке, потом новая перетасовка (одно и то же два раза подряд не бывает)
        if (!order.length) {
            const a = STATES.slice();
            for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
            if (lastId && a[0].id === lastId) a.push(a.shift());
            order = a;
        }
        const st = order.shift(); lastId = st.id; return st;
    }

    // рисуем сову игры прямо в холст логотипа в нужном состоянии; все значения игры сразу возвращаем на место
    const LS = { stars: [], acc: 0 };   // звёздочки ускорения — те же, что в игре
    function drawOwlRaw(gc, px, x, y, size, state, rot, wing, now, fx, spin) {
        if (typeof owl === 'undefined' || !owl.draw || typeof ctx === 'undefined') return;
        const keys = ['x', 'y', 'rotation', 'visible', 'wing', 'lean', 'boostK', 'spinAngle'];
        const save = {}; keys.forEach(k => save[k] = owl[k]);
        const main = ctx, ga = gameActive, wft = waitingFirstTap, dm = dtMult, fr = frame,
            d = currentDrunkFactor, fz = currentFreezeFactor, ov = currentOvereatFactor, vs = viewScale, rs = renderScale;
        const hasShz = typeof SHZ !== 'undefined', shk = hasShz ? SHZ.k : 0, inv0 = invulnerableTime;
        try {
            const k = size / 96 * px;
            const sc = Math.cos(spin || 0), sn = Math.sin(spin || 0);
            gc.setTransform(k * sc, k * sn, -k * sn, k * sc, x * px, y * px);   // spin — вращение всей совы (замёрзшая кувыркается, как в игре)
            gameActive = false; waitingFirstTap = false; dtMult = 1; frame = now / 16.67;
            currentDrunkFactor = state.id === 'drunk' ? 1 : 0;
            currentFreezeFactor = state.id === 'freeze' ? 1 : 0;
            currentOvereatFactor = state.id === 'fat' ? 1 : 0;
            if (hasShz) SHZ.k = state.id === 'shazam' ? 1 : 0;
            owl.x = 0; owl.y = 0; owl.rotation = rot; owl.visible = true; owl.wing = state.id === 'freeze' ? 0 : wing; owl.lean = (state.id === 'speed' || state.id === 'shazam') ? 0.3 : 0;   // ускорение и ШАЗАМ — сова наклонена вперёд owl.boostK = state.id === 'speed' ? 1 : 0; owl.spinAngle = 0;
            ctx = gc; window.__noBlink = true; invulnerableTime = state.id === 'dizzy' ? 70 : 0;   // звёздочки над головой — только у «оглушённой» совы
            // ускорение и ШАЗАМ: из-за совы вылетают звёздочки, как в игре (те же функции игры)
            if (fx && (state.id === 'speed' || state.id === 'shazam') && typeof updateSpeedStars === 'function') {
                const ss_ = speedStars, sr_ = speedRamp, sa_ = speedStarAcc, sbt_ = speedBoostTime, sga = gameActive, shA = window.shazamActive;
                speedStars = LS.stars; speedRamp = 1; speedStarAcc = LS.acc; speedBoostTime = 9999; gameActive = true;
                if (state.id === 'shazam') window.shazamActive = () => true;
                try { updateSpeedStars(); drawSpeedStars(); }
                finally { LS.stars = speedStars; LS.acc = speedStarAcc; speedStars = ss_; speedRamp = sr_; speedStarAcc = sa_; speedBoostTime = sbt_; gameActive = sga; if (state.id === 'shazam') window.shazamActive = shA; }
            }
            if (state.id === 'freeze' && typeof drawFrozenOwl === 'function') { viewScale = k; renderScale = 1; drawFrozenOwl(); }
            else owl.draw();
        } catch (e) {}
        finally {
            ctx = main; window.__noBlink = false; invulnerableTime = inv0; gameActive = ga; waitingFirstTap = wft; dtMult = dm; frame = fr;
            currentDrunkFactor = d; currentFreezeFactor = fz; currentOvereatFactor = ov; viewScale = vs; renderScale = rs;
            if (hasShz) SHZ.k = shk;
            keys.forEach(k => owl[k] = save[k]);
            gc.setTransform(px, 0, 0, px, 0, 0);
        }
    }
    // визуальный центр совы в каждом состоянии (по видимым пикселям) — чтобы сова стояла ровно по центру плитки
    const CENTER = {};
    function owlCenter(state) {
        if (CENTER[state.id]) return CENTER[state.id];
        let r = { dx: 0, dy: 0, w: 1, h: 1 };
        try {
            // большой холст (сова не обрезается), только плотные пиксели (без мягких свечений), крылья в разных положениях
            const N = 480, S = 120, c = document.createElement('canvas'); c.width = c.height = N; const cc = c.getContext('2d');
            let x0 = N, y0 = N, x1 = 0, y1 = 0;
            [0, 0.5, 1].forEach((wg) => {
                cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, N, N);
                drawOwlRaw(cc, 1, N / 2, N / 2, S, state, 0, wg, 0);
                const px = cc.getImageData(0, 0, N, N).data;
                for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (px[(y * N + x) * 4 + 3] > 150) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            });
            if (x1 > x0) r = { dx: ((x0 + x1) / 2 - N / 2) / S, dy: ((y0 + y1) / 2 - N / 2) / S, w: (x1 - x0) / S, h: (y1 - y0) / S };
        } catch (e) {}
        return (CENTER[state.id] = r);
    }
    window.__owlCenter = (id) => owlCenter(STATES.find(x => x.id === id));
    function owlSize(state, size) {
        const c = owlCenter(state.id === 'shazam' ? STATES.find(t => t.id === 'speed') : (state.id === 'dizzy' ? STATES.find(t => t.id === 'normal') : state));
        return state.id === 'fat' ? size : size * 0.56 / Math.max(0.3, c.w, c.h);   // одинаково крупно во всех состояниях; «полная» — по своему размеру
    }
    function drawOwlState(x, y, size, state, rot, wing, now, spin, gc, px, fx) {
        // ШАЗАМ: молнии вокруг совы не считаем — центр и размер как у наклонённой совы (ускорение)
        const c = owlCenter(state.id === 'shazam' ? STATES.find(t => t.id === 'speed') : (state.id === 'dizzy' ? STATES.find(t => t.id === 'normal') : state));
        size = owlSize(state, size);
        const a = spin || 0, cs = Math.cos(a), sn = Math.sin(a), dx = c.dx * size, dy = c.dy * size;
        // крутим вокруг видимого центра совы: она остаётся ровно посередине плитки
        drawOwlRaw(gc || g, px || dpr, x - (dx * cs - dy * sn), y - (dx * sn + dy * cs), size, state, rot, wing, now, fx !== false, a);
    }



    const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const back = (t) => { t = Math.max(0, Math.min(1, t)); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const DUR = 4.2;
    let state = null, t0 = 0, raf = 0, nextAt = performance.now() + 2500, sparks = [], flags = {}, lastT = 0;

    function canRun() {
        const ss = document.getElementById('startScreen');
        if (!ss || ss.classList.contains('hidden') || document.hidden) return false;
        if (document.documentElement.classList.contains('booting') || window.__booting) return false;
        if (performance.now() < (window.__logoAnimHold || 0)) return false;   // после загрузки логотип сначала появляется джойстиком
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
    // ускорение: позади совы проносятся светлые полоски и звёздочки
    function speedLines(tx, ty, ts, k) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
            const u = (k * 1.6 + i / 6) % 1, y = ty - ts * 0.35 + (i % 3) * ts * 0.3 + (i > 2 ? ts * 0.08 : 0), x = tx - ts * 0.25 - u * ts * 1.1, len = ts * (0.35 + (i % 2) * 0.2);
            const gr = g.createLinearGradient(x - len, 0, x, 0);
            gr.addColorStop(0, 'rgba(253,224,71,0)'); gr.addColorStop(1, `rgba(255,236,150,${(0.75 * (1 - u)).toFixed(2)})`);
            g.fillStyle = gr; g.fillRect(x - len, y, len, 2);
        }
        g.restore();
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
    const sparkCol = (s) => s.id === 'speed' ? '#FDE047' : s.id === 'freeze' ? '#BAE6FD' : s.id === 'drunk' ? '#5EEAD4' : s.id === 'fat' ? '#F9A8D4' : s.id === 'shazam' ? '#FFB45C' : '#C4A1FF';

    // главный логотип — крупная сова в плитке (картинка, нарисованная той же функцией, что и в игре); джойстик появляется только в анимации
    const NORMAL = STATES.find(t => t.id === 'normal');
    let home = null;
    function makeHomeOwl() {
        try {
            const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
            drawOwlState(S / 2, S / 2, S * 1.3, NORMAL, 0, 0.5, 0, 0, c.getContext('2d'), 1, false);
            window.__logoOwlSrc = c.toDataURL('image/png');
        } catch (e) { return; }
        const put = (t) => {
            if (!t || t.querySelector('.lg-owl')) return t && t.querySelector('.lg-owl');
            const im = document.createElement('img'); im.className = 'lg-owl'; im.alt = ''; im.src = window.__logoOwlSrc; im.draggable = false;
            t.classList.add('lg-home'); t.appendChild(im); return im;
        };
        home = put(tile);
        document.querySelectorAll('#gameOverModal .shrink-0 > .fa-gamepad, #bootLoader .fa-gamepad').forEach(ic => put(ic.parentElement));
        window.__logoOwlPut = put;
        setHome(1); setIcon(0, 0, 0);
    }
    function setHome(sc) { if (home) { home.style.transform = 'scale(' + sc.toFixed(3) + ')'; home.style.opacity = sc > 0.01 ? '1' : '0'; } }
    const T_A = 0, T_B = 0, T_C = 0.65, T_D = 5.0, T_E = 0.65;   // логотип — джойстик: джойстик→сова в состоянии (≈6 с) → снова джойстик   // сова→джойстик, джойстик держится, джойстик→состояние, состояние, состояние→сова
    const DUR2 = T_A + T_B + T_C + T_D + T_E;
    function tick(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
        if (!state) {
            if (now < nextAt) return;
            if (!canRun()) { nextAt = now + 2000; return; }
            state = nextState(); t0 = now; flags = {}; sparks = [];
            tile.style.setProperty('--lc', state.line);
        }
        if (!canRun()) { stop(); return; }
        const L = sizeCanvas(), t = (now - t0) / 1000, { tx, ty, ts } = L;
        g.clearRect(0, 0, L.w, L.h);
        const OS = ts * 1.3, col = state.glow;
        const b1 = T_A, b2 = b1 + T_B, b3 = b2 + T_C, b4 = b3 + T_D;
        if (t < b1) {   // 1) сова сжимается — вспышка — выпрыгивает джойстик
            const k = t / T_A;
            setHome(1 - ease(Math.min(1, k / 0.45)));
            glow(tx, ty, ts * 1.3, 0.6 * Math.sin(Math.PI * k), '255,200,120');
            if (k > 0.35) { if (!flags.j1) { flags.j1 = 1; burst(tx, ty, 8, '#FFE08A'); } const s = back((k - 0.35) / 0.65); setIcon(s, s, 1); }
            else setIcon(0, 0, 0);
        } else if (t < b2) {   // 2) джойстик
            setHome(0); setIcon(1, 1, 1);
            if (t > b2 - 0.3) lgOn(true);
        } else if (t < b3) {   // 3) джойстик сжимается — выпрыгивает сова в своём состоянии
            setHome(0); lgOn(true);
            const k = (t - b2) / T_C;
            const js = 1 - ease(Math.min(1, k / 0.45));
            setIcon(js, js, 1);
            glow(tx, ty, ts * 1.5, 0.9 * ease(k), col);
            if (k > 0.35) {
                if (!flags.pop) { flags.pop = 1; burst(tx, ty, 10, sparkCol(state)); }
                const s = back((k - 0.35) / 0.65);
                drawOwlState(tx, ty, OS * s, state, 0, 0.5, now, state.id === 'freeze' ? (t - b2) * 4.2 : 0);
            }
        } else if (t < b4) {   // 4) сова в своём состоянии, ровно по центру плитки
            setHome(0); setIcon(0, 0, 0);
            const k = t - b3;
            const pulse = 0.85 + 0.15 * Math.sin(k * 5);
            glow(tx, ty, ts * 1.5 * pulse, 0.9, col);
            glow(tx, ty, ts * 0.9, 0.5, '255,220,170');
            const wing = (state.id === 'shazam' || state.id === 'speed') ? Math.max(0, Math.sin(now / 90)) : 0.5 + 0.5 * Math.sin(k * 9) * (k < 1.6 ? 1 : 0.5);
            const rot = state.id === 'drunk' ? Math.sin(k * 3.2) * 0.18 : 0;
            drawOwlState(tx, ty, OS, state, rot, wing, now, state.id === 'freeze' ? (t - b2) * 4.2 : 0);   // замёрзшая кувыркается, как в игре
        } else {   // 5) сова-состояние сжимается — вспышка — возвращается главная сова
            if (home) setIcon(0, 0, 0);
            const k = Math.min(1, (t - b4) / T_E);
            const os = 1 - ease(Math.min(1, k / 0.45));
            glow(tx, ty, ts * 1.5, 0.9 * (1 - k), col);
            if (os > 0.01) drawOwlState(tx, ty, OS * os, state, 0, 0.5, now, state.id === 'freeze' ? (t - b2) * 4.2 : 0);
            if (k > 0.2) lgOn(false);
            if (k > 0.35) { if (!flags.back) { flags.back = 1; burst(tx, ty, 8, '#FFE08A'); } const s = back((k - 0.35) / 0.65); if (home) setHome(s); else setIcon(s, s, 1); }
            else setHome(0);
        }
        // плавное появление и угасание эффекта на надписи
        txtK(t < b2 ? 0 : t < b2 + 0.6 ? ease((t - b2) / 0.6) : t > DUR2 - 1 ? ease((DUR2 - t) / 1) : 1);
        drawSparks(dt);
        if (t >= DUR2) { stop(); return; }
        raf = requestAnimationFrame(tick);
    }
    function stop() {
        state = null; sparks = []; LS.stars = []; LS.acc = 0; lgOn(false); txtK(0);
        if (home) { setHome(1); setIcon(0, 0, 0); } else resetIcon();
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        nextAt = performance.now() + 1700;   // джойстик ≈2 с (с переходами), потом снова сова
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
    setInterval(() => { if (!state && !raf) schedule(); }, 1000);
    // makeHomeOwl();   // сова как постоянный логотип — отключено, логотип снова джойстик
    schedule();
    window.logoAnimPlay = (id) => { const s = STATES.find(x => x.id === id); if (s) order.unshift(s); nextAt = 0; schedule(); };
})();
