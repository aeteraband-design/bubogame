// Тонкая полоска прокрутки во всех окнах: едет прямо по правой обводке окна, цвета окна,
// и не заходит на скругление углов (останавливается чуть раньше). Встроенные полосы браузера скрыты.
// Полоска рисуется верхним слоем фона самого окна (фон не листается вместе с содержимым и лежит под обводкой),
// поэтому она всегда точно на линии обводки — на iPhone, Android и ПК, при любом масштабе окна.
(function () {
    const L = [   // что листается, по чьей обводке едет полоска, цвет
        { s: '#qzWin', c: '#38BDF8' },
        { s: '#shWin', c: '#FFC53D' },
        { s: '#rlWin', c: '#FE7600' },
        { s: '#rwWindow', c: '#F472B6' },
        { s: '#settingsModal .custom-scroll', f: '#settingsModal .glass-panel', c: '#A855F7' },
        { s: '#adminModal #admBody', f: '#adminModal .adm-panel', c: '#FE7600' },
        { s: '#startScreen', c: '#A855F7', edge: true }
    ];
    const st = document.createElement('style');
    st.textContent = L.map(o => o.s).join(',') + '{scrollbar-width:none!important}'
        + L.map(o => o.s + '::-webkit-scrollbar').join(',') + '{display:none!important;width:0!important;height:0!important}';
    document.head.appendChild(st);
    const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };
    const items = L.map(o => ({ o, t: 0, a: 0, g: 0, fr: null, rgb: rgb(o.c) }));
    const vis = (el) => el && el.offsetParent !== null && el.getClientRects().length > 0 && !el.closest('.hidden');
    // добавляем окну два слоя фона: полоска (2px, концы плавно скруглены) и мягкое овальное свечение — без обрезанных краёв
    function attach(it, fr) {
        if (it.fr === fr) return;
        it.fr = fr;
        const cs = getComputedStyle(fr), img = cs.backgroundImage, has = img && img !== 'none';
        const add = (mine, orig) => mine + (has && orig ? ', ' + orig : '');
        const set = (p, v) => fr.style.setProperty(p, v, 'important');
        set('background-image', add('linear-gradient(to bottom,transparent,var(--sbC,transparent) 2px,var(--sbC,transparent) calc(100% - 2px),transparent), radial-gradient(farthest-side at 100% 50%,var(--sbG,transparent),transparent)', has ? img : ''));
        set('background-position', add('right var(--sbX,0px) top var(--sbY,0px), right var(--sbX,0px) top var(--sbGY,0px)', cs.backgroundPosition));
        set('background-size', add('2px var(--sbH,0px), 16px var(--sbGH,0px)', cs.backgroundSize));
        set('background-repeat', add('no-repeat, no-repeat', cs.backgroundRepeat));
        set('background-origin', add('border-box, border-box', cs.backgroundOrigin));
        set('background-clip', add('border-box, border-box', cs.backgroundClip));
        set('background-attachment', add('scroll, scroll', cs.backgroundAttachment));
    }
    function place(it, now) {
        const sc = document.querySelector(it.o.s);
        const fr = sc && ((it.o.f && document.querySelector(it.o.f)) || sc);
        const show = vis(sc) && sc.scrollHeight - sc.clientHeight >= 4;
        const act = show && now - it.t < 700;   // листают сейчас: полоска ярче и светится, потом свечение плавно гаснет
        const target = show ? (act ? 1 : 0.4) : 0, gt = act ? 1 : 0;
        it.a += (target - it.a) * (act ? 0.3 : 0.08); if (Math.abs(target - it.a) < 0.01) it.a = target;
        it.g += (gt - it.g) * (act ? 0.3 : 0.06); if (Math.abs(gt - it.g) < 0.01) it.g = gt;
        if (!fr) return false;
        if (!show && it.a <= 0 && it.g <= 0) { if (it.fr) it.fr.style.setProperty('--sbC', 'transparent'); if (it.fr) it.fr.style.setProperty('--sbG', 'transparent'); return false; }
        attach(it, fr);
        const cs = getComputedStyle(fr);
        const rad = it.o.edge ? 0 : Math.max(parseFloat(cs.borderTopRightRadius) || 0, parseFloat(cs.borderBottomRightRadius) || 0);
        const pad = it.o.edge ? 6 : rad + 5;   // не заходим на скругление: останавливаемся на 5 px раньше
        const len = fr.offsetHeight - pad * 2;
        if (len < 20) return false;
        const ratio = sc.clientHeight / Math.max(1, sc.scrollHeight), h = Math.max(22, len * ratio);
        const p = sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight);
        fr.style.setProperty('--sbX', it.o.edge ? '2px' : '0px');
        fr.style.setProperty('--sbY', (pad + (len - h) * Math.min(1, Math.max(0, p))).toFixed(1) + 'px');
        fr.style.setProperty('--sbH', h.toFixed(1) + 'px');
        fr.style.setProperty('--sbGY', (pad + (len - h) * Math.min(1, Math.max(0, p)) - 14).toFixed(1) + 'px');
        fr.style.setProperty('--sbGH', (h + 28).toFixed(1) + 'px');
        fr.style.setProperty('--sbC', 'rgba(' + it.rgb + ',' + it.a.toFixed(3) + ')');
        fr.style.setProperty('--sbG', 'rgba(' + it.rgb + ',' + (it.g * 0.45).toFixed(3) + ')');
        return show && (act || it.a !== target || it.g !== gt) || (!show && (it.a > 0 || it.g > 0));
    }
    let raf = 0;
    function loop() {
        raf = 0; const now = performance.now(); let any = false;
        items.forEach(it => { if (place(it, now)) any = true; });
        if (any) raf = requestAnimationFrame(loop);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    document.addEventListener('scroll', (e) => {
        const now = performance.now();
        items.forEach(it => { const sc = document.querySelector(it.o.s); if (sc && (e.target === sc)) it.t = now; });
        kick();
    }, true);
    window.addEventListener('resize', kick);
    setInterval(kick, 400);   // окно открылось / закрылось
    kick();
})();
