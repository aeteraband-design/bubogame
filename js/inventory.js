// ===== ЗАПАС ЭФФЕКТОВ: щит, ускорение, замедление и ШАЗАМ покупаются в лавке и лежат в запасе (до 3 каждого вида) =====
// В полёте — столбик квадратных кнопок (как пауза и нотка) с иконкой и числом; нажал — эффект включился.
// С какой стороны столбик — выбирается в настройках.
const INV_KEY = 'bubo_inv', INV_MAX = 3, INV_SIDE_KEY = 'bubo_inv_side';
const INV_TYPES = [
    { key: 'shield', icon: 'fa-shield-halved', col: '#22C55E' },
    { key: 'speed', icon: 'fa-bolt', col: '#FACC15' },
    { key: 'slow', icon: 'fa-hourglass-half', col: '#38BDF8' },
    { key: 'shazam', icon: 'fa-bolt-lightning', col: '#FF7A00' }
];
function invGet() { try { const o = JSON.parse(localStorage.getItem(INV_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function invCount(k) { return Math.max(0, Math.min(INV_MAX, invGet()[k] | 0)); }
function invSetCount(k, n) { const o = invGet(); o[k] = Math.max(0, Math.min(INV_MAX, n | 0)); try { localStorage.setItem(INV_KEY, JSON.stringify(o)); } catch (e) {} invRender(); }
function invAdd(k) { invSetCount(k, invCount(k) + 1); }
function invSideLeft() { try { return localStorage.getItem(INV_SIDE_KEY) !== '0'; } catch (e) { return true; } }   // по умолчанию — слева
// старые покупки «на старт полёта» переходят в запас, чтобы ничего не пропало
(function () {
    try {
        if (typeof shopPend !== 'function') return;
        const p = shopPend(); let ch = false;
        ['shield', 'slow', 'shazam'].forEach((k) => { if (p[k]) { const o = invGet(); o[k] = Math.min(INV_MAX, (o[k] | 0) + 1); localStorage.setItem(INV_KEY, JSON.stringify(o)); ch = true; } });
        if (ch) shopSetPend({});
    } catch (e) {}
})();

// можно ли включить эффект прямо сейчас
function invCanUse(k) {
    let fly = false; try { fly = gameActive && !waitingFirstTap; } catch (e) {}
    if (!fly) return false;
    const busy = typeof shazamBusy === 'function' && shazamBusy();
    if (k === 'shazam') return typeof SHZ !== 'undefined' && SHZ.state === 'idle';
    if (k === 'speed' || k === 'slow') return !busy;
    return true;
}
function invUse(k, btn) {
    if (invCount(k) <= 0 || !invCanUse(k)) return;
    let label = null;
    try {
        if (k === 'shield') {
            AudioFX.playShieldCollect(); shieldTime = Math.max(shieldTime, shieldSecs() * 60); shieldAppearAnim = 12;
            label = [`Щит ${shieldSecs()}с`, '#22C55E', 'fa-shield-halved'];
        } else if (k === 'speed') {
            AudioFX.playStarCollect(); slowMotionTime = 0;
            speedBoostTime = ADMIN_CFG.speedSec * 60; const shz = shazamOnSpeedup(); AudioFX.onSpeedChanged();
            label = shz ? [`ШАЗАМ ${Math.round((SHZ.DUR + SHZ.FADE) / 60)}с`, '#FF7A00', 'fa-bolt-lightning'] : [`Ускорение ${ADMIN_CFG.speedSec}с`, '#FACC15', 'fa-bolt'];
        } else if (k === 'slow') {
            AudioFX.playStarCollect(); speedBoostTime = 0; slowMotionTime = ADMIN_CFG.slowSec * 60; AudioFX.onSpeedChanged();
            label = [`Замедление ${ADMIN_CFG.slowSec}с`, '#38BDF8', 'fa-hourglass-half'];
        } else if (k === 'shazam') {
            shazamStart();
        }
        Haptics.powerup();
    } catch (e) { return; }
    invSetCount(k, invCount(k) - 1);
    // подсказка вылетает из кнопки и улетает в таймер — как при подборе значка
    if (label && btn && typeof spawnFlyingArrivalFX === 'function') {
        try {
            const cv = document.getElementById('gameCanvas'), cr = cv.getBoundingClientRect(), br = btn.getBoundingClientRect();
            const x = (br.left + br.width / 2 - cr.left) * width / cr.width, y = (br.top + br.height / 2 - cr.top) * height / cr.height;
            spawnFlyingArrivalFX(x, y, 'other', label[0], label[1], label[2]);
        } catch (e) {}
    }
    try { StorageManager.save(); } catch (e) {}
}

let invEl = null;
function invBuild() {
    if (invEl) return invEl;
    const host = document.getElementById('gameContainer'); if (!host) return null;
    const st = document.createElement('style');
    st.textContent = '#invBar{position:absolute;top:auto;bottom:200px;z-index:21;display:flex;flex-direction:column;gap:8px;zoom:var(--tophud-zoom,1.1);pointer-events:none}'
        + '#invBar.l{left:14px}#invBar.r{right:14px}#invBar.hidden{display:none}'
        + '#invBar .inv-b{pointer-events:auto;position:relative;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;'
        + 'color:var(--c);background:rgba(29,9,54,.85);border:1px solid color-mix(in srgb,var(--c) 60%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--c) 30%,transparent),0 6px 14px rgba(0,0,0,.3);transition:opacity .2s,transform .12s;-webkit-tap-highlight-color:transparent}'
        + '#invBar .inv-b:active{transform:scale(.92)}#invBar .inv-b.off{opacity:.4;filter:saturate(.5)}'
        + '#invBar .inv-n{position:absolute;right:-5px;bottom:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;display:flex;align-items:center;justify-content:center;font:900 10px/1 Onest,sans-serif;color:#fff;background:var(--c);border:2px solid #140326}'
        + '#invBar .inv-b.pop{animation:invPop .35s ease}@keyframes invPop{40%{transform:scale(1.15)}}';
    document.head.appendChild(st);
    invEl = document.createElement('div'); invEl.id = 'invBar'; invEl.className = 'hidden';
    host.appendChild(invEl);
    ['pointerdown', 'touchstart', 'mousedown'].forEach((ev) => invEl.addEventListener(ev, (e) => { if (e.target.closest('.inv-b')) e.stopPropagation(); }, { passive: true }));
    invEl.addEventListener('click', (e) => { const b = e.target.closest('.inv-b'); if (!b) return; e.stopPropagation(); invUse(b.dataset.k, b); });
    return invEl;
}
function invVisible() { const t = document.getElementById('topHud'); return !!t && !t.classList.contains('hidden'); }
function invRender() {
    const el = invBuild(); if (!el) return;
    const show = invVisible();
    el.className = (invSideLeft() ? 'l' : 'r') + (show ? '' : ' hidden');
    const html = INV_TYPES.filter((t) => invCount(t.key) > 0).map((t) => `<button type="button" class="inv-b${invCanUse(t.key) ? '' : ' off'}" data-k="${t.key}" style="--c:${t.col}" aria-label="${t.key}"><i class="fa-solid ${t.icon}"></i><span class="inv-n">${invCount(t.key)}</span></button>`).join('');
    if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
    if (show) invPlace();
}
// столбик кнопок — внизу, сразу над панелью прогресса (сложность и коллекция тем)
function invPlace() {
    const el = invEl, host = document.getElementById('gameContainer'), bh = document.getElementById('bottomHud'); if (!el || !host) return;
    const hr = host.getBoundingClientRect(); let gap;
    if (bh && bh.offsetParent) gap = hr.bottom - bh.getBoundingClientRect().top + 10;
    else gap = hr.height * 0.25;
    const z = parseFloat(getComputedStyle(el).zoom) || 1;
    const v = (gap / z).toFixed(1) + 'px';
    if (el.style.bottom !== v) el.style.bottom = v;
}
window.addEventListener('resize', () => { try { if (invVisible()) invPlace(); } catch (e) {} });
// кнопки появляются вместе с верхней панелью игры; «можно / нельзя сейчас» обновляется раз в полсекунды
(function () {
    const t = document.getElementById('topHud');
    if (t && typeof MutationObserver !== 'undefined') new MutationObserver(() => invRender()).observe(t, { attributes: true, attributeFilter: ['class'] });
    setInterval(() => { if (invVisible()) invRender(); }, 500);
    invRender();
})();
// настройка «Где кнопки запаса»
{
    const hb = document.getElementById('settingsInvSideToggle'), ht = document.getElementById('settingsInvSideThumb');
    const sl = document.getElementById('invSideL'), sr = document.getElementById('invSideR');
    const paint = () => {
        const left = invSideLeft();
        if (ht) { ht.classList.toggle('translate-x-0', left); ht.classList.toggle('translate-x-5', !left); }
        if (sl) { sl.classList.toggle('text-white', left); sl.classList.toggle('text-purple-300', !left); sl.style.opacity = left ? '1' : '.55'; }
        if (sr) { sr.classList.toggle('text-white', !left); sr.classList.toggle('text-purple-300', left); sr.style.opacity = left ? '.55' : '1'; }
    };
    const setSide = (left) => { try { localStorage.setItem(INV_SIDE_KEY, left ? '1' : '0'); } catch (er) {} paint(); invRender(); };
    if (hb) { paint(); hb.addEventListener('click', (e) => { e.stopPropagation(); setSide(!invSideLeft()); }); }
    if (sl) sl.addEventListener('click', (e) => { e.stopPropagation(); setSide(true); });
    if (sr) sr.addEventListener('click', (e) => { e.stopPropagation(); setSide(false); });
}
