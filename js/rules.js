// ===== ОКНО ПРАВИЛ: разделы-вкладки, текст собирается из настоящих значений игры при каждом открытии =====
// Числа берутся из ADMIN_CFG, DIFF_LEVELS, CATEGORIES, CRYSTAL, WATERFX, SHZ, SHOP_ITEMS, RL_PRIZES, QZ_LEVELS и т.д. —
// поменяли значение в коде или в админке, правила поменялись сами.
// Высота окна — по содержимому вкладки (до краёв экрана), при переключении плавно подстраивается.
(function () {
    const modal = document.getElementById('rulesModal');
    const win = document.getElementById('rlWin');
    if (!modal || !win) return;
    const tabsEl = document.getElementById('ruTabs'), scrollEl = document.getElementById('ruScroll'), paneEl = document.getElementById('ruPane');
    const bodyEl = win.querySelector('.ru-body'), sbEl = win.querySelector('.ru-sb');
    if (!tabsEl || !scrollEl || !paneEl) return;
    // шапка (крестик, эмблема, заголовок) листается вместе с текстом и уходит вверх, а вкладки прилипают к верху окна
    const headEl = win.querySelector('.ru-head'), xEl = document.getElementById('closeRulesBtn');
    // вкладки — поверх ленты (вне её): пока шапка видна, едут под ней; шапка ушла — стоят у верхнего края, а текст под ними
    // уходит в тень так же, как над кнопками снизу (маска ленты), без всякой плашки
    let phEl = null;
    if (headEl && bodyEl) {
        scrollEl.insertBefore(headEl, paneEl);
        phEl = document.createElement('div'); phEl.className = 'ru-tabsph'; scrollEl.insertBefore(phEl, paneEl);   // место под вкладками в ленте
        bodyEl.insertBefore(tabsEl, bodyEl.firstChild);
        if (xEl) headEl.appendChild(xEl);
        win.classList.add('ru-stick');
    }
    const headBottom = () => (phEl ? phEl.offsetTop : 0);
    function syncTabsPos() {
        if (!phEl) return;
        const th = tabsEl.offsetHeight;
        if (phEl.style.height !== th + 'px') phEl.style.height = th + 'px';
        const y = Math.max(0, phEl.offsetTop - scrollEl.scrollTop);
        tabsEl.style.transform = y > 0.5 ? `translateY(${y}px)` : '';
        win.classList.toggle('ru-stuck', y <= 0.5);
        bodyEl.style.setProperty('--tabH', th + 'px');
    }
    window.addEventListener('resize', () => syncTabsPos());

    // ---------- помощники ----------
    const has = (fn) => { try { return fn(); } catch (e) { return undefined; } };
    const CFG = () => (typeof ADMIN_CFG !== 'undefined' ? ADMIN_CFG : {});
    const pl = (n, f) => (typeof ruPlural === 'function' ? ruPlural(n, f) : f[2]);
    const num = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
    const secs = (n) => `${n} ${pl(n, ['секунду', 'секунды', 'секунд'])}`;          // «на 10 секунд»
    const secN = (n) => `${n} ${pl(n, ['секунда', 'секунды', 'секунд'])}`;          // «10 секунд»
    const coinsW = (n) => `${n} ${pl(n, ['монета', 'монеты', 'монет'])}`;
    // «каждая 3-я порция» / «каждый 6-й напиток» / «каждое 4-е ускорение»; при 1 — просто «каждая порция»
    const every = (n, g, noun) => {
        const e = { f: ['каждая', 'я'], m: ['каждый', 'й'], n: ['каждое', 'е'] }[g];
        return n <= 1 ? `${e[0]} ${noun}` : `${e[0]} ${n}-${e[1]} ${noun}`;
    };
    const half = (v) => (v === 0.5 ? 'пол-сердца' : `${num(v)} сердца`);
    const LV = () => (typeof DIFF_LEVELS !== 'undefined' ? DIFF_LEVELS : []);
    const lvName = (i) => { const l = LV()[i]; return l ? l.name : ''; };
    const lvChip = (i, extra) => { const l = LV()[i]; return l ? `<span class="ru-chip" style="--c:${l.color}">${l.name}${extra != null ? ` <em>${extra}</em>` : ''}</span>` : ''; };
    const lvChips = (fn) => `<div class="ru-chips">${LV().map((l, i) => lvChip(i, fn(l, i))).join('')}</div>`;
    const pct = (p) => {
        if (p >= 10) return String(Math.round(p)) + '%';
        if (p >= 1) return num(Math.round(p * 10) / 10) + '%';
        const d = Math.max(1, Math.ceil(-Math.log10(p)) + 1);
        return String(+p.toFixed(d)).replace('.', ',') + '%';
    };
    const capFirst = (s) => { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };

    // ---------- иконки ----------
    const SVG_COMPRESS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v7.5m-4-3.5L12 9.5l4-3.5M12 22v-7.5m-4 3.5L12 14.5l4 3.5"/></svg>';
    function glyph(icon) {
        if (icon === 'compress') return SVG_COMPRESS;
        if (icon === 'inf') return '<i class="fa-solid fa-feather-pointed"></i><span class="ru-inf">∞</span>';
        return `<i class="fa-solid ${icon}"></i>`;
    }
    const ball = (icon, c) => `<span class="ru-ic" style="--c:${c}">${glyph(icon)}</span>`;
    // строка: иконка, жирный заголовок цветом иконки, текст; side — что-то справа (цена, шанс)
    const row = (icon, c, title, text, side) => `<div class="ru-row">${ball(icon, c)}<div class="ru-tx"><span>${title ? `<b style="color:${c}">${title}</b>${text ? ' — ' : ''}` : ''}${text || ''}</span></div>${side ? `<div class="ru-side">${side}</div>` : ''}</div>`;
    const sec = (icon, c, title, inner) => `<section class="ru-sec" style="--c:${c}"><h3><span class="ru-hi">${glyph(icon)}</span>${title}</h3>${inner}</section>`;
    const p = (html) => `<p class="ru-p">${html}</p>`;
    const coin = (n) => `<span class="ru-price"><i class="fa-solid fa-coins"></i>${n}</span>`;

    // ---------- значения из игры ----------
    const V = {
        themes() { const C = typeof CATEGORIES !== 'undefined' ? CATEGORIES : {}; const keys = typeof THEME_KEYS_ALL !== 'undefined' ? THEME_KEYS_ALL : []; return keys.map(k => ({ k, ...C[k] })); },
        total() { return typeof TOTAL_THEMES !== 'undefined' ? TOTAL_THEMES : this.themes().reduce((a, t) => a + (t.count || 0), 0); },
        attempts() { return CFG().attempts || 2; },
        qpa() { return CFG().questionsPerAttempt || 200; },
        maxLives() { return CFG().maxLives || 5; },
        drain() { return typeof STAMINA_DRAIN_BY_LEVEL !== 'undefined' ? STAMINA_DRAIN_BY_LEVEL : []; },
        shop(key) { return typeof SHOP_ITEMS !== 'undefined' ? SHOP_ITEMS.find(i => i.key === key) : null; },
        price(key) { const it = this.shop(key); return it ? it.price : null; },
        shzEvery() { return Math.max(1, CFG().shazamEvery || 4); },
        shz() { const S = typeof SHZ !== 'undefined' ? SHZ : { INTRO: 60, DUR: 900, FADE: 300 }; return { intro: Math.round(S.INTRO / 60), full: Math.round(S.DUR / 60), fade: Math.round(S.FADE / 60), total: Math.round((S.DUR + S.FADE) / 60) }; },
        crystal() { return typeof CRYSTAL !== 'undefined' ? CRYSTAL : { SEC: 10, HIT_DMG: 0.5, PER_PIPE: [1, 1, 2, 2, 3, 3] }; },
        water() { return typeof WATERFX !== 'undefined' ? WATERFX : { SEC: 10 }; },
        levelStart(i) { return Math.ceil(i * this.total() / Math.max(1, LV().length)); },
        coinOnPath(i) { return typeof COIN_PATH_VALUES !== 'undefined' ? COIN_PATH_VALUES[Math.max(0, Math.min(5, i))] : 5; },   // как в spawnPipe (hud.js)
        // монеты за рубежи вопросов в полёте — как в checkAttemptMilestone (game-core.js)
        milestoneCoins(k) { return typeof coinsForMilestone === 'function' ? coinsForMilestone(k) : 15; },
        quizLevels() { return has(() => (typeof qzLevelsOn === 'function' ? qzLevelsOn() : QZ_LEVELS)) || []; },
        quizPerDay() { return typeof QUIZ_PER_DAY !== 'undefined' ? QUIZ_PER_DAY : 10; },
        quizRead() { return typeof QZ_READ !== 'undefined' ? QZ_READ : 5; },
        quizAnswer() { return typeof QZ_ANSWER !== 'undefined' ? QZ_ANSWER : 10; },
        prizes() { return typeof RL_PRIZES !== 'undefined' ? RL_PRIZES : {}; }
    };

    // ---------- вкладки ----------
    const TABS = [
        { id: 'main', name: 'Главное', icon: 'fa-star', c: '#FE7600', build: buildMain },
        { id: 'themes', name: 'Значки и темы', icon: 'fa-layer-group', c: '#A855F7', build: buildThemes },
        { id: 'bonus', name: 'Бонусы и состояния', icon: 'fa-bolt', c: '#FACC15', build: buildBonus },
        { id: 'danger', name: 'Опасности', icon: 'fa-triangle-exclamation', c: '#F43F5E', build: buildDanger },
        { id: 'levels', name: 'Сложность и уровни', icon: 'fa-gauge-high', c: '#84CC16', build: buildLevels },
        { id: 'quiz', name: 'Вопросы дня и монеты', icon: 'fa-circle-question', c: '#38BDF8', build: buildQuiz },
        { id: 'shop', name: 'Лавка и рулетка', icon: 'fa-store', c: '#F472B6', build: buildShop }
    ];

    function buildMain() {
        const T = V.total(), th = V.themes(), A = V.attempts(), drain = V.drain(), maxDrain = drain.length ? Math.max(...drain) : 1;
        const chips = `<div class="ru-themes">${th.map(t => `<span class="ru-th" style="--c:${t.color}"><i class="fa-solid ${t.faClass}"></i>${t.name}<b>${t.count}</b></span>`).join('')}</div>`;
        const aPrice = V.price('a1');
        return sec('fa-flag-checkered', '#FE7600', 'Цель игры',
                p(`Лети между труб и собирай значки тем. Нужно собрать все <b class="ru-w">${T} ${pl(T, ['тему', 'темы', 'тем'])}</b>:`) + chips
                + p(`Собрал всё — <b style="color:#FACC15">победа</b> и вращение рулетки призов.`))
            + sec('fa-hand-pointer', '#FE7600', 'Как летать',
                row('fa-hand-pointer', '#FE7600', 'Нажимай на экран', 'сова взмахивает крыльями и подлетает вверх. Не нажимаешь — падает. Полёт начинается с первого касания.')
                + row('fa-feather-pointed', '#67E8F9', 'Силы', `каждый взмах тратит немного сил, и понемногу они уходят даже без взмахов. Чем выше уровень сложности, тем быстрее (до ×${num(maxDrain)}).`)
                + row('fa-battery-quarter', '#F43F5E', 'Силы на нуле', 'минус сердце, а силы снова полные. Когда сил остаётся четверть, звучит тревожный сигнал.'))
            + sec('fa-heart', '#EF4444', 'Сердца',
                row('fa-heart', '#EF4444', 'Полёт начинается с 3 сердец', `максимум — ${V.maxLives()}. Бывают и половинки сердца.`)
                + row('fa-heart-crack', '#F43F5E', 'Удар', 'о трубу, землю или верхний край — минус сердце и около 2 секунд неуязвимости.')
                + row('fa-skull', '#E11D48', 'Полтора сердца или меньше', 'следующий удар заканчивает полёт.'))
            + sec('fa-rotate-right', '#FFC53D', 'Попытки',
                row('fa-rotate-right', '#FE7600', `На день — ${A} ${pl(A, ['попытка', 'попытки', 'попыток'])}`, 'полёт закончился — сгорает одна попытка.')
                + row('fa-floppy-disk', '#22C55E', 'Прогресс сохраняется', 'продолжаешь с того же места и уровня: темы, вопросы, перья и прокачка остаются, сердца снова 3, силы полные.')
                + row('fa-store', '#FFC53D', 'Ещё попытки', `${aPrice ? `купить в лавке за ${coinsW(aPrice)}; ` : ''}+1 за каждые ${V.qpa()} вопросов в полёте; приз рулетки. Иначе — ждать завтра.`)
                + row('fa-sun', '#FACC15', 'Новый день', `снова ${A} ${pl(A, ['попытка', 'попытки', 'попыток'])}, полёт с нуля: темы, вопросы, сердца и прокачка сил сбрасываются. Монеты и вращения рулетки остаются.`)
                + row('fa-pause', '#C4A1FF', 'Пауза', 'кнопка вверху экрана: выходишь в меню и потом продолжаешь ровно с того же места.'))
            + sec('fa-trophy', '#FACC15', 'Победа',
                row('fa-trophy', '#FACC15', 'Собраны все темы', 'попытка не тратится, а ты получаешь 1 вращение рулетки призов.')
                + row('fa-route', '#A855F7', 'Следующий полёт', 'новый поход с первого уровня: темы собираются заново, а вопросы, сердца, перья и прокачка сил сохраняются.'));
    }

    function buildThemes() {
        const th = V.themes(), lv = LV(), Q = V.qpa();
        const tiles = `<div class="ru-tgrid">${th.map(t => `<div class="ru-tt" style="--c:${t.color}">${ball(t.faClass, t.color)}<b>${t.name}</b><span>нужно ${t.count}</span></div>`).join('')}</div>`;
        const byW = th.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0));
        const often = byW.length && byW[0].weight !== byW[byW.length - 1].weight
            ? `Чаще всех попадается <b style="color:${byW[0].color}">${byW[0].name}</b>, реже всех — <b style="color:${byW[byW.length - 1].color}">${byW[byW.length - 1].name}</b>.` : '';
        const ms = [1, 2, 3, 4].map(k => { const c = V.milestoneCoins(k); return `${k * 50} — ${c ? coinsW(c) : 'без монет'}`; }).join(', ');
        const c0 = V.coinOnPath(0), c1 = V.coinOnPath(Math.max(0, lv.length - 1));
        return sec('fa-layer-group', '#A855F7', 'Темы',
                p('Главная цель. Значки тем летят по одному — через несколько труб и не два одинаковых подряд.') + tiles
                + row('fa-scale-balanced', '#C4A1FF', '', often)
                + row('fa-check-double', '#22C55E', 'Тема собрана до конца', 'её значки больше не попадаются. Если секретная звезда заберёт одну — тема снова появится.')
                + row('fa-chart-line', '#FB923C', 'Выше уровень', 'темы попадаются реже.'))
            + sec('fa-circle-question', '#FE7600', 'Значки на пути',
                row('fa-circle-question', '#FE7600', 'Вопрос', 'самый частый значок: +1 к счёту вопросов (вверху экрана).')
                + row('fa-coins', '#FFC53D', 'Каждые 50 вопросов в полёте', `${coinsW(V.milestoneCoins(1))}. Каждые ${Q} — <b style="color:#FE7600">+1 попытка</b> вместо монет.`)
                + row('fa-coins', '#FFD66B', 'Монеты', `значок: от ${c0} до ${c1} монет — чем выше уровень, тем больше; не больше 4 раз за каждые два уровня.`)
                + row('fa-heart-circle-plus', '#EF4444', 'Сердца и еда', 'появляются, только пока сердца не полные.')
                + row('fa-battery-quarter', '#67E8F9', 'Сил меньше 30%', 'на пути только то, что их восстанавливает: перья, мороженое и напитки.'))
            + sec('fa-star', '#FFD700', 'Секретная звезда',
                p('Сюрприз: бонус или штраф. Чем выше уровень, тем чаще штраф:') + lvChips(l => Math.round(l.negChance * 100) + '%')
                + row('fa-gift', '#22C55E', 'Бонус', 'полные силы, +1 или +½ сердца, щит, замедление, +1 тема или +3 вопроса.')
                + row('fa-triangle-exclamation', '#F43F5E', 'Штраф', 'минус сердце (если их полтора или меньше — конец полёта), −35% сил, минус одна собранная тема (если тем нет — −25% сил), сжатие или ускорение — оно может включить ШАЗАМ.'));
    }

    function buildBonus() {
        const c = CFG(), S = V.shz(), N = V.shzEvery(), fm = c.feathersForMax || 6;
        return sec('fa-feather-pointed', '#67E8F9', 'Силы',
                row('fa-feather-pointed', '#67E8F9', 'Перо силы', '+50% сил. Летит волной — лови!')
                + row('inf', '#00F0FF', 'Волшебное перо', `силы сразу полные и ${secs(c.infiniteSec)} не тратятся. ${capFirst(every(fm, 'n', 'волшебное перо'))} — максимум сил +20% (до конца дня).`)
                + row('fa-ice-cream', '#B5E4FF', 'Мороженое', '+20% сил.')
                + row('fa-martini-glass-citrus', '#2DD4BF', 'Коктейль', '+15% сил.')
                + row('fa-beer-mug-empty', '#F4B942', 'Пиво', '+10% сил.'))
            + sec('fa-heart', '#EF4444', 'Сердца',
                row('fa-heart', '#EF4444', 'Сердце', '+1 сердце.')
                + row('fa-pizza-slice', '#F97316', 'Пицца, бургер, хот-дог', '+½ сердца каждый.'))
            + sec('fa-wand-magic-sparkles', '#22C55E', 'Эффекты',
                row('fa-shield-halved', '#22C55E', `Щит · ${c.shieldSec} с`, 'сердца не теряются: от труб, земли и верхнего края сова отскакивает, огненные шары отбиваются, вода сносит слабее.')
                + row('fa-hourglass-half', '#38BDF8', `Замедление · ${c.slowSec} с`, 'игра идёт на 30% медленнее, трубы ближе друг к другу. Отменяет ускорение.')
                + row('fa-bolt', '#FACC15', `Ускорение · ${c.speedSec} с`, 'игра в 1,3 раза быстрее, трубы дальше друг от друга. Отменяет замедление.')
                + row('fa-arrows-rotate', '#C4A1FF', 'Взял ещё раз', 'таймер эффекта снова полный. Таймеры видны под верхней панелью.'))
            + sec('fa-bolt-lightning', '#FF7A00', 'ШАЗАМ',
                row('fa-bolt-lightning', '#FF7A00', every(N, 'n', 'ускорение'), `включает ШАЗАМ: ${S.intro} с зарядки и ${secN(S.total)} суперскорости. Такое ускорение на пути — оранжевая молния с искрами.`)
                + row('fa-ghost', '#FFB347', 'Насквозь', 'сова мчится вдвое быстрее, пролетает трубы насквозь и не разбивается о землю и верхний край.')
                + row('fa-magnet', '#FACC15', 'Магнит', 'значки впереди сами притягиваются к сове.')
                + row('fa-clock', '#F43F5E', `Последние ${S.fade} с`, 'скорость плавно спадает и звучит отсчёт. Успей вылететь из трубы — после ШАЗАМа защиты нет.')
                + row('fa-ban', '#C4A1FF', 'Пока идёт ШАЗАМ', 'все другие эффекты снимаются (кроме «Опасных труб» и «Водонапора»); щит, замедление, сжатие, ускорение и мороженое не появляются; еда и напитки не считаются для переедания и опьянения; волшебное перо только наполняет силы. Силы тратятся как обычно.'))
            + sec('fa-face-dizzy', '#FB923C', 'Состояния',
                row('fa-burger', '#FB923C', `Переедание · ${c.overeatSec} с`, `${capFirst(every(c.overeatEvery, 'f', 'порция'))} еды (пицца, бургер, хот-дог): сова толстеет — она крупнее, тяжелее падает и тратит на взмах больше сил.`)
                + row('fa-martini-glass-citrus', '#2DD4BF', `Опьянение · ${c.drunkSec} с`, `${capFirst(every(c.drunkEvery, 'm', 'напиток'))} (коктейль или пиво): сову водит вверх-вниз.`)
                + row('fa-snowflake', '#B5E4FF', `Замерзание · ${c.freezeSec} с`, `${capFirst(every(c.freezeEvery, 'n', 'мороженое'))}: сова кувыркается, взмахи слабее и непредсказуемее, падает быстрее, взмах дороже.`));
    }

    function buildDanger() {
        const c = CFG(), K = V.crystal(), W = V.water(), lv = LV();
        const per = lvChips((l, i) => (K.PER_PIPE && K.PER_PIPE[i]) || 1);
        const f = c.crystalFreq | 0;
        const plan = f <= 0 ? `на ${lvName(0)} и ${lvName(1)} — по 1 разу, на ${lvName(2)} и ${lvName(3)} — по 2, на ${lvName(4)} и ${lvName(5)} — по 3`
            : (f === 1 ? 'по 1 разу на каждом уровне' : 'по 2 раза на каждом уровне');
        const sf = has(() => WX.FREQ[Math.max(0, Math.min(3, c.stormFreq | 0))]);
        const stormNone = sf && sf.none > 0 ? ' А бывает — ни разу за полёт.' : '';
        const dmg = K.HIT_DMG === 0.5 ? 'пол-сердца' : `${num(K.HIT_DMG)} сердца`;
        return sec('fa-heart-crack', '#F43F5E', 'Удары',
                row('fa-heart-crack', '#F43F5E', 'Трубы, земля и верхний край', 'удар отнимает сердце, потом около 2 секунд сова неуязвима.')
                + row('fa-skull', '#E11D48', 'Полтора сердца или меньше', 'удар заканчивает полёт и сжигает попытку.')
                + row('fa-battery-empty', '#FB923C', 'Кончились силы', 'тоже минус сердце, а силы снова полные.')
                + row('fa-shield-halved', '#22C55E', 'Спасают', 'щит и ШАЗАМ.'))
            + sec('compress', '#D946EF', 'Сжатие',
                row('compress', '#D946EF', `Значок сжатия · ${c.compressSec} с`, 'проходы между трубами заметно уже. Сжатие бывает и штрафом секретной звезды.')
                + row('fa-gauge-high', '#A855F7', 'С уровнем', 'проходы понемногу сужаются и сами по себе.'))
            + sec('fa-fire', '#FF4A3D', 'Опасные трубы',
                row('fa-fire', '#FF4A3D', `Значок с огнём · ${K.SEC} с`, 'шляпки труб краснеют, и из труб вылетают огненные шары — пролетают проём насквозь, в другую трубу.')
                + row('fa-heart-crack', '#F43F5E', 'Попал шар', `минус ${dmg} и около секунды неуязвимости. Если сердце одно или меньше — конец полёта.`)
                + p('Сколько шаров летит из одной трубы сразу (на высоких уровнях они ещё и вылетают чаще):') + per
                + row('fa-shield-halved', '#22C55E', 'Щит', 'отбивает шары, ШАЗАМ сбивает их.'))
            + sec('fa-droplet', '#38BDF8', 'Водонапор',
                row('fa-droplet', '#38BDF8', `Значок-капля · ${W.SEC} с`, 'из каждой верхней трубы в нижнюю льётся поток воды.')
                + row('fa-arrow-down', '#7DD3FC', 'Напор', 'вода не ранит, но сбивает сову вниз — прямо к нижней трубе. С уровнем поток шире и напор сильнее.')
                + row('fa-bolt', '#FACC15', 'Помогает', 'на ускорении сова режет воду, щит сносит слабее, ШАЗАМ пробивает поток насквозь.')
                + row('fa-snowflake', '#B5E4FF', 'Мокрая и замёрзшая', 'сова обрастает льдом и тяжелеет (в щите лёд не налипает).'))
            + sec('fa-dice', '#FB923C', 'Когда бывают огонь и вода',
                p(`Значок выпадает по мере сбора тем: ${plan}. Огонь и вода — по очереди вперемешку, вместо обычного значка.`))
            + sec('fa-cloud-bolt', '#A5B4FC', 'Дождь и гроза',
                row('fa-cloud-showers-heavy', '#A5B4FC', 'Погода', `иногда собираются тучи и 30–45 секунд идёт дождь — от мороси до ливня с молниями.${stormNone}`)
                + row('fa-umbrella', '#7DD3FC', 'Сама гроза не опасна', 'но мокрую замёрзшую сову облепляет лёд, и она тяжелеет.'));
    }

    function buildLevels() {
        const lv = LV(), dr = V.drain(), n = lv.length;
        const rows = lv.map((l, i) => `<tr><td>${lvChip(i)}</td><td>${V.levelStart(i)}</td><td>×${num(l.speedMult)}</td><td>×${num(dr[i] || 1)}</td><td>${Math.round(l.negChance * 100)}%</td></tr>`).join('');
        return sec('fa-gauge-high', '#84CC16', 'Уровни',
                p(`Уровень зависит от того, сколько тем собрано: шкала внизу экрана делится на ${n} равных частей.`)
                + `<div class="ru-tblw"><table class="ru-tbl"><thead><tr><th>Уровень</th><th>с тем</th><th>Скорость</th><th>Силы</th><th><i class="fa-solid fa-star"></i> штраф</th></tr></thead><tbody>${rows}</tbody></table></div>`
                + row('fa-floppy-disk', '#22C55E', 'Проиграл', 'уровень сохраняется — продолжаешь с него.')
                + row('fa-trophy', '#FACC15', 'Победил', 'следующий поход — снова с первого уровня.'))
            + sec('fa-arrow-trend-up', '#FB923C', 'Что растёт с уровнем',
                row('fa-gauge-high', '#FACC15', 'Скорость', 'полёт и темп музыки быстрее.')
                + row('fa-feather-pointed', '#67E8F9', 'Расход сил', 'силы уходят быстрее.')
                + row('compress', '#D946EF', 'Проходы', 'между трубами уже.')
                + row('fa-layer-group', '#A855F7', 'Темы', 'попадаются реже.')
                + row('fa-star', '#FFD700', 'Секретная звезда', 'чаще штрафует.')
                + row('fa-fire', '#FF4A3D', 'Огонь и вода', 'шаров больше и они чаще, поток воды сильнее.')
                + row('fa-coins', '#FFC53D', 'Монеты на пути', 'дороже:') + lvChips((l, i) => V.coinOnPath(i)));
    }

    function buildQuiz() {
        const L = V.quizLevels(), N = V.quizPerDay();
        const lchips = `<div class="ru-chips">${L.map(l => `<span class="ru-chip" style="--c:${l.col}">${l.name} <em><i class="fa-solid fa-coins"></i>${l.coins}</em></span>`).join('')}</div>`;
        const ms = [1, 2, 3].map(k => V.milestoneCoins(k)).join(', ');
        const lv = LV(), c0 = V.coinOnPath(0), c1 = V.coinOnPath(Math.max(0, lv.length - 1));
        const big = V.prizes().coins;
        return sec('fa-calendar-day', '#38BDF8', 'Вопросы дня',
                row('fa-list-ol', '#38BDF8', `${N} ${pl(N, ['вопрос', 'вопроса', 'вопросов'])} в день`, 'кнопка — в главном меню, вверху. Новый день — новые вопросы.')
                + row('fa-clock', '#FACC15', 'Время', `${secN(V.quizRead())} на чтение, потом ${secN(V.quizAnswer())} на ответ.`)
                + row('fa-layer-group', '#A855F7', 'Тема и сложность', 'выбираешь сам. Вопросы не повторяются, пока не пройдена вся база.')
                + row('fa-coins', '#FFC53D', 'За верный ответ', 'монеты по сложности:') + lchips
                + row('fa-door-open', '#C4A1FF', 'Выйти', 'можно между вопросами. Закрыл окно посреди вопроса — он засчитан как неотвеченный.'))
            + sec('fa-coins', '#FFC53D', 'Где взять монеты',
                row('fa-circle-question', '#38BDF8', 'Вопросы дня', 'за верные ответы.')
                + row('fa-circle-question', '#FE7600', 'В полёте', `каждые 50 вопросов — ${coinsW(V.milestoneCoins(1))}; каждые ${V.qpa()} — попытка вместо монет.`)
                + row('fa-coins', '#FFD66B', 'Значок монет', `на пути: ${c0}–${c1} монет.`)
                + (big ? row('fa-dice', '#F472B6', 'Рулетка', `приз ${coinsW(big.coins || 300)}.`) : '')
                + row('fa-piggy-bank', '#22C55E', 'Не сгорают', 'монеты остаются и на следующий день. Тратятся в лавке.'));
    }

    function buildShop() {
        const items = typeof SHOP_ITEMS !== 'undefined' ? SHOP_ITEMS : [];
        const NOTE = { life: 'Только если сердца не полные.', hearts: 'До конца дня.', stamina: 'До конца дня, максимум — 200%.', refill: 'Только если силы не полные.' };
        const shopRows = items.map(it => row(it.icon, it.col, it.name, `${it.inv ? 'Эффект в запас: до 3 штук, включается кнопкой сбоку экрана, когда нужно (сторону выбираешь в настройках).' : it.desc + '.'}${NOTE[it.key] ? ' ' + NOTE[it.key] : ''}`, coin(it.price))).join('');
        const P = V.prizes(), keys = Object.keys(P), tw = keys.reduce((a, k) => a + (P[k].w || 0), 0) || 1;
        const prizeRows = keys.slice().sort((a, b) => P[b].w - P[a].w).map(k => row(P[k].icon, P[k].col, capFirst(P[k].title), '', `<span class="ru-pct">${pct(P[k].w / tw * 100)}</span>`)).join('');
        const sp = V.price('spin');
        return sec('fa-store', '#FFC53D', 'Лавка',
                p('Кнопка — в главном меню, вверху. Покупка в два нажатия: первое — «Купить?», второе — подтверждение.') + shopRows)
            + sec('fa-dice', '#F472B6', 'Рулетка призов',
                row('fa-rotate', '#F472B6', 'Вращения', `1 — за каждую победу${sp ? `, ещё — в лавке за ${coinsW(sp)}` : ''}. Вращения не сгорают.`)
                + p('Призы и шанс выпадения:') + prizeRows
                + row('fa-circle-info', '#C4A1FF', '', '«+1 жизнь» не выпадает при полных сердцах, «6 жизней» — если максимум уже 6. Сертификаты и проходки — скоро здесь появится чат, где их забрать.'));
    }

    // ---------- отрисовка ----------
    let cur = 'main';
    function renderTabs() {
        tabsEl.innerHTML = TABS.map(t => `<button type="button" class="ru-tab${t.id === cur ? ' on' : ''}" data-ru-tab="${t.id}" role="tab" aria-selected="${t.id === cur}" style="--c:${t.c}"><i class="fa-solid ${t.icon}"></i><span>${t.name}</span></button>`).join('');
    }
    function renderPane() {
        const t = TABS.find(x => x.id === cur) || TABS[0];
        let html = '';
        try { html = t.build(); } catch (e) { html = p('Не удалось показать раздел.'); }
        paneEl.innerHTML = html;
        paneEl.classList.remove('ru-in'); void paneEl.offsetWidth; paneEl.classList.add('ru-in');
    }
    // активная вкладка — по центру ленты
    function centerTab(smooth) {
        const b = tabsEl.querySelector('.ru-tab.on'); if (!b) return;
        const left = b.offsetLeft - (tabsEl.clientWidth - b.offsetWidth) / 2;
        try { tabsEl.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { tabsEl.scrollLeft = Math.max(0, left); }
    }
    // мягкое затенение краёв: у ленты вкладок — слева/справа, у текста — сверху/снизу; полоска прокрутки на обводке окна
    function syncTabFade() {
        const max = tabsEl.scrollWidth - tabsEl.clientWidth;
        tabsEl.classList.toggle('fl', tabsEl.scrollLeft > 2);
        tabsEl.classList.toggle('fr', tabsEl.scrollLeft < max - 2);
    }
    let sbT = 0;
    function syncScroll(active) {
        syncTabsPos();   // вкладки: под шапкой или у верхнего края
        const max = scrollEl.scrollHeight - scrollEl.clientHeight, can = max > 3;
        bodyEl.classList.toggle('ft', can && scrollEl.scrollTop > 2);
        bodyEl.classList.toggle('fb', can && scrollEl.scrollTop < max - 2);
        if (!sbEl) return;
        sbEl.classList.toggle('show', can);
        if (can) {
            sbEl.style.setProperty('--sh', (Math.max(0.12, scrollEl.clientHeight / scrollEl.scrollHeight) * 100).toFixed(2) + '%');
            sbEl.style.setProperty('--sp', Math.min(1, Math.max(0, scrollEl.scrollTop / max)).toFixed(4));
        }
        if (active) { sbEl.classList.add('act'); clearTimeout(sbT); sbT = setTimeout(() => sbEl.classList.remove('act'), 700); }
    }
    // высота окна: плавно от прежней к новой (меряем через computed height — в тех же единицах, что и style.height, при любом zoom)
    let hEnd = null;
    function animateHeight(fn) {
        const h0 = parseFloat(getComputedStyle(win).height);
        if (hEnd) { win.removeEventListener('transitionend', hEnd); hEnd = null; }
        win.style.transition = 'none'; win.style.height = '';
        fn();
        const h1 = parseFloat(getComputedStyle(win).height);
        if (!isFinite(h0) || !isFinite(h1) || Math.abs(h1 - h0) < 1) { win.style.transition = ''; syncScroll(false); return; }
        win.style.height = h0 + 'px';
        void win.offsetHeight;
        win.style.transition = '';
        win.style.height = h1 + 'px';
        win.classList.add('ru-anim');
        hEnd = (e) => {
            if (e && (e.target !== win || e.propertyName !== 'height')) return;
            win.removeEventListener('transitionend', hEnd); hEnd = null;
            win.style.height = ''; win.classList.remove('ru-anim'); syncScroll(false);
        };
        win.addEventListener('transitionend', hEnd);
        setTimeout(() => { if (hEnd) hEnd(); }, 600);   // страховка, если transitionend не придёт
        syncScroll(false);
    }
    function selectTab(id, smooth) {
        if (!TABS.some(t => t.id === id)) id = 'main';
        const same = id === cur && paneEl.childElementCount;
        cur = id;
        tabsEl.querySelectorAll('.ru-tab').forEach(b => { const on = b.dataset.ruTab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
        centerTab(smooth);
        // шапка уже уехала — вкладки остаются прилипшими, новый раздел начинается сразу под ними
        if (same) { scrollEl.scrollTo({ top: Math.min(scrollEl.scrollTop, headBottom()), behavior: 'smooth' }); return; }
        const keepTop = Math.min(scrollEl.scrollTop, headBottom());
        const run = () => { renderPane(); scrollEl.scrollTop = keepTop; };
        if (smooth) animateHeight(run); else { win.style.height = ''; run(); syncScroll(false); }
        try { Haptics.flap(); } catch (e) {}
    }
    // низкое окно (с учётом масштаба интерфейса) — шапка компактнее, чтобы тексту оставалось место
    function syncCompact() {
        const z = parseFloat(getComputedStyle(win).zoom) || 1;
        win.classList.toggle('ru-compact', (window.innerHeight - 24) / z < 720);
    }
    function onOpen() {
        syncCompact();
        renderTabs();
        win.style.transition = 'none'; win.style.height = '';
        renderPane(); scrollEl.scrollTop = 0;
        void win.offsetHeight; win.style.transition = '';
        requestAnimationFrame(() => { centerTab(false); syncTabFade(); syncScroll(false); });
    }

    tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.ru-tab'); if (!b) return;
        e.stopPropagation();
        selectTab(b.dataset.ruTab, true);
    });
    tabsEl.addEventListener('scroll', syncTabFade, { passive: true });
    scrollEl.addEventListener('scroll', () => syncScroll(true), { passive: true });
    window.addEventListener('resize', () => { if (!modal.classList.contains('hidden')) { syncCompact(); syncTabFade(); syncScroll(false); } });
    // окно открыли (ui.js снимает класс hidden) — собираем текст заново из текущих значений
    let wasOpen = !modal.classList.contains('hidden');
    new MutationObserver(() => {
        const open = !modal.classList.contains('hidden');
        if (open && !wasOpen) onOpen();
        wasOpen = open;
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    if (wasOpen) onOpen();
    window.rulesSelectTab = (id) => selectTab(id, !modal.classList.contains('hidden'));
})();
