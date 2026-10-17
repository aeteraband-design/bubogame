// ===== КВИЗ-МИР (тестовая версия) =====
// Каждые 10% собранных тем между трубами появляется портал. Влетели — камера уходит за спину совы (псевдо-3D, мир летит на нас
// из глубины), сова машет крыльями сама, игрок водит её только влево-вправо (палец/мышь, стрелки, A/D).
// В этом мире нет значков тем — только бонусные напитки и 3 вопроса. Вопрос: 5 секунд на чтение (мир замирает), потом из глубины
// медленно летят шары с буквами A, B, C, D — влетаешь в нужный. Верно — шар и ответ зелёные, неверно — красные.
// После трёх вопросов — выходной портал и возврат в обычный полёт.
// Каждый вопрос показывается игроку только один раз (запоминается в браузере); сбросить можно в админке, вкладка «Вопросы».

// ---------- база вопросов: добавлять по этому же шаблону ----------
const QUIZ_QUESTIONS = [
    { id: 101, cat: 'Еда', question: 'Какая специя считается самой дорогой в мире по весу?', options: { A: 'Ваниль', B: 'Шафран', C: 'Кардамон', D: 'Мускатный орех' }, correct: 'B' },
    { id: 102, cat: 'Еда', question: 'Из какой страны родом блюдо пад-тай?', options: { A: 'Вьетнам', B: 'Китай', C: 'Таиланд', D: 'Малайзия' }, correct: 'C' },
    { id: 103, cat: 'Кино', question: 'Кто снял фильм «Начало» (Inception)?', options: { A: 'Кристофер Нолан', B: 'Дэвид Финчер', C: 'Дени Вильнёв', D: 'Ридли Скотт' }, correct: 'A' },
    { id: 104, cat: 'Кино', question: 'За какой фильм Леонардо Ди Каприо получил «Оскар» за лучшую мужскую роль?', options: { A: '«Титаник»', B: '«Волк с Уолл-стрит»', C: '«Выживший»', D: '«Остров проклятых»' }, correct: 'C' },
    { id: 105, cat: 'Сериалы', question: 'Как зовут учителя химии, ставшего наркобароном в «Во все тяжкие»?', options: { A: 'Джесси Пинкман', B: 'Уолтер Уайт', C: 'Сол Гудман', D: 'Хэнк Шрейдер' }, correct: 'B' },
    { id: 106, cat: 'Сериалы', question: 'Какой дом сидит на Железном троне в начале «Игры престолов»?', options: { A: 'Старки', B: 'Ланнистеры', C: 'Баратеоны', D: 'Таргариены' }, correct: 'C' },
    { id: 107, cat: 'Игры', question: 'Какая студия создала серию игр «Ведьмак»?', options: { A: 'Ubisoft', B: 'CD Projekt Red', C: 'BioWare', D: 'Bethesda' }, correct: 'B' },
    { id: 108, cat: 'Игры', question: 'Как называется вымышленный штат, где происходит действие GTA V?', options: { A: 'Сан-Андреас', B: 'Вайс-Сити', C: 'Либерти-Сити', D: 'Лос-Сантос' }, correct: 'A' },
    { id: 109, cat: 'Музыка', question: 'Какая группа выпустила альбом «The Dark Side of the Moon»?', options: { A: 'The Beatles', B: 'Led Zeppelin', C: 'Pink Floyd', D: 'Queen' }, correct: 'C' },
    { id: 110, cat: 'Музыка', question: 'Сколько симфоний написал Бетховен?', options: { A: '5', B: '7', C: '9', D: '12' }, correct: 'C' },
    { id: 111, cat: 'Мультики', question: 'Какая студия создала мультфильм «Унесённые призраками»?', options: { A: 'Pixar', B: 'Studio Ghibli', C: 'DreamWorks', D: 'Toei Animation' }, correct: 'B' },
    { id: 112, cat: 'Мультики', question: 'Как зовут льва-злодея из «Короля Льва»?', options: { A: 'Шрам', B: 'Муфаса', C: 'Пумба', D: 'Рафики' }, correct: 'A' },
    { id: 113, cat: 'Обо всём', question: 'Какой химический элемент обозначается символом Au?', options: { A: 'Серебро', B: 'Аргон', C: 'Золото', D: 'Алюминий' }, correct: 'C' },
    { id: 114, cat: 'Обо всём', question: 'Какая река считается самой длинной в мире по большинству справочников?', options: { A: 'Амазонка', B: 'Нил', C: 'Янцзы', D: 'Миссисипи' }, correct: 'B' },
    { id: 115, cat: 'Обо всём', question: 'В каком году человек впервые высадился на Луну?', options: { A: '1961', B: '1965', C: '1969', D: '1972' }, correct: 'C' },
    { id: 116, cat: 'Наука', question: 'Сколько костей в теле взрослого человека?', options: { A: '186', B: '206', C: '226', D: '256' }, correct: 'B' }
];
const QUIZ_PER_PORTAL = 3;          // вопросов за один заход в портал
const QUIZ_PORTAL_AT = [0.30, 0.60];   // порталы за всю игру: на 30% и на 60% собранных тем
const QUIZ_READ_SEC = 5;            // пауза на чтение вопроса
const QUIZ_FLY_SEC = 12;            // сколько летят шары с ответами (10–15 с)
const QUIZ_SEEN_KEY = 'bubo_quiz_seen', QUIZ_MS_KEY = 'bubo_quiz_ms';

// ---------- какие вопросы игрок уже видел ----------
function quizSeen() { try { return JSON.parse(localStorage.getItem(QUIZ_SEEN_KEY)) || []; } catch (e) { return []; } }
function quizMarkSeen(id) { try { const s = quizSeen(); if (s.indexOf(id) < 0) { s.push(id); localStorage.setItem(QUIZ_SEEN_KEY, JSON.stringify(s)); } } catch (e) {} }
function quizResetSeen() { try { localStorage.removeItem(QUIZ_SEEN_KEY); } catch (e) {} }
function quizPick(n) {
    const seen = quizSeen();
    const free = QUIZ_QUESTIONS.filter(q => seen.indexOf(q.id) < 0);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    return free.slice(0, n);
}

// ---------- состояние ----------
const QZ = {
    pending: false, portal: null,          // портал в обычном мире
    on: false, t: 0, phase: 'fly', phaseT: 0,
    x: 0, tx: 0, keyL: false, keyR: false, drag: false,
    objs: [], qList: [], qi: -1, q: null, balls: null, picked: null, result: null,
    flash: 0, exitAt: 0, spawnT: 0, colT: 0, grid: 0, exiting: false, nOk: 0, nBad: 0, nDone: 0
};
let quizMs = 0; try { quizMs = parseInt(localStorage.getItem(QUIZ_MS_KEY), 10) || 0; } catch (e) {}
function quizActive() { return QZ.on; }

// собрана ещё одна тема: проверяем рубеж 10%, 20%, …
function quizOnTheme() {
    if (!ADMIN_CFG.quizOn) return;   // вопросы выключены в админке (по умолчанию)
    let have = 0, need = 0;
    for (const k of THEME_KEYS_ALL) { have += Math.min(collected[k] || 0, CATEGORIES[k].count); need += CATEGORIES[k].count; }
    if (!need) return;
    const pct = have / need + 1e-9, m = QUIZ_PORTAL_AT.filter(a => pct >= a).length;
    if (m > quizMs) { quizMs = m; try { localStorage.setItem(QUIZ_MS_KEY, String(m)); } catch (e) {} if (quizPick(1).length) QZ.pending = true; }
}
// новая игра: рубежи с нуля
function quizResetProgress() { quizMs = 0; QZ.pending = false; QZ.portal = null; try { localStorage.removeItem(QUIZ_MS_KEY); } catch (e) {} }
// из админки: портал прямо сейчас
function quizForcePortal() { QZ.pending = true; }

// ---------- портал в обычном мире ----------
function quizUpdate2D(speed, sq) {
    if (QZ.pending && !QZ.portal && !QZ.on) {
        // вешаем портал в проём ближайшей трубы, которая ещё за правым краем экрана
        const p = pipes.find(pp => pp.x > width * 0.75 && !pp.portal);
        if (p) { p.portal = true; QZ.portal = { pipe: p }; QZ.pending = false; }
    }
    quizUpdateExit2D(sq);
    const P = QZ.portal; if (!P) return;
    const p = P.pipe;
    if (pipes.indexOf(p) < 0) { QZ.portal = null; QZ.pending = true; return; }
    const top = p.top + sq, bot = height - (p.bottom + sq);
    P.x = p.x + p.width / 2; P.y = (top + bot) / 2; P.r = Math.min(46, (bot - top) * 0.36);
    quizClearItemsNear(P.x);   // в проёме с порталом — никаких значков, только портал
    if (!gameActive) return;
    if (owl.x > P.x - 6 && owl.x < P.x + 14 && owl.y > top && owl.y < bot) quizEnter();
    else if (P.x < owl.x - 60) { QZ.portal = null; QZ.pending = true; }   // промахнулись (например, разбились) — портал появится у следующей трубы
}
// Портал как в игре Portal: овал с толстой огненной кромкой (несколько слоёв свечения), изнутри — тёмная «дверь» в другой мир
// с цветным отсветом от кромки, по краю бегут языки энергии и слетают искры. Вход — голубой, выход — оранжевый.
const QZ_PORTAL_COL = { in: { c: [56, 170, 255], hi: [205, 240, 255], dark: [3, 14, 40] }, out: { c: [255, 138, 30], hi: [255, 232, 196], dark: [40, 12, 2] } };
function drawQuizPortal(x, y, r, a, kind) {
    const t = (typeof frame === 'number' ? frame : 0), P = QZ_PORTAL_COL[kind || 'in'], [cr, cg, cb] = P.c, [hr, hg, hb] = P.hi, [dr, dg, db] = P.dark;
    const rx = r * 0.66, ry = r * 1.12, rgba = (c, al) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${al})`;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    // мягкое свечение вокруг: градиент растянут по форме овала и плавно уходит в ноль — без видимой границы
    ctx.save(); ctx.scale(rx / ry, 1);
    const gl = ctx.createRadialGradient(0, 0, ry * 0.8, 0, 0, ry * 2.2);
    gl.addColorStop(0, rgba(P.c, 0.38)); gl.addColorStop(0.35, rgba(P.c, 0.16)); gl.addColorStop(0.7, rgba(P.c, 0.05)); gl.addColorStop(1, rgba(P.c, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, ry * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // «дверь»: тёмная середина, к кромке — цветной отсвет; внутри медленно вращаются туманные завитки
    const edge = (i, n, w) => { const an = i / n * Math.PI * 2; const j = 1 + 0.03 * Math.sin(an * 6 + t * 0.18) + 0.02 * Math.sin(an * 11 - t * 0.27) + w; return [Math.cos(an) * rx * j, Math.sin(an) * ry * j]; };
    const oval = (w) => { ctx.beginPath(); for (let i = 0; i <= 60; i++) { const [px, py] = edge(i, 60, w); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); };
    ctx.save(); oval(0); ctx.clip();
    ctx.save(); ctx.scale(rx / ry, 1);
    const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    ig.addColorStop(0, rgba(P.dark, 1)); ig.addColorStop(0.55, `rgba(${(dr + cr) >> 1}, ${(dg + cg) >> 1}, ${(db + cb) >> 1}, 0.95)`); ig.addColorStop(0.85, rgba(P.c, 0.95)); ig.addColorStop(1, rgba(P.hi, 1));
    ctx.fillStyle = ig; ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
        const an = t * (0.012 + k * 0.006) * (k % 2 ? -1 : 1) + k * 2.1, cx2 = Math.cos(an) * ry * 0.3, cy2 = Math.sin(an) * ry * 0.3;
        const sg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, ry * 0.55);
        sg.addColorStop(0, rgba(P.c, 0.22)); sg.addColorStop(1, rgba(P.c, 0));
        ctx.fillStyle = sg; ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    }
    ctx.restore(); ctx.restore();
    // кромка: широкий мягкий слой, яркий цветной, тонкий почти белый
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(P.c, 0.28); ctx.lineWidth = Math.max(3, r * 0.3); oval(0.02); ctx.stroke();
    ctx.shadowColor = rgba(P.c, 1); ctx.shadowBlur = r * 0.35;
    ctx.strokeStyle = rgba(P.c, 1); ctx.lineWidth = Math.max(2, r * 0.13); oval(0); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(P.hi, 0.95); ctx.lineWidth = Math.max(1, r * 0.04); oval(-0.01); ctx.stroke();
    // языки энергии: короткие вспышки, бегущие по кромке
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
        const s0 = ((t * 0.006 * (k % 2 ? 1 : -1.3) + k / 6) % 1 + 1) % 1, n = 60, i0 = Math.floor(s0 * n);
        ctx.strokeStyle = rgba(P.hi, 0.85); ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const [px, py] = edge((i0 + i) % n, n, 0.01); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
    }
    // искры слетают с кромки наружу и гаснут
    for (let k = 0; k < 12; k++) {
        const ph = (t * 0.018 + k * 0.083) % 1, an = k * 0.52 + Math.floor(t * 0.018 + k * 0.083) * 1.7, d = 1.02 + ph * 0.5;
        ctx.globalAlpha = a * (1 - ph) * 0.9;
        ctx.fillStyle = k % 3 ? rgba(P.hi, 1) : '#FFFFFF';
        ctx.beginPath(); ctx.arc(Math.cos(an) * rx * d, Math.sin(an) * ry * d, Math.max(0.7, r * 0.03) * (1 - ph * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}
function quizClearItemsNear(x) {
    if (typeof items === 'undefined') return;
    for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (!it.collected && Math.abs(it.x - x) < 70) items.splice(i, 1); }
}
// выходной портал в обычном мире: стоит в проёме трубы, сова из него выскакивает; потом уезжает вместе с трубой и гаснет
function quizUpdateExit2D(sq) {
    const E = QZ.exitP; if (!E) return;
    const p = E.pipe;
    if (pipes.indexOf(p) < 0) { QZ.exitP = null; return; }
    const top = p.top + sq, bot = height - (p.bottom + sq);
    E.x = p.x + p.width / 2; E.y = (top + bot) / 2; E.r = Math.min(46, (bot - top) * 0.36);
    E.t += dtMult; if (E.t > 70) E.a = Math.max(0, (E.a == null ? 1 : E.a) - 0.02 * dtMult);
    quizClearItemsNear(E.x);
    if (E.a === 0 || E.x < -80) QZ.exitP = null;
}
function quizDrawPortal2D() {
    const P = QZ.portal; if (P && P.r) drawQuizPortal(P.x, P.y, P.r, 1, 'in');
    const E = QZ.exitP; if (E && E.r) drawQuizPortal(E.x, E.y, E.r, E.a == null ? 1 : E.a, 'out');
}

// ---------- вход и выход ----------
function quizEnter() {
    QZ.portal = null; QZ.on = true; QZ.t = 0; QZ.flash = 1; QZ.objs = []; QZ.scroll = 0; QZ.hinted = false;
    owl.vy = 0; owl.y = height * 0.45;
    QZ.qList = quizPick(QUIZ_PER_PORTAL); QZ.qi = -1; QZ.q = null; QZ.balls = null; QZ.exiting = false;
    QZ.phase = 'fly'; QZ.phaseT = 150; QZ.spawnT = 40; QZ.colT = 0; QZ.nOk = 0; QZ.nBad = 0; QZ.nDone = 0;
    try { AudioFX.playStarCollect(); Haptics.powerup(); } catch (e) {}
    quizUI(true);
}
function quizAbort() { QZ.on = false; QZ.objs = []; QZ.portal = null; QZ.exitP = null; quizUI(false); }
function quizExit() {
    QZ.on = false; QZ.flash = 1; QZ.objs = []; quizUI(false);
    // возвращаемся в обычный полёт: сова выскакивает из оранжевого портала в проёме трубы, вокруг — чисто
    pipes = pipes.filter(p => p.x + p.width < owl.x - 160 || p.x > owl.x + 280);
    let sq = 0; try { sq = currentDifficultySqueeze + currentCompressionFactor * compressionMaxForLevel(); } catch (e) {}
    let gap = 230; try { gap = pipeGapForLevel(); } catch (e) {}
    owl.y = Math.max(gap / 2 + 70, Math.min(height - gap / 2 - 90, height * 0.45));
    const np = { x: owl.x - 43, width: 86, top: owl.y - gap / 2 - sq, gap, bottom: height - owl.y - gap / 2 - sq, passed: true, portal: true };
    pipes.push(np); pipes.sort((a, b) => a.x - b.x);
    QZ.exitP = { pipe: np, t: 0 };
    quizClearItemsNear(owl.x);
    try { owl.flap(); } catch (e) { owl.vy = 0; }
    invulnerableTime = Math.max(invulnerableTime, 120);
    try { AudioFX.playStarCollect(); } catch (e) {}
}

// ---------- другой мир: вид сбоку, как в игре ----------
// Небо другого мира (бирюзово-индиговое, с северным сиянием и огромной планетой), летающие острова-скалы на трёх планах.
// Сова летит как обычно — тапами. Шары-ответы A, B, C, D плывут справа столбиком; в какой влетишь — тот ответ.
const QZ_LETTERS = ['A', 'B', 'C', 'D'];
const QZ_BALL_COL = { A: '#FE7600', B: '#A855F7', C: '#38BDF8', D: '#F43F5E' };
const QZ_SPEED = 1.6;   // скорость мира, пикселей за кадр
function qzBand() { return { top: 120, bot: height - 110 }; }   // где летают шары и бонусы (под карточкой вопроса и над табличкой)

// ---------- логика ----------
function quizUpdate() {
    const dt = dtMult; QZ.t += dt;
    if (QZ.flash > 0) QZ.flash = Math.max(0, QZ.flash - 0.03 * dt);
    const reading = QZ.phase === 'read';
    // сова: на чтении вопроса парит на месте, в остальное время летит тапами, как в игре (разбиться нельзя — края мягко отталкивают)
    if (reading) { owl.vy = 0; owl.y += (QZ.hoverY - owl.y) * Math.min(1, 0.1 * dt) + Math.sin(QZ.t * 0.06) * 0.25; owl.rotation = 0; if (owl.wing > 0) owl.wing -= 0.05 * dt; }
    else {
        try { owl.update(); } catch (e) { owl.vy += 0.26 * dt; owl.y += owl.vy * dt; }
        if (owl.y < 70) { owl.y = 70; owl.vy = Math.max(0, owl.vy); }
        if (owl.y > height - 80) { owl.y = height - 80; owl.vy = Math.min(-3.6, owl.vy); }   // у земли — сама подпрыгивает
    }
    const sp = reading ? 0 : QZ_SPEED;
    QZ.scroll += sp * dt;
    // фазы вопросов
    QZ.phaseT -= dt;
    if (QZ.phase === 'fly' && QZ.phaseT <= 0) {
        if (QZ.qi + 1 < QZ.qList.length) {
            QZ.qi++; QZ.q = QZ.qList[QZ.qi]; QZ.phase = 'read'; QZ.phaseT = QUIZ_READ_SEC * 60; QZ.picked = null; QZ.result = null; QZ.hoverY = Math.max(140, Math.min(height - 140, owl.y));
            quizMarkSeen(QZ.q.id); quizShowQuestion();
            try { AudioFX.playStarCollect(); } catch (e) {}
        } else if (!QZ.exiting) {
            QZ.exiting = true; QZ.objs.push({ k: 'exit', x: width + 70, y: height * 0.48 });
        }
    } else if (QZ.phase === 'read' && QZ.phaseT <= 0) {
        QZ.phase = 'answer'; QZ.phaseT = QUIZ_FLY_SEC * 60;
        const B = qzBand(), Ls = QZ_LETTERS.filter(L => QZ.q.options[L] !== undefined), n = Ls.length;
        const x0 = width + 40, v = (x0 - owl.x) / (QUIZ_FLY_SEC * 60);
        QZ.ballR = Math.min(26, (B.bot - B.top) / n * 0.32);
        QZ.balls = Ls.map((L, i) => ({ k: 'ball', L, x: x0, y: B.top + (i + 0.5) / n * (B.bot - B.top), v, ph: i * 1.3 }));
        QZ.objs.push(...QZ.balls);
    } else if (QZ.phase === 'result' && QZ.phaseT <= 0) {
        quizHideQuestion(); QZ.phase = 'fly'; QZ.phaseT = 170;
        for (const b of (QZ.balls || [])) b.gone = true;
        QZ.balls = null;
    }
    quizUiTick();
    // бонусы на пути — только между вопросами
    if (!reading && QZ.phase === 'fly' && !QZ.exiting) {
        QZ.spawnT -= dt;
        if (QZ.spawnT <= 0) {
            QZ.spawnT = 70 + Math.random() * 60;
            const B = qzBand(), kinds = ['beer', 'cocktail', 'icecream', 'feather'];
            QZ.objs.push({ k: 'item', t: kinds[Math.floor(Math.random() * kinds.length)], x: width + 30, y: B.top + Math.random() * (B.bot - B.top) });
        }
    }
    for (let i = QZ.objs.length - 1; i >= 0; i--) {
        const o = QZ.objs[i];
        if (!reading) o.x -= (o.v || sp) * dt;
        if (o.k === 'ball' && o.gone) { o.fade = (o.fade == null ? 1 : o.fade) - 0.04 * dt; if (o.fade <= 0) { QZ.objs.splice(i, 1); continue; } }
        if (o.k === 'item' && Math.hypot(o.x - owl.x, o.y - owl.y) < owl.radius + 16) { quizCollect(o); QZ.objs.splice(i, 1); continue; }
        if (o.k === 'ball' && QZ.phase === 'answer' && o.x <= owl.x + 6) { quizAnswer(); }
        if (o.k === 'exit' && o.x <= owl.x + 4) { quizExit(); return; }
        if (o.x < -80) QZ.objs.splice(i, 1);
    }
}
function quizCollect(o) {
    const add = { beer: 10, cocktail: 15, icecream: 20, feather: 30 }[o.t] || 10;
    stamina = Math.min(maxStamina, stamina + add);
    try { updateStaminaHUD(); AudioFX.playStarCollect(); Haptics.collectTheme(); } catch (e) {}
    QZ.toast = { txt: `+${add}% сил`, t: 70, col: '#00F0FF' };
}
function quizAnswer() {
    // выбран шар, в который влетела сова: ближайший к ней по высоте
    let best = null, bd = 1e9;
    for (const b of QZ.balls) { const d = Math.abs(b.y - owl.y); if (d < bd) { bd = d; best = b; } }
    QZ.picked = best.L; const ok = best.L === QZ.q.correct; QZ.result = ok;
    QZ.nDone++; if (ok) QZ.nOk++; else QZ.nBad++; quizScore();
    best.res = ok ? 'ok' : 'bad'; best.pop = 1;
    if (!ok) { const c = QZ.balls.find(b => b.L === QZ.q.correct); if (c) c.res = 'right'; }
    for (const b of QZ.balls) b.v = QZ_SPEED;
    if (ok) { stamina = Math.min(maxStamina, stamina + 25); try { updateStaminaHUD(); AudioFX.playThemeCollect(); Haptics.collectTheme(); } catch (e) {} QZ.toast = { txt: 'Верно! +25% сил', t: 90, col: '#22C55E' }; }
    else { try { (AudioFX.playThemeLose || AudioFX.playStarCollect).call(AudioFX); Haptics.hit(); } catch (e) {} QZ.toast = { txt: 'Неверно', t: 90, col: '#EF4444' }; }
    for (let i = 0; i < 14 && particles.length < 500; i++) { const an = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2.5; particles.push({ x: best.x, y: best.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, color: ok ? '#4ADE80' : '#F87171', alpha: 1, size: 1.2 + Math.random() * 1.6, decay: 0.035, isStar: true }); }
    quizShowResult();
    QZ.phase = 'result'; QZ.phaseT = 100;
}

// ---------- отрисовка ----------
// слои летающих островов: заготовки рисуются один раз, дальше просто сдвигаются (дальние — медленнее)
let __qzIsl = null, __qzIslKey = '';
function quizIslands() {
    const key = Math.round(width) + 'x' + Math.round(height);
    if (__qzIslKey === key && __qzIsl) return __qzIsl;
    __qzIslKey = key; __qzIsl = [];
    const L = [{ k: 0.18, col: '#1b2f63', top: 0.45, n: 5, sc: 0.8 }, { k: 0.4, col: '#1a1f4f', top: 0.58, n: 4, sc: 1.1 }, { k: 0.75, col: '#120f33', top: 0.72, n: 3, sc: 1.5 }];
    for (const l of L) {
        const W = Math.round(width * 1.5), H = Math.round(height * 0.5), S = 2, c = document.createElement('canvas');
        c.width = W * S; c.height = H * S; const g = c.getContext('2d'); g.scale(S, S);
        for (let i = 0; i < l.n; i++) {
            const cx = (i + 0.5) / l.n * W + (Math.random() - 0.5) * W / l.n * 0.5, cy = H * (0.25 + Math.random() * 0.45), w = (40 + Math.random() * 50) * l.sc, h = w * (0.55 + Math.random() * 0.3);
            // остров: плоская трава-крыша сверху и острый скальный низ, с бирюзовыми кристаллами
            g.fillStyle = l.col;
            g.beginPath(); g.moveTo(cx - w / 2, cy);
            g.quadraticCurveTo(cx - w * 0.3, cy - h * 0.12, cx, cy - h * 0.08); g.quadraticCurveTo(cx + w * 0.3, cy - h * 0.14, cx + w / 2, cy);
            g.lineTo(cx + w * 0.3, cy + h * 0.35); g.lineTo(cx + w * 0.08, cy + h); g.lineTo(cx - w * 0.12, cy + h * 0.5); g.lineTo(cx - w * 0.35, cy + h * 0.3); g.closePath(); g.fill();
            g.fillStyle = 'rgba(94, 234, 212, 0.35)';
            for (let j = 0; j < 3; j++) { const kx = cx + (Math.random() - 0.5) * w * 0.6, ky = cy - h * 0.08; g.beginPath(); g.moveTo(kx - 3 * l.sc, ky); g.lineTo(kx, ky - (8 + Math.random() * 10) * l.sc); g.lineTo(kx + 3 * l.sc, ky); g.closePath(); g.fill(); }
            g.fillStyle = 'rgba(94, 234, 212, 0.18)'; g.fillRect(cx - w / 2, cy - 1, w, 2);
        }
        __qzIsl.push({ c, W, H, k: l.k, y: height * l.top - H * 0.35 });
    }
    return __qzIsl;
}
function quizDraw() {
    ctx.setTransform(viewScale * renderScale * WORLD_K, 0, 0, viewScale * renderScale * WORLD_K, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const t = QZ.t;
    // небо другого мира
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#071a33'); sky.addColorStop(0.45, '#0e1446'); sky.addColorStop(1, '#22093f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    for (const st of stars) { ctx.globalAlpha = st.alpha * (0.6 + 0.4 * Math.sin(t * 0.05 + st.x)); ctx.fillRect(st.x, st.y, st.size, st.size); }
    ctx.globalAlpha = 1;
    // огромная планета с кольцом
    {
        const px = width * 0.22, py = height * 0.2, pr = Math.min(width, height) * 0.16;
        const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
        pg.addColorStop(0, '#7dd3fc'); pg.addColorStop(0.5, '#3b5bdb'); pg.addColorStop(1, '#1a1a5e');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.55)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.38, -0.35, 0, Math.PI * 2); ctx.stroke();
    }
    // северное сияние: мягкие волнистые ленты
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
        const g = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.42);
        g.addColorStop(0, 'rgba(45, 212, 191, 0)'); g.addColorStop(0.5, k ? 'rgba(168, 85, 247, 0.12)' : 'rgba(45, 212, 191, 0.14)'); g.addColorStop(1, 'rgba(45, 212, 191, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, height * 0.42);
        for (let x = 0; x <= width + 10; x += 10) ctx.lineTo(x, height * (0.16 + k * 0.06) + Math.sin(x * 0.012 + t * 0.012 + k * 2) * 26 + Math.sin(x * 0.03 - t * 0.02) * 9);
        ctx.lineTo(width, height * 0.42); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // острова на трёх планах
    for (const L of quizIslands()) {
        const off = (QZ.scroll * L.k) % L.W;
        for (let x = -off; x < width; x += L.W) ctx.drawImage(L.c, x, L.y, L.W, L.H);
    }
    // дымка снизу
    const fog = ctx.createLinearGradient(0, height * 0.7, 0, height);
    fog.addColorStop(0, 'rgba(45, 212, 191, 0)'); fog.addColorStop(1, 'rgba(45, 212, 191, 0.14)');
    ctx.fillStyle = fog; ctx.fillRect(0, height * 0.7, width, height * 0.3);
    // объекты и сова
    for (const o of QZ.objs) quizDrawObj(o);
    try { owl.draw(); } catch (e) {}
    drawParticleList(particles);
    if (QZ.toast && QZ.toast.t > 0) {
        QZ.toast.t -= dtMult;
        ctx.save(); ctx.globalAlpha = Math.min(1, QZ.toast.t / 20); ctx.font = '900 18px Onest, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = QZ.toast.col; ctx.shadowColor = QZ.toast.col; ctx.shadowBlur = 10;
        ctx.fillText(QZ.toast.txt, owl.x, owl.y - 40 - (90 - QZ.toast.t) * 0.3); ctx.restore();
    }
    if (QZ.flash > 0) { ctx.fillStyle = `rgba(200, 235, 255, ${QZ.flash * 0.85})`; ctx.fillRect(0, 0, width, height); }
}
function quizDrawObj(o) {
    ctx.save();
    if (o.k === 'item') {
        const r = 15, col = { beer: '#FACC15', cocktail: '#2DD4BF', icecream: '#B5E4FF', feather: '#00F0FF' }[o.t];
        const ic = { beer: '', cocktail: '', icecream: '', feather: '' }[o.t];
        const y = o.y + Math.sin(QZ.t * 0.06 + o.x * 0.02) * 4;
        ctx.fillStyle = 'rgba(20, 3, 38, 0.85)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(o.x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = col; ctx.font = `900 ${r * 1.05}px "Font Awesome 6 Free"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ic, o.x, y + 1);
    } else if (o.k === 'ball') {
        const r = (QZ.ballR || 22) * (1 + (o.pop ? 0.25 * Math.sin(Math.min(1, (QZ.t % 1000)) * Math.PI) : 0)), y = o.y + Math.sin(QZ.t * 0.05 + o.ph) * 5;
        ctx.globalAlpha = o.fade == null ? 1 : Math.max(0, o.fade);
        const base = o.res === 'ok' || o.res === 'right' ? '#22C55E' : o.res === 'bad' ? '#EF4444' : QZ_BALL_COL[o.L];
        const g = ctx.createRadialGradient(o.x - r * 0.35, y - r * 0.35, r * 0.1, o.x, y, r);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, base); g.addColorStop(1, 'rgba(10, 2, 25, 0.9)');
        ctx.shadowColor = base; ctx.shadowBlur = o.res ? 26 : 14;
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${r * 0.95}px Onest, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.L, o.x, y + r * 0.05);
    } else if (o.k === 'exit') {
        drawQuizPortal(o.x, o.y, 44, 1, 'out');
    }
    ctx.restore();
}

// ---------- окно вопроса (HTML поверх игры) ----------
let qzEl = null;
function quizUI(on) {
    if (on && !qzEl) {
        const st = document.createElement('style');
        st.textContent = '#gameContainer.qz-on #bottomHud,#gameContainer.qz-on #buffBar{opacity:0!important;pointer-events:none!important;transition:opacity .3s}'
            + '#qzCard{position:absolute;left:14px;right:14px;top:58px;z-index:35;pointer-events:none;opacity:0;transform:translateY(-12px) scale(.97);transition:opacity .35s,transform .35s;'
            + 'background:rgba(29,9,54,.88);border:1.5px solid rgba(168,120,245,.5);border-radius:20px;padding:14px 14px 12px;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 24px rgba(168,85,247,.25);backdrop-filter:blur(6px);color:#fff;font-family:Onest,sans-serif;max-width:520px;margin:0 auto}'
            + '#qzCard.on{opacity:1;transform:none}'
            + '#qzCard .qz-top{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:800;color:#C4A1FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}'
            + '#qzCard .qz-q{font-size:16px;font-weight:900;line-height:1.3;margin-bottom:10px}'
            + '#qzCard .qz-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}'
            + '#qzCard .qz-o{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:rgba(120,44,233,.22);border:1px solid rgba(168,120,245,.3);font-size:12.5px;font-weight:700;transition:background .3s,border-color .3s}'
            + '#qzCard .qz-o b{flex:0 0 22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff}'
            + '#qzCard .qz-o.ok{background:rgba(34,197,94,.35);border-color:#22C55E}#qzCard .qz-o.bad{background:rgba(239,68,68,.35);border-color:#EF4444}'
            + '#qzCard .qz-bar{height:5px;border-radius:5px;background:rgba(255,255,255,.12);margin-top:10px;overflow:hidden}#qzCard .qz-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#FE7600,#A855F7);border-radius:5px}'
            + '#qzScore{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:35;display:flex;align-items:center;gap:12px;padding:8px 16px;border-radius:9999px;background:rgba(29,9,54,.9);border:1.5px solid rgba(168,120,245,.5);box-shadow:0 6px 18px rgba(0,0,0,.4);font:800 13px Onest,sans-serif;color:#EDE5F8;white-space:nowrap;pointer-events:none}'
            + '#qzScore b{font-weight:900;color:#fff}#qzScore .ok{color:#22C55E}#qzScore .bad{color:#EF4444}#qzScore i{margin-right:4px}'
            + '#qzCount{position:absolute;left:0;right:0;top:44%;z-index:35;text-align:center;font:900 64px Onest,sans-serif;color:#fff;text-shadow:0 0 18px #A855F7,0 4px 0 rgba(0,0,0,.4);pointer-events:none;opacity:0;transition:opacity .2s}'
            + '#qzHint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 64px);transform:translateX(-50%);z-index:35;display:flex;flex-direction:column;align-items:center;gap:6px;font:800 12px Onest,sans-serif;color:#EDE5F8;pointer-events:none;transition:opacity .5s;text-shadow:0 1px 3px rgba(0,0,0,.6);white-space:nowrap}'
            + '#qzHint.off{opacity:0}#qzHint .qh-row{display:flex;align-items:center;gap:10px;font-size:18px;color:#C4A1FF}#qzHint .qh-hand{font-size:24px;color:#fff;animation:qzSwipe 1.6s ease-in-out infinite;filter:drop-shadow(0 0 6px #A855F7)}'
                        + '@keyframes qzSwipe{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(6px) scale(.9)}60%{transform:translateY(0) scale(1)}}';
        document.head.appendChild(st);
        qzEl = { card: document.createElement('div'), count: document.createElement('div'), hint: document.createElement('div'), score: document.createElement('div') };
        qzEl.card.id = 'qzCard'; qzEl.count.id = 'qzCount'; qzEl.hint.id = 'qzHint'; qzEl.score.id = 'qzScore';
        container.appendChild(qzEl.score);
        qzEl.hint.innerHTML = '<div class="qh-row"><i class="fa-solid fa-hand-pointer qh-hand"></i></div><div>Тапай и влетай в шар с ответом</div>';
        container.appendChild(qzEl.card); container.appendChild(qzEl.count); container.appendChild(qzEl.hint);
    }
    if (!qzEl) return;
    qzEl.hint.style.display = on ? '' : 'none'; qzEl.hint.classList.remove('off'); QZ.moved = false; qzEl.score.style.display = on ? '' : 'none';
    container.classList.toggle('qz-on', !!on); if (on) quizScore();
    if (!on) { qzEl.card.classList.remove('on'); qzEl.count.style.opacity = 0; }
}
function quizShowQuestion() {
    const q = QZ.q; if (!qzEl) return;
    qzEl.card.innerHTML = `<div class="qz-top"><span>Вопрос ${QZ.qi + 1} из ${QZ.qList.length}</span><span>${q.cat || ''}</span></div>`
        + `<div class="qz-q">${q.question}</div><div class="qz-opts">`
        + QZ_LETTERS.filter(L => q.options[L] !== undefined).map(L => `<div class="qz-o" data-l="${L}"><b style="background:${QZ_BALL_COL[L]}">${L}</b><span>${q.options[L]}</span></div>`).join('')
        + `</div><div class="qz-bar"><i></i></div>`;
    qzEl.card.classList.add('on');
}
function quizShowResult() {
    if (!qzEl) return;
    qzEl.card.querySelectorAll('.qz-o').forEach(el => {
        const L = el.dataset.l;
        if (L === QZ.q.correct) el.classList.add('ok');
        else if (L === QZ.picked) el.classList.add('bad');
    });
}
function quizScore() {
    if (!qzEl) return;
    qzEl.score.innerHTML = `<span><i class="fa-solid fa-circle-question"></i>Отвечено <b>${QZ.nDone}/${QZ.qList.length}</b></span><span class="ok"><i class="fa-solid fa-check"></i><b>${QZ.nOk}</b></span><span class="bad"><i class="fa-solid fa-xmark"></i><b>${QZ.nBad}</b></span>`;
}
function quizHideQuestion() { if (qzEl) qzEl.card.classList.remove('on'); }
function quizUiTick() {
    if (!qzEl) return;
    if (QZ.phase === 'read') {
        const n = Math.ceil(QZ.phaseT / 60);
        qzEl.count.style.opacity = 1; if (qzEl.count.textContent !== String(n)) qzEl.count.textContent = n;
    } else qzEl.count.style.opacity = 0;
    const bar = qzEl.card.querySelector('.qz-bar i');
    if (bar) bar.style.width = (QZ.phase === 'answer' ? Math.max(0, QZ.phaseT / (QUIZ_FLY_SEC * 60)) * 100 : QZ.phase === 'read' ? 100 : 0).toFixed(1) + '%';
}

// ---------- управление ----------
// в другом мире сова летит тапами, как обычно; на чтении вопроса тапы не нужны. Подсказка исчезает после первого тапа.
function quizMoved() { if (QZ.moved) return; QZ.moved = true; if (qzEl) qzEl.hint.classList.add('off'); }
container.addEventListener('pointerdown', () => { if (QZ.on) quizMoved(); }, true);
window.addEventListener('keydown', (e) => { if (QZ.on && (e.code === 'Space' || e.code === 'ArrowUp')) quizMoved(); });

// ---------- админка: список вопросов ----------
(function () {
    try {
        const st = document.createElement('style');
        st.textContent = '#adminModal .adq-acts{display:flex;gap:8px;flex:0 0 auto}'
            + '#adminModal .adq-btn{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 10px;border-radius:12px;font:800 12px Onest,sans-serif;color:#fff;cursor:pointer;border:1px solid rgba(168,120,245,.55);background:rgba(120,44,233,.28)}'
            + '#adminModal .adq-btn.pri{background:linear-gradient(180deg,#FF9F1C,#FE7600);border-color:rgba(255,214,150,.85);box-shadow:0 0 9px rgba(254,118,0,.45)}'
            + '#adminModal .adq-card{flex:0 0 auto;padding:10px 12px;border-radius:14px;background:#1a0a30;border:1px solid rgba(120,44,233,.32);display:flex;flex-direction:column;gap:7px}'
            + '#adminModal .adq-card.seen{opacity:.55}'
            + '#adminModal .adq-head{display:flex;align-items:center;gap:6px}'
            + '#adminModal .adq-chip{font:800 10px Onest,sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px;border-radius:8px;background:rgba(120,44,233,.3);color:#C4A1FF}'
            + '#adminModal .adq-chip.seen{background:rgba(255,255,255,.08);color:rgba(237,229,248,.75)}'
            + '#adminModal .adq-num{margin-left:auto;font:800 11px Onest,sans-serif;color:rgba(196,161,255,.7)}'
            + '#adminModal .adq-q{font:800 13px/1.35 Onest,sans-serif;color:#fff}'
            + '#adminModal .adq-opts{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
            + '#adminModal .adq-o{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(120,44,233,.25);font:600 11.5px/1.25 Onest,sans-serif;color:rgba(237,229,248,.85);min-width:0}'
            + '#adminModal .adq-o b{flex:0 0 18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 10px Onest,sans-serif;color:#fff}'
            + '#adminModal .adq-o.ok{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.7);color:#fff;font-weight:800}'
            + '#adminModal .adq-o.ok i{margin-left:auto;color:#22C55E}';
        document.head.appendChild(st);
    } catch (e) {}
})();
function quizAdminHtml() {
    const seen = quizSeen();
    return `<div class="adm-sum"><span>Вопросов в базе / уже показано</span><b>${QUIZ_QUESTIONS.length} / ${seen.filter(id => QUIZ_QUESTIONS.some(q => q.id === id)).length}</b></div>`
        + `<div class="adq-acts"><button type="button" class="adq-btn pri" data-q="portal"><i class="fa-solid fa-circle-nodes"></i>Портал сейчас</button>`
        + `<button type="button" class="adq-btn" data-q="reset"><i class="fa-solid fa-rotate-left"></i>Сбросить показанные</button></div>`
        + QUIZ_QUESTIONS.map((q, n) => {
            const was = seen.indexOf(q.id) >= 0;
            return `<div class="adq-card${was ? ' seen' : ''}"><div class="adq-head"><span class="adq-chip">${q.cat || 'Вопрос'}</span>${was ? '<span class="adq-chip seen">уже был</span>' : ''}<span class="adq-num">№${n + 1}</span></div>`
                + `<div class="adq-q">${q.question}</div><div class="adq-opts">`
                + QZ_LETTERS.filter(L => q.options[L] !== undefined).map(L => `<div class="adq-o${L === q.correct ? ' ok' : ''}"><b style="background:${QZ_BALL_COL[L]}">${L}</b><span>${q.options[L]}</span>${L === q.correct ? '<i class="fa-solid fa-check"></i>' : ''}</div>`).join('')
                + `</div></div>`;
        }).join('');
}
