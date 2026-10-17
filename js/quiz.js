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
const QUIZ_PORTAL_STEP = 0.10;      // портал — на каждых 10% собранных тем
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
    const m = Math.floor(have / need / QUIZ_PORTAL_STEP + 1e-9);
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
    const P = QZ.portal; if (!P) return;
    const p = P.pipe;
    if (pipes.indexOf(p) < 0) { QZ.portal = null; QZ.pending = true; return; }
    const top = p.top + sq, bot = height - (p.bottom + sq);
    P.x = p.x + p.width / 2; P.y = (top + bot) / 2; P.r = Math.min(46, (bot - top) * 0.36);
    if (!gameActive) return;
    if (owl.x > P.x - 6 && owl.x < P.x + 14 && owl.y > top && owl.y < bot) quizEnter();
    else if (P.x < owl.x - 60) { QZ.portal = null; QZ.pending = true; }   // промахнулись (например, разбились) — портал появится у следующей трубы
}
function drawQuizPortal(x, y, r, a) {
    const t = (typeof frame === 'number' ? frame : 0);
    ctx.save(); ctx.globalAlpha = a;
    const gl = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.6);
    gl.addColorStop(0, 'rgba(255, 255, 255, 0.55)'); gl.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)'); gl.addColorStop(0.7, 'rgba(168, 85, 247, 0.25)'); gl.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 1.6, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 4; k++) {
        const pr = r * (0.55 + k * 0.16) * (1 + 0.05 * Math.sin(t * 0.12 + k));
        ctx.strokeStyle = k % 2 ? 'rgba(125, 211, 252, 0.85)' : 'rgba(216, 180, 254, 0.9)';
        ctx.lineWidth = 2.4 - k * 0.4;
        ctx.beginPath(); ctx.ellipse(x, y, pr * 0.62, pr, 0, t * 0.05 * (k % 2 ? -1 : 1) + k, t * 0.05 * (k % 2 ? -1 : 1) + k + Math.PI * 1.5); ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF';
    for (let k = 0; k < 10; k++) {
        const an = t * 0.04 + k * 0.63, rr = r * (0.3 + ((k * 37 + t * 0.6) % 70) / 100);
        ctx.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.1 + k)));
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * rr * 0.6, y + Math.sin(an) * rr, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}
function quizDrawPortal2D() { const P = QZ.portal; if (P && P.r) drawQuizPortal(P.x, P.y, P.r, 1); }

// ---------- вход и выход ----------
function quizEnter() {
    QZ.portal = null; QZ.on = true; QZ.t = 0; QZ.flash = 1; QZ.x = 0; QZ.tx = 0; QZ.objs = [];
    QZ.qList = quizPick(QUIZ_PER_PORTAL); QZ.qi = -1; QZ.q = null; QZ.balls = null; QZ.exiting = false;
    QZ.phase = 'fly'; QZ.phaseT = 150; QZ.spawnT = 40; QZ.colT = 0; QZ.nOk = 0; QZ.nBad = 0; QZ.nDone = 0;
    try { AudioFX.playStarCollect(); Haptics.powerup(); } catch (e) {}
    quizUI(true);
}
function quizExit() {
    QZ.on = false; QZ.flash = 1; QZ.objs = []; quizUI(false);
    // возвращаемся в обычный полёт: впереди расчищаем трубы и даём пару секунд неуязвимости
    pipes = pipes.filter(p => p.x + p.width < owl.x - owl.radius * 2 || p.x > owl.x + 260);
    owl.y = height * 0.45; owl.vy = 0; invulnerableTime = Math.max(invulnerableTime, 120);
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
    if (QZ.flash > 0) QZ.flash = Math.max(0, QZ.flash - 0.03 * dt);
    // управление: к пальцу / клавишами
    const XM = qzXmax();
    if (QZ.keyL) QZ.tx -= 0.06 * dt * XM;
    if (QZ.keyR) QZ.tx += 0.06 * dt * XM;
    QZ.tx = Math.max(-XM, Math.min(XM, QZ.tx));
    QZ.x += (QZ.tx - QZ.x) * Math.min(1, 0.14 * dt);
    const reading = QZ.phase === 'read';
    const vz = reading ? 0 : 0.11;
    if (!reading) QZ.grid = (QZ.grid + vz * dt) % 2;
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
    // пол — светящаяся сетка, бежит на нас
    const gy = (z) => v.y + QZ_GROUND * F / z;
    const floor = ctx.createLinearGradient(0, v.y, 0, height);
    floor.addColorStop(0, '#1a0638'); floor.addColorStop(1, '#090117');
    ctx.fillStyle = floor; ctx.fillRect(0, v.y, width, height - v.y);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let z = 2 - QZ.grid; z < 40; z += 2) { if (z < 0.7) continue; const y = gy(z); ctx.moveTo(0, y); ctx.lineTo(width, y); }
    for (let X = -12; X <= 12; X += 1.2) { const a = qzProj(X, QZ_GROUND, 0.7), b = qzProj(X, QZ_GROUND, 40); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    // объекты — от дальних к ближним
    const list = QZ.objs.slice().sort((a, b) => b.z - a.z);
    let owlDrawn = false;
    for (const o of list) {
        if (!owlDrawn && o.z < QZ_ZO) { quizDrawOwl(); owlDrawn = true; }
        quizDrawObj(o);
    }
    if (!owlDrawn) quizDrawOwl();
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
        drawQuizPortal(p.x, p.y, 0.9 * p.s, Math.max(0, fade));
    }
    ctx.restore();
}
function quizDrawOwl() {
    const p = qzProj(QZ.x, QZ_OWL_Y, QZ_ZO);
    const bob = Math.sin(QZ.t * 0.12) * 4;
    // тень на полу
    const sh = qzProj(QZ.x, QZ_GROUND, QZ_ZO);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
    // взмахи: крылья сами поднимаются и опускаются в ритме покачивания; при повороте сова наклоняется в сторону полёта
    const wing = 0.5 + 0.5 * Math.sin(QZ.t * 0.26);
    const tilt = Math.max(-0.35, Math.min(0.35, (QZ.tx - QZ.x) * 1.2));
    quizOwlBack(p.x, p.y + bob, 1.15, wing, tilt);
}
// Сова со спины: круглое тело-«капля» вместе с головой (общий контур), маленькие ушки-пёрышки, узор перьев на спине,
// закруглённые крылья по бокам (машут вверх-вниз), хвостик и оранжевые лапки
function quizOwlBack(x, y, k, wing, tilt) {
    const OUT = '#14052a';
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // крылья — за телом: округлое крыло с тремя «маховыми» зубчиками по краю
    for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * 14, -2); ctx.rotate(sd * (-0.15 + wing * 0.85));
        const wg = ctx.createLinearGradient(0, -8, 0, 10);
        wg.addColorStop(0, '#7c3aed'); wg.addColorStop(1, '#4c1d95');
        ctx.fillStyle = wg; ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.bezierCurveTo(sd * 10, -12, sd * 22, -9, sd * 27, -2);
        ctx.quadraticCurveTo(sd * 27, 3, sd * 23, 3);
        ctx.quadraticCurveTo(sd * 23, 7, sd * 18, 7);
        ctx.quadraticCurveTo(sd * 16, 11, sd * 11, 10);
        ctx.bezierCurveTo(sd * 6, 10, sd * 2, 8, 0, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(196, 161, 255, 0.5)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(sd * 6, -2); ctx.quadraticCurveTo(sd * 14, -5, sd * 22, -2); ctx.stroke();
        ctx.restore();
    }
    // хвостик и лапки
    ctx.fillStyle = '#5b21b6'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-6, 17); ctx.quadraticCurveTo(-7, 25, -3, 26); ctx.quadraticCurveTo(0, 28, 3, 26); ctx.quadraticCurveTo(7, 25, 6, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FE7600';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 7, 21, 3.2, 2.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // общий силуэт тела и головы: сначала толстый тёмный контур обеих фигур, потом заливка — получается один гладкий контур
    const shape = () => {
        ctx.beginPath(); ctx.ellipse(0, 3, 18.5, 18, 0, 0, Math.PI * 2);
        ctx.moveTo(15.5, -14); ctx.ellipse(0, -14, 15.5, 12.5, 0, 0, Math.PI * 2);
        // ушки-пёрышки — короткие и округлые
        ctx.moveTo(-12, -21); ctx.quadraticCurveTo(-15, -30, -10.5, -31); ctx.quadraticCurveTo(-8, -26, -5, -25.5); ctx.closePath();
        ctx.moveTo(12, -21); ctx.quadraticCurveTo(15, -30, 10.5, -31); ctx.quadraticCurveTo(8, -26, 5, -25.5); ctx.closePath();
    };
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; shape(); ctx.stroke();
    const bg = ctx.createRadialGradient(-5, -12, 2, 0, 0, 30);
    bg.addColorStop(0, '#b197fc'); bg.addColorStop(0.45, '#8b5cf6'); bg.addColorStop(1, '#5b21b6');
    ctx.fillStyle = bg; shape(); ctx.fill();
    // перья на спине: ряды мягких дуг, книзу темнее
    for (let r = 0; r < 4; r++) {
        ctx.strokeStyle = `rgba(221, 214, 254, ${0.5 - r * 0.08})`; ctx.lineWidth = 1.2;
        const n = r % 2 ? 3 : 4, w = 5.6;
        for (let c = 0; c < n; c++) {
            const fx = (c - (n - 1) / 2) * w, fy = -4 + r * 5.2;
            ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
        }
    }
    // складка шеи и блик на макушке
    ctx.strokeStyle = 'rgba(20, 5, 42, 0.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -11, 12, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'; ctx.beginPath(); ctx.ellipse(-5, -19, 6, 3.2, -0.3, 0, Math.PI * 2); ctx.fill();
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
            + '#qzHint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 62px);z-index:35;text-align:center;font:700 12px Onest,sans-serif;color:#C4A1FF;pointer-events:none;opacity:.85}';
        document.head.appendChild(st);
        qzEl = { card: document.createElement('div'), count: document.createElement('div'), hint: document.createElement('div'), score: document.createElement('div') };
        qzEl.card.id = 'qzCard'; qzEl.count.id = 'qzCount'; qzEl.hint.id = 'qzHint'; qzEl.score.id = 'qzScore';
        container.appendChild(qzEl.score);
        qzEl.hint.textContent = 'Веди сову пальцем влево-вправо';
        container.appendChild(qzEl.card); container.appendChild(qzEl.count); container.appendChild(qzEl.hint);
    }
    if (!qzEl) return;
    qzEl.hint.style.display = on ? '' : 'none'; qzEl.score.style.display = on ? '' : 'none';
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
}
container.addEventListener('pointerdown', (e) => { if (!QZ.on) return; QZ.drag = true; quizPointer(e); }, true);
container.addEventListener('pointermove', (e) => { if (QZ.on && (QZ.drag || e.pointerType === 'mouse')) quizPointer(e); }, true);
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => container.addEventListener(ev, () => { QZ.drag = false; }, true));
window.addEventListener('keydown', (e) => {
    if (!QZ.on) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { QZ.keyL = true; e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { QZ.keyR = true; e.preventDefault(); }
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
