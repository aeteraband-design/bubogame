// ===== МОНЕТЫ И ЛАВКА =====
// Монеты — валюта: вопросы дня (30 / 60 / 100 за верный ответ, до 10 вопросов в день — максимум ~550, обычно 300–400),
// в полёте — по 40 за каждые 50 собранных вопросов, в рулетке — редкий приз 500 монет. Монеты не сгорают при смене дня.
// Баланс: попытка стоит 1000 — это 2–3 дня хороших ответов или очень хороший полёт; плохо сыграв, сразу докупить не выйдет.
const COINS_KEY = 'bubo_coins', SHOP_PEND_KEY = 'bubo_shop_pending';
function coinsGet() { try { return Math.max(0, parseInt(localStorage.getItem(COINS_KEY), 10) || 0); } catch (e) { return 0; } }
function coinsSet(n) { try { localStorage.setItem(COINS_KEY, String(Math.max(0, Math.round(n)))); } catch (e) {} shopSyncBtn(); }
function coinsAdd(n) { coinsSet(coinsGet() + n); }

// бонусы «на старт полёта»: купил — сработают, когда полетишь в следующий раз
function shopPend() { try { return JSON.parse(localStorage.getItem(SHOP_PEND_KEY)) || {}; } catch (e) { return {}; } }
function shopSetPend(p) { try { localStorage.setItem(SHOP_PEND_KEY, JSON.stringify(p)); } catch (e) {} }
function shopOnFlightStart() {
    const p = shopPend(); if (!p.shield && !p.slow && !p.shazam) return;
    shopSetPend({});
    setTimeout(() => {
        try {
            if (p.shield) { shieldTime = Math.max(shieldTime, ADMIN_CFG.shieldSec * 60); shieldAppearAnim = 12; AudioFX.playShieldCollect(); }
            if (p.slow) { speedBoostTime = 0; slowMotionTime = ADMIN_CFG.slowSec * 60; AudioFX.onSpeedChanged(); }
            if (p.shazam && typeof shazamStart === 'function' && SHZ.state === 'idle') shazamStart();
            Haptics.powerup();
            showGoldBanner('Бонус из лавки!', 'fa-store', '#FFC53D');
        } catch (e) {}
    }, 400);
}

// товары. can() — можно ли купить сейчас (false → кнопка «нельзя» с пояснением why)
const SHOP_ITEMS = [
    { key: 'a1', name: '+1 попытка', desc: 'Ещё один полёт', icon: 'fa-rotate-right', col: '#FE7600', price: 1000,
      buy() { attempts = Math.min(99, attempts + 1); zeroDay = ''; } },
    { key: 'spin', name: 'Вращение рулетки', desc: 'Крути и выигрывай призы', icon: 'fa-dice', col: '#A855F7', price: 800,
      buy() { rouletteSpins = Math.min(99, rouletteSpins + 1); try { rwUpdateUI(); } catch (e) {} } },
    { key: 'life', name: '+1 жизнь', desc: 'Сердце прямо сейчас', icon: 'fa-heart-circle-plus', col: '#EC4899', price: 250,
      can() { return lives < maxLives ? '' : 'Сердца полные'; },
      buy() { lives = Math.min(maxLives, (lives <= 0.5 ? startLives : lives) + 1); } },
    { key: 'hearts', name: '6 жизней', desc: 'Максимум 6, старт с 4', icon: 'fa-heart', col: '#F43F5E', price: 1800,
      can() { return maxLives < 6 ? '' : 'Уже есть'; },
      buy() { startLives = Math.max(startLives, 4); maxLives = Math.max(maxLives, 6); } },
    { key: 'stamina', name: '+20% к силе', desc: 'Максимум сил больше', icon: 'fa-bolt', col: '#00F0FF', price: 900,
      can() { return maxStamina < 200 ? '' : 'Максимум'; },
      buy() { maxStamina = Math.min(200, maxStamina + 20); stamina = maxStamina; } },
    { key: 'refill', name: 'Полные силы', desc: 'Запас сил до краёв', icon: 'fa-battery-full', col: '#22C55E', price: 120,
      can() { return stamina < maxStamina - 0.5 ? '' : 'Силы полные'; },
      buy() { stamina = maxStamina; } },
    { key: 'shield', name: 'Щит на старте', desc: 'В начале следующего полёта', icon: 'fa-shield-halved', col: '#4ADE80', price: 300, pend: true },
    { key: 'slow', name: 'Замедление на старте', desc: 'В начале следующего полёта', icon: 'fa-hourglass-half', col: '#38BDF8', price: 250, pend: true },
    { key: 'shazam', name: 'ШАЗАМ на старте', desc: 'Суперскорость с первых секунд', icon: 'fa-bolt-lightning', col: '#FF7A00', price: 900, pend: true }
];

(function () {
    try {
        const st = document.createElement('style');
        st.textContent = `
#openShopBtn.rw-menu-btn{z-index:6;zoom:var(--ui-zoom,1);position:absolute!important;top:100px!important;right:14px!important;left:auto!important;width:36px!important;height:36px!important;border-radius:12px!important;font-size:13px!important;color:#E9D5FF!important;background-color:rgba(29,9,54,.72)!important;border:1px solid rgba(120,44,233,.6)!important;box-shadow:0 6px 14px rgba(0,0,0,.3)!important}
#openShopBtn.rw-menu-btn.has-c{color:#FFC53D!important;border-color:#FFC53D!important;box-shadow:0 0 12px rgba(255,197,61,.45)!important}
#shopModal{position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(20,3,38,.25);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
#shopModal.hidden{display:none}
#shWin{position:relative;width:100%;max-width:380px;max-height:100%;overflow-y:auto;border-radius:28px;padding:16px 16px 18px;display:flex;flex-direction:column;gap:16px;font-family:Onest,sans-serif;color:#fff;
 background:radial-gradient(110% 45% at 50% -8%,rgba(255,197,61,.2),transparent 62%),radial-gradient(80% 40% at 0% 105%,rgba(45,212,191,.13),transparent 60%),rgba(29,9,54,.97);border:1.5px solid rgba(255,197,61,.35);box-shadow:0 10px 40px rgba(0,0,0,.5)}
#shWin .sh-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:6px}
#shWin .sh-coins{justify-self:start;display:flex;align-items:center;gap:7px;padding:6px 11px 6px 6px;border-radius:999px;background:rgba(20,3,38,.75);border:1px solid rgba(255,197,61,.5);box-shadow:0 0 12px rgba(255,197,61,.18);font-weight:900;font-size:15px;color:#FFD66B;margin-top:4px}
#shWin .sh-coins.bump{animation:shBump .5s ease}
@keyframes shBump{40%{transform:scale(1.12)}}
.sh-coin{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:10px;color:#7C4A00;background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFC53D 55%,#E08A00);box-shadow:0 0 8px rgba(255,197,61,.6),inset 0 -1.5px 0 rgba(0,0,0,.2);flex:0 0 auto}
#shWin .sh-x{justify-self:end;width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#C4A1FF;background:rgba(120,44,233,.18);border:1px solid rgba(120,44,233,.4);font-size:14px;cursor:pointer}
#shWin .sh-emb{position:relative;width:92px;height:92px;display:flex;align-items:center;justify-content:center}
#shWin .sh-glow{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,rgba(255,197,61,.22),transparent 70%);animation:shPulse 3.2s ease-in-out infinite}
#shWin .sh-ring{position:absolute;inset:6px;border-radius:50%;padding:1.5px;background:conic-gradient(from var(--shA),rgba(255,197,61,0) 0deg,#FFE08A 70deg,#5EEAD4 140deg,rgba(94,234,212,0) 200deg,rgba(255,197,61,0) 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:shRing 3.6s linear infinite;opacity:.9}
@property --shA{syntax:'<angle>';inherits:false;initial-value:0deg}
#shWin .sh-core{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#shWin .sh-core i{font-size:38px;background:linear-gradient(110deg,#FFC53D 0%,#FFF3B0 22%,#FFC53D 40%,#5EEAD4 60%,#FFC53D 80%,#FFF3B0 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 6px rgba(255,197,61,.45));animation:shFlow 4.5s linear infinite}
@keyframes shFlow{to{background-position:-250% 0}}
#shWin .sh-tw{position:absolute;color:#FFF3B0;font-style:normal;font-size:var(--s);text-shadow:0 0 8px #FFC53D;animation:shTw 2.2s ease-in-out infinite;animation-delay:var(--d)}
@keyframes shSpin{to{transform:rotate(360deg)}}
@keyframes shRing{to{--shA:360deg}}
@keyframes shPulse{0%,100%{opacity:.6;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
@keyframes shTw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.1)}}
#shWin .sh-title{text-align:center;margin-top:-4px}
#shWin .sh-title b{display:block;font-weight:900;font-size:26px;letter-spacing:.02em;line-height:1;background:linear-gradient(90deg,#FFD66B,#FFF3B0 45%,#5EEAD4);-webkit-background-clip:text;background-clip:text;color:transparent}
#shWin .sh-title span{display:block;margin-top:6px;font-weight:600;font-size:12px;color:#C4B5FD}
#shWin .sh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
#shWin .sh-it{position:relative;display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 6px 9px;border-radius:16px;text-align:center;
 background:linear-gradient(180deg,color-mix(in srgb,var(--c) 14%,transparent),rgba(20,3,38,.65) 70%);border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}
#shWin .sh-ic{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c) 55%,#fff),var(--c) 60%,color-mix(in srgb,var(--c) 70%,#000));box-shadow:0 0 14px color-mix(in srgb,var(--c) 60%,transparent),inset 0 -3px 0 rgba(0,0,0,.2)}
#shWin .sh-nm{font-weight:900;font-size:11.5px;line-height:1.2;min-height:28px;display:flex;align-items:center}
#shWin .sh-ds{font-weight:600;font-size:9.5px;line-height:1.25;color:rgba(221,214,254,.75);min-height:24px}
#shWin .sh-buy{margin-top:auto;width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 4px;border-radius:11px;font-weight:900;font-size:12.5px;cursor:pointer;
 color:#4A2600;background:linear-gradient(180deg,#FFD66B,#FFB020);border:1px solid rgba(255,240,190,.8);box-shadow:0 0 10px rgba(255,197,61,.35);transition:transform .12s}
#shWin .sh-buy .sh-coin{width:16px;height:16px;font-size:7.5px}
#shWin .sh-buy:active{transform:scale(.94)}
#shWin .sh-buy.sure{background:linear-gradient(180deg,#4ADE80,#16A34A);color:#fff;border-color:#BBF7D0;box-shadow:0 0 12px rgba(34,197,94,.55)}
#shWin .sh-buy.no{cursor:default;font-size:10.5px;color:rgba(255,255,255,.6);background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.15);box-shadow:none}
#shWin .sh-buy.no .sh-coin{filter:grayscale(1);opacity:.6}
#shWin .sh-buy.own{cursor:default;color:#BBF7D0;background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.5);box-shadow:none;font-size:10.5px}
#shWin .sh-it.bought{animation:shBought .7s ease}
@keyframes shBought{30%{transform:scale(1.07);box-shadow:0 0 22px var(--c)}}
#shWin .sh-earn{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;background:rgba(20,3,38,.6);border:1px solid rgba(56,189,248,.35)}
#shWin .sh-earn>i{color:#38BDF8;font-size:18px;flex:0 0 22px;text-align:center}
#shWin .sh-earn span{flex:1;font-weight:700;font-size:11.5px;line-height:1.35;color:#DDD6FE}
#shWin .sh-earn button{flex:0 0 auto;padding:8px 11px;border-radius:11px;font-weight:900;font-size:11px;color:#fff;background:rgba(56,189,248,.22);border:1px solid rgba(56,189,248,.6);cursor:pointer}
#shWin .sh-back{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 10px;border-radius:16px;font-weight:900;font-size:12px;letter-spacing:.06em;color:#fff;cursor:pointer;background:rgba(45,14,82,.9);border:1px solid rgba(168,85,247,.5)}
#shWin .sh-back i{color:#FE7600}
#shWin .sh-toast{position:absolute;left:50%;top:132px;transform:translate(-50%,0);padding:9px 14px;border-radius:14px;font-weight:900;font-size:13px;white-space:nowrap;background:rgba(22,101,52,.95);border:1px solid #4ADE80;box-shadow:0 0 18px rgba(34,197,94,.5);pointer-events:none;animation:shToast 1.8s ease forwards;z-index:3}
@keyframes shToast{0%{opacity:0;transform:translate(-50%,10px)}15%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-10px)}}
`;
        document.head.appendChild(st);
    } catch (e) {}
})();

let shRoot = null, shSure = null, shSureT = 0;
function shopBuild() {
    if (shRoot) return shRoot;
    const host = document.getElementById('gameContainer') || document.body;
    shRoot = document.createElement('div'); shRoot.id = 'shopModal'; shRoot.className = 'hidden';
    const tw = [[-50, -18, 8, 0], [52, 10, 7, .9], [36, -40, 6, 1.7]].map(([x, y, s, d]) => `<i class="sh-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('');
    shRoot.innerHTML = `<div id="shWin">
        <div class="sh-top"><div class="sh-coins" id="shCoins"><span class="sh-coin"><i class="fa-solid fa-star"></i></span><span id="shCoinsN">0</span></div>
            <div class="sh-emb"><div class="sh-glow"></div><div class="sh-ring"></div><div class="sh-core"><i class="fa-solid fa-store"></i></div>${tw}</div>
            <button type="button" class="sh-x" data-sh="close" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="sh-title"><b>ЛАВКА</b><span>Обменивай монеты на попытки и бонусы</span></div>
        <div class="sh-grid" id="shGrid"></div>
        <div class="sh-earn"><i class="fa-solid fa-circle-question"></i><span>Монеты: вопросы дня (до 100 за ответ) и по 40 за каждые 50 вопросов в полёте</span><button type="button" data-sh="quiz">ВОПРОСЫ</button></div>
        <button type="button" class="sh-back" data-sh="close"><i class="fa-solid fa-house"></i>В ГЛАВНОЕ МЕНЮ</button>
    </div>`;
    host.appendChild(shRoot);
    ['click', 'pointerdown', 'touchstart'].forEach((ev) => shRoot.addEventListener(ev, (e) => e.stopPropagation()));
    shRoot.addEventListener('click', (e) => {
        if (e.target === shRoot) { closeShop(); return; }
        const b = e.target.closest('[data-sh]'); if (!b) return;
        const a = b.dataset.sh;
        if (a === 'close') closeShop();
        else if (a === 'quiz') { closeShop(); if (typeof openQuiz === 'function') openQuiz(); }
        else shopTap(a, b);
    });
    return shRoot;
}
function shopRender() {
    const g = document.getElementById('shGrid'); if (!g) return;
    const c = coinsGet(), pend = shopPend();
    document.getElementById('shCoinsN').textContent = String(c);
    g.innerHTML = SHOP_ITEMS.map(it => {
        const why = it.can ? it.can() : (it.pend && pend[it.key] ? 'own' : '');
        let btn;
        if (why === 'own') btn = `<div class="sh-buy own"><i class="fa-solid fa-check"></i>Ждёт полёта</div>`;
        else if (why) btn = `<div class="sh-buy no">${why}</div>`;
        else if (c < it.price) btn = `<div class="sh-buy no"><span class="sh-coin"><i class="fa-solid fa-star"></i></span>${it.price}</div>`;
        else if (shSure === it.key) btn = `<button type="button" class="sh-buy sure" data-sh="${it.key}">КУПИТЬ?</button>`;
        else btn = `<button type="button" class="sh-buy" data-sh="${it.key}"><span class="sh-coin"><i class="fa-solid fa-star"></i></span>${it.price}</button>`;
        return `<div class="sh-it" data-it="${it.key}" style="--c:${it.col}"><div class="sh-ic"><i class="fa-solid ${it.icon}"></i></div><div class="sh-nm">${it.name}</div><div class="sh-ds">${it.desc}</div>${btn}</div>`;
    }).join('');
}
// первое нажатие — «Купить?», второе (в течение 3 с) — покупка
function shopTap(key) {
    const it = SHOP_ITEMS.find(x => x.key === key); if (!it) return;
    try { AudioFX.resume(); } catch (e) {}
    if (shSure !== key) { shSure = key; clearTimeout(shSureT); shSureT = setTimeout(() => { shSure = null; shopRender(); }, 3000); shopRender(); try { Haptics.flap(); } catch (e) {} return; }
    shSure = null; clearTimeout(shSureT);
    const c = coinsGet(); if (c < it.price) { shopRender(); return; }
    if (it.can && it.can()) { shopRender(); return; }
    coinsSet(c - it.price);
    if (it.pend) { const p = shopPend(); p[it.key] = 1; shopSetPend(p); }
    else try { it.buy(); } catch (e) {}
    try { StorageManager.save(); updateHUDAll(); } catch (e) {}
    try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {}
    shopRender();
    const tile = document.querySelector(`#shGrid [data-it="${key}"]`); if (tile) tile.classList.add('bought');
    const cn = document.getElementById('shCoins'); if (cn) { cn.classList.remove('bump'); void cn.offsetWidth; cn.classList.add('bump'); }
    const w = document.getElementById('shWin');
    if (w) { const t = document.createElement('div'); t.className = 'sh-toast'; t.innerHTML = `<i class="fa-solid fa-check"></i> Куплено: ${it.name}`; w.appendChild(t); setTimeout(() => t.remove(), 1900); }
}
function openShop(e) {
    if (e) e.stopPropagation();
    try { AudioFX.resume(); } catch (er) {}
    shopBuild(); shSure = null; shopRender();
    shRoot.classList.remove('hidden');
    try { AudioFX.setMode('shop', { fade: true }); } catch (er) {}
}
function closeShop(e) {
    if (e) e.stopPropagation();
    if (shRoot) shRoot.classList.add('hidden');
    shSure = null; shopSyncBtn();
    try { if (AudioFX.mode === 'shop' || AudioFX._pendMode === 'shop') AudioFX.setMode('menu', { fade: true }); } catch (er) {}
    try { updateHUDAll(); } catch (er) {}
}
function shopSyncBtn() {
    const mc = document.getElementById('menuCoinsN'); if (mc) mc.textContent = String(coinsGet());
    const b = document.getElementById('openShopBtn'); if (!b) return;
    const c = coinsGet(); b.classList.toggle('has-c', c >= Math.min(...SHOP_ITEMS.map(i => i.price)));
}
(function () {
    const b = document.getElementById('openShopBtn'); if (b) b.addEventListener('click', openShop);
    const g = document.getElementById('earnAttemptBtn');   // попыток нет — в лавку (там можно купить попытку)
    if (g) g.addEventListener('click', (e) => { e.stopPropagation(); try { returnToHome(); } catch (er) {} openShop(); });
    shopSyncBtn();
})();

// Пока открыто окно из главного меню (вопросы, лавка, рулетка, правила, настройки, админка…), само меню прячется —
// остаётся только фон, кнопки не светятся сквозь окно. Закрыли окно — меню плавно возвращается.
(function () {
    const st = document.createElement('style');
    st.textContent = '#startScreen > *{transition:opacity .25s ease}#startScreen.menu-under-pop > *{opacity:0!important;pointer-events:none!important}';
    document.head.appendChild(st);
    const POPS = ['rouletteModal', 'quizModal', 'shopModal', 'rulesModal', 'settingsModal', 'adminModal', 'admLogin', 'resetConfirmModal', 'winModal'];
    const sync = () => {
        const ss = document.getElementById('startScreen'); if (!ss) return;
        const any = POPS.some((id) => { const e = document.getElementById(id); return e && !e.classList.contains('hidden') && e.style.display !== 'none' && e.offsetParent !== null; });
        ss.classList.toggle('menu-under-pop', any);
    };
    // следим за всей страницей (окна лежат в разных местах), плюс страховка раз в полсекунды
    let q = 0; const kick = () => { if (!q) q = requestAnimationFrame(() => { q = 0; sync(); }); };
    try { new MutationObserver(kick).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style'], childList: true }); } catch (e) {}
    setInterval(sync, 500);
    sync();
})();

// Монеты в левом верхнем углу главного меню (нажатие — лавка). Админка спрятана: открывается касанием тремя пальцами
// по экрану меню (на компьютере — Ctrl+Shift+A)
(function () {
    const st = document.createElement('style');
    st.textContent = '#openAdminBtn{display:none!important}'
        + '#menuCoins{position:absolute;z-index:6;zoom:var(--ui-zoom,1);top:12px;left:14px;height:36px;display:flex;align-items:center;gap:7px;padding:0 12px 0 7px;border-radius:12px;'
        + 'background:rgba(29,9,54,.72);border:1px solid rgba(255,197,61,.55);box-shadow:0 0 10px rgba(255,197,61,.22);font:900 14px Onest,sans-serif;color:#FFD66B;cursor:pointer}'
        + '#menuCoins:active{transform:scale(.95)}'
        + '#menuCoins .mc-coin{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:10px;color:#7C4A00;background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFC53D 55%,#E08A00);box-shadow:0 0 8px rgba(255,197,61,.6),inset 0 -1.5px 0 rgba(0,0,0,.2)}';
    document.head.appendChild(st);
    const mc = document.getElementById('menuCoins');
    if (mc) mc.addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
    shopSyncBtn();
    setInterval(shopSyncBtn, 2000);
    const openAdm = () => { const b = document.getElementById('openAdminBtn'); if (b) b.click(); };
    const ss = document.getElementById('startScreen');
    if (ss) ss.addEventListener('touchstart', (e) => { if (e.touches && e.touches.length >= 3) { e.preventDefault(); openAdm(); } }, { passive: false });
    window.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && (e.code === 'KeyA')) { e.preventDefault(); openAdm(); } });
})();
