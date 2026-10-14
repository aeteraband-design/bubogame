// Полноэкранный режим: тумблер в настройках (Android/Chrome/ПК; на iPhone Safari такого режима нет — там «На экран Домой»)
(function () {
    const btn = document.getElementById('fullscreenBtn'), thumb = document.getElementById('fullscreenThumb');
    if (!btn || !thumb) return;
    const root = document.documentElement;
    const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const sync = () => { if (typeof updateToggleVisual === 'function') updateToggleVisual(btn, thumb, isFs()); };
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
            if (!isFs()) {
                const req = root.requestFullscreen || root.webkitRequestFullscreen;
                if (req) { const r = req.call(root); if (r && r.catch) r.catch(() => {}); }
            } else {
                const ex = document.exitFullscreen || document.webkitExitFullscreen;
                if (ex) { const r = ex.call(document); if (r && r.catch) r.catch(() => {}); }
            }
        } catch (er) {}
    });
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
})();
