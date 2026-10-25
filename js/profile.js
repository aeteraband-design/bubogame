// ===== ПРОФИЛЬ ИГРОКА =====
// Регистрация (ник, почта, пароль, аватар — пока всё хранится в браузере; вход через ВКонтакте и сервер — позже),
// плашка игрока в главном меню и окно совы: уровень, очки обучения и навыки, характеристики, статистика, профиль.
// Уровень копится всегда (не сбрасывается с новым днём): опыт за вопросы в полёте, темы, победы и вопросы дня.
// За каждый уровень — очко обучения (на каждом 5-м — два) и монеты, на каждом 5-м ещё и попытка.
// Очки тратятся на навыки (как у учителей в «Готике» — ещё и монеты): у каждого навыка 5 ступеней, каждая дороже.
const PF_KEY = 'bubo_profile', PG_KEY = 'bubo_prog', PS_KEY = 'bubo_stats';
function pfLoad(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
function pfStore(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pfGet() { const p = pfLoad(PF_KEY, null); return p && p.nick ? p : null; }
function pfSet(p) { pfStore(PF_KEY, p); pfPlateSync(); }
let PG = Object.assign({ xp: 0, lvl: 1, pts: 0, sk: {} }, pfLoad(PG_KEY, {}));
let PS = Object.assign({ q: 0, best: 0, themes: 0, att: 0, wins: 0, coins: 0, qzOk: 0, qzAll: 0, time: 0, days: 0, lastDay: '' }, pfLoad(PS_KEY, {}));
if (!PG.sk || typeof PG.sk !== 'object') PG.sk = {};

// ---- уровень: каждый следующий требует больше опыта ----
const PF_LV_MAX = 99;
const PF_XP = { q: 1, theme: 5, win: 100, qzBad: 1 };   // за вопрос в полёте, за тему, за победу; вопрос дня: верно — монеты ×2, неверно — 1
function pfNeed(L) { return Math.round(80 * Math.pow(L, 1.45) / 5) * 5; }   // 80, 220, 395, 595, 825 … 2255 на 10-м
function pfLvInfo(xp) {
    let L = 1, r = Math.max(0, Math.floor(xp || 0));
    while (L < PF_LV_MAX && r >= pfNeed(L)) { r -= pfNeed(L); L++; }
    const need = pfNeed(L);
    return { L, cur: r, need, pct: L >= PF_LV_MAX ? 100 : Math.min(99, Math.floor(r / need * 100)) };
}
function pfPtsFor(L) { return L % 5 === 0 ? 2 : 1; }
function pfCoinsFor(L) { return 20 + 5 * L; }

// ---- навыки ----
const PF_SK_PTS = [1, 1, 2, 2, 3], PF_SK_COINS = [50, 100, 200, 350, 500], PF_SK_MAX = 5;
const PF_SK = [
    { k: 'cold', name: 'Морозостойкость', icon: 'fa-snowflake', col: '#7DD3FC', step: 'Сова быстрее оттаивает: заморозка короче на 6% за ступень.', top: 'На 5-й ступени — на 1 мороженое больше до заморозки.', fx: r => `заморозка −${r * 6}%` },
    { k: 'drunk', name: 'Крепкая голова', icon: 'fa-martini-glass-citrus', col: '#2DD4BF', step: 'Сова быстрее трезвеет: опьянение короче на 6% за ступень.', top: 'На 5-й ступени — на 1 коктейль больше до опьянения.', fx: r => `опьянение −${r * 6}%` },
    { k: 'food', name: 'Крепкий желудок', icon: 'fa-burger', col: '#FB923C', step: 'Переедание проходит быстрее: короче на 6% за ступень.', top: 'На 5-й ступени — на 1 кусочек больше до переедания.', fx: r => `переедание −${r * 6}%` },
    { k: 'stam', name: 'Выносливость', icon: 'fa-feather-pointed', col: '#22D3EE', step: 'Силы в полёте тратятся на 4% медленнее за ступень.', fx: r => `расход сил −${r * 4}%` },
    { k: 'shield', name: 'Крепкий щит', icon: 'fa-shield-halved', col: '#4ADE80', step: 'Щит держится на 1 секунду дольше за ступень.', fx: r => `щит +${r} с` },
    { k: 'coins', name: 'Монетный нюх', icon: 'fa-coins', col: '#FFC53D', step: 'Монет в полёте на 6% больше за ступень: значки монет и монеты за каждые 50 вопросов.', fx: r => `монеты +${r * 6}%` }
];
function skRank(k) { const r = PG.sk && PG.sk[k]; return Math.max(0, Math.min(PF_SK_MAX, r | 0)); }
function skDur(k) { return 1 - 0.06 * skRank(k); }                 // длительность заморозки / опьянения / переедания
function skTrig(k) { return skRank(k) >= PF_SK_MAX ? 1 : 0; }      // +1 порция до состояния на последней ступени
function skStamMul() { return 1 - 0.04 * skRank('stam'); }
function skCoinMul() { return 1 + 0.06 * skRank('coins'); }
function shieldSecs() { return ADMIN_CFG.shieldSec + skRank('shield'); }

function pfSaveProg() { pfStore(PG_KEY, PG); }
let pfStatsDirty = false;
function pfStat(k, n) { PS[k] = (PS[k] || 0) + n; pfStatsDirty = true; }

// ---- опыт и новый уровень ----
function pfXpAdd(n) {
    n = Math.round(n || 0); if (n <= 0) return;
    PG.xp += n;
    const L = pfLvInfo(PG.xp).L, ups = [];
    while (PG.lvl < L) { PG.lvl++; ups.push(PG.lvl); }
    pfSaveProg();
    ups.forEach((lv, i) => pfLevelUp(lv, i));
    pfPlateSync();
    if (pfRoot && !pfRoot.classList.contains('hidden')) pfRenderHero();
}
function pfLevelUp(L, i) {
    const pts = pfPtsFor(L), c = pfCoinsFor(L), att = L % 5 === 0;
    PG.pts += pts; pfSaveProg();
    try { coinsAdd(c); } catch (e) {}
    if (att) { try { attempts = Math.min(99, attempts + 1); zeroDay = ''; } catch (e) {} }
    try { StorageManager.save(); updateHUDAll(); } catch (e) {}
    const flying = (() => { try { return gameActive; } catch (e) { return false; } })();
    setTimeout(() => {
        try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {}
        if (flying) {
            try {
                showGoldBanner(`Уровень ${L}!`, 'fa-star', '#C084FC');
                setTimeout(() => showGoldBanner(`+${c} монет`, 'fa-coins', '#FFC53D'), 300);
                if (att) setTimeout(() => showGoldBanner('+1 попытка', 'fa-rotate-right', '#FE7600'), 600);
            } catch (e) {}
        } else pfLvToast(L, pts, c, att);
    }, i * 1400);
}
function pfLvToast(L, pts, c, att) {
    const host = document.getElementById('gameContainer') || document.body;
    const old = document.getElementById('pfLvUp'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'pfLvUp';
    el.innerHTML = `<div class="lv-n">${L}</div><div><b>НОВЫЙ УРОВЕНЬ!</b><span>+${pts} ${pfPl(pts, ['очко', 'очка', 'очков'])} обучения · +${c} монет${att ? ' · +1 попытка' : ''}</span></div>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); el.remove(); openProfile('skills'); });
    ['pointerdown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
    host.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3700);
}
function pfPl(n, f) { n = Math.abs(n) % 100; const a = n % 10; return (n > 10 && n < 20) ? f[2] : a === 1 ? f[0] : (a >= 2 && a <= 4) ? f[1] : f[2]; }
function pfEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// вопросы дня: опыт за ответ
function profOnQuiz(ok, coins) {
    pfStat('qzAll', 1); if (ok) pfStat('qzOk', 1);
    pfXpAdd(ok ? (coins || 2) * 2 : PF_XP.qzBad);
}

// монеты, заработанные за всё время (для статистики)
(function () {
    try {
        const base = coinsAdd;
        coinsAdd = function (n) { base(n); if (n > 0) pfStat('coins', n); };
    } catch (e) {}
})();

// ---- слежение за полётом: вопросы, темы, попытки, победы, время ----
(function () {
    let lastS = null, lastT = null, lastA = null, lastW = null, t0 = performance.now(), saveT = 0;
    setInterval(() => {
        let s, th, a, w, act;
        try { s = score; th = getTotalCollectedThemes(); a = attempts; w = hasWonGame; act = gameActive && !waitingFirstTap; } catch (e) { return; }
        const now = performance.now(), dt = Math.min(2, (now - t0) / 1000); t0 = now;
        if (lastS !== null && act && s > lastS) { pfStat('q', s - lastS); pfXpAdd((s - lastS) * PF_XP.q); }
        if (s > (PS.best || 0)) { PS.best = s; pfStatsDirty = true; }
        if (lastT !== null && act && th > lastT) { pfStat('themes', th - lastT); pfXpAdd((th - lastT) * PF_XP.theme); }
        if (lastA !== null && a < lastA) pfStat('att', lastA - a);
        if (lastW === false && w === true) { pfStat('wins', 1); pfXpAdd(PF_XP.win); }
        if (act && !document.hidden) {
            pfStat('time', dt);
            try { const d = todayKey(); if (PS.lastDay !== d) { PS.lastDay = d; pfStat('days', 1); } } catch (e) {}
        }
        lastS = s; lastT = th; lastA = a; lastW = w;
        if (pfStatsDirty && now - saveT > 4000) { saveT = now; pfStatsDirty = false; pfStore(PS_KEY, PS); }
    }, 250);
    window.addEventListener('pagehide', () => { if (pfStatsDirty) pfStore(PS_KEY, PS); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && pfStatsDirty) { pfStatsDirty = false; pfStore(PS_KEY, PS); } });
})();

// ---- аватары: сова игры в одном из своих состояний ----
const PF_AV = [
    { id: 'normal', g: '168,85,247' }, { id: 'wet', g: '125,190,252' }, { id: 'freeze', g: '125,211,252' }, { id: 'drunk', g: '45,212,191' },
    { id: 'fat', g: '244,114,182' }, { id: 'shazam', g: '254,118,0' }, { id: 'speed', g: '250,204,21' }, { id: 'dizzy', g: '196,167,255' }
];
function pfAv(id) { return PF_AV.find(a => a.id === id) || PF_AV[0]; }
function pfAvHTML(id, cls, extra) { const a = pfAv(id); return `<span class="pf-av ${cls || ''}" data-av="${a.id}" style="--g:${a.g}" ${extra || ''}><canvas></canvas></span>`; }
function pfPaintAv(el, wing) {
    const cv = el && el.querySelector('canvas'); if (!cv || typeof window.__owlPortrait !== 'function') return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1), z = (el.getBoundingClientRect().width / w) || 1, px = dpr * z;
    const W = Math.round(w * px), H = Math.round(h * px);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try { window.__owlPortrait(g, px, w / 2, h / 2, Math.min(w, h) * 1.2, el.dataset.av, wing == null ? 0.35 : wing); } catch (e) {}
}
function pfPaintAll(root) { (root || document).querySelectorAll('.pf-av').forEach(el => pfPaintAv(el)); }

// ---- плашка игрока в главном меню ----
let pfPlate = null;
function pfPlateBuild() {
    const ss = document.getElementById('startScreen'); if (!ss || pfPlate) return;
    pfPlate = document.createElement('button'); pfPlate.type = 'button'; pfPlate.id = 'profPlate'; pfPlate.className = 'hidden'; pfPlate.title = 'Профиль';
    pfPlate.innerHTML = `<span class="pp-av"><b class="pp-pts hidden">+1</b></span><span class="pp-mid"><span class="pp-nick"></span><span class="pp-row"><span class="pp-lv"></span><span class="pp-bar"><i></i></span><span class="pp-pct"></span></span></span><i class="fa-solid fa-chevron-down pp-ch"></i>`;
    pfPlate.addEventListener('click', (e) => { e.stopPropagation(); openProfile(PG.pts > 0 ? 'skills' : 'owl'); });
    ss.insertBefore(pfPlate, ss.firstChild);
}
let pfPlateAv = '';
function pfPlateSync() {
    pfPlateBuild(); if (!pfPlate) return;
    const p = pfGet(), ss = document.getElementById('startScreen');
    pfPlate.classList.toggle('hidden', !p); if (ss) ss.classList.toggle('has-prof', !!p);
    if (!p) { const mc = document.getElementById('menuCoins'); if (mc) { mc.style.top = ''; mc.style.left = ''; } return; }
    const info = pfLvInfo(PG.xp);
    pfPlate.querySelector('.pp-nick').textContent = p.nick;
    pfPlate.querySelector('.pp-lv').textContent = info.L + ' УР';
    pfPlate.querySelector('.pp-bar > i').style.width = info.pct + '%';
    pfPlate.querySelector('.pp-pct').textContent = info.pct + '%';
    const b = pfPlate.querySelector('.pp-pts'); b.classList.toggle('hidden', !(PG.pts > 0)); b.textContent = '+' + PG.pts;
    const box = pfPlate.querySelector('.pp-av');
    if (pfPlateAv !== p.av) { const old = box.querySelector('.pf-av'); if (old) old.remove(); box.insertAdjacentHTML('afterbegin', pfAvHTML(p.av)); pfPlateAv = p.av; }
    pfPlateFit();
    pfPaintAv(box.querySelector('.pf-av'));
}
// ширина плашки — до кнопок справа (лавка, вопросы, рулетка), на ПК не шире 250
function pfPlateFit() {
    if (!pfPlate || pfPlate.classList.contains('hidden')) return;
    const sh = document.getElementById('openShopBtn'); if (!sh || !sh.offsetParent) return;
    const r = pfPlate.getBoundingClientRect(), z = (r.width / pfPlate.offsetWidth) || 1, br = sh.getBoundingClientRect();
    const w = Math.max(150, Math.min(250, (br.left - r.left) / z - 12));
    pfPlate.style.width = w.toFixed(1) + 'px';
    // монеты — под плашкой, ровно по её левому краю (у монет свой масштаб, поэтому считаем в экранных пикселях)
    const mc = document.getElementById('menuCoins'), ss = document.getElementById('startScreen');
    if (mc && ss) {
        const sr = ss.getBoundingClientRect(), pr = pfPlate.getBoundingClientRect(), mz = (mc.getBoundingClientRect().width / mc.offsetWidth) || 1;
        mc.style.top = ((pr.bottom - sr.top + 8 * z) / mz).toFixed(1) + 'px';
        mc.style.left = ((pr.left - sr.left) / mz).toFixed(1) + 'px';
    }
}
window.addEventListener('resize', () => { pfPlateFit(); setTimeout(() => { pfPlateFit(); if (pfPlate) pfPaintAll(pfPlate); }, 120); });

// ---- окно регистрации ----
let auRoot = null, auMode = 'reg', auAv = 'normal';
function auBuild() {
    if (auRoot) return auRoot;
    const host = document.getElementById('gameContainer') || document.body;
    auRoot = document.createElement('div'); auRoot.id = 'authModal'; auRoot.className = 'hidden';
    host.appendChild(auRoot);
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(ev => auRoot.addEventListener(ev, e => e.stopPropagation()));
    auRoot.addEventListener('click', (e) => {
        const b = e.target.closest('[data-au]'); if (!b) return;
        const a = b.dataset.au;
        if (a === 'av') { auAv = b.dataset.av; auRoot.querySelectorAll('.pf-avs .pf-av').forEach(x => x.classList.toggle('on', x === b)); const em = auRoot.querySelector('.au-emb .pf-av'); if (em) { em.dataset.av = auAv; em.style.setProperty('--g', pfAv(auAv).g); pfPaintAv(em); } try { Haptics.flap(); } catch (er) {} }
        else if (a === 'eye') { const inp = b.parentNode.querySelector('input'); const on = inp.type === 'password'; inp.type = on ? 'text' : 'password'; b.innerHTML = `<i class="fa-solid ${on ? 'fa-eye-slash' : 'fa-eye'}"></i>`; }
        else if (a === 'go') auSubmit();
        else if (a === 'vk') pfToast(auRoot.querySelector('#authWin'), 'Вход через ВКонтакте появится вместе с сервером игры', 'info');
        else if (a === 'mode') { auMode = auMode === 'reg' ? 'login' : 'reg'; auRender(); }
    });
    auRoot.addEventListener('input', (e) => { const f = e.target.closest('.pf-f'); if (f) f.classList.remove('bad'); const er = auRoot.querySelector('.pf-err'); if (er) er.textContent = ''; });
    auRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); auSubmit(); } });
    return auRoot;
}
function auRender() {
    const reg = auMode === 'reg';
    const tw = [[-44, -30, 8, 0], [46, -10, 7, .9], [38, 34, 6, 1.7]].map(([x, y, s, d]) => `<i class="pf-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('');
    auRoot.innerHTML = `<div id="authWin">
        <div class="au-emb">${pfAvHTML(reg ? auAv : 'normal')}<div class="pf-ring"></div>${tw}</div>
        <div class="pf-title"><b>${reg ? 'НОВЫЙ ИГРОК' : 'ВХОД'}</b><span>${reg ? 'Создай профиль совы: уровень, навыки и статистика будут копиться с каждым полётом' : 'Войди в свой профиль совы'}</span></div>
        ${reg ? `<div class="pf-lbl">Выбери сову</div><div class="pf-avs">${PF_AV.map(a => pfAvHTML(a.id, a.id === auAv ? 'on' : '', 'data-au="av"')).join('')}</div>` : ''}
        <div class="pf-fields">
            ${reg ? `<label class="pf-f" data-f="nick" style="--c:#C084FC"><i class="fa-solid fa-user"></i><input id="auNick" type="text" maxlength="16" placeholder="Никнейм" autocomplete="nickname" autocapitalize="off" spellcheck="false"></label>` : ''}
            <label class="pf-f" data-f="mail" style="--c:#5EEAD4"><i class="fa-solid fa-envelope"></i><input id="auMail" type="email" maxlength="60" placeholder="${reg ? 'Почта' : 'Почта или никнейм'}" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email"></label>
            <label class="pf-f" data-f="pass" style="--c:#FFB25C"><i class="fa-solid fa-lock"></i><input id="auPass" type="password" maxlength="40" placeholder="Пароль${reg ? ' (от 6 символов)' : ''}" autocomplete="${reg ? 'new-password' : 'current-password'}"><button type="button" class="pf-eye" data-au="eye" aria-label="Показать пароль"><i class="fa-solid fa-eye"></i></button></label>
        </div>
        <div class="pf-err"></div>
        <button type="button" class="pf-main" data-au="go"><i class="fa-solid ${reg ? 'fa-user-plus' : 'fa-right-to-bracket'}"></i>${reg ? 'СОЗДАТЬ ПРОФИЛЬ' : 'ВОЙТИ'}</button>
        <div class="pf-or">или</div>
        <button type="button" class="pf-vk" data-au="vk"><span class="vk-l">VK</span>Войти через ВКонтакте</button>
        <div class="pf-link">${reg ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}<button type="button" data-au="mode">${reg ? 'Войти' : 'Регистрация'}</button></div>
    </div>`;
    requestAnimationFrame(() => pfPaintAll(auRoot));
}
async function pfHash(s) {
    try {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bubo:' + s));
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'd' + (h >>> 0).toString(16); }
}
const PF_NICK_RE = /^[A-Za-zА-Яа-яЁё0-9 _.\-]{3,16}$/, PF_MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function pfNickErr(n) { if (n.length < 3) return 'Никнейм — от 3 символов'; if (!PF_NICK_RE.test(n)) return 'В никнейме — буквы, цифры, пробел, _ . -'; return ''; }
function auBad(f, msg) {
    const el = auRoot.querySelector(`.pf-f[data-f="${f}"]`); if (el) { el.classList.add('bad'); const i = el.querySelector('input'); if (i) i.focus(); }
    const er = auRoot.querySelector('.pf-err'); if (er) er.textContent = msg;
    try { Haptics.hit(); } catch (e) {}
}
let auBusy = false;
async function auSubmit() {
    if (auBusy) return;
    const v = (id) => { const i = document.getElementById(id); return i ? i.value.trim() : ''; };
    const nick = v('auNick').replace(/\s+/g, ' '), mail = v('auMail'), pass = (document.getElementById('auPass') || {}).value || '';
    if (auMode === 'login') {
        if (!mail) return auBad('mail', 'Введи почту или никнейм');
        if (!pass) return auBad('pass', 'Введи пароль');
        return auBad('mail', 'Профиль не найден на этом устройстве. Вход с других устройств появится вместе с сервером игры');
    }
    const ne = pfNickErr(nick); if (ne) return auBad('nick', ne);
    if (!PF_MAIL_RE.test(mail)) return auBad('mail', 'Проверь почту — например, owl@mail.ru');
    if (pass.length < 6) return auBad('pass', 'Пароль — от 6 символов');
    auBusy = true;
    const ph = await pfHash(pass);
    auBusy = false;
    pfSet({ nick, mail, ph, av: auAv, created: Date.now(), vk: false });
    try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {}
    closeAuth();
    pfWelcome(nick);
}
function pfWelcome(nick) {
    const host = document.getElementById('gameContainer') || document.body;
    const el = document.createElement('div'); el.id = 'pfLvUp';
    el.innerHTML = `${pfAvHTML(pfGet().av, 'lv-av')}<div><b>ПРИВЕТ, ${pfEsc(nick).toUpperCase()}!</b><span>Летай, копи опыт и прокачивай сову</span></div>`;
    host.appendChild(el); pfPaintAll(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3700);
}
function openAuth(mode) {
    auBuild(); auMode = mode || 'reg';
    const p = pfGet(); auAv = p ? p.av : 'normal';
    auRender();
    auRoot.classList.remove('hidden');
}
function closeAuth() { if (auRoot) auRoot.classList.add('hidden'); try { updateMenuVisibility(); } catch (e) {} }

// ---- окно профиля ----
let pfRoot = null, pfTab = 'owl', pfSure = null, pfSureT = 0, pfAnim = 0;
const PF_TABS = [
    { id: 'owl', name: 'Сова', icon: 'fa-feather', c: '#FE7600' },
    { id: 'skills', name: 'Навыки', icon: 'fa-graduation-cap', c: '#C084FC' },
    { id: 'stats', name: 'Статистика', icon: 'fa-chart-simple', c: '#38BDF8' },
    { id: 'prof', name: 'Профиль', icon: 'fa-id-card', c: '#5EEAD4' }
];
function pfBuild() {
    if (pfRoot) return pfRoot;
    const host = document.getElementById('gameContainer') || document.body;
    pfRoot = document.createElement('div'); pfRoot.id = 'profModal'; pfRoot.className = 'hidden';
    pfRoot.innerHTML = `<div id="pfWin">
        <button type="button" class="pf-x" data-pf="close" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button>
        <div class="pf-hero" id="pfHero"></div>
        <div class="pf-tabs" id="pfTabs"></div>
        <div class="pf-pane" id="pfPane"></div>
        <div class="pf-foot"><button type="button" class="pf-fb st" data-pf="settings"><i class="fa-solid fa-gear"></i>НАСТРОЙКИ</button><button type="button" class="pf-fb" data-pf="close"><i class="fa-solid fa-house"></i>В МЕНЮ</button></div>
    </div>`;
    host.appendChild(pfRoot);
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(ev => pfRoot.addEventListener(ev, e => e.stopPropagation()));
    pfRoot.addEventListener('click', (e) => {
        if (e.target === pfRoot) { closeProfile(); return; }
        const b = e.target.closest('[data-pf]'); if (!b) return;
        const a = b.dataset.pf;
        if (a === 'close') closeProfile();
        else if (a === 'settings') { closeProfile(); const s = document.getElementById('openSettingsBtn'); if (s) s.click(); }
        else if (a.startsWith('tab:')) pfShowTab(a.slice(4));
        else if (a === 'shop') { closeProfile(); try { openShop(); } catch (er) {} }
        else if (a === 'quiz') { closeProfile(); try { openQuiz(); } catch (er) {} }
        else if (a.startsWith('sk:')) pfSkTap(a.slice(3));
        else if (a === 'av') { const p = pfGet(); if (!p) return; p.av = b.dataset.av; pfSet(p); pfRenderHero(); pfRenderPane(); try { Haptics.flap(); } catch (er) {} }
        else if (a === 'eye') { const inp = b.parentNode.querySelector('input'); const on = inp.type === 'password'; inp.type = on ? 'text' : 'password'; b.innerHTML = `<i class="fa-solid ${on ? 'fa-eye-slash' : 'fa-eye'}"></i>`; }
        else if (a === 'nick') pfSaveNick();
        else if (a === 'mail') pfSaveMail();
        else if (a === 'pass') pfSavePass();
        else if (a === 'vk') pfToast(document.getElementById('pfWin'), 'Привязка ВКонтакте появится вместе с сервером игры', 'info');
    });
    pfRoot.addEventListener('input', (e) => { const f = e.target.closest('.pf-f'); if (f) f.classList.remove('bad'); });
    pfRoot.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
        e.preventDefault(); const id = e.target.id;
        if (id === 'pfNick') pfSaveNick(); else if (id === 'pfMail') pfSaveMail(); else pfSavePass();
    });
    return pfRoot;
}
function pfRenderHero() {
    const h = document.getElementById('pfHero'); const p = pfGet(); if (!h || !p) return;
    const info = pfLvInfo(PG.xp), max = info.L >= PF_LV_MAX;
    const tw = [[-40, -32, 7, 0], [42, -22, 6, 1.1], [36, 34, 5, .5]].map(([x, y, s, d]) => `<i class="pf-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('');
    h.innerHTML = `<div class="pf-hav" data-pf="tab:prof" title="Сменить аватар">${pfAvHTML(p.av)}<div class="pf-ring"></div>${tw}</div>
        <div class="pf-hinfo"><div class="pf-nick">${pfEsc(p.nick)}</div>
            <div class="pf-lvrow"><span class="pf-lvl">УРОВЕНЬ ${info.L}</span><span class="pf-xpn">${max ? 'максимум' : `${info.cur} / ${info.need} опыта`}</span></div>
            <div class="pf-xpbar"><i style="width:${info.pct}%"></i></div>
            <button type="button" class="pf-ptschip${PG.pts > 0 ? '' : ' hidden'}" data-pf="tab:skills"><i class="fa-solid fa-graduation-cap"></i>${PG.pts} ${pfPl(PG.pts, ['очко', 'очка', 'очков'])} обучения</button></div>`;
    pfPaintAll(h);
    pfRenderTabs();
}
function pfRenderTabs() {
    const t = document.getElementById('pfTabs'); if (!t) return;
    t.innerHTML = PF_TABS.map(x => `<button type="button" class="pf-tab${x.id === pfTab ? ' on' : ''}" data-pf="tab:${x.id}" style="--c:${x.c}"><i class="fa-solid ${x.icon}"></i><span>${x.name}</span>${x.id === 'skills' && PG.pts > 0 ? `<b class="pf-dot">${PG.pts}</b>` : ''}</button>`).join('');
}
function pfShowTab(id) {
    if (!PF_TABS.some(x => x.id === id)) id = 'owl';
    pfTab = id; pfSure = null; pfRenderTabs(); pfRenderPane();
    const pn = document.getElementById('pfPane'); if (pn) pn.scrollTop = 0;
}
const pfFmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function pfCard(icon, c, val, lbl, plus) { return `<div class="pf-card" style="--c:${c}"><i class="fa-solid ${icon}"></i><div class="pf-cv"><b>${val}</b><span>${lbl}</span></div>${plus ? `<button type="button" class="pf-plus" data-pf="${plus}" aria-label="Пополнить"><i class="fa-solid fa-plus"></i></button>` : ''}</div>`; }
function pfStatTile(icon, c, lbl, val) { return `<div class="pf-st" style="--c:${c}"><span><i class="fa-solid ${icon}"></i>${lbl}</span><b>${val}</b></div>`; }
function pfRenderPane() {
    const el = document.getElementById('pfPane'); if (!el) return;
    const p = pfGet() || {};
    let h = '';
    if (pfTab === 'owl') {
        let lv = 3, ml = 3, st = 100, ms = 100, at = 0, sc = 0, th = 0, tt = 120, dn = '', dc = '#4ADE80';
        try { lv = lives; ml = maxLives; st = stamina; ms = maxStamina; at = attempts; sc = score; th = getTotalCollectedThemes(); tt = TOTAL_THEMES; const d = getDifficultyMultipliers(); dn = d.level; dc = d.color || dc; } catch (e) {}
        const lvTxt = (x) => (Math.round(x * 2) / 2).toString().replace('.', ',');
        h += `<div class="pf-cards">`
            + pfCard('fa-heart', '#F43F5E', `${lvTxt(lv)} / ${lvTxt(ml)}`, 'Жизни', 'shop')
            + pfCard('fa-bolt', '#00F0FF', `${Math.round(st)}%`, `Силы из ${Math.round(ms)}%`, 'shop')
            + pfCard('fa-rotate-right', '#FE7600', at, 'Попытки', 'shop')
            + pfCard('fa-coins', '#FFC53D', pfFmt(coinsGet()), 'Монеты', 'quiz')
            + pfCard('fa-circle-question', '#FE7600', pfFmt(sc), 'Вопросов сегодня')
            + pfCard('fa-layer-group', '#A855F7', `${th} / ${tt}`, 'Темы сегодня')
            + `</div>`;
        if (dn) h += `<div class="pf-cards" style="grid-template-columns:1fr">${pfCard('fa-gauge-high', dc, dn, 'Сложность сейчас')}</div>`;
        let inv = '';
        try { inv = INV_TYPES.map(t => { const n = invCount(t.key); return `<div class="pf-ii${n ? '' : ' zero'}" style="--c:${t.col}"><i class="fa-solid ${t.icon}"></i>${n}</div>`; }).join(''); } catch (e) {}
        if (inv) h += `<div class="pf-sec" style="--c:#4ADE80"><i class="fa-solid fa-box-open"></i>Запас эффектов</div><div class="pf-inv">${inv}</div>`;
        const bon = PF_SK.filter(s => skRank(s.k) > 0).map(s => `<span style="--c:${s.col}"><i class="fa-solid ${s.icon}"></i>${s.fx(skRank(s.k))}${skTrig(s.k) && s.top ? ' · +1 порция' : ''}</span>`).join('');
        h += `<div class="pf-sec" style="--c:#C084FC"><i class="fa-solid fa-graduation-cap"></i>Навыки совы</div>`
            + (bon ? `<div class="pf-bon">${bon}</div>` : `<div class="pf-empty">Пока ничего не изучено. За каждый уровень сова получает очко обучения — трать его во вкладке «Навыки».</div>`);
    } else if (pfTab === 'skills') {
        const c = coinsGet();
        h += `<div class="pf-ptsbox"><div class="pf-pn">${PG.pts}</div><div class="pf-pt"><b>${PG.pts} ${pfPl(PG.pts, ['очко', 'очка', 'очков'])} обучения</b>За каждый уровень — 1 очко, за каждый 5-й — 2. Ступень навыка стоит очки и монеты, каждая следующая — дороже.</div></div>`;
        h += PF_SK.map(s => {
            const r = skRank(s.k), max = r >= PF_SK_MAX;
            const pips = Array.from({ length: PF_SK_MAX }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
            let btn;
            if (max) btn = `<div class="pf-skb done"><i class="fa-solid fa-check"></i>ИЗУЧЕНО ПОЛНОСТЬЮ</div>`;
            else {
                const np = PF_SK_PTS[r], nc = PF_SK_COINS[r];
                const cost = `<span class="pf-cost"><i class="fa-solid fa-graduation-cap"></i>${np}</span><span class="pf-cost"><i class="fa-solid fa-coins"></i>${nc}</span>`;
                if (PG.pts < np) btn = `<div class="pf-skb no">Нужно ${np} ${pfPl(np, ['очко', 'очка', 'очков'])} ${cost}</div>`;
                else if (c < nc) btn = `<div class="pf-skb no">Не хватает монет ${cost}</div>`;
                else if (pfSure === s.k) btn = `<button type="button" class="pf-skb sure" data-pf="sk:${s.k}">ИЗУЧИТЬ? ${cost}</button>`;
                else btn = `<button type="button" class="pf-skb" data-pf="sk:${s.k}">${r ? 'СЛЕДУЮЩАЯ СТУПЕНЬ' : 'ИЗУЧИТЬ'} ${cost}</button>`;
            }
            const now = r ? `Сейчас: <b>${s.fx(r)}</b>${skTrig(s.k) && s.top ? ' и +1 порция' : ''}.` : 'Ещё не изучено.';
            return `<div class="pf-sk${max ? ' max' : ''}" data-sk="${s.k}" style="--c:${s.col}"><div class="pf-skh"><div class="pf-ski"><i class="fa-solid ${s.icon}"></i></div><div class="pf-skn">${s.name}<small>Ступень ${r} из ${PF_SK_MAX}</small></div><div class="pf-pips">${pips}</div></div>
                <div class="pf-skd">${s.step}${s.top ? ' ' + s.top : ''} ${now}</div>${btn}</div>`;
        }).join('');
    } else if (pfTab === 'stats') {
        const info = pfLvInfo(PG.xp), t = Math.round(PS.time || 0), hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60);
        const since = p.created ? new Date(p.created).toLocaleDateString('ru-RU') : '—';
        h += `<div class="pf-stats">`
            + pfStatTile('fa-star', '#FFB25C', 'Уровень', info.L)
            + pfStatTile('fa-bolt', '#C084FC', 'Опыта всего', pfFmt(PG.xp))
            + pfStatTile('fa-circle-question', '#FE7600', 'Вопросов собрано', pfFmt(PS.q))
            + pfStatTile('fa-trophy', '#FACC15', 'Рекорд за день', pfFmt(PS.best))
            + pfStatTile('fa-layer-group', '#A855F7', 'Тем собрано', pfFmt(PS.themes))
            + pfStatTile('fa-crown', '#FFD66B', 'Побед', pfFmt(PS.wins))
            + pfStatTile('fa-rotate-right', '#FB923C', 'Попыток сыграно', pfFmt(PS.att))
            + pfStatTile('fa-coins', '#FFC53D', 'Монет заработано', pfFmt(PS.coins))
            + pfStatTile('fa-comments', '#38BDF8', 'Вопросы дня: верно', `${pfFmt(PS.qzOk)} из ${pfFmt(PS.qzAll)}`)
            + pfStatTile('fa-clock', '#5EEAD4', 'Время в полёте', hh ? `${hh} ч ${mm} мин` : `${mm} мин`)
            + pfStatTile('fa-calendar', '#F472B6', 'Дней в игре', pfFmt(PS.days))
            + pfStatTile('fa-feather', '#E9D5FF', 'В игре с', since)
            + `</div>`;
    } else {
        h += `<div class="pf-sec" style="--c:#C084FC"><i class="fa-solid fa-image-portrait"></i>Аватар</div><div class="pf-avs">${PF_AV.map(a => pfAvHTML(a.id, a.id === p.av ? 'on' : '', 'data-pf="av"')).join('')}</div>`
            + `<div class="pf-sec" style="--c:#C084FC"><i class="fa-solid fa-user"></i>Никнейм</div>`
            + `<div class="pf-row"><label class="pf-f" data-f="nick" style="--c:#C084FC"><i class="fa-solid fa-user"></i><input id="pfNick" type="text" maxlength="16" value="${pfEsc(p.nick)}" autocomplete="nickname" autocapitalize="off" spellcheck="false"></label><button type="button" class="pf-save" data-pf="nick" aria-label="Сохранить"><i class="fa-solid fa-check"></i></button></div>`
            + `<div class="pf-sec" style="--c:#5EEAD4"><i class="fa-solid fa-envelope"></i>Почта</div>`
            + `<div class="pf-row"><label class="pf-f" data-f="mail" style="--c:#5EEAD4"><i class="fa-solid fa-envelope"></i><input id="pfMail" type="email" maxlength="60" value="${pfEsc(p.mail)}" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email"></label><button type="button" class="pf-save" data-pf="mail" aria-label="Сохранить"><i class="fa-solid fa-check"></i></button></div>`
            + `<div class="pf-sec" style="--c:#FFB25C"><i class="fa-solid fa-key"></i>Сменить пароль</div>`
            + `<div class="pf-fields"><label class="pf-f" data-f="old" style="--c:#FFB25C"><i class="fa-solid fa-lock"></i><input id="pfOld" type="password" maxlength="40" placeholder="Текущий пароль" autocomplete="current-password"><button type="button" class="pf-eye" data-pf="eye" aria-label="Показать пароль"><i class="fa-solid fa-eye"></i></button></label>`
            + `<div class="pf-row"><label class="pf-f" data-f="new" style="--c:#FFB25C"><i class="fa-solid fa-lock"></i><input id="pfNew" type="password" maxlength="40" placeholder="Новый пароль" autocomplete="new-password"><button type="button" class="pf-eye" data-pf="eye" aria-label="Показать пароль"><i class="fa-solid fa-eye"></i></button></label><button type="button" class="pf-save" data-pf="pass" aria-label="Сохранить"><i class="fa-solid fa-check"></i></button></div></div>`
            + `<button type="button" class="pf-vk" data-pf="vk"><span class="vk-l">VK</span>Привязать ВКонтакте</button>`
            + `<div class="pf-note"><i class="fa-solid fa-circle-info"></i><span>Профиль и прогресс пока хранятся на этом устройстве. Вход с других устройств появится вместе с сервером игры.</span></div>`;
    }
    el.innerHTML = h;
    pfPaintAll(el);
}
function pfFieldBad(id, msg) {
    const i = document.getElementById(id), f = i && i.closest('.pf-f'); if (f) f.classList.add('bad'); if (i) i.focus();
    pfToast(document.getElementById('pfWin'), msg, 'bad'); try { Haptics.hit(); } catch (e) {}
}
function pfSaveNick() {
    const p = pfGet(); if (!p) return;
    const n = ((document.getElementById('pfNick') || {}).value || '').trim().replace(/\s+/g, ' ');
    const er = pfNickErr(n); if (er) return pfFieldBad('pfNick', er);
    p.nick = n; pfSet(p); pfRenderHero(); pfToast(document.getElementById('pfWin'), 'Никнейм сохранён');
}
function pfSaveMail() {
    const p = pfGet(); if (!p) return;
    const m = ((document.getElementById('pfMail') || {}).value || '').trim();
    if (!PF_MAIL_RE.test(m)) return pfFieldBad('pfMail', 'Проверь почту — например, owl@mail.ru');
    p.mail = m; pfSet(p); pfToast(document.getElementById('pfWin'), 'Почта сохранена');
}
async function pfSavePass() {
    const p = pfGet(); if (!p) return;
    const o = (document.getElementById('pfOld') || {}).value || '', n = (document.getElementById('pfNew') || {}).value || '';
    if (!o) return pfFieldBad('pfOld', 'Введи текущий пароль');
    if (await pfHash(o) !== p.ph) return pfFieldBad('pfOld', 'Текущий пароль не подходит');
    if (n.length < 6) return pfFieldBad('pfNew', 'Новый пароль — от 6 символов');
    p.ph = await pfHash(n); pfSet(p);
    document.getElementById('pfOld').value = ''; document.getElementById('pfNew').value = '';
    pfToast(document.getElementById('pfWin'), 'Пароль изменён');
}
// изучение навыка: первое нажатие — «Изучить?», второе (в течение 3 с) — изучить
function pfSkTap(k) {
    const s = PF_SK.find(x => x.k === k); if (!s) return;
    const r = skRank(k); if (r >= PF_SK_MAX) return;
    const np = PF_SK_PTS[r], nc = PF_SK_COINS[r];
    if (PG.pts < np || coinsGet() < nc) { pfRenderPane(); return; }
    if (pfSure !== k) { pfSure = k; clearTimeout(pfSureT); pfSureT = setTimeout(() => { pfSure = null; if (pfTab === 'skills') pfRenderPane(); }, 3000); pfRenderPane(); try { Haptics.flap(); } catch (e) {} return; }
    pfSure = null; clearTimeout(pfSureT);
    PG.pts -= np; PG.sk[k] = r + 1; pfSaveProg();
    coinsSet(coinsGet() - nc);
    try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {}
    pfRenderHero(); pfRenderPane(); pfPlateSync();
    const card = document.querySelector(`#pfPane .pf-sk[data-sk="${k}"]`); if (card) card.classList.add('up');
    pfToast(document.getElementById('pfWin'), `${s.name}: ступень ${r + 1}`);
}
function pfToast(win, msg, kind) {
    if (!win) return;
    win.querySelectorAll('.pf-toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'pf-toast' + (kind ? ' ' + kind : '');
    t.textContent = msg; t.style.top = (win.scrollTop + 96) + 'px';
    win.appendChild(t); setTimeout(() => t.remove(), 2500);
}
// сова в шапке окна чуть машет крыльями
function pfAnimLoop() {
    cancelAnimationFrame(pfAnim);
    const tick = (t) => {
        if (!pfRoot || pfRoot.classList.contains('hidden')) return;
        const el = pfRoot.querySelector('.pf-hav .pf-av'); if (el) pfPaintAv(el, 0.5 + 0.5 * Math.sin(t / 260));
        pfAnim = requestAnimationFrame(tick);
    };
    pfAnim = requestAnimationFrame(tick);
}
function openProfile(tab) {
    if (!pfGet()) { openAuth('reg'); return; }
    try { AudioFX.resume(); } catch (e) {}
    pfBuild(); pfTab = tab || 'owl'; pfSure = null;
    pfRoot.classList.remove('hidden');
    pfRenderHero(); pfRenderPane();
    const w = document.getElementById('pfPane'); if (w) w.scrollTop = 0;
    pfAnimLoop();
}
function closeProfile() {
    if (pfRoot) pfRoot.classList.add('hidden');
    cancelAnimationFrame(pfAnim); pfSure = null;
    pfPlateSync();
    try { updateHUDAll(); } catch (e) {}
}

// админка: +1 уровень (для проверки) и полный сброс профиля вместе с игрой
function profAdminLevel() { const i = pfLvInfo(PG.xp); pfXpAdd(i.need - i.cur); }
function profAdminReset() {
    try { [PF_KEY, PG_KEY, PS_KEY, 'bubo_inv'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
    PG = { xp: 0, lvl: 1, pts: 0, sk: {} };
    PS = { q: 0, best: 0, themes: 0, att: 0, wins: 0, coins: 0, qzOk: 0, qzAll: 0, time: 0, days: 0, lastDay: '' };
    pfPlateSync();
    openAuth('reg');
}

// после экрана загрузки: нет профиля — сначала регистрация, есть — плашка игрока в меню
(function () {
    pfPlateSync();
    let asked = false;
    const iv = setInterval(() => {
        if (document.documentElement.classList.contains('booting')) return;
        pfPlateSync();
        if (!asked) { asked = true; if (!pfGet()) openAuth('reg'); }
        clearInterval(iv);
    }, 200);
    setInterval(() => { if (pfPlate && !pfPlate.classList.contains('hidden')) { const p = pfGet(); if (!p) pfPlateSync(); } }, 2000);
})();
