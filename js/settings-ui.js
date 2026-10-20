// Окно настроек: кнопка «Сохранить» активна только после изменений, мягкое затенение листаемого списка,
// пункт «На весь экран» скрыт, если игра запущена как приложение (PWA / TWA / «На экран Домой»).
(function () {
    // --- игра запущена как приложение? Тогда системная строка (время, батарея) остаётся видна, полноэкранный режим не нужен ---
    function isApp() {
        try {
            const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
            if (mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)')) return true;
            if (window.navigator.standalone === true) return true;   // iPhone: «На экран Домой»
            // TWA (приложение из Google Play): при первом запуске referrer = android-app://…; запоминаем на всю сессию
            if (document.referrer && document.referrer.indexOf('android-app://') === 0) { try { sessionStorage.setItem('bubo_twa', '1'); } catch (e) {} return true; }
            if (sessionStorage.getItem('bubo_twa') === '1') return true;
        } catch (e) {}
        return false;
    }
    window.buboIsApp = isApp;
    const applyAppMode = () => {
        const app = isApp();
        document.documentElement.classList.toggle('is-app', app);
        const row = document.getElementById('stFsRow'); if (row) row.hidden = app;
        // в приложении полноэкранный режим не включаем; если он оказался включён — выходим
        if (app && (document.fullscreenElement || document.webkitFullscreenElement)) {
            try { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) { const r = ex.call(document); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
        }
    };
    applyAppMode();
    try { ['(display-mode: standalone)', '(display-mode: fullscreen)'].forEach((q) => { const m = window.matchMedia(q); if (m.addEventListener) m.addEventListener('change', applyAppMode); }); } catch (e) {}

    const modal = document.getElementById('settingsModal');
    const win = document.getElementById('stWin');
    const sc = win && win.querySelector('.st-scroll');
    const save = document.getElementById('saveSettingsBtn');
    if (!modal || !win || !sc || !save) return;

    // нажатия внутри окна не доходят до игрового поля
    ['click', 'pointerdown', 'touchstart'].forEach((ev) => modal.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));

    // --- затенение сверху/снизу: только когда в эту сторону есть что листать ---
    const fades = () => {
        const max = sc.scrollHeight - sc.clientHeight;
        sc.classList.toggle('ft', max > 2 && sc.scrollTop > 2);
        sc.classList.toggle('fb', max > 2 && sc.scrollTop < max - 2);
    };
    sc.addEventListener('scroll', fades, { passive: true });
    window.addEventListener('resize', fades);

    // --- «Сохранить» активна только после изменения любого пункта ---
    const state = () => {
        const v = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const on = (id) => { const el = document.getElementById(id); return el ? (el.classList.contains('translate-x-5') ? 1 : 0) : ''; };
        return [v('musicVolumeSlider'), v('sfxVolumeSlider'), v('gfxSlider'),
            on('settingsMusicThumb'), on('settingsSfxThumb'), on('settingsVibeThumb'), on('settingsHudSwapThumb'), on('fullscreenThumb')].join('|');
    };
    let snap = null;
    const check = () => { if (snap === null) return; save.disabled = state() === snap; };
    const later = () => requestAnimationFrame(check);   // после того как обработчики в ui.js обновили пункт
    // в фазе захвата: обработчики в ui.js останавливают всплытие
    ['input', 'change', 'click'].forEach((ev) => sc.addEventListener(ev, later, true));
    try { new MutationObserver(later).observe(sc, { subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    document.addEventListener('fullscreenchange', later);
    document.addEventListener('webkitfullscreenchange', later);

    // окно открылось — запоминаем исходные значения, кнопка приглушена, список сверху
    let wasOpen = false;
    const onToggle = () => {
        const open = !modal.classList.contains('hidden');
        if (open && !wasOpen) {
            applyAppMode();
            save.disabled = true; snap = null;
            sc.scrollTop = 0;
            requestAnimationFrame(() => { snap = state(); save.disabled = true; fades(); });
        }
        if (!open) snap = null;
        wasOpen = open;
    };
    try { new MutationObserver(onToggle).observe(modal, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    onToggle();
})();
