// ===== АДМИНКА: окно настроек игры =====
(function () {
    const $ = (id) => document.getElementById(id);
    const modal = $('adminModal'), openBtn = $('openAdminBtn'), body = $('admBody'), tabsEl = $('admTabs');
    if (!modal || !openBtn || !body || !tabsEl) return;
    const SEC = ['секунда', 'секунды', 'секунд'];
    const unitSec = (n) => ruPlural(n, SEC);
    const rowDef = (k, t, s, i, c, unit) => ({ k, t, s, i, c, unit });

    const TABS = [
        { id: 'themes', name: 'Темы', icon: 'fa-layer-group' },
        { id: 'food', name: 'Еда', icon: 'fa-burger' },
        { id: 'drinks', name: 'Напитки', icon: 'fa-martini-glass-citrus' },
        { id: 'cold', name: 'Холод', icon: 'fa-snowflake' },
        { id: 'bonus', name: 'Бонусы', icon: 'fa-star' },
        { id: 'game', name: 'Игра', icon: 'fa-gamepad' },
        { id: 'quiz', name: 'Вопросы', icon: 'fa-circle-question' },
        { id: 'test', name: 'Тест', icon: 'fa-flask' }
    ];
    const ROWS = {
        quiz: [],
        food: [
            rowDef('overeatEvery', 'До переедания', '', 'fa-burger', '#FB923C', (n) => ruPlural(n, ['порция еды', 'порции еды', 'порций еды'])),
            rowDef('overeatSec', 'Длительность', '', 'fa-stopwatch', '#FDBA74', unitSec)
        ],
        drinks: [
            rowDef('drunkEvery', 'До опьянения', '', 'fa-martini-glass-citrus', '#2DD4BF', (n) => ruPlural(n, ['напиток', 'напитка', 'напитков'])),
            rowDef('drunkSec', 'Длительность', '', 'fa-stopwatch', '#5EEAD4', unitSec)
        ],
        cold: [
            rowDef('freezeEvery', 'До заморозки', '', 'fa-ice-cream', '#B5E4FF', (n) => ruPlural(n, ['порция мороженого', 'порции мороженого', 'порций мороженого'])),
            rowDef('freezeSec', 'Длительность', '', 'fa-snowflake', '#E3F5FF', unitSec)
        ],
        bonus: [
            rowDef('shieldSec', 'Щит', '', 'fa-shield-halved', '#22C55E', unitSec),
            rowDef('slowSec', 'Замедление', '', 'fa-hourglass-half', '#38BDF8', unitSec),
            rowDef('speedSec', 'Ускорение', '', 'fa-bolt', '#FACC15', unitSec),
            rowDef('shazamEvery', 'До ШАЗАМа', '', 'fa-bolt-lightning', '#FF7A00', (n) => ruPlural(n, ['ускорение', 'ускорения', 'ускорений'])),
            rowDef('compressSec', 'Сжатие', '', 'fa-compress', '#D946EF', unitSec),
            rowDef('infiniteSec', 'Макс. силы', '', 'fa-feather-pointed', '#00F0FF', unitSec),
            rowDef('feathersForMax', 'Рост запаса сил', '', 'fa-wand-magic-sparkles', '#00F0FF', (n) => ruPlural(n, ['перо до +20%', 'пера до +20%', 'перьев до +20%']))
        ],
        game: [
            rowDef('attempts', 'Попыток в начале', '', 'fa-rotate-right', '#FE7600', (n) => ruPlural(n, ['попытка', 'попытки', 'попыток'])),
            rowDef('questionsPerAttempt', 'За +1 попытку', '', 'fa-circle-question', '#FE7600', (n) => ruPlural(n, ['вопрос', 'вопроса', 'вопросов'])),
            rowDef('maxLives', 'Макс. сердечек', '', 'fa-heart', '#EF4444', (n) => ruPlural(n, ['сердечко', 'сердечка', 'сердечек'])),
            rowDef('stormFreq', 'Частота гроз', '', 'fa-cloud-rain', '#93C5FD', (n) => ['редко', 'по умолчанию', 'часто', 'очень часто'][n] || ''),
            rowDef('crystalFreq', 'Опасные трубы / Водонапор', '', 'fa-fire', '#FF4A3D', (n) => ['раз на 2 уровня', 'раз за уровень', '2 раза за уровень'][n] || ''),
        ]
    };
    let tab = 'themes';

    function themeRows() {
        return Object.keys(ADMIN_DEFAULTS.themes).map((k) => {
            const c = CATEGORIES[k] || {};
            return rowDef('themes.' + k, c.name || k, '', c.faClass || 'fa-star', c.color || '#fff', (n) => ruPlural(n, ['значок', 'значка', 'значков']));
        });
    }
    const getVal = (k) => k.indexOf('themes.') === 0 ? ADMIN_CFG.themes[k.slice(7)] : ADMIN_CFG[k];
    const specOf = (k) => k.indexOf('themes.') === 0 ? ADMIN_SPEC.theme : ADMIN_SPEC[k];

    function rowHtml(r) {
        const v = getVal(r.k);
        return `<div class="adm-row" data-k="${r.k}">
            <div class="adm-ico" style="color:${r.c}"><i class="fa-solid ${r.i}"></i></div>
            <div class="adm-txt"><b>${r.t}</b><span class="adm-unit">${r.unit(v)}</span></div>
            <div class="adm-step"><button type="button" data-d="-1" aria-label="Меньше"><i class="fa-solid fa-minus"></i></button>
                <span class="adm-num">${v}</span>
                <button type="button" data-d="1" aria-label="Больше"><i class="fa-solid fa-plus"></i></button></div>
        </div>`;
    }
    function renderTabs() {
        tabsEl.innerHTML = TABS.map((t) => `<button type="button" class="adm-tab${t.id === tab ? ' on' : ''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i><span>${t.name}</span></button>`).join('');
    }
    function themesTotal() { return Object.keys(ADMIN_CFG.themes).reduce((a, k) => a + ADMIN_CFG.themes[k], 0); }
    // ===== Вкладка «Тест»: сова на звёздном небе — накидываем эффекты (можно несколько сразу) и смотрим, как она выглядит в игре =====
    // Рисуется настоящими функциями игры (owl.draw, drawFrozenOwl, звёздочки ускорения, щит, свечение пера). Игровое состояние на время
    // отрисовки подменяется и сразу возвращается обратно, так что на саму игру предпросмотр не влияет.
    const T_EFFECTS = [['drunk', 'Опьянение', 'fa-martini-glass-citrus'], ['freeze', 'Заморозка', 'fa-snowflake'], ['overeat', 'Переедание', 'fa-burger'],
                       ['shield', 'Щит', 'fa-shield-halved'], ['speed', 'Ускорение', 'fa-bolt'], ['feather', 'Перо силы', 'fa-feather']];
    const pv = { on: {}, drunk: 0, freeze: 0, overeat: 0, rot: 0, lean: 0, boostK: 0, frame: 0, stars: [], ramp: 0, acc: 0, shieldAnim: 0, bg: [], bgW: 0, bgH: 0, raf: 0, last: 0, parts: [], flap: 0, kick: 0 };
    function renderTest() {
        body.innerHTML = '<div class="adm-prev"><canvas id="admPrevCv"></canvas></div>'
            + '<div class="adm-effs">' + T_EFFECTS.map((e) => `<button type="button" class="adm-chk${pv.on[e[0]] ? ' on' : ''}" data-e="${e[0]}"><span class="adm-box"><i class="fa-solid fa-check"></i></span><i class="fa-solid ${e[2]} adm-ei"></i><span>${e[1]}</span></button>`).join('') + '</div>'
            + '<div class="adm-prev-reset"><button type="button" class="adm-chip-reset" data-e="reset"><i class="fa-solid fa-rotate-left"></i> Сбросить всё</button></div>';
        body.scrollTop = 0; prevStart();
    }
    function prevStop() { if (pv.raf) cancelAnimationFrame(pv.raf); pv.raf = 0; }
    function prevStart() { if (pv.raf) return; pv.last = performance.now(); pv.raf = requestAnimationFrame(prevTick); }
    function prevTick(now) {
        pv.raf = 0;
        const cv = $('admPrevCv');
        if (!cv || modal.classList.contains('hidden') || tab !== 'test') return;   // не крутим вхолостую
        pv.raf = requestAnimationFrame(prevTick);
        const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
        try { if (typeof owl === 'undefined') return; } catch (er) { return; }
        const dpr = Math.min(3, window.devicePixelRatio || 1), dtF = Math.min(3, Math.max(0.3, (now - pv.last) / 16.667)); pv.last = now; pv.frame += dtF;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            pv.bg = []; for (let i = 0; i < Math.round(34 * Math.max(1, (W * H) / 70000)); i++) pv.bg.push({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 1.8 + 0.6, alpha: Math.random() * 0.8 + 0.2 });
        }
        const g = cv.getContext('2d'), on = pv.on;
        // плавные коэффициенты — такие же шаги, как в игре
        const stp = (c, t, st) => c + Math.max(-st * dtF, Math.min(st * dtF, t - c));
        pv.freeze = stp(pv.freeze, on.freeze ? 1 : 0, 0.025); pv.drunk = stp(pv.drunk, on.drunk ? 1 : 0, 0.02); pv.overeat = stp(pv.overeat, on.overeat ? 1 : 0, 0.02);
        if (pv.shieldAnim > 0) pv.shieldAnim = Math.max(0, pv.shieldAnim - dtF);
        // фон — небо игры и звёзды
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1E0842'); sky.addColorStop(0.5, '#140326'); sky.addColorStop(1, '#090117');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = '#FFFFFF';
        for (const st of pv.bg) { st.alpha += (Math.random() - 0.5) * 0.05 * dtF; st.alpha = Math.max(0.2, Math.min(0.95, st.alpha)); g.globalAlpha = st.alpha; g.beginPath(); g.arc(st.x, st.y, st.size, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;
        const haze = g.createLinearGradient(0, H * 0.45, 0, H); haze.addColorStop(0, 'rgba(254,140,60,0)'); haze.addColorStop(1, 'rgba(254,140,60,0.11)'); g.fillStyle = haze; g.fillRect(0, H * 0.45, W, H * 0.55);
        // положение и вращение: заморозка — крутится вокруг центра (как в игре), иначе покачивается
        if (on.freeze) pv.rot += 0.035 * dtF;
        else { let r = pv.rot % (Math.PI * 2); if (r > Math.PI) r -= Math.PI * 2; if (r < -Math.PI) r += Math.PI * 2; pv.rot = r * Math.max(0, 1 - 0.08 * dtF); }
        const S = (typeof viewScale === 'number' ? viewScale : 1) * (typeof WORLD_K === 'number' ? WORLD_K : 1) * 1.7;   // тот же вид, что в игре, но крупнее — чтобы рассматривать детали
        pv.flap = Math.max(0, pv.flap - 0.04 * dtF); pv.kick *= Math.pow(0.86, dtF);   // после тапа: взмах крыла и лёгкий толчок вверх
        const bob = Math.sin(pv.frame * 0.05) * 3 + pv.kick, wing = Math.max(Math.max(0, Math.sin(pv.frame * 0.1)) * (1 - pv.freeze), pv.flap);
        for (let i = pv.parts.length - 1; i >= 0; i--) {   // частицы летят и тают так же, как в игре
            const pt = pv.parts[i]; pt.x += pt.vx * dtF; pt.y += pt.vy * dtF;
            if (pt.kind === 'snow') pt.angle += pt.vAngle * dtF;
            pt.alpha -= (pt.decay || 0.025) * dtF; if (pt.grow) pt.size += pt.grow * dtF;
            if (pt.alpha <= 0) pv.parts.splice(i, 1);
        }
        const sv = { x: owl.x, y: owl.y, rotation: owl.rotation, visible: owl.visible, lean: owl.lean, boostK: owl.boostK, spinAngle: owl.spinAngle, wing: owl.wing, radius: owl.radius };
        const gv = { ctx, frame, gameActive, d: currentDrunkFactor, f: currentFreezeFactor, o: currentOvereatFactor, sh: shieldTime, sa: shieldAppearAnim, inf: infiniteStaminaTime, boost: speedBoostTime, vs: viewScale, rs: renderScale, ss: speedStars, ramp: speedRamp, acc: speedStarAcc, inv: invulnerableTime };
        try {
            owl.x = 0; owl.y = bob; owl.visible = true; owl.lean = pv.lean; owl.boostK = pv.boostK; owl.spinAngle = 0; owl.wing = wing;
            owl.rotation = pv.rot + Math.sin(pv.frame * 0.04) * 0.05 * (1 - pv.freeze);
            owl.radius = owl.baseRadius * (1 + 0.16 * easeFactor(pv.overeat));
            frame = pv.frame; gameActive = true; invulnerableTime = 0;
            currentDrunkFactor = pv.drunk; currentFreezeFactor = pv.freeze; currentOvereatFactor = pv.overeat;
            // щит «дышит» так же, как в игре: штрихи зависят от времени с момента подбора щита (цикл 2,4 с, целое число циклов — без скачков)
            const shCyc = 2.4 * Math.max(1, Math.floor((ADMIN_CFG.shieldSec - 2.5) / 2.4));
            const shT = (pv.frame / 60) % shCyc;
            shieldTime = on.shield ? Math.max(130, ADMIN_CFG.shieldSec * 60 - shT * 60) : 0; shieldAppearAnim = pv.shieldAnim; infiniteStaminaTime = on.feather ? ADMIN_CFG.infiniteSec * 60 - 60 : 0; speedBoostTime = on.speed ? 9999 : 0;
            speedStars = pv.stars; speedRamp = pv.ramp; speedStarAcc = pv.acc;
            ctx = g; g.setTransform(dpr * S, 0, 0, dpr * S, (W / 2) * dpr, (H / 2) * dpr - 3.7 * S * dpr);   // визуальный центр совы — в центре картинки
            viewScale = dpr * S; renderScale = 1;                       // лёд рисуется в масштабе предпросмотра — чётко
            drawParticleList(pv.parts);
            updateSpeedStars(); drawSpeedStars();
            if (pv.freeze > 0.01) drawFrozenOwl(); else owl.draw();
            pv.lean = owl.lean; pv.boostK = owl.boostK; pv.stars = speedStars; pv.ramp = speedRamp; pv.acc = speedStarAcc;
        } finally {
            ctx = gv.ctx; frame = gv.frame; gameActive = gv.gameActive; currentDrunkFactor = gv.d; currentFreezeFactor = gv.f; currentOvereatFactor = gv.o;
            shieldTime = gv.sh; shieldAppearAnim = gv.sa; infiniteStaminaTime = gv.inf; speedBoostTime = gv.boost; viewScale = gv.vs; renderScale = gv.rs;
            speedStars = gv.ss; speedRamp = gv.ramp; speedStarAcc = gv.acc; invulnerableTime = gv.inv;
            owl.x = sv.x; owl.y = sv.y; owl.rotation = sv.rotation; owl.visible = sv.visible; owl.lean = sv.lean; owl.boostK = sv.boostK; owl.spinAngle = sv.spinAngle; owl.wing = sv.wing; owl.radius = sv.radius;
        }
    }
    function renderBody() {
        const rb = $('admReset'); if (rb) rb.style.display = (tab === 'test' || tab === 'quiz') ? 'none' : '';
        if (tab === 'test') { renderTest(); return; }
        if (tab === 'quiz') { prevStop(); body.innerHTML = ROWS.quiz.map(rowHtml).join('') + (typeof quizAdminHtml === 'function' ? quizAdminHtml() : ''); body.scrollTop = 0; return; }
        prevStop();
        const rows = tab === 'themes' ? themeRows() : ROWS[tab];
        let h = '';
        if (tab === 'themes') h += `<div class="adm-sum"><span>Всего тем для победы</span><b id="admTotal">${themesTotal()}</b></div>`;
        h += rows.map(rowHtml).join('');
        if (tab === 'game') h += `<div class="adq-acts"><button type="button" class="adq-btn" data-g="coins"><i class="fa-solid fa-coins"></i>+1000 монет</button></div>`
            + `<div class="adq-acts"><button type="button" class="adq-btn" data-g="out"><i class="fa-solid fa-right-from-bracket"></i>Выйти из админки</button></div>`;
        body.innerHTML = h;
        body.scrollTop = 0;
    }
    function refreshRow(k) {
        const rows = tab === 'themes' ? themeRows() : ROWS[tab];
        const r = rows.find((x) => x.k === k); if (!r) return;
        const el = body.querySelector(`.adm-row[data-k="${k}"]`); if (!el) return;
        const v = getVal(k);
        el.querySelector('.adm-num').textContent = v;
        el.querySelector('.adm-unit').textContent = r.unit(v);
        const tot = $('admTotal'); if (tot) tot.textContent = themesTotal();
    }
    function change(k, d) {
        const sp = specOf(k); if (!sp) return;
        const cfg = JSON.parse(JSON.stringify(ADMIN_CFG));
        const cur = getVal(k);
        let nv = Math.round((cur + d * sp[2]) / sp[2]) * sp[2];
        nv = Math.max(sp[0], Math.min(sp[1], nv));
        if (nv === cur) return;
        if (k.indexOf('themes.') === 0) cfg.themes[k.slice(7)] = nv; else cfg[k] = nv;
        window.applyAdminConfig(cfg);
        refreshRow(k);
    }

    // Применение настроек «на лету» + сохранение в браузере
    window.applyAdminConfig = function (cfgIn) {
        const oldMax = MAX_ATTEMPTS;
        ADMIN_CFG = normalizeAdminCfg(cfgIn);
        try { localStorage.setItem(ADMIN_KEY, JSON.stringify(ADMIN_CFG)); } catch (e) {}
        MAX_ATTEMPTS = ADMIN_CFG.attempts;
        if (!hasStartedCampaign) { maxLives = ADMIN_CFG.maxLives; lives = Math.min(lives, maxLives); }   // новая игра — сразу новый максимум сердечек
        QUESTIONS_PER_ATTEMPT = ADMIN_CFG.questionsPerAttempt;
        FEATHERS_FOR_MAX_UP = ADMIN_CFG.feathersForMax;
        OVEREAT_TRIGGER = ADMIN_CFG.overeatEvery;
        DRUNK_TRIGGER = ADMIN_CFG.drunkEvery;
        FREEZE_TRIGGER = ADMIN_CFG.freezeEvery;
        for (const k in ADMIN_CFG.themes) {
            if (!CATEGORIES[k]) continue;
            CATEGORIES[k].count = ADMIN_CFG.themes[k];
            if (collected && collected[k] > CATEGORIES[k].count) collected[k] = CATEGORIES[k].count;
        }
        TOTAL_THEMES = Object.keys(CATEGORIES).reduce((a, k) => a + (CATEGORIES[k].count || 0), 0);
        if (attempts === oldMax) attempts = MAX_ATTEMPTS;                        // игра ещё не начата — берём новое число попыток
        try { attemptMilestone = Math.floor(score / QUESTIONS_PER_ATTEMPT); coinMilestone = Math.floor(score / 50); } catch (e) {}   // не выдаём попытки задним числом
        syncAll();
    };
    function syncAll() {
        syncRulesCfg();
        try { renderLivesHUD(); } catch (e) {}
        try { renderRulesGoal(); } catch (e) {}
        try { updateCollectionHUD(); } catch (e) {}
        try { updateMenuVisibility(); } catch (e) {}
        try { StorageManager.save(); } catch (e) {}
        try { fitThemeLabels(); } catch (e) {}
    }
    // Числа и склонения в тексте правил берутся из настроек
    window.syncRulesCfg = function () {
        document.querySelectorAll('[data-num]').forEach((e) => { e.textContent = ADMIN_CFG[e.dataset.num]; });
        document.querySelectorAll('[data-pl]').forEach((e) => {
            const n = ADMIN_CFG[e.dataset.pl], f = (e.dataset.forms || '').split('|');
            if (f.length === 3) e.textContent = n + ' ' + ruPlural(n, f);
        });
    };

    // большая кнопка внизу окна: вернуть попытки дня (снова ${MAX_ATTEMPTS})
    { const ab = $('admAttBtn'); if (ab) ab.addEventListener('click', (e) => { e.stopPropagation(); attempts = Math.max(attempts, MAX_ATTEMPTS); zeroDay = ''; try { StorageManager.save(); updateHUDAll(); } catch (er) {} ab.querySelector('span').textContent = 'ГОТОВО: ПОПЫТОК ' + attempts; setTimeout(() => { ab.querySelector('span').textContent = 'СБРОСИТЬ ПОПЫТКИ ДНЯ'; }, 1800); }); }
    // вкладка «Игра»: вернуть дневные попытки, тестовые монеты, выход
    body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-g]'); if (!b || tab !== 'game') return;
        if (b.dataset.g === 'att') { attempts = Math.max(attempts, MAX_ATTEMPTS); zeroDay = ''; try { StorageManager.save(); updateHUDAll(); } catch (er) {} b.innerHTML = '<i class="fa-solid fa-check"></i>Попытки: ' + attempts; }
        else if (b.dataset.g === 'coins') { if (typeof coinsAdd === 'function') coinsAdd(1000); b.innerHTML = '<i class="fa-solid fa-check"></i>Монет: ' + (typeof coinsGet === 'function' ? coinsGet() : ''); }
        else if (b.dataset.g === 'out') { try { localStorage.removeItem(AUTH); } catch (er) {} close(); }
    });
    // вкладка «Вопросы»: сброс показанных и портал прямо сейчас (для проверки)
    body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-q]'); if (!b || tab !== 'quiz') return;
        if (b.dataset.q === 'reset') { quizResetSeen(); renderBody(); }
        else if (b.dataset.q === 'today') { quizResetDay(); renderBody(); }
    });
    body.addEventListener('click', (e) => {
        const c = e.target.closest('[data-e]'); if (!c || tab !== 'test') return;
        const k = c.dataset.e;
        if (k === 'reset') { pv.on = {}; body.querySelectorAll('.adm-chk').forEach((x) => x.classList.remove('on')); return; }
        pv.on[k] = !pv.on[k]; if (!pv.on[k]) delete pv.on[k];
        if (k === 'shield' && pv.on[k]) pv.shieldAnim = 12;
        c.classList.toggle('on', !!pv.on[k]);
    });

    // Тап по небу в окне предпросмотра: сова взмахивает и роняет частицы — снежинки (заморозка), пузырьки (опьянение) или обычные кружочки
    body.addEventListener('pointerdown', (e) => {
        if (tab !== 'test' || !e.target.closest('.adm-prev')) return;
        e.preventDefault();
        pv.flap = 1; pv.kick = -7;
        const sn = !!(pv.on.freeze && pv.freeze > 0.05), bu = !!pv.on.drunk;
        const kind = (sn && bu) ? 'both' : (sn ? 'snow' : (bu ? 'bubble' : null));
        spawnFlapParticles(0, Math.sin(pv.frame * 0.05) * 3, kind, pv.parts);
    });

    // Вкладки, кнопки + и − (зажатие повторяет)
    tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.adm-tab'); if (!b) return;
        tab = b.dataset.tab; renderTabs(); renderBody();
    });
    let holdT = null, holdI = null;
    const stopHold = () => { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; };
    body.addEventListener('pointerdown', (e) => {
        const b = e.target.closest('.adm-step button'); if (!b) return;
        e.preventDefault();
        const k = b.closest('.adm-row').dataset.k, d = parseInt(b.dataset.d, 10);
        change(k, d); stopHold();
        holdT = setTimeout(() => { holdI = setInterval(() => change(k, d), 80); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => body.addEventListener(ev, stopHold));
    body.addEventListener('click', (e) => { if (e.target.closest('.adm-step button')) e.preventDefault(); });

    // Сброс к стандартным (с подтверждением вторым нажатием)
    const resetBtn = $('admReset'); let sure = false, sureT = null;
    resetBtn.addEventListener('click', () => {
        if (!sure) {
            sure = true; resetBtn.classList.add('sure'); resetBtn.querySelector('span').textContent = 'Точно?';
            sureT = setTimeout(() => { sure = false; resetBtn.classList.remove('sure'); resetBtn.querySelector('span').textContent = 'Сбросить'; }, 3000);
            return;
        }
        clearTimeout(sureT); sure = false; resetBtn.classList.remove('sure'); resetBtn.querySelector('span').textContent = 'Сбросить';
        window.applyAdminConfig(ADMIN_DEFAULTS); renderBody();
    });

    const openReal = () => { try { AudioFX.resume(); } catch (er) {} renderTabs(); renderBody(); modal.classList.remove('hidden'); };
    // вход по логину и паролю (запоминается на этом устройстве)
    const AUTH = 'bubo_adm_ok';
    let login = null;
    const showLogin = () => {
        if (!login) {
            const st = document.createElement('style');
            st.textContent = '#admLogin{position:absolute;inset:0;z-index:46;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,3,38,.6);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}'
                + '#admLogin.hidden{display:none}#admLogin .al-box{width:100%;max-width:300px;display:flex;flex-direction:column;gap:12px;padding:20px 18px;border-radius:22px;background:linear-gradient(180deg,rgba(36,10,66,.98),rgba(24,6,46,.98));border:1px solid rgba(254,118,0,.45);box-shadow:0 20px 50px rgba(0,0,0,.55);font-family:Onest,sans-serif;color:#fff}'
                + '#admLogin .al-t{display:flex;align-items:center;gap:8px;font-weight:900;font-size:14px;letter-spacing:.06em}#admLogin .al-t i{color:#FE7600}'
                + '#admLogin input{width:100%;padding:11px 12px;border-radius:12px;background:#140326;border:1px solid rgba(120,44,233,.5);color:#fff;font:700 14px Onest,sans-serif;outline:none}#admLogin input:focus{border-color:#FE7600}'
                + '#admLogin .al-err{min-height:14px;font-weight:700;font-size:11.5px;color:#F87171}#admLogin .al-row{display:flex;gap:8px}'
                + '#admLogin button{flex:1;padding:11px;border-radius:12px;font:900 12px Onest,sans-serif;letter-spacing:.05em;color:#fff;cursor:pointer;border:1px solid rgba(168,85,247,.5);background:rgba(45,14,82,.9)}'
                + '#admLogin button.pri{background:linear-gradient(180deg,#FF9F1C,#FE7600);border-color:rgba(255,214,150,.85)}'
                + '#admLogin .al-box.shake{animation:alShake .35s}@keyframes alShake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
            document.head.appendChild(st);
            login = document.createElement('div'); login.id = 'admLogin'; login.className = 'hidden';
            login.innerHTML = '<form class="al-box" autocomplete="off"><div class="al-t"><i class="fa-solid fa-lock"></i>ВХОД В АДМИНКУ</div>'
                + '<input id="alU" type="text" placeholder="Логин" autocapitalize="off" spellcheck="false"><input id="alP" type="password" placeholder="Пароль">'
                + '<div class="al-err" id="alE"></div><div class="al-row"><button type="button" id="alC">ОТМЕНА</button><button type="submit" class="pri">ВОЙТИ</button></div></form>';
            (document.getElementById('gameContainer') || document.body).appendChild(login);
            ['click', 'pointerdown', 'touchstart', 'keydown'].forEach((ev) => login.addEventListener(ev, (e) => e.stopPropagation()));
            login.querySelector('#alC').addEventListener('click', () => login.classList.add('hidden'));
            login.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                const u = login.querySelector('#alU').value.trim().toLowerCase(), p = login.querySelector('#alP').value.trim();
                if (u === 'admin' && p === '19881988') { try { localStorage.setItem(AUTH, '1'); } catch (er) {} login.classList.add('hidden'); openReal(); }
                else { login.querySelector('#alE').textContent = 'Неверный логин или пароль'; const b = login.querySelector('.al-box'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
            });
        }
        login.querySelector('#alU').value = ''; login.querySelector('#alP').value = ''; login.querySelector('#alE').textContent = '';
        login.classList.remove('hidden');
        setTimeout(() => { try { login.querySelector('#alU').focus(); } catch (er) {} }, 50);
    };
    const open = (e) => { if (e) e.stopPropagation(); let ok = false; try { ok = localStorage.getItem(AUTH) === '1'; } catch (er) {} if (ok) openReal(); else showLogin(); };
    const close = (e) => { if (e) e.stopPropagation(); stopHold(); prevStop(); modal.classList.add('hidden'); syncAll(); };
    openBtn.addEventListener('click', open);
    $('admClose').addEventListener('click', close);
    $('admDone').addEventListener('click', close);
    ['click', 'pointerdown', 'touchstart'].forEach((ev) => modal.addEventListener(ev, (e) => e.stopPropagation()));

    syncRulesCfg();
    try { updateCollectionHUD(); } catch (e) {}
})();
