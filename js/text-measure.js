// Ширина текста «100%» (в долях размера шрифта) — для фиксированной ширины плашки сил; пересчитывается после загрузки шрифта
(function () {
    function upd() {
        try {
            const v = document.getElementById('staminaVal'); if (!v) return;
            const cs = getComputedStyle(v), fs = parseFloat(cs.fontSize) || 10;
            const c = document.createElement('canvas').getContext('2d');
            c.font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
            const w = c.measureText('100%').width;
            if (w > 0) document.documentElement.style.setProperty('--stam-k', (w / fs).toFixed(4));
        } catch (e) {}
    }
    upd();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(upd);
    window.addEventListener('resize', upd);
})();
