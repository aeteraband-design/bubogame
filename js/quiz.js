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
// Портал как в игре Portal: вертикальный овал с яркой «живой» кромкой, внутри — закрученная воронка света.
// Вход — голубой, выход — оранжевый.
const QZ_PORTAL_COL = { in: { c: [56, 170, 255], hi: '#BFE7FF', dark: 'rgba(4, 22, 60, 0.92)' }, out: { c: [255, 138, 30], hi: '#FFE2B8', dark: 'rgba(60, 20, 2, 0.92)' } };
function drawQuizPortal(x, y, r, a, kind) {
    const t = (typeof frame === 'number' ? frame : 0), P = QZ_PORTAL_COL[kind || 'in'], [cr, cg, cb] = P.c;
    const rx = r * 0.68, ry = r * 1.12;
    ctx.save(); ctx.globalAlpha = a;
    // внешнее свечение
    const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.9);
    gl.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.35)`); gl.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(x, y, rx * 2.1, ry * 1.7, 0, 0, Math.PI * 2); ctx.fill();
    // воронка внутри
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    const ig = ctx.createRadialGradient(x, y, 0, x, y, ry);
    ig.addColorStop(0, '#FFFFFF'); ig.addColorStop(0.18, P.hi); ig.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, 0.85)`); ig.addColorStop(1, P.dark);
    ctx.fillStyle = ig; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    ctx.translate(x, y); ctx.scale(rx / ry, 1);
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {   // закрученные рукава
        const a0 = t * 0.06 + k * Math.PI * 2 / 5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + 0.1 * (k % 2)})`; ctx.lineWidth = Math.max(1, ry * 0.05);
        ctx.beginPath();
        for (let s2 = 0; s2 <= 1.0001; s2 += 0.1) { const rr = ry * (0.12 + s2 * 0.85), an = a0 + s2 * 2.6; if (s2 === 0) ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); else ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.stroke();
    }
    ctx.restore();
    // «живая» кромка: дрожащий яркий контур со свечением
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`; ctx.shadowBlur = 16;
    for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? P.hi : `rgb(${cr}, ${cg}, ${cb})`; ctx.lineWidth = pass ? Math.max(1, r * 0.035) : Math.max(2, r * 0.11);
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
            const an = i / 48 * Math.PI * 2, j = 1 + 0.035 * Math.sin(an * 7 + t * 0.21) + 0.025 * Math.sin(an * 13 - t * 0.33);
            const px = Math.cos(an) * rx * j, py = Math.sin(an) * ry * j;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // искры, слетающие с кромки
    for (let k = 0; k < 9; k++) {
        const ph = (t * 0.02 + k * 0.137) % 1, an = k * 0.7 + t * 0.01 * (k % 2 ? 1 : -1), d = 1 + ph * 0.45;
        ctx.globalAlpha = a * (1 - ph);
        ctx.fillStyle = k % 3 ? P.hi : '#FFFFFF';
        ctx.beginPath(); ctx.arc(Math.cos(an) * rx * d, Math.sin(an) * ry * d, Math.max(0.8, r * 0.035) * (1 - ph * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
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
    QZ.portal = null; QZ.on = true; QZ.t = 0; QZ.flash = 1; QZ.x = 0; QZ.tx = 0; QZ.objs = [];
    QZ.bld = []; QZ.bz = 0; for (let z = 1.2; z < 40; z += 0) z += quizSpawnBuildingRow(z);
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

// ---------- проекция: точка схода по центру, камера за спиной совы ----------
const QZ_ZO = 2.2;     // на какой глубине летит сова
function qzF() { return height * 0.9; }
function qzVP() { return { x: width / 2, y: height * 0.4 }; }
function qzXmax() { return width * 0.4 * QZ_ZO / qzF(); }
function qzProj(X, Y, z) { const f = qzF() / z, v = qzVP(); return { x: v.x + X * f, y: v.y + Y * f, s: f }; }
const QZ_OWL_Y = 0.78, QZ_GROUND = 1.3;
const QZ_LETTERS = ['A', 'B', 'C', 'D'];
const QZ_BALL_COL = { A: '#FE7600', B: '#A855F7', C: '#38BDF8', D: '#F43F5E' };

// ---------- логика ----------
function quizUpdate() {
    const dt = dtMult; QZ.t += dt;
    // сова сама «тапает»: короткий подскок и взмах, потом плавно опускается
    QZ.hv = (QZ.hv || 0) + 0.24 * dt; QZ.hy = (QZ.hy || 0) + QZ.hv * dt;
    if (QZ.hy >= 0) { QZ.hy = 0; QZ.hv = -2.7; QZ.wing = 1; }
    QZ.wing = Math.max(0, (QZ.wing || 0) - 0.06 * dt);
    if (QZ.flash > 0) QZ.flash = Math.max(0, QZ.flash - 0.03 * dt);
    // управление: к пальцу / клавишами
    const XM = qzXmax();
    if (QZ.keyL) QZ.tx -= 0.06 * dt * XM;
    if (QZ.keyR) QZ.tx += 0.06 * dt * XM;
    QZ.tx = Math.max(-XM, Math.min(XM, QZ.tx));
    QZ.x += (QZ.tx - QZ.x) * Math.min(1, 0.14 * dt);
    const reading = QZ.phase === 'read';
    const vz = reading ? 0 : 0.11;
    if (!reading) {
        QZ.grid = (QZ.grid + vz * dt) % 2;
        for (let i = QZ.bld.length - 1; i >= 0; i--) { const b = QZ.bld[i]; b.z -= vz * dt; if (b.z + b.d < 0.5) QZ.bld.splice(i, 1); }
        QZ.bz -= vz * dt; while (QZ.bz <= 0) QZ.bz += quizSpawnBuildingRow(40);
    }
    // фаза вопросов
    QZ.phaseT -= dt;
    if (QZ.phase === 'fly' && QZ.phaseT <= 0) {
        if (QZ.qi + 1 < QZ.qList.length) {
            QZ.qi++; QZ.q = QZ.qList[QZ.qi]; QZ.phase = 'read'; QZ.phaseT = QUIZ_READ_SEC * 60; QZ.picked = null; QZ.result = null;
            quizMarkSeen(QZ.q.id); quizShowQuestion();
            try { AudioFX.playStarCollect(); } catch (e) {}
        } else if (!QZ.exiting) {
            QZ.exiting = true; QZ.objs.push({ k: 'exit', X: 0, Y: QZ_OWL_Y - 0.15, z: 24 });
        }
    } else if (QZ.phase === 'read' && QZ.phaseT <= 0) {
        QZ.phase = 'answer'; QZ.phaseT = QUIZ_FLY_SEC * 60;
        const zs = 26, v = (zs - QZ_ZO) / (QUIZ_FLY_SEC * 60);
        const Ls = QZ_LETTERS.filter(L => QZ.q.options[L] !== undefined), gap = Ls.length > 1 ? XM * 1.8 / (Ls.length - 1) : XM;
        QZ.ballR = Math.min(0.13, gap * 0.38);   // шары не слипаются: радиус меньше половины шага
        QZ.balls = Ls.map((L, i, arr) => ({ k: 'ball', L, X: (arr.length === 1 ? 0 : (i / (arr.length - 1) * 2 - 1)) * XM * 0.9, Y: QZ_OWL_Y - 0.05, z: zs, v, st: 0 }));
        QZ.objs.push(...QZ.balls);
    } else if (QZ.phase === 'result' && QZ.phaseT <= 0) {
        quizHideQuestion(); QZ.phase = 'fly'; QZ.phaseT = 150; QZ.balls = null;
    }
    quizUiTick();
    // по бокам — ряды труб, на пути — бонусные напитки
    if (!reading) {
        if (QZ.phase === 'fly' && !QZ.exiting) {
            QZ.spawnT -= dt;
            if (QZ.spawnT <= 0) {
                QZ.spawnT = 55 + Math.random() * 50;
                const kinds = ['beer', 'cocktail', 'icecream', 'feather'];
                QZ.objs.push({ k: 'item', t: kinds[Math.floor(Math.random() * kinds.length)], X: (Math.random() * 2 - 1) * XM * 0.85, Y: QZ_OWL_Y - 0.1, z: 30 });
            }
        }
    }
    for (let i = QZ.objs.length - 1; i >= 0; i--) {
        const o = QZ.objs[i];
        if (!reading) o.z -= (o.v || vz) * dt;
        if (o.k === 'ball' && o.st) { o.z -= 0.02 * dt; o.st += dt; }
        // долетело до совы
        if (o.z <= QZ_ZO + 0.05 && !o.hit) {
            o.hit = true;
            if (o.k === 'item' && Math.abs(o.X - QZ.x) < XM * 0.28) { quizCollect(o); QZ.objs.splice(i, 1); continue; }
            if (o.k === 'ball' && QZ.phase === 'answer') quizAnswer();
            if (o.k === 'exit') { quizExit(); return; }
        }
        if (o.z < 0.6) QZ.objs.splice(i, 1);
    }
}
function quizCollect(o) {
    const add = { beer: 10, cocktail: 15, icecream: 20, feather: 30 }[o.t] || 10;
    stamina = Math.min(maxStamina, stamina + add);
    try { updateStaminaHUD(); AudioFX.playStarCollect(); Haptics.collectTheme(); } catch (e) {}
    QZ.toast = { txt: `+${add}% сил`, t: 70, col: '#00F0FF' };
}
function quizAnswer() {
    // выбран шар, напротив которого сова (ближайший по горизонтали)
    let best = null, bd = 1e9;
    for (const b of QZ.balls) { const d = Math.abs(b.X - QZ.x); if (d < bd) { bd = d; best = b; } }
    QZ.picked = best.L; const ok = best.L === QZ.q.correct; QZ.result = ok;
    QZ.nDone++; if (ok) QZ.nOk++; else QZ.nBad++; quizScore();
    for (const b of QZ.balls) b.st = b.L === best.L ? 1 : 0;
    best.res = ok ? 'ok' : 'bad';
    if (!ok) { const c = QZ.balls.find(b => b.L === QZ.q.correct); if (c) c.res = 'right'; }
    if (ok) { stamina = Math.min(maxStamina, stamina + 25); try { updateStaminaHUD(); AudioFX.playThemeCollect(); Haptics.collectTheme(); } catch (e) {} QZ.toast = { txt: 'Верно! +25% сил', t: 90, col: '#22C55E' }; }
    else { try { (AudioFX.playThemeLose || AudioFX.playStarCollect).call(AudioFX); Haptics.hit(); } catch (e) {} QZ.toast = { txt: 'Неверно', t: 90, col: '#EF4444' }; }
    quizShowResult();
    QZ.phase = 'result'; QZ.phaseT = 100;
}

// ---------- отрисовка ----------
function quizDraw() {
    ctx.setTransform(viewScale * renderScale * WORLD_K, 0, 0, viewScale * renderScale * WORLD_K, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = stormSkyGrad(); ctx.fillRect(0, 0, width, height);
    // звёзды
    ctx.fillStyle = '#FFFFFF';
    for (const st of stars) { ctx.globalAlpha = st.alpha * 0.9; ctx.fillRect(st.x, st.y * 0.6, st.size, st.size); }
    ctx.globalAlpha = 1;
    try { drawMoon(); } catch (e) {}
    const v = qzVP(), F = qzF();
    // горизонт: сиреневое свечение
    const hz = ctx.createLinearGradient(0, v.y - 60, 0, v.y + 30);
    hz.addColorStop(0, 'rgba(168, 85, 247, 0)'); hz.addColorStop(0.7, 'rgba(168, 85, 247, 0.35)'); hz.addColorStop(1, 'rgba(254, 118, 0, 0.25)');
    ctx.fillStyle = hz; ctx.fillRect(0, v.y - 60, width, 90);
    try { drawClouds(); } catch (e) {}
    quizDrawCity(v);
    // улица внизу: тёмная, с мягкой разметкой, бегущей навстречу
    const floor = ctx.createLinearGradient(0, v.y, 0, height);
    floor.addColorStop(0, '#1c0a3a'); floor.addColorStop(1, '#0a0218');
    ctx.fillStyle = floor; ctx.fillRect(0, v.y, width, height - v.y);
    ctx.fillStyle = 'rgba(255, 190, 110, 0.22)';
    for (let z = 3 - QZ.grid * 1.5; z < 40; z += 3) {
        if (z < 0.8) continue;
        const a = qzProj(-0.05, QZ_GROUND, z), b = qzProj(0.05, QZ_GROUND, z + 1.2);
        ctx.fillRect(a.x, b.y, Math.max(0.5, b.x - a.x), Math.max(0.5, a.y - b.y));
    }
    quizDrawBuildings();
    // объекты — от дальних к ближним
    const list = QZ.objs.slice().sort((a, b) => b.z - a.z);
    let owlDrawn = false;
    for (const o of list) {
        if (!owlDrawn && o.z < QZ_ZO) { quizDrawOwl(); owlDrawn = true; }
        quizDrawObj(o);
    }
    if (!owlDrawn) quizDrawOwl();
    quizDrawWarp(v);
    drawParticleList(particles);
    // всплывающая надпись
    if (QZ.toast && QZ.toast.t > 0) {
        QZ.toast.t -= dtMult;
        const p = qzProj(QZ.x, QZ_OWL_Y, QZ_ZO);
        ctx.save(); ctx.globalAlpha = Math.min(1, QZ.toast.t / 20); ctx.font = '900 18px Onest, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = QZ.toast.col; ctx.shadowColor = QZ.toast.col; ctx.shadowBlur = 10;
        ctx.fillText(QZ.toast.txt, p.x, p.y - 60 - (70 - QZ.toast.t) * 0.4); ctx.restore();
    }
    if (QZ.flash > 0) { ctx.fillStyle = `rgba(230, 210, 255, ${QZ.flash * 0.85})`; ctx.fillRect(0, 0, width, height); }
}
function quizDrawObj(o) {
    if (o.z <= 0.6) return;
    const fade = Math.min(1, (30 - o.z) / 6);
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    if (o.k === 'pipe') {
        const a = qzProj(o.X, -4, o.z), b = qzProj(o.X, QZ_GROUND, o.z), w = 0.55 * a.s;
        const g = ctx.createLinearGradient(a.x - w / 2, 0, a.x + w / 2, 0);
        g.addColorStop(0, '#260647'); g.addColorStop(0.55, '#7a22d6'); g.addColorStop(0.75, '#9534ed'); g.addColorStop(1, '#1c0333');
        ctx.fillStyle = g; ctx.fillRect(a.x - w / 2, a.y, w, b.y - a.y);
        const cy = qzProj(o.X, QZ_OWL_Y - 1.2, o.z).y, ch = 0.16 * a.s;
        ctx.fillStyle = '#f36500'; ctx.fillRect(a.x - w * 0.6, cy - ch / 2, w * 1.2, ch);
    } else if (o.k === 'item') {
        const p = qzProj(o.X, o.Y, o.z), r = 0.16 * p.s;
        const col = { beer: '#FACC15', cocktail: '#2DD4BF', icecream: '#B5E4FF', feather: '#00F0FF' }[o.t];
        const ic = { beer: '', cocktail: '', icecream: '', feather: '' }[o.t];
        ctx.fillStyle = 'rgba(20, 3, 38, 0.85)'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = col; ctx.font = `900 ${Math.max(6, r * 1.05)}px "Font Awesome 6 Free"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ic, p.x, p.y + r * 0.04);
    } else if (o.k === 'ball') {
        const p = qzProj(o.X, o.Y, o.z), r = (QZ.ballR || 0.12) * p.s;
        const base = o.res === 'ok' || o.res === 'right' ? '#22C55E' : o.res === 'bad' ? '#EF4444' : QZ_BALL_COL[o.L];
        const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, base); g.addColorStop(1, 'rgba(10, 2, 25, 0.9)');
        ctx.shadowColor = base; ctx.shadowBlur = o.res ? 26 : 14;
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${Math.max(7, r * 0.95)}px Onest, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.L, p.x, p.y + r * 0.05);
    } else if (o.k === 'exit') {
        const p = qzProj(o.X, o.Y, o.z);
        drawQuizPortal(p.x, p.y, 0.9 * p.s, Math.max(0, fade), 'out');
    }
    ctx.restore();
}
function quizDrawOwl() {
    const p = qzProj(QZ.x, QZ_OWL_Y, QZ_ZO);
    const sh = qzProj(QZ.x, QZ_GROUND, QZ_ZO), hy = QZ.hy || 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 + hy * 0.008})`; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 22 + hy * 0.2, 6, 0, 0, Math.PI * 2); ctx.fill();
    const tilt = Math.max(-0.35, Math.min(0.35, (QZ.tx - QZ.x) * 1.2));
    quizOwlBack(p.x, p.y + hy, 1.7, QZ.wing || 0, tilt);
}
// Сова со спины (как на референсе): круглое фиолетовое тело, два ушка-пёрышка, широко раскрытые крылья
// в нашем стиле (фиолетовый градиент, тёмный контур, светлые пёрышки), хвост-веер из трёх перьев, белки глаз по бокам.
function quizOwlBack(x, y, k, wing, tilt) {
    const OUT = '#1D0542';
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // крылья: раскрыты в стороны; при взмахе концы поднимаются, потом опускаются
    for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * 11, -2); ctx.rotate(sd * (0.18 - wing * 0.55));
        // маховые перья — 5 закруглённых «пальцев», веером в сторону (нижние короче)
        for (let f = 4; f >= 0; f--) {
            const len = 27 - f * 2.4, ang = -0.1 + f * 0.27;
            const fx = Math.cos(ang) * len * 0.5, fy = Math.sin(ang) * len * 0.5 + 1;
            const fg = ctx.createLinearGradient(0, 0, sd * len, 0);
            fg.addColorStop(0, '#9A46FF'); fg.addColorStop(0.5, '#7C2CE8'); fg.addColorStop(1, '#5216AC');
            ctx.fillStyle = fg; ctx.strokeStyle = '#20044A'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(sd * fx, fy, len * 0.5, 4.8, sd * ang, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(235, 215, 255, 0.45)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(sd * fx * 0.4, fy * 0.4); ctx.lineTo(sd * (fx + Math.cos(ang) * len * 0.35), fy + Math.sin(ang) * len * 0.35); ctx.stroke();
        }
        // кроющие перья у плеча
        const cg = ctx.createLinearGradient(0, -6, sd * 16, 4);
        cg.addColorStop(0, '#9A46FF'); cg.addColorStop(0.55, '#6F1CDA'); cg.addColorStop(1, '#450F96');
        ctx.fillStyle = cg; ctx.strokeStyle = '#20044A'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.bezierCurveTo(sd * 7, -8, sd * 14, -6, sd * 16, -2); ctx.quadraticCurveTo(sd * 10, 2, 0, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        // светлые крапинки, как на перьях совы
        ctx.fillStyle = 'rgba(235, 215, 255, 0.75)';
        for (let i = 0; i < 6; i++) { const px = sd * (6 + i * 2.2), py = -2.6 + (i % 2) * 2.2 + i * 0.25; ctx.beginPath(); ctx.arc(px, py, 0.75, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }
    // хвост-веер из трёх перьев
    const tg = ctx.createLinearGradient(0, 9, 0, 22);
    tg.addColorStop(0, '#782CE9'); tg.addColorStop(0.55, '#5216BD'); tg.addColorStop(1, '#2B0762');
    ctx.fillStyle = tg; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    for (const a2 of [-0.45, 0.45, 0]) { ctx.save(); ctx.translate(0, 10); ctx.rotate(a2); ctx.beginPath(); ctx.ellipse(0, 5.5, 4, 5.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // белки глаз, выглядывающие по бокам головы
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 12.6, -6.5, 3.4, 4.6, sd * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // тело — круглое, как у совы сбоку, с ушками-пёрышками
    const bg = ctx.createRadialGradient(-3, -9, 2, -1, -2, 20);
    bg.addColorStop(0, '#9248FB'); bg.addColorStop(0.5, '#6A20D4'); bg.addColorStop(1, '#30066B');
    ctx.fillStyle = bg; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -13.2);
    ctx.lineTo(-9.5, -19); ctx.quadraticCurveTo(-11.5, -14, -10.6, -11.2);   // левое ушко
    ctx.bezierCurveTo(-13.6, -7, -14, -3, -14, 0);
    ctx.bezierCurveTo(-14, 9, -7.5, 14, 0, 14);
    ctx.bezierCurveTo(7.5, 14, 14, 9, 14, 0);
    ctx.bezierCurveTo(14, -3, 13.6, -7, 10.6, -11.2);
    ctx.quadraticCurveTo(11.5, -14, 9.5, -19); ctx.lineTo(6, -13.2);   // правое ушко
    ctx.quadraticCurveTo(0, -15.6, -6, -13.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // мягкий блик на макушке и лёгкая тень снизу — объём шара
    ctx.strokeStyle = 'rgba(235, 215, 255, 0.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(-1, -3, 10, 1.15 * Math.PI, 1.45 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(20, 3, 45, 0.25)'; ctx.beginPath(); ctx.ellipse(0, 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ---------- наш город в 3D: дома по обе стороны «улицы», мы летим между ними ----------
// дом — коробка: X — центр, w — ширина, d — глубина, h — высота над землёй, z — ближняя грань; окна запоминаются (какие горят)
function quizSpawnBuildingRow(z) {
    const XM = qzXmax(), gap = 1.6 + Math.random() * 1.8;
    for (const sd of [-1, 1]) {
        if (Math.random() < 0.12) continue;   // иногда просвет между домами
        const w = 1.1 + Math.random() * 1.4, d = 1.2 + Math.random() * 1.6, h = 2.4 + Math.random() * 5.5;
        const X = sd * (XM + 0.55 + w / 2 + Math.random() * 0.35);
        const cols = Math.max(2, Math.round(w / 0.32)), rows = Math.max(3, Math.round(h / 0.42)), dcols = Math.max(2, Math.round(d / 0.36));
        const lit = []; for (let i = 0; i < (cols + dcols) * rows; i++) lit.push(Math.random() < 0.32 ? (Math.random() < 0.8 ? 1 : 2) : 0);
        const tone = Math.random();
        QZ.bld.push({ X, w, d, h, z: z + Math.random() * 0.6, sd, cols, rows, dcols, lit, tone });
        // второй ряд — дальше от улицы, выше
        if (Math.random() < 0.6) {
            const w2 = 1.3 + Math.random() * 1.6, h2 = 4 + Math.random() * 6;
            QZ.bld.push({ X: X + sd * (w / 2 + w2 / 2 + 0.6), w: w2, d: 1.5 + Math.random() * 1.5, h: h2, z: z + 0.8 + Math.random(), sd, cols: Math.max(2, Math.round(w2 / 0.34)), rows: Math.max(3, Math.round(h2 / 0.45)), dcols: 2, lit: Array.from({ length: 200 }, () => Math.random() < 0.28 ? 1 : 0), tone: Math.random(), back: true });
        }
    }
    return gap;
}
function quizDrawBuildings() {
    const list = QZ.bld.slice().sort((a, b) => (b.z + b.d * 0.5) - (a.z + a.d * 0.5));
    const G = QZ_GROUND;
    const quad = (p1, p2, p3, p4) => { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); };
    for (const b of list) {
        const z0 = Math.max(0.55, b.z), z1 = b.z + b.d; if (z1 <= 0.55) continue;
        const far = Math.min(1, Math.max(0, (36 - b.z) / 8));   // дальние — проявляются из дымки
        const top = G - b.h, xi = b.X - b.sd * b.w / 2, xo = b.X + b.sd * b.w / 2;   // xi — грань, что смотрит на улицу
        const base = b.back ? [30, 12, 62] : [38 + b.tone * 10, 16 + b.tone * 6, 76 + b.tone * 14];
        ctx.globalAlpha = far;
        // боковая грань, обращённая к улице: левые дома освещены луной чуть сильнее
        const s1 = qzProj(xi, top, z0), s2 = qzProj(xi, G, z0), s3 = qzProj(xi, G, z1), s4 = qzProj(xi, top, z1);
        const sideK = b.sd < 0 ? 1.25 : 0.8;
        ctx.fillStyle = `rgb(${Math.round(base[0] * sideK)}, ${Math.round(base[1] * sideK)}, ${Math.round(base[2] * sideK)})`;
        quad(s1, s2, s3, s4); ctx.fill();
        // окна на боковой грани
        for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.dcols; c++) {
            const L = b.lit[(b.cols + c) * b.rows + r] || 0; if (!L) continue;
            const u0 = (c + 0.25) / b.dcols, u1 = (c + 0.75) / b.dcols, zz0 = b.z + b.d * u0, zz1 = b.z + b.d * u1; if (zz0 < 0.55) continue;
            const y0 = top + (r + 0.25) / b.rows * b.h, y1 = top + (r + 0.7) / b.rows * b.h;
            ctx.fillStyle = L === 1 ? 'rgba(255, 186, 92, 0.9)' : 'rgba(205, 165, 255, 0.85)';
            quad(qzProj(xi, y0, zz0), qzProj(xi, y1, zz0), qzProj(xi, y1, zz1), qzProj(xi, y0, zz1)); ctx.fill();
        }
        // передняя грань (если дом ещё впереди)
        if (b.z > 0.55) {
            const f1 = qzProj(Math.min(xi, xo), top, b.z), f2 = qzProj(Math.max(xi, xo), G, b.z);
            ctx.fillStyle = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
            ctx.fillRect(f1.x, f1.y, f2.x - f1.x, f2.y - f1.y);
            // кромка крыши и свет луны по краю
            ctx.fillStyle = 'rgba(200, 160, 255, 0.25)'; ctx.fillRect(f1.x, f1.y, f2.x - f1.x, Math.max(0.6, (f2.y - f1.y) * 0.012));
            const cw = (f2.x - f1.x) / b.cols, rh = (f2.y - f1.y) / b.rows;
            if (cw > 1.2 && rh > 1.2) for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
                const L = b.lit[c * b.rows + r]; if (!L) continue;
                ctx.fillStyle = L === 1 ? 'rgba(255, 186, 92, 0.92)' : 'rgba(205, 165, 255, 0.85)';
                ctx.fillRect(f1.x + (c + 0.28) * cw, f1.y + (r + 0.25) * rh, cw * 0.44, rh * 0.45);
            }
        }
    }
    ctx.globalAlpha = 1;
}
// далёкий город на горизонте — силуэты домов с горящими окнами (рисуются один раз), чуть сдвигаются при повороте
let __qzCity = null, __qzCityKey = '';
function quizDrawCity(v) {
    const key = Math.round(width) + 'x' + Math.round(height);
    if (__qzCityKey !== key) {
        __qzCityKey = key; const W = Math.round(width * 1.6), H = Math.round(height * 0.16), S = 2;
        __qzCity = document.createElement('canvas'); __qzCity.width = W * S; __qzCity.height = H * S;
        const g = __qzCity.getContext('2d'); g.scale(S, S);
        for (let layer = 0; layer < 2; layer++) {
            let x = 0;
            while (x < W) {
                const bw = 10 + Math.random() * 22, bh = H * (layer ? 0.35 + Math.random() * 0.55 : 0.25 + Math.random() * 0.4);
                g.fillStyle = layer ? '#170634' : '#220a47'; g.fillRect(x, H - bh, bw, bh);
                if (layer) for (let wy = H - bh + 3; wy < H - 2; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3.5) if (Math.random() < 0.28) { g.fillStyle = Math.random() < 0.7 ? 'rgba(255, 190, 90, 0.85)' : 'rgba(200, 160, 255, 0.8)'; g.fillRect(wx, wy, 1.4, 1.6); }
                x += bw + (layer ? 1 : 3);
            }
        }
    }
    const cw = width * 1.6, ch = height * 0.16, off = -QZ.x * 18;
    ctx.drawImage(__qzCity, (width - cw) / 2 + off, v.y - ch + 2, cw, ch);
}
// «звёздный тоннель»: искорки вылетают из точки схода и проносятся мимо — видно, что летим вперёд
function quizDrawWarp(v) {
    const W = QZ.warp || (QZ.warp = []);
    const moving = QZ.phase !== 'read';
    if (moving && W.length < 18 && Math.random() < 0.25 * dtMult) { const an = Math.random() * Math.PI * 2; W.push({ an, d: 4 + Math.random() * 10, v: 1.02 + Math.random() * 0.025 }); }
    ctx.save(); ctx.lineCap = 'round';
    for (let i = W.length - 1; i >= 0; i--) {
        const w = W[i]; const d0 = w.d;
        if (moving) w.d *= Math.pow(w.v, dtMult);
        if (w.d > Math.max(width, height)) { W.splice(i, 1); continue; }
        const a = Math.min(1, w.d / 80);
        ctx.strokeStyle = `rgba(220, 200, 255, ${0.55 * a})`; ctx.lineWidth = 0.6 + w.d / 220;
        ctx.beginPath(); ctx.moveTo(v.x + Math.cos(w.an) * d0 * 0.92, v.y + Math.sin(w.an) * d0 * 0.6 * 0.92); ctx.lineTo(v.x + Math.cos(w.an) * w.d, v.y + Math.sin(w.an) * w.d * 0.6); ctx.stroke();
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
            + '#qzHint .qh-row .fa-chevron-left{animation:qzArrL 1.6s ease-in-out infinite}#qzHint .qh-row .fa-chevron-right{animation:qzArrR 1.6s ease-in-out infinite}'
            + '@keyframes qzSwipe{0%,100%{transform:translateX(-22px) rotate(-8deg)}50%{transform:translateX(22px) rotate(8deg)}}@keyframes qzArrL{0%,100%{opacity:1}50%{opacity:.3}}@keyframes qzArrR{0%,100%{opacity:.3}50%{opacity:1}}';
        document.head.appendChild(st);
        qzEl = { card: document.createElement('div'), count: document.createElement('div'), hint: document.createElement('div'), score: document.createElement('div') };
        qzEl.card.id = 'qzCard'; qzEl.count.id = 'qzCount'; qzEl.hint.id = 'qzHint'; qzEl.score.id = 'qzScore';
        container.appendChild(qzEl.score);
        qzEl.hint.innerHTML = '<div class="qh-row"><i class="fa-solid fa-chevron-left"></i><i class="fa-solid fa-hand-pointer qh-hand"></i><i class="fa-solid fa-chevron-right"></i></div><div>Веди сову влево-вправо</div>';
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
function quizPointer(e) {
    if (!QZ.on) return;
    const r = canvas.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
    QZ.tx = (fx * 2 - 1) * qzXmax() * 1.15;
    quizMoved();
}
// игрок начал рулить — подсказка плавно исчезает (как «Тапни, чтобы начать»)
function quizMoved() { if (QZ.moved) return; QZ.moved = true; if (qzEl) qzEl.hint.classList.add('off'); }
container.addEventListener('pointerdown', (e) => { if (!QZ.on) return; QZ.drag = true; quizPointer(e); }, true);
container.addEventListener('pointermove', (e) => { if (QZ.on && (QZ.drag || e.pointerType === 'mouse')) quizPointer(e); }, true);
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => container.addEventListener(ev, () => { QZ.drag = false; }, true));
window.addEventListener('keydown', (e) => {
    if (!QZ.on) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { QZ.keyL = true; e.preventDefault(); quizMoved(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { QZ.keyR = true; e.preventDefault(); quizMoved(); }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') QZ.keyL = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') QZ.keyR = false;
});

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
