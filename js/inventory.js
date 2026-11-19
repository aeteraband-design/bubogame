// ===== ЗАПАС ЭФФЕКТОВ: щит, ускорение, замедление и ШАЗАМ покупаются в лавке и лежат в запасе (до 3 каждого вида) =====
// В полёте — столбик квадратных кнопок (как пауза и нотка) с иконкой и числом; нажал — эффект включился.
// С какой стороны столбик — выбирается в настройках.
const INV_KEY = 'bubo_inv', INV_MAX = 3, INV_SIDE_KEY = 'bubo_inv_side';
const INV_TYPES = [
    { key: 'shield', name: 'Щит', icon: 'fa-shield-halved', col: '#22C55E' },
    { key: 'speed', name: 'Ускорение', icon: 'fa-bolt', col: '#FACC15' },
    { key: 'slow', name: 'Замедление', icon: 'fa-hourglass-half', col: '#38BDF8' },
    { key: 'shazam', name: 'ШАЗАМ', icon: 'fa-bolt-lightning', col: '#FF7A00' }
];
function invGet() { try { const o = JSON.parse(BuboSaveStorage.getItem(INV_KEY)); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
function invCount(k, stock = invGet()) { return Math.max(0, Math.min(INV_MAX, stock[k] | 0)); }
function invWrite(stock) {
    try { BuboSaveStorage.setItem(INV_KEY, JSON.stringify(stock)); return true; } catch (e) { return false; }
}
function invChange(k, delta) {
    const stock = invGet();
    const count = invCount(k, stock) + delta;
    if (count < 0 || count > INV_MAX) return false;
    stock[k] = count;
    return invWrite(stock);
}
function invAdd(k) { return invChange(k, 1); }
function invSideLeft() { try { return BuboSaveStorage.getItem(INV_SIDE_KEY) !== '0'; } catch (e) { return true; } }   // по умолчанию — слева
// Старые покупки «на старт полёта» переносим одним сохранением.
(function () {
    if (typeof shopPend !== 'function') return;
    const pending = shopPend();
    const effects = ['shield', 'slow', 'shazam'].filter(k => pending[k]);
    if (!effects.length) return;
    const stock = invGet();
    if (!stock.movedLegacyPending) {
        for (const k of effects) stock[k] = Math.min(INV_MAX, invCount(k, stock) + 1);
        stock.movedLegacyPending = true;
        if (!invWrite(stock)) return;
    }
    shopSetPend({});
})();

function invBlockReason(k, scene = window.BuboCampaign?.scene()) {
    if (window.BuboCampaign?.isTestRun()) return 'Запас не расходуется в предпросмотре';
    if (!gameActive || waitingFirstTap || scene === 'training') return 'Доступно в полёте';
    if (k === 'shazam' && scene) {
        const combat = window.BuboCampaignCombat?.status();
        if (scene !== 'boss' || combat?.wave !== 'shazam') return 'В Походе доступен у Смотрителя в последней волне';
        if (combat.shazamStarts > 0 || combat.finalGateApproached) return 'В этой волне ШАЗАМ уже недоступен';
    }
    if (shazamBusy() || (k === 'shazam' && SHZ.state !== 'idle')) return 'Дождись окончания ШАЗАМа';
    return '';
}

function invCanUse(k, scene) { return !invBlockReason(k, scene); }

function invUse(k, btn) {
    const scene = window.BuboCampaign?.scene();
    if (!INV_TYPES.some(item => item.key === k) || !invCanUse(k, scene) || !invChange(k, -1)) return;
    let label = null, play = null, applied = false;
    try {
        if (k === 'shield') {
            const seconds = shieldSecs();
            shieldTime = Math.max(shieldTime, seconds * 60); shieldAppearAnim = 12;
            label = ['Щит ' + seconds + 'с', '#22C55E', 'fa-shield-halved'];
            play = () => AudioFX.playShieldCollect();
            applied = true;
        } else if (k === 'speed') {
            slowMotionTime = 0;
            speedBoostTime = ADMIN_CFG.speedSec * 60;
            const shz = !scene && shazamOnSpeedup();
            label = shz ? ['ШАЗАМ ' + Math.round((SHZ.DUR + SHZ.FADE) / 60) + 'с', '#FF7A00', 'fa-bolt-lightning']
                        : ['Ускорение ' + ADMIN_CFG.speedSec + 'с', '#FACC15', 'fa-bolt'];
            play = () => { AudioFX.playStarCollect(); AudioFX.onSpeedChanged(); };
            applied = true;
        } else if (k === 'slow') {
            speedBoostTime = 0; slowMotionTime = ADMIN_CFG.slowSec * 60;
            label = ['Замедление ' + ADMIN_CFG.slowSec + 'с', '#38BDF8', 'fa-hourglass-half'];
            play = () => { AudioFX.playStarCollect(); AudioFX.onSpeedChanged(); };
            applied = true;
        } else if (scene === 'boss') {
            applied = Boolean(window.BuboCampaignCombat?.launchShazam());
        } else {
            shazamStart();
            applied = true;
        }
    } catch (e) {}
    if (!applied) invAdd(k);
    try { invRender(); } catch (e) {}
    if (!applied) return;
    try { play?.(); Haptics.powerup(); } catch (e) {}
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
    const show = invVisible() && window.BuboCampaign?.scene() !== 'training';
    el.className = (invSideLeft() ? 'l' : 'r') + (show ? '' : ' hidden');
    const stock = invGet(), scene = window.BuboCampaign?.scene();
    const html = INV_TYPES.filter(t => invCount(t.key, stock) > 0).map(t => {
        const count = invCount(t.key, stock), reason = invBlockReason(t.key, scene);
        const label = t.name + ', в запасе: ' + count + (reason ? '. ' + reason : '');
        return '<button type="button" class="inv-b' + (reason ? ' off' : '') + '" data-k="' + t.key
            + '" style="--c:' + t.col + '" aria-label="' + label + '" aria-disabled="' + Boolean(reason) + '">'
            + '<i class="fa-solid ' + t.icon + '" aria-hidden="true"></i><span class="inv-n" aria-hidden="true">' + count + '</span></button>';
    }).join('');
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
    const setSide = (left) => { try { BuboSaveStorage.setItem(INV_SIDE_KEY, left ? '1' : '0'); } catch (er) {} paint(); invRender(); };
    if (hb) { paint(); hb.addEventListener('click', (e) => { e.stopPropagation(); setSide(!invSideLeft()); }); }
    if (sl) sl.addEventListener('click', (e) => { e.stopPropagation(); setSide(true); });
    if (sr) sr.addEventListener('click', (e) => { e.stopPropagation(); setSide(false); });
}

window.addEventListener('bubo:campaign-combat', invRender);
