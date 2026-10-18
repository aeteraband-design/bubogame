// Тонкая полоска прокрутки во всех окнах: едет прямо по правой обводке окна, цвета окна,
// и не заходит на скругление углов (останавливается чуть раньше). Встроенные полосы браузера скрыты.
(function () {
    const L = [   // что листается, по чьей обводке едет полоска, цвет
        { s: '#qzWin', c: '#38BDF8' },
        { s: '#shWin', c: '#FFC53D' },
        { s: '#rlWin', c: '#FE7600' },
        { s: '#rwWindow', c: '#F472B6' },
        { s: '#rouletteModal > .glass-panel', c: '#F472B6' },
        { s: '#settingsModal .custom-scroll', f: '#settingsModal .glass-panel', c: '#A855F7' },
        { s: '#adminModal #admBody', f: '#adminModal .adm-panel', c: '#FE7600' },
        { s: '#startScreen', c: '#A855F7', edge: true }
    ];
    const st = document.createElement('style');
    st.textContent = L.map(o => o.s).join(',') + '{scrollbar-width:none!important}'
        + L.map(o => o.s + '::-webkit-scrollbar').join(',') + '{display:none!important;width:0!important;height:0!important}'
        + '.sb-thumb{position:fixed;z-index:9999;width:2px;border-radius:2px;pointer-events:none;opacity:0;transition:opacity .35s ease;will-change:transform,height}'
        + '.sb-thumb.on{opacity:.55}.sb-thumb.on.act{opacity:1}';
    document.head.appendChild(st);
    const items = L.map(o => {
        const d = document.createElement('div'); d.className = 'sb-thumb';
        d.style.background = o.c; d.style.boxShadow = '0 0 6px ' + o.c;
        document.body.appendChild(d);
        return { o, d, t: 0 };
    });
    const vis = (el) => el && el.offsetParent !== null && el.getClientRects().length > 0 && !el.closest('.hidden');
    function place(it, now) {
        const sc = document.querySelector(it.o.s);
        if (!vis(sc) || sc.scrollHeight - sc.clientHeight < 4) { it.d.classList.remove('on'); return false; }
        const fr = (it.o.f && document.querySelector(it.o.f)) || sc;
        const r = fr.getBoundingClientRect(), k = fr.offsetWidth ? r.width / fr.offsetWidth : 1;
        const cs = getComputedStyle(fr);
        const bw = (parseFloat(cs.borderRightWidth) || 0) * k;
        const rad = it.o.edge ? 0 : Math.max(parseFloat(cs.borderTopRightRadius) || 0, parseFloat(cs.borderBottomRightRadius) || 0) * k;
        const pad = it.o.edge ? 6 : rad + 5;   // не заходим на скругление: останавливаемся на 5 px раньше
        const top = r.top + pad, len = r.height - pad * 2;
        if (len < 20) { it.d.classList.remove('on'); return false; }
        const ratio = sc.clientHeight / sc.scrollHeight, h = Math.max(22, len * ratio);
        const p = sc.scrollTop / Math.max(1, sc.scrollHeight - sc.clientHeight);
        const x = it.o.edge ? r.right - 3 : r.right - bw / 2 - 1;   // по середине обводки
        it.d.style.left = x.toFixed(1) + 'px'; it.d.style.top = '0px'; it.d.style.height = h.toFixed(1) + 'px';
        it.d.style.transform = 'translateY(' + (top + (len - h) * p).toFixed(1) + 'px)';
        it.d.classList.add('on');
        it.d.classList.toggle('act', now - it.t < 900);   // во время прокрутки — ярче
        return true;
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
