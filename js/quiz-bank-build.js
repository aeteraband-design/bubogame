// ===== СБОРКА БАЗЫ ВОПРОСОВ: подключается после всех файлов quiz-bank*.js =====
// ---------- сборка общей базы ----------
function qzHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 100000 + (Math.abs(h) % 899999999); }
(function () {
    const L = ['A', 'B', 'C', 'D'], seenIds = {};
    Object.keys(QZ_BANK).forEach((t) => {
        QZ_BANK[t].forEach((r) => {
            const [lv, q, ok, w1, w2, w3] = r, opts = {}, arr = [ok, w1, w2, w3];
            arr.forEach((v, i) => { opts[L[i]] = v; });
            const id = qzHash(t + '|' + q);
            if (seenIds[id]) return;   // одинаковый вопрос дважды не добавляем
            seenIds[id] = 1;
            QUIZ_QUESTIONS.push({ id, theme: t, lvl: lv, question: q, options: opts, correct: 'A' });
        });
    });
})();

// ---------- старые вопросы (из quiz.js): раскладываем по темам и уровням; повторы с новой базой убираем ----------
(function () {
    const MAP = { 'Еда': 'food', 'Кино': 'kino', 'Сериалы': 'series', 'Игры': 'games', 'Музыка': 'music', 'Мультики': 'cartoons', 'История': 'history',
        'Литература': 'lit', 'Слова': 'lit', 'Искусство': 'art', 'География': 'geo', 'Наука': 'nature', 'Обо всём': 'misc' };
    const DROP = [101, 116, 131, 135, 136, 139];   // такие же вопросы есть в новой базе
    for (let i = QUIZ_QUESTIONS.length - 1; i >= 0; i--) if (DROP.indexOf(QUIZ_QUESTIONS[i].id) >= 0) QUIZ_QUESTIONS.splice(i, 1);
    QUIZ_QUESTIONS.forEach((q) => {
        if (q.theme) return;
        q.theme = q.id === 170 || q.id === 115 ? 'space' : q.id === 113 ? 'chem' : q.id === 114 ? 'geo' : (MAP[q.cat] || 'misc');
        q.lvl = q.diff === 'e' ? 's' : q.diff === 'h' ? 'm' : 'l';   // старые diff: лёгкий → суперлайт, средний → лайт, сложный → средне
    });
})();
