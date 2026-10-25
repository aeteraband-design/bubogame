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
// уровни копятся долго: первый — за первый полёт, 5-й — примерно за неделю игры, 10-й — за пару месяцев
const PF_XP = { q: 1, theme: 2, win: 150, qzBad: 0 };   // за вопрос в полёте, за тему, за победу; вопрос дня: верно — столько же, сколько монет за него
function pfNeed(L) { return Math.round(250 * Math.pow(L, 1.5) / 10) * 10; }   // 250, 710, 1300, 2000, 2800 … 7910 на 10-м
function pfLvInfo(xp) {
    let L = 1, r = Math.max(0, Math.floor(xp || 0));
    while (L < PF_LV_MAX && r >= pfNeed(L)) { r -= pfNeed(L); L++; }
    const need = pfNeed(L);
    return { L, cur: r, need, pct: L >= PF_LV_MAX ? 100 : Math.min(99, Math.floor(r / need * 100)) };
}
function pfPtsFor(L) { return L % 5 === 0 ? 2 : 1; }
function pfCoinsFor(L) { return 20 + 5 * L; }

// ---- навыки ----
// у каждого навыка 5 ступеней; простые (холод, хмель, еда) дешевле, сильные (силы, щит, монеты) — дороже: на них надо копить
const PF_SK_MAX = 5;
const PF_SK_COST = {
    minor: { pts: [2, 3, 3, 4, 5], coins: [60, 120, 200, 300, 450] },
    major: { pts: [4, 4, 5, 6, 7], coins: [120, 220, 350, 500, 700] }
};
const PF_SK = [
    { k: 'cold', tier: 'minor', name: 'Морозостойкость', icon: 'fa-snowflake', col: '#7DD3FC', short: 'Быстрее оттаивает', step: 'Сова быстрее оттаивает: заморозка короче на 6% за ступень.', top: 'На 5-й ступени — на 1 мороженое больше до заморозки.', topS: '+1 мороженое', fx: r => `заморозка −${r * 6}%`, v: r => `−${r * 6}%` },
    { k: 'drunk', tier: 'minor', name: 'Крепкая голова', icon: 'fa-martini-glass-citrus', col: '#2DD4BF', short: 'Быстрее трезвеет', step: 'Сова быстрее трезвеет: опьянение короче на 6% за ступень.', top: 'На 5-й ступени — на 1 коктейль больше до опьянения.', topS: '+1 коктейль', fx: r => `опьянение −${r * 6}%`, v: r => `−${r * 6}%` },
    { k: 'food', tier: 'minor', name: 'Крепкий желудок', icon: 'fa-burger', col: '#FB923C', short: 'Быстрее приходит в себя после переедания', step: 'Переедание проходит быстрее: короче на 6% за ступень.', top: 'На 5-й ступени — на 1 кусочек больше до переедания.', topS: '+1 кусочек', fx: r => `переедание −${r * 6}%`, v: r => `−${r * 6}%` },
    { k: 'stam', tier: 'major', name: 'Выносливость', icon: 'fa-feather-pointed', col: '#22D3EE', short: 'Силы тратятся медленнее', step: 'Силы в полёте тратятся на 4% медленнее за ступень.', fx: r => `расход сил −${r * 4}%`, v: r => `−${r * 4}%` },
    { k: 'shield', tier: 'major', name: 'Крепкий щит', icon: 'fa-shield-halved', col: '#4ADE80', short: 'Щит держится дольше', step: 'Щит держится на 1 секунду дольше за ступень.', fx: r => `щит +${r} с`, v: r => `+${r} с` },
    { k: 'coins', tier: 'major', name: 'Монетный нюх', icon: 'fa-coins', col: '#FFC53D', short: 'Больше монет в полёте', step: 'Монет в полёте на 6% больше за ступень: значки монет и монеты за каждые 50 вопросов.', fx: r => `монеты +${r * 6}%`, v: r => `+${r * 6}%` }
];
function pfSkCost(s, r) { const c = PF_SK_COST[s.tier]; return { pts: c.pts[r], coins: c.coins[r] }; }
// переход на новые цены: уровень пересчитывается по новой шкале, очки — заново за все уровни, изученные навыки и потраченные на них монеты возвращаются
(function () {
    if (PG.v === 2) return;
    const OLD = [50, 100, 200, 350, 500];
    let back = 0; Object.keys(PG.sk || {}).forEach(k => { for (let i = 0; i < (PG.sk[k] | 0); i++) back += OLD[i] || 0; });
    const L = (function () { let L = 1, r = Math.max(0, Math.floor(PG.xp || 0)); while (L < 99 && r >= Math.round(250 * Math.pow(L, 1.5) / 10) * 10) { r -= Math.round(250 * Math.pow(L, 1.5) / 10) * 10; L++; } return L; })();
    let pts = 0; for (let l = 2; l <= L; l++) pts += (l % 5 === 0 ? 2 : 1);
    PG.lvl = L; PG.pts = pts; PG.sk = {}; PG.v = 2;
    pfStore(PG_KEY, PG);
    if (back > 0) { try { localStorage.setItem('bubo_coins', String((parseInt(localStorage.getItem('bubo_coins'), 10) || 0) + back)); } catch (e) {} }
})();
function skRank(k) { const r = PG.sk && PG.sk[k]; return Math.max(0, Math.min(PF_SK_MAX, r | 0)); }
function skDur(k) { return 1 - 0.06 * skRank(k); }                 // длительность заморозки / опьянения / переедания
function skTrig(k) { return skRank(k) >= PF_SK_MAX ? 1 : 0; }      // +1 порция до состояния на последней ступени
function skStamMul() { return 1 - 0.04 * skRank('stam'); }
function skCoinMul() { return 1 + 0.06 * skRank('coins'); }
function shieldSecs() { return ADMIN_CFG.shieldSec + skRank('shield'); }

function pfSaveProg() { PG.v = 2; pfStore(PG_KEY, PG); }
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
    pfXpAdd(ok ? (coins || 2) : PF_XP.qzBad);
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

// ---- аватары: сова игры в одном из своих состояний — у каждой свой цвет и своё живое движение ----
// g — цвет фона аватара; c, l, s — оформление окон и плашки под аватар: основной, светлый (заголовок, звёздочки, блик кольца) и второй (свечение снизу)
const PF_AV = [
    { id: 'normal', g: '168,85,247', c: '#A855F7', l: '#E9D5FF', s: '#5EEAD4' },   // классика — машет крыльями
    { id: 'wet', g: '59,130,246', c: '#3B82F6', l: '#DBEAFE', s: '#22D3EE' },      // мокрая — в капельках, капли стекают
    { id: 'freeze', g: '103,232,249', c: '#67E8F9', l: '#ECFEFF', s: '#A5B4FC' },  // ледяная — кувыркается во льду, как в игре
    { id: 'drunk', g: '34,197,94', c: '#22C55E', l: '#DCFCE7', s: '#FACC15' },     // весёлая — покачивается, глаза кружатся
    { id: 'fat', g: '244,114,182', c: '#F472B6', l: '#FCE7F3', s: '#FB923C' },     // сытая — пузатая, неспешно машет
    { id: 'shazam', g: '254,118,0', c: '#FE7600', l: '#FFE0B8', s: '#FACC15' },    // ШАЗАМ — молнии вокруг
    { id: 'speed', g: '250,204,21', c: '#FACC15', l: '#FEF9C3', s: '#FE7600' },    // шустрая — наклонилась вперёд, быстро машет
    { id: 'dizzy', g: '244,63,94', c: '#F43F5E', l: '#FFE4E6', s: '#C084FC' }      // оглушённая — звёздочки кружатся над головой
];
function pfAv(id) { return PF_AV.find(a => a.id === id) || PF_AV[0]; }
function pfTheme(el, id) { if (!el) return; const a = pfAv(id); el.style.setProperty('--pfC', a.c); el.style.setProperty('--pfL', a.l); el.style.setProperty('--pfS', a.s); }
function pfAvHTML(id, cls, extra) { const a = pfAv(id); return `<span class="pf-av ${cls || ''}" data-av="${a.id}" style="--g:${a.g}" ${extra || ''}><canvas></canvas></span>`; }
// движение каждой совы во времени t (мс): взмах крыльев, наклон, кувырок
function pfMotion(id, t) {
    const sn = Math.sin;
    switch (id) {
        case 'freeze': return { wing: 0, rot: 0, spin: t / 1000 * 2.4 };
        case 'drunk': return { wing: 0.5 + 0.5 * sn(t / 260), rot: sn(t / 420) * 0.2, spin: 0 };
        case 'fat': return { wing: 0.5 + 0.5 * sn(t / 330), rot: 0, spin: 0 };
        case 'shazam': return { wing: Math.max(0, sn(t / 90)), rot: 0, spin: 0 };
        case 'speed': return { wing: Math.max(0, sn(t / 75)), rot: 0, spin: 0 };
        default: return { wing: 0.5 + 0.5 * sn(t / 190), rot: 0, spin: 0 };
    }
}
function pfPaintAv(el, t) {
    const cv = el && el.querySelector('canvas'); if (!cv || typeof window.__owlPortrait !== 'function') return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1), z = (el.getBoundingClientRect().width / w) || 1, px = dpr * z;
    const W = Math.round(w * px), H = Math.round(h * px);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const now = t == null ? performance.now() : t, m = pfMotion(el.dataset.av, now);
    try { window.__owlPortrait(g, px, w / 2, h / 2, Math.min(w, h) * (+el.dataset.k || 1.2), el.dataset.av, m.wing, false, now, m.rot, m.spin); } catch (e) {}
}
function pfPaintAll(root) { (root || document).querySelectorAll('.pf-av').forEach(el => pfPaintAv(el)); }
// все аватары на экране живут постоянно: один общий цикл (крупные — 30 кадров в секунду, мелкие в выборе — 15).
// Ушёл в другое окно и вернулся — цикл сам продолжается; спрятанные аватары не рисуются.
(function () {
    let last = 0, odd = false, list = [], listT = 0;
    const visible = (el) => {
        if (!el.offsetParent || !el.clientWidth) return false;
        if (el.closest('#profPlate')) { const ss = document.getElementById('startScreen'); if (!ss || ss.classList.contains('menu-under-pop') || document.documentElement.classList.contains('booting')) return false; }
        return true;
    };
    const tick = (t) => {
        requestAnimationFrame(tick);
        if (document.hidden || t - last < 32) return;
        last = t; odd = !odd;
        if (t - listT > 400) { listT = t; list = [...document.querySelectorAll('.pf-av')].filter(visible); }
        list.forEach(el => { if (el.closest('.pf-avs') && odd) return; if (el.isConnected) pfPaintAv(el, t); });
    };
    requestAnimationFrame(tick);
})();

// ---- плашка игрока в главном меню ----
let pfPlate = null;
function pfPlateBuild() {
    const ss = document.getElementById('startScreen'); if (!ss || pfPlate) return;
    pfPlate = document.createElement('button'); pfPlate.type = 'button'; pfPlate.id = 'profPlate'; pfPlate.className = 'hidden'; pfPlate.title = 'Профиль';
    pfPlate.innerHTML = `<span class="pp-av"><b class="pp-pts hidden">+1</b></span><span class="pp-mid"><span class="pp-nick"></span><span class="pp-row"><span class="pp-lv"></span><span class="pp-bar"><i></i></span><span class="pp-pct"></span><span class="pp-coins"><i class="fa-solid fa-coins"></i><b>0</b></span></span></span>`;
    pfPlate.addEventListener('click', (e) => { e.stopPropagation(); openProfile(PG.pts > 0 ? 'skills' : 'owl'); });
    ss.insertBefore(pfPlate, ss.firstChild);
}
let pfPlateAv = '';
function pfPlateSync() {
    pfPlateBuild(); if (!pfPlate) return;
    const p = pfGet(), ss = document.getElementById('startScreen');
    pfPlate.classList.toggle('hidden', !p); if (ss) ss.classList.toggle('has-prof', !!p);
    if (!p) return;
    pfTheme(pfPlate, p.av);
    pfPlateCoins();
    const info = pfLvInfo(PG.xp);
    pfPlate.querySelector('.pp-nick').textContent = p.nick;
    pfPlate.querySelector('.pp-lv').textContent = info.L + ' УР';
    pfPlate.querySelector('.pp-bar > i').style.width = info.pct + '%';
    pfPlate.querySelector('.pp-pct').textContent = info.pct + '%';
    const b = pfPlate.querySelector('.pp-pts'); b.classList.toggle('hidden', !(PG.pts > 0)); b.textContent = '+' + PG.pts;
    const box = pfPlate.querySelector('.pp-av');
    if (pfPlateAv !== p.av) { const old = box.querySelector('.pf-av'); if (old) old.remove(); box.insertAdjacentHTML('afterbegin', pfAvHTML(p.av, '', 'data-k="1.5"')); pfPlateAv = p.av; }
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
}
// монеты — прямо в плашке, рядом с ником (отдельная плашка монет в меню при профиле спрятана); прибавились — число подпрыгивает
let pfCoinsShown = -1;
function pfPlateCoins() {
    if (!pfPlate) return;
    const c = coinsGet(); if (c === pfCoinsShown) return;
    const el = pfPlate.querySelector('.pp-coins'); if (!el) return;
    el.querySelector('b').textContent = pfFmt(c);
    if (pfCoinsShown >= 0 && c > pfCoinsShown) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    pfCoinsShown = c;
}
setInterval(pfPlateCoins, 400);
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
        if (a === 'av') { auAv = b.dataset.av; auRoot.querySelectorAll('.pf-avs .pf-av').forEach(x => x.classList.toggle('on', x === b)); const em = auRoot.querySelector('.au-emb .pf-av'); if (em) { em.dataset.av = auAv; em.style.setProperty('--g', pfAv(auAv).g); pfPaintAv(em); } pfTheme(document.getElementById('authWin'), auAv); try { Haptics.flap(); } catch (er) {} }
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
    auRoot.innerHTML = `<div id="authWin" style="--pfC:${pfAv(reg ? auAv : 'normal').c};--pfL:${pfAv(reg ? auAv : 'normal').l};--pfS:${pfAv(reg ? auAv : 'normal').s}">
        <div class="au-emb">${pfAvHTML(reg ? auAv : 'normal', 'round')}<div class="pf-ring"></div>${tw}</div>
        <div class="pf-title"><b>${reg ? 'НОВЫЙ ИГРОК' : 'ВХОД'}</b><span>${reg ? 'Создай профиль совы: уровень, навыки и статистика будут копиться с каждым полётом' : 'Войди в свой профиль совы'}</span></div>
        ${reg ? `<div class="pf-lbl">Выбери аватар</div><div class="pf-avs">${PF_AV.map(a => pfAvHTML(a.id, a.id === auAv ? 'on' : '', 'data-au="av"')).join('')}</div>` : ''}
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
// приветствие говорит сова в логотипе — в своём облачке (одна подсказка, а не несколько поверх друг друга)
function pfWelcome(nick) {
    window.__owlSayNext = { id: 'welcome', text: `Привет, ${nick}! Летай, копи опыт и прокачивай сову` };
    try { localStorage.setItem('bubo_hello_day', (() => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); })()); } catch (e) {}
}
function openAuth(mode) {
    auBuild(); auMode = mode || 'reg';
    const p = pfGet(); auAv = p ? p.av : 'normal';
    auRender();
    auRoot.classList.remove('hidden');
}
function closeAuth() { if (auRoot) auRoot.classList.add('hidden'); try { updateMenuVisibility(); } catch (e) {} }

// ---- окно профиля ----
let pfRoot = null, pfTab = 'owl', pfSure = null, pfSureT = 0, pfPendAv = null;
function pfAvCur() { const p = pfGet(); return pfPendAv || (p && p.av) || 'normal'; }
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
        else if (a === 'av') { const p = pfGet(); if (!p) return; pfPendAv = b.dataset.av === p.av ? null : b.dataset.av; pfRenderHero(); pfRenderPane(); try { Haptics.flap(); } catch (er) {} }   // пока не сохранили — только примерка
        else if (a === 'avok') { const p = pfGet(); if (!p || !pfPendAv) return; p.av = pfPendAv; pfPendAv = null; pfSet(p); pfRenderHero(); pfRenderPane(); pfToast(document.getElementById('pfWin'), 'Аватар сохранён'); try { Haptics.powerup(); } catch (er) {} }
        else if (a === 'avno') { pfPendAv = null; pfRenderHero(); pfRenderPane(); }
        else if (a === 'eye') { const inp = b.parentNode.querySelector('input'); const on = inp.type === 'password'; inp.type = on ? 'text' : 'password'; b.innerHTML = `<i class="fa-solid ${on ? 'fa-eye-slash' : 'fa-eye'}"></i>`; }
        else if (a === 'nick') pfSaveNick();
        else if (a === 'mail') pfSaveMail();
        else if (a === 'pass') pfSavePass();
        else if (a === 'vk') pfToast(document.getElementById('pfWin'), 'Привязка ВКонтакте появится вместе с сервером игры', 'info');
    });
    pfRoot.addEventListener('input', (e) => { const f = e.target.closest('.pf-f'); if (f) f.classList.remove('bad'); });
    pfRoot.querySelector('#pfTabs').addEventListener('scroll', pfTabsEdge, { passive: true });
    pfRoot.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
        e.preventDefault(); const id = e.target.id;
        if (id === 'pfNick') pfSaveNick(); else if (id === 'pfMail') pfSaveMail(); else pfSavePass();
    });
    return pfRoot;
}
function pfRenderHero() {
    const h = document.getElementById('pfHero'); const p = pfGet(); if (!h || !p) return;
    pfTheme(document.getElementById('pfWin'), pfAvCur());
    const info = pfLvInfo(PG.xp), max = info.L >= PF_LV_MAX;
    const tw = [[-40, -32, 7, 0], [42, -22, 6, 1.1], [36, 34, 5, .5]].map(([x, y, s, d]) => `<i class="pf-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('');
    h.innerHTML = `<div class="pf-hav" data-pf="tab:prof" title="Сменить аватар">${pfAvHTML(pfAvCur(), 'round')}<div class="pf-ring"></div>${tw}</div>
        <div class="pf-hinfo"><div class="pf-nick">${pfEsc(p.nick)}</div>
            <div class="pf-lvrow"><span class="pf-lvl">УРОВЕНЬ ${info.L}</span><span class="pf-xpn">${max ? 'максимум' : `${info.cur} / ${info.need} опыта`}</span></div>
            <div class="pf-xpbar"><i style="width:${info.pct}%"></i></div>
            <button type="button" class="pf-ptschip${PG.pts > 0 ? '' : ' hidden'}" data-pf="tab:skills"><i class="fa-solid fa-graduation-cap"></i>${PG.pts} ${pfPl(PG.pts, ['очко', 'очка', 'очков'])} обучения</button></div>`;
    pfPaintAll(h);
    pfRenderTabs();
}
function pfRenderTabs() {
    const t = document.getElementById('pfTabs'); if (!t) return;
    const sl = t.scrollLeft;
    t.innerHTML = PF_TABS.map(x => `<button type="button" class="pf-tab${x.id === pfTab ? ' on' : ''}" data-pf="tab:${x.id}" style="--c:${x.c}"><i class="fa-solid ${x.icon}"></i><span>${x.name}</span>${x.id === 'skills' && PG.pts > 0 ? `<b class="pf-dot">${PG.pts}</b>` : ''}</button>`).join('');
    t.scrollLeft = sl;
    pfTabsEdge();
}
// лента вкладок листается пальцем (как в правилах): у краёв, за которыми есть ещё вкладки, — мягкое затенение
function pfTabsEdge() {
    const t = document.getElementById('pfTabs'); if (!t) return;
    t.classList.toggle('fl', t.scrollLeft > 2);
    t.classList.toggle('fr', t.scrollLeft < t.scrollWidth - t.clientWidth - 2);
}
// выбранная вкладка целиком в ленте
function pfTabReveal() {
    const t = document.getElementById('pfTabs'), b = t && t.querySelector('.pf-tab.on'); if (!b) return;
    const pad = 16, l = b.offsetLeft - pad, r = b.offsetLeft + b.offsetWidth + pad - t.clientWidth;
    if (t.scrollLeft > l) t.scrollTo({ left: Math.max(0, l), behavior: 'smooth' });
    else if (t.scrollLeft < r) t.scrollTo({ left: r, behavior: 'smooth' });
}
function pfShowTab(id) {
    if (!PF_TABS.some(x => x.id === id)) id = 'owl';
    pfTab = id; pfSure = null; pfRenderTabs(); pfRenderPane(); pfTabReveal();
    const pn = document.getElementById('pfPane'); if (pn) pn.scrollTop = 0;
}
function pfFmt(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
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
        h += `<div class="sk-head"><div class="sk-badge"><svg viewBox="0 0 54 54"><defs><linearGradient id="skBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C084FC"/><stop offset="1" stop-color="#6D28D9"/></linearGradient></defs><path d="M27 2 49 14.5v25L27 52 5 39.5v-25Z" fill="url(#skBg)" stroke="#E9D5FF" stroke-opacity=".7" stroke-width="1.5"/></svg><b>${PG.pts}</b></div>`
            + `<div class="sk-ht"><b>${pfPl(PG.pts, ['Очко', 'Очка', 'Очков'])} обучения</b><span>1 за уровень, 2 — за каждый 5-й. Ступень стоит очки и монеты.</span></div>`
            + `<div class="sk-wallet"><i class="fa-solid fa-coins"></i>${pfFmt(c)}</div></div>`;
        h += `<div class="sk-grid">` + PF_SK.map(s => {
            const r = skRank(s.k), max = r >= PF_SK_MAX;
            // кольцо из 5 делений вокруг значка: изученные ступени горят цветом навыка
            const R = 29, C = 2 * Math.PI * R, seg = C / PF_SK_MAX, gap = 5;
            const arcs = Array.from({ length: PF_SK_MAX }, (_, i) => `<circle cx="33" cy="33" r="${R}" fill="none" stroke="${i < r ? s.col : 'rgba(255,255,255,.13)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(seg - gap).toFixed(2)} ${(C - seg + gap).toFixed(2)}" transform="rotate(${-90 + i * 72 + gap / C * 180} 33 33)"${i < r ? ` style="filter:drop-shadow(0 0 3px ${s.col})"` : ''}/>`).join('');
            let btn;
            if (max) btn = `<div class="sk-b done"><i class="fa-solid fa-crown"></i>МАКСИМУМ</div>`;
            else {
                const k = pfSkCost(s, r);
                const cost = `<span class="c"><i class="fa-solid fa-graduation-cap"></i>${k.pts}</span><span class="c"><i class="fa-solid fa-coins"></i>${k.coins}</span>`;
                if (PG.pts < k.pts || c < k.coins) btn = `<div class="sk-b no"><i class="fa-solid fa-lock"></i>${cost}</div>`;
                else if (pfSure === s.k) btn = `<button type="button" class="sk-b sure" data-pf="sk:${s.k}">ИЗУЧИТЬ?</button>`;
                else btn = `<button type="button" class="sk-b" data-pf="sk:${s.k}"><i class="fa-solid fa-arrow-up"></i>${cost}</button>`;
            }
            const fx = max ? `<div class="sk-fx">${s.v(r)}</div>` : r ? `<div class="sk-fx">${s.v(r)}<span class="nx"><i class="fa-solid fa-arrow-right"></i>${s.v(r + 1)}</span></div>` : `<div class="sk-fx"><span class="nx">1-я ступень:</span>${s.v(1)}</div>`;
            const top = s.topS ? `<div class="sk-top${r >= PF_SK_MAX ? ' got' : ''}"><i class="fa-solid fa-star"></i> 5-я ступень: ${s.topS}</div>` : '';
            return `<div class="sk-t${max ? ' max' : ''}${r ? ' has' : ''}" data-sk="${s.k}" style="--c:${s.col}"><div class="sk-ring"><svg viewBox="0 0 66 66">${arcs}</svg><div class="sk-ic"><i class="fa-solid ${s.icon}"></i></div><span class="sk-rk">${r} / ${PF_SK_MAX}</span></div>`
                + `<div class="sk-n">${s.name}</div><div class="sk-d">${s.short}</div>${fx}${top}${btn}</div>`;
        }).join('') + `</div><div class="sk-note">Навыки помогают понемногу — полёт остаётся непростым. Подробнее — в «Правилах».</div>`;
    } else if (pfTab === 'stats') {
        const info = pfLvInfo(PG.xp), t = Math.round(PS.time || 0), hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60);
        const since = p.created ? new Date(p.created).toLocaleDateString('ru-RU') : '—';
        h += `<div class="pf-stats">`
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
        const cur = pfAvCur(), dirty = cur !== p.av;
        h += `<div class="pf-sec" style="--c:#C084FC"><i class="fa-solid fa-circle-user"></i>Аватар</div><div class="pf-avs">${PF_AV.map(a => pfAvHTML(a.id, a.id === cur ? 'on' : '', 'data-pf="av"')).join('')}</div>`
            + `<div class="pf-avsave${dirty ? '' : ' hidden'}"><button type="button" class="no" data-pf="avno">Отмена</button><button type="button" class="ok" data-pf="avok"><i class="fa-solid fa-check"></i>СОХРАНИТЬ АВАТАР</button></div>`
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
    const kc = pfSkCost(s, r), np = kc.pts, nc = kc.coins;
    if (PG.pts < np || coinsGet() < nc) { pfRenderPane(); return; }
    if (pfSure !== k) { pfSure = k; clearTimeout(pfSureT); pfSureT = setTimeout(() => { pfSure = null; if (pfTab === 'skills') pfRenderPane(); }, 3000); pfRenderPane(); try { Haptics.flap(); } catch (e) {} return; }
    pfSure = null; clearTimeout(pfSureT);
    PG.pts -= np; PG.sk[k] = r + 1; pfSaveProg();
    coinsSet(coinsGet() - nc);
    try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {}
    pfRenderHero(); pfRenderPane(); pfPlateSync();
    const card = document.querySelector(`#pfPane .sk-t[data-sk="${k}"]`); if (card) card.classList.add('up');
    pfToast(document.getElementById('pfWin'), `${s.name}: ступень ${r + 1}`);
}
function pfToast(win, msg, kind) {
    if (!win) return;
    win.querySelectorAll('.pf-toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'pf-toast' + (kind ? ' ' + kind : '');
    t.textContent = msg; t.style.top = (win.scrollTop + 96) + 'px';
    win.appendChild(t); setTimeout(() => t.remove(), 2500);
}
// Окно совы разворачивается из плашки игрока: плашка растягивается до окна (быстро, ~0,35 с), затем по очереди
// проявляются шапка, вкладки, содержимое и кнопки. Закрытие — обратно в плашку.
let pfAnimating = null;
function pfPlateRect() {
    if (!pfPlate || pfPlate.classList.contains('hidden') || !pfPlate.offsetParent) return null;
    const r = pfPlate.getBoundingClientRect(); return r.width > 10 ? r : null;
}
function pfClipFrom(win, pr) {
    const wr = win.getBoundingClientRect(), z = (wr.width / win.offsetWidth) || 1;
    const t = (pr.top - wr.top) / z, l = (pr.left - wr.left) / z, r = (wr.right - pr.right) / z, b = (wr.bottom - pr.bottom) / z;
    return `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${(13 / z * ((pfPlate.getBoundingClientRect().width / pfPlate.offsetWidth) || 1)).toFixed(1)}px)`;
}
function pfAnimOpen(pr) {
    const win = document.getElementById('pfWin'); if (!win || !win.animate) return;
    if (pfAnimating) pfAnimating.forEach(a => { try { a.cancel(); } catch (e) {} });
    const parts = [...win.children].filter(el => !el.classList.contains('pf-toast'));
    const list = [];
    list.push(pfRoot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }));
    if (pr) list.push(win.animate([{ clipPath: pfClipFrom(win, pr) }, { clipPath: 'inset(0px 0px 0px 0px round 28px)' }], { duration: 360, easing: 'cubic-bezier(.2,.85,.25,1)' }));
    else list.push(win.animate([{ transform: 'scale(.92)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.85,.25,1)' }));
    parts.forEach((el, i) => list.push(el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 110 + i * 45, easing: 'ease-out', fill: 'backwards' })));
    pfAnimating = list;
    Promise.all(list.map(a => a.finished.catch(() => {}))).then(() => { if (pfAnimating === list) pfAnimating = null; });
}
function pfAnimClose(done) {
    const win = document.getElementById('pfWin'), pr = pfPlateRect();
    if (!win || !win.animate) { done(); return; }
    if (pfAnimating) pfAnimating.forEach(a => { try { a.cancel(); } catch (e) {} });
    const parts = [...win.children].filter(el => !el.classList.contains('pf-toast'));
    const list = [];
    parts.forEach(el => list.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' })));
    if (pr) list.push(win.animate([{ clipPath: 'inset(0px 0px 0px 0px round 28px)' }, { clipPath: pfClipFrom(win, pr) }], { duration: 260, delay: 40, easing: 'cubic-bezier(.5,0,.75,.3)', fill: 'forwards' }));
    else list.push(win.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }));
    list.push(pfRoot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 100, easing: 'ease-in', fill: 'forwards' }));
    pfAnimating = list;
    pfRoot.style.pointerEvents = 'none';
    Promise.all(list.map(a => a.finished.catch(() => {}))).then(() => {
        if (pfAnimating !== list) return;   // пока закрывалось, окно открыли снова
        pfAnimating = null; done();
        list.forEach(a => { try { a.cancel(); } catch (e) {} });
        pfRoot.style.pointerEvents = '';
    });
}
let pfClosing = false;
function openProfile(tab) {
    if (!pfGet()) { openAuth('reg'); return; }
    try { AudioFX.resume(); } catch (e) {}
    const pr = pfPlateRect();
    pfBuild(); pfTab = tab || 'owl'; pfSure = null; pfPendAv = null; pfClosing = false; pfRoot.classList.remove('closing');
    pfRoot.style.pointerEvents = '';
    pfRoot.classList.remove('hidden');
    pfRenderHero(); pfRenderPane();
    const w = document.getElementById('pfPane'); if (w) w.scrollTop = 0;
    const t = document.getElementById('pfTabs'); if (t) { t.scrollLeft = 0; pfTabReveal(); pfTabsEdge(); }
    pfAnimOpen(pr);
}
function closeProfile() {
    if (!pfRoot || pfRoot.classList.contains('hidden') || pfClosing) return;
    pfClosing = true; pfSure = null; pfPendAv = null;
    pfRoot.classList.add('closing');   // меню проявляется сразу, пока окно сворачивается в плашку
    pfPlateSync();
    pfAnimClose(() => {
        pfClosing = false;
        pfRoot.classList.add('hidden'); pfRoot.classList.remove('closing');
        try { updateHUDAll(); } catch (e) {}
    });
}

// админка: +1 уровень (для проверки); сброс прогресса совы (уровень, навыки, статистика, запас — профиль остаётся)
// и полный сброс — ещё и профиль: снова регистрация
function profAdminLevel() { const i = pfLvInfo(PG.xp); pfXpAdd(i.need - i.cur); }
function profResetProgress() {
    try { [PG_KEY, PS_KEY, 'bubo_inv'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
    PG = { xp: 0, lvl: 1, pts: 0, sk: {} };
    PS = { q: 0, best: 0, themes: 0, att: 0, wins: 0, coins: 0, qzOk: 0, qzAll: 0, time: 0, days: 0, lastDay: '' };
    try { invRender(); } catch (e) {}
    pfPlateSync();
}
function profResetAll() {
    profResetProgress();
    try { [PF_KEY, 'bubo_hello_day'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
    pfPlateAv = ''; pfPlateSync();
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
