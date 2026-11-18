// ===== ВОПРОСЫ ДНЯ =====
// Кнопка в главном меню (под рулеткой). В день — 10 вопросов: перед каждым — кнопка «К вопросу», 5 с на чтение, 10 с на ответ
// (таймер — кольцо справа). За верный ответ — монеты по сложности (QZ_LEVELS в quiz-bank.js). Монеты тратятся в лавке (shop.js).
// Выйти можно в любой момент между вопросами; закрыли окно посреди вопроса — он засчитывается как неотвеченный.
// Вопросы не повторяются, пока не пройдена вся база; порядок вариантов перемешивается. Админка, «Вопросы»: список, сброс показанных и дня.

// ---------- база вопросов: добавлять по этому же шаблону (diff: 'e' — лёгкий, 'm' — средний, 'h' — сложный; без diff — по списку ниже) ----------
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
    { id: 116, cat: 'Наука', question: 'Сколько костей в теле взрослого человека?', options: { A: '186', B: '206', C: '226', D: '256' }, correct: 'B' },
    // ----- история -----
    { id: 117, cat: 'История', question: 'В каком году пала Берлинская стена?', options: { A: '1987', B: '1989', C: '1991', D: '1985' }, correct: 'B' },
    { id: 118, cat: 'История', question: 'Кто стал первым императором Рима?', options: { A: 'Юлий Цезарь', B: 'Нерон', C: 'Октавиан Август', D: 'Траян' }, correct: 'C' },
    { id: 119, cat: 'История', question: 'Какое сражение 1812 года подробно описано в «Войне и мире»?', options: { A: 'Полтавская битва', B: 'Ледовое побоище', C: 'Бородинское сражение', D: 'Куликовская битва' }, correct: 'C' },
    { id: 120, cat: 'История', question: 'В каком году был основан Санкт-Петербург?', options: { A: '1703', B: '1721', C: '1689', D: '1712' }, correct: 'A' },
    { id: 121, cat: 'История', question: 'Какая страна подарила США Статую Свободы?', options: { A: 'Великобритания', B: 'Испания', C: 'Италия', D: 'Франция' }, correct: 'D' },
    { id: 122, cat: 'История', question: 'Как звали первую женщину-космонавта?', options: { A: 'Светлана Савицкая', B: 'Валентина Терешкова', C: 'Салли Райд', D: 'Елена Кондакова' }, correct: 'B' },
    { id: 123, cat: 'История', question: 'В каком городе в 1914 году убили эрцгерцога Франца Фердинанда?', options: { A: 'Вена', B: 'Белград', C: 'Сараево', D: 'Будапешт' }, correct: 'C' },
    // ----- литература -----
    { id: 124, cat: 'Литература', question: 'Кто написал роман «Мастер и Маргарита»?', options: { A: 'Борис Пастернак', B: 'Михаил Булгаков', C: 'Владимир Набоков', D: 'Андрей Платонов' }, correct: 'B' },
    { id: 125, cat: 'Литература', question: 'Как звали коня Дон Кихота?', options: { A: 'Буцефал', B: 'Пегас', C: 'Росинант', D: 'Серко' }, correct: 'C' },
    { id: 126, cat: 'Литература', question: 'Кто автор антиутопии «1984»?', options: { A: 'Олдос Хаксли', B: 'Рэй Брэдбери', C: 'Евгений Замятин', D: 'Джордж Оруэлл' }, correct: 'D' },
    { id: 127, cat: 'Литература', question: 'В каком произведении Пушкина есть верный слуга Савельич?', options: { A: '«Капитанская дочка»', B: '«Дубровский»', C: '«Евгений Онегин»', D: '«Пиковая дама»' }, correct: 'A' },
    { id: 128, cat: 'Литература', question: 'Как зовут главного героя «Преступления и наказания»?', options: { A: 'Лев Мышкин', B: 'Родион Раскольников', C: 'Дмитрий Карамазов', D: 'Николай Ставрогин' }, correct: 'B' },
    { id: 129, cat: 'Литература', question: 'Кто написал роман «Сто лет одиночества»?', options: { A: 'Хорхе Луис Борхес', B: 'Хулио Кортасар', C: 'Пабло Неруда', D: 'Габриэль Гарсиа Маркес' }, correct: 'D' },
    { id: 130, cat: 'Литература', question: 'Какой номер у «нехорошей квартиры» в «Мастере и Маргарите»?', options: { A: '13', B: '66', C: '50', D: '7' }, correct: 'C' },
    { id: 131, cat: 'Литература', question: 'Кто написал сказку «Маленький принц»?', options: { A: 'Антуан де Сент-Экзюпери', B: 'Жюль Верн', C: 'Виктор Гюго', D: 'Альбер Камю' }, correct: 'A' },
    { id: 132, cat: 'Литература', question: 'На какой улице жил Шерлок Холмс?', options: { A: 'Даунинг-стрит', B: 'Пикадилли', C: 'Флит-стрит', D: 'Бейкер-стрит' }, correct: 'D' },
    { id: 133, cat: 'Литература', question: 'Кто написал комедию «Горе от ума»?', options: { A: 'Денис Фонвизин', B: 'Александр Грибоедов', C: 'Александр Островский', D: 'Николай Гоголь' }, correct: 'B' },
    { id: 134, cat: 'Литература', question: 'Кому принадлежат строки «Я помню чудное мгновенье»?', options: { A: 'Михаил Лермонтов', B: 'Фёдор Тютчев', C: 'Александр Пушкин', D: 'Сергей Есенин' }, correct: 'C' },
    // ----- искусство -----
    { id: 135, cat: 'Искусство', question: 'Кто написал картину «Звёздная ночь»?', options: { A: 'Клод Моне', B: 'Винсент Ван Гог', C: 'Поль Гоген', D: 'Эдвард Мунк' }, correct: 'B' },
    { id: 136, cat: 'Искусство', question: 'В каком музее хранится «Мона Лиза»?', options: { A: 'Прадо', B: 'Эрмитаж', C: 'Уффици', D: 'Лувр' }, correct: 'D' },
    { id: 137, cat: 'Искусство', question: 'Кто автор картины «Утро в сосновом лесу» (вместе с Савицким)?', options: { A: 'Иван Шишкин', B: 'Исаак Левитан', C: 'Илья Репин', D: 'Архип Куинджи' }, correct: 'A' },
    { id: 138, cat: 'Искусство', question: 'Кто расписал потолок Сикстинской капеллы?', options: { A: 'Рафаэль', B: 'Леонардо да Винчи', C: 'Микеланджело', D: 'Сандро Боттичелли' }, correct: 'C' },
    { id: 139, cat: 'Искусство', question: 'Кто автор «Чёрного квадрата»?', options: { A: 'Василий Кандинский', B: 'Марк Шагал', C: 'Александр Родченко', D: 'Казимир Малевич' }, correct: 'D' },
    { id: 140, cat: 'Искусство', question: 'Кто написал картину «Девятый вал»?', options: { A: 'Василий Суриков', B: 'Иван Айвазовский', C: 'Виктор Васнецов', D: 'Алексей Саврасов' }, correct: 'B' },
    // ----- кино -----
    { id: 141, cat: 'Кино', question: 'Как зовут героя Брюса Уиллиса в «Крепком орешке»?', options: { A: 'Джон Макклейн', B: 'Рик Декард', C: 'Джон Коннор', D: 'Мартин Риггс' }, correct: 'A' },
    { id: 142, cat: 'Кино', question: 'Как зовут героя Юрия Никулина в «Бриллиантовой руке»?', options: { A: 'Геша Козодоев', B: 'Лёлик', C: 'Семён Горбунков', D: 'Михаил Иванович' }, correct: 'C' },
    { id: 143, cat: 'Кино', question: 'Кто снял «Криминальное чтиво»?', options: { A: 'Мартин Скорсезе', B: 'Гай Ричи', C: 'Роберт Родригес', D: 'Квентин Тарантино' }, correct: 'D' },
    { id: 144, cat: 'Кино', question: 'Как называется корабль капитана Джека Воробья?', options: { A: '«Летучий голландец»', B: '«Чёрная жемчужина»', C: '«Месть королевы Анны»', D: '«Разящий»' }, correct: 'B' },
    { id: 145, cat: 'Кино', question: 'Сколько «Оскаров» получил фильм «Титаник»?', options: { A: '7', B: '9', C: '11', D: '14' }, correct: 'C' },
    { id: 146, cat: 'Кино', question: 'Кто сыграл Данилу Багрова в фильме «Брат»?', options: { A: 'Константин Хабенский', B: 'Сергей Бодров', C: 'Виктор Сухоруков', D: 'Владимир Машков' }, correct: 'B' },
    { id: 147, cat: 'Кино', question: 'Как зовут мага, который ведёт Братство Кольца?', options: { A: 'Гэндальф', B: 'Саруман', C: 'Радагаст', D: 'Элронд' }, correct: 'A' },
    { id: 148, cat: 'Кино', question: 'Куда по ошибке улетел Женя Лукашин в «Иронии судьбы»?', options: { A: 'Киев', B: 'Рига', C: 'Минск', D: 'Ленинград' }, correct: 'D' },
    // ----- сериалы -----
    { id: 149, cat: 'Сериалы', question: 'В каком городе живут герои сериала «Друзья»?', options: { A: 'Лос-Анджелес', B: 'Чикаго', C: 'Нью-Йорк', D: 'Бостон' }, correct: 'C' },
    { id: 150, cat: 'Сериалы', question: 'Как называется тёмное измерение в «Очень странных делах»?', options: { A: 'Изнанка', B: 'Тень', C: 'Зазеркалье', D: 'Пустота' }, correct: 'A' },
    { id: 151, cat: 'Сериалы', question: 'Кто сыграл Шерлока в сериале BBC «Шерлок»?', options: { A: 'Мартин Фримен', B: 'Бенедикт Камбербэтч', C: 'Том Хиддлстон', D: 'Мэтт Смит' }, correct: 'B' },
    { id: 152, cat: 'Сериалы', question: 'Какое прозвище у главного героя сериала «Бригада»?', options: { A: 'Космос', B: 'Пчёла', C: 'Фил', D: 'Белый' }, correct: 'D' },
    { id: 153, cat: 'Сериалы', question: 'Кто играл Геральта в первых сезонах «Ведьмака» от Netflix?', options: { A: 'Генри Кавилл', B: 'Крис Хемсворт', C: 'Лиам Хемсворт', D: 'Мадс Миккельсен' }, correct: 'A' },
    // ----- музыка -----
    { id: 154, cat: 'Музыка', question: 'Кто написал музыку к балету «Лебединое озеро»?', options: { A: 'Николай Римский-Корсаков', B: 'Игорь Стравинский', C: 'Пётр Чайковский', D: 'Сергей Прокофьев' }, correct: 'C' },
    { id: 155, cat: 'Музыка', question: 'Кто был лидером группы «Кино»?', options: { A: 'Борис Гребенщиков', B: 'Виктор Цой', C: 'Юрий Шевчук', D: 'Майк Науменко' }, correct: 'B' },
    { id: 156, cat: 'Музыка', question: 'Из какого города группа The Beatles?', options: { A: 'Лондон', B: 'Манчестер', C: 'Бирмингем', D: 'Ливерпуль' }, correct: 'D' },
    { id: 157, cat: 'Музыка', question: 'Кто исполнил хит «Thriller»?', options: { A: 'Майкл Джексон', B: 'Принс', C: 'Стиви Уандер', D: 'Уитни Хьюстон' }, correct: 'A' },
    { id: 158, cat: 'Музыка', question: 'Какая группа исполняет песню «Группа крови»?', options: { A: 'ДДТ', B: 'Алиса', C: 'Кино', D: 'Наутилус Помпилиус' }, correct: 'C' },
    { id: 159, cat: 'Музыка', question: 'Как по-настоящему звали Фредди Меркьюри?', options: { A: 'Ричард Старки', B: 'Фарух Булсара', C: 'Гордон Самнер', D: 'Реджинальд Дуайт' }, correct: 'B' },
    { id: 160, cat: 'Музыка', question: 'Кто написал скрипичные концерты «Времена года»?', options: { A: 'Иоганн Себастьян Бах', B: 'Георг Гендель', C: 'Вольфганг Моцарт', D: 'Антонио Вивальди' }, correct: 'D' },
    { id: 161, cat: 'Музыка', question: 'Какая группа выпустила песню «Smells Like Teen Spirit»?', options: { A: 'Nirvana', B: 'Pearl Jam', C: 'Soundgarden', D: 'Foo Fighters' }, correct: 'A' },
    // ----- слова -----
    { id: 162, cat: 'Слова', question: 'Что изучает орнитология?', options: { A: 'Насекомых', B: 'Рыб', C: 'Птиц', D: 'Змей' }, correct: 'C' },
    { id: 163, cat: 'Слова', question: 'Как называется слово, которое одинаково читается в обе стороны, как «шалаш»?', options: { A: 'Анаграмма', B: 'Палиндром', C: 'Омоним', D: 'Акроним' }, correct: 'B' },
    { id: 164, cat: 'Слова', question: 'Сколько букв в современном русском алфавите?', options: { A: '31', B: '32', C: '33', D: '34' }, correct: 'C' },
    { id: 165, cat: 'Слова', question: 'Что такое оксюморон?', options: { A: 'Повтор одинаковых звуков', B: 'Сильное преувеличение', C: 'Скрытое сравнение', D: 'Сочетание противоположных по смыслу слов' }, correct: 'D' },
    { id: 166, cat: 'Слова', question: 'Какого рода слово «кофе» по литературной норме?', options: { A: 'Мужского', B: 'Среднего', C: 'Женского', D: 'Рода нет' }, correct: 'A' },
    // ----- мир и наука -----
    { id: 167, cat: 'География', question: 'Какая гора самая высокая в Африке?', options: { A: 'Кения', B: 'Килиманджаро', C: 'Тубкаль', D: 'Эльбрус' }, correct: 'B' },
    { id: 168, cat: 'География', question: 'Какой город — столица Австралии?', options: { A: 'Сидней', B: 'Мельбурн', C: 'Канберра', D: 'Перт' }, correct: 'C' },
    { id: 169, cat: 'География', question: 'Сколько часовых поясов в России?', options: { A: '9', B: '10', C: '12', D: '11' }, correct: 'D' },
    { id: 170, cat: 'Наука', question: 'Какая планета Солнечной системы самая большая?', options: { A: 'Юпитер', B: 'Сатурн', C: 'Нептун', D: 'Уран' }, correct: 'A' }
];

// ---------- сложность вопросов: лёгкий — 30 монет, средний — 60, сложный — 100 ----------
const QZ_DIFF = {
    e: [103, 105, 111, 112, 113, 115, 119, 121, 122, 124, 128, 131, 132, 133, 134, 135, 136, 139, 140, 142, 143, 144, 146, 147, 148, 149, 151, 153, 154, 155, 156, 157, 158, 162, 164, 170],
    h: [106, 108, 120, 130, 145, 159, 165, 169, 101, 104, 110, 118, 129]
};
const QZ_DIFF_INFO = { e: { name: 'Легко', coins: 30, col: '#4ADE80' }, m: { name: 'Средне', coins: 60, col: '#FACC15' }, h: { name: 'Сложно', coins: 100, col: '#F87171' } };
QUIZ_QUESTIONS.forEach(q => { if (!q.diff) q.diff = QZ_DIFF.e.includes(q.id) ? 'e' : QZ_DIFF.h.includes(q.id) ? 'h' : 'm'; });

const QUIZ_PER_DAY = 10, QZ_READ = 5, QZ_ANSWER = 10;   // вопросов в день; секунд на чтение и на ответ
const QUIZ_SEEN_KEY = 'bubo_quiz_seen', QUIZ_DAY_KEY = 'bubo_quiz_day10', QUIZ_ATTEMPT_KEY = 'bubo_quiz_attempt_v1';
const QZ_LETTERS = ['A', 'B', 'C', 'D'];
// четыре разных цвета (без зелёного и красного — это «верно»/«неверно»), соседи по сетке не похожи: оранжевый, бирюзовый, синий, розовый; буквы белые
const QZ_BALL_COL = { A: '#FF7A00', B: '#00BFC4', C: '#2F5BFF', D: '#FF4FA3' };
const QZ_BALL_TXT = {};
const qzTxt = (L) => (QZ_BALL_TXT[L] ? `;color:${QZ_BALL_TXT[L]};text-shadow:none` : '');

// старый «квиз-мир» убран: заглушки для мест, которые его вызывали
const QZ = { on: false, phase: '' };
function quizActive() { return false; }
function quizUpdate() {} function quizUpdate2D() {} function quizDraw() {} function quizDrawPortal2D() {}
function quizOnTheme() {} function quizResetProgress() {} function quizAbort() {} function quizUI() {} function quizForcePortal() {}

// ---------- какие вопросы игрок уже видел ----------
function quizSeen() {
    try {
        const seen = JSON.parse(localStorage.getItem(QUIZ_SEEN_KEY));
        return Array.isArray(seen) ? seen : [];
    } catch (e) { return []; }
}
function quizMarkSeen(id) {
    try {
        const seen = quizSeen();
        if (!seen.includes(id)) { seen.push(id); localStorage.setItem(QUIZ_SEEN_KEY, JSON.stringify(seen)); }
        return true;
    } catch (e) { return false; }
}
function quizResetSeen() { try { localStorage.removeItem(QUIZ_SEEN_KEY); } catch (e) {} }
// ---------- темы и уровни (QZ_THEMES, QZ_LEVELS — в quiz-bank.js) ----------
function qzTheme(id) { return (typeof QZ_THEMES !== 'undefined' && QZ_THEMES.find(t => t.id === id)) || { id: 'misc', name: 'Обо всём', icon: 'fa-brain', col: '#4ADE80' }; }
function qzLevel(id) { return (typeof QZ_LEVELS !== 'undefined' && QZ_LEVELS.find(l => l.id === id)) || { id: 'm', name: 'Средне', coins: 100, col: '#FACC15' }; }
function qzLevelsOn() { const on = QZ_LEVELS.filter(l => QUIZ_QUESTIONS.some(q => q.lvl === l.id)); return on.length ? on : QZ_LEVELS.slice(0, 1); }   // уровень без вопросов не показываем
function qzPool(theme) { return QUIZ_QUESTIONS.filter(q => theme === 'all' || q.theme === theme); }
function qzLeft(theme, lvl) { const seen = quizSeen(); return qzPool(theme).filter(q => seen.indexOf(q.id) < 0 && (!lvl || q.lvl === lvl)).length; }
// следующий вопрос: из выбранной темы и выбранной сложности; один и тот же вопрос второй раз не попадается
function quizNextId(day) {
    const seen = quizSeen(), th = day.theme || 'all', lv = day.lvl || 'm';
    const free = qzPool(th).filter(q => seen.indexOf(q.id) < 0 && day.ids.indexOf(q.id) < 0);
    if (!free.length) return 0;
    const f = free.filter(q => q.lvl === lv);   // только выбранной сложности
    return f.length ? f[Math.floor(Math.random() * f.length)].id : 0;
}

// ---------- день: 10 вопросов ----------
// v0.13.55: уровни сдвинулись (лайт → суперлайт, средне → лайт, хард → средне) — переносим сохранённый выбор игрока
(function () { try { if (localStorage.getItem('bubo_quiz_lv5')) return; const M = { s: 's', l: 's', m: 'l', h: 'm' };
    const v = localStorage.getItem('bubo_quiz_lvl'); if (v && M[v]) localStorage.setItem('bubo_quiz_lvl', M[v]);
    const d = JSON.parse(localStorage.getItem(QUIZ_DAY_KEY) || 'null'); if (d && d.lvl && M[d.lvl]) { d.lvl = M[d.lvl]; localStorage.setItem(QUIZ_DAY_KEY, JSON.stringify(d)); }
    localStorage.setItem('bubo_quiz_lv5', '1'); } catch (e) {} })();
function qzToday() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function qzStoredDay() {
    try { return JSON.parse(localStorage.getItem(QUIZ_DAY_KEY)); } catch (e) { return null; }
}
function quizDay(day = qzToday()) {
    let d = qzStoredDay();
    if (!d || d.d !== day || !Array.isArray(d.ids) || !Array.isArray(d.res)) {
        d = { d: day, ids: [], res: [], earned: 0, cur: 0, ord: '', shown: false, theme: '', lvl: '' };
    }
    return d;
}
function quizSaveDay(d) {
    try { localStorage.setItem(QUIZ_DAY_KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
}
function qzReadAttempt() {
    try {
        const a = JSON.parse(localStorage.getItem(QUIZ_ATTEMPT_KEY));
        if (!a) return null;
        if (a.id && a.day && ['daily', 'bonus'].includes(a.mode) && Number.isFinite(a.startedAt)
            && typeof a.ord === 'string' && a.ord.length === 4 && QUIZ_QUESTIONS.some(q => q.id === a.question)) return a;
        if (a.mode === 'bonus' && typeof FlightQuizBonus !== 'undefined') FlightQuizBonus.release?.(a.id);
        qzSaveAttempt(null);
        return null;
    } catch (e) { return null; }
}
function qzSaveAttempt(a) {
    try {
        if (a) localStorage.setItem(QUIZ_ATTEMPT_KEY, JSON.stringify(a));
        else localStorage.removeItem(QUIZ_ATTEMPT_KEY);
        return true;
    } catch (e) { return false; }
}
function quizResetDay() {
    try { localStorage.removeItem(QUIZ_DAY_KEY); } catch (e) {}
    if (qzReadAttempt()?.mode === 'daily') qzSaveAttempt(null);
    quizMenuBadge();
}
function quizDayLeft() { return quizDay().ids.length < QUIZ_PER_DAY; }
function qzShuffleOrd() { const a = QZ_LETTERS.slice(); for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(''); }
function qzCoinsTotal() { return typeof coinsGet === 'function' ? coinsGet() : 0; }

// ---------- окно ----------
(function () {
    try {
        const st = document.createElement('style');
        st.textContent = `
#openQuizBtn.rw-menu-btn{z-index:6;zoom:var(--ui-zoom,1);position:absolute!important;top:12px!important;right:58px!important;left:auto!important;width:36px!important;height:36px!important;border-radius:12px!important;font-size:13px!important;color:#E9D5FF!important;background-color:rgba(29,9,54,.72)!important;border:1px solid rgba(120,44,233,.6)!important;box-shadow:0 6px 14px rgba(0,0,0,.3)!important}
#openQuizBtn.rw-menu-btn.has-q{color:#38BDF8!important;border-color:#38BDF8!important;box-shadow:0 0 12px rgba(56,189,248,.5)!important}
#openQuizBtn .rw-badge{top:-4px!important;right:-4px!important;left:auto!important;transform:none!important;min-width:0!important;width:10px!important;height:10px!important;padding:0!important;background:#38BDF8;border:1.5px solid #1d0936;font-size:0}
#quizModal{position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(20,3,38,.25);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
#quizModal.hidden{display:none}
#qzWin{position:relative;width:100%;max-width:360px;max-height:100%;overflow-y:auto;border-radius:28px;padding:22px 18px 22px;font-family:Onest,sans-serif;color:#fff;
 background:radial-gradient(120% 60% at 50% -10%,rgba(56,189,248,.16),transparent 60%),radial-gradient(90% 50% at 100% 110%,rgba(254,118,0,.12),transparent 60%),rgba(29,9,54,.97);border:1px solid rgba(120,44,233,.6);box-shadow:0 10px 40px rgba(0,0,0,.5)}
#qzBody{display:flex;flex-direction:column;gap:16px}
#qzWin .qz-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#C4A1FF;background:rgba(120,44,233,.18);border:1px solid rgba(120,44,233,.4);font-size:13px;cursor:pointer;z-index:2}
#qzWin .qz-top{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:-4px}
#qzWin .qz-emb2{position:relative;width:106px;height:106px;display:flex;align-items:center;justify-content:center}
#qzWin .qz-glow{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,rgba(56,189,248,.28),rgba(168,85,247,.12) 55%,transparent 72%);animation:qzPulse 3.2s ease-in-out infinite}
@property --qzA{syntax:'<angle>';inherits:false;initial-value:0deg}
#qzWin .qz-ring{position:absolute;inset:6px;border-radius:50%;padding:1.5px;background:conic-gradient(from var(--qzA),rgba(56,189,248,0) 0deg,#7DD3FC 70deg,#C4A1FF 140deg,rgba(168,85,247,0) 200deg,rgba(56,189,248,0) 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:qzRing 3.6s linear infinite}
#qzWin .qz-core{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#qzWin .qz-core i{font-size:44px;background:linear-gradient(110deg,#7DD3FC 0%,#E0F2FE 22%,#7DD3FC 40%,#C4A1FF 60%,#7DD3FC 80%,#E0F2FE 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 6px rgba(56,189,248,.45));animation:qzFlow 4.5s linear infinite}
#qzWin .qz-tw{position:absolute;font-style:normal;font-size:var(--s);color:#E0F2FE;text-shadow:0 0 8px #38BDF8;animation:qzTw 2.4s ease-in-out infinite;animation-delay:var(--d)}
@keyframes qzRing{to{--qzA:360deg}}
@keyframes qzFlow{to{background-position:-250% 0}}
@keyframes qzPulse{0%,100%{opacity:.6;transform:scale(.95)}50%{opacity:1;transform:scale(1.06)}}
@keyframes qzTw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.1)}}
#qzWin .qz-title2{text-align:center}
#qzWin .qz-title2 b{display:block;font-weight:900;font-size:22px;letter-spacing:.02em;line-height:1;background:linear-gradient(90deg,#7DD3FC,#E0F2FE 45%,#C4A1FF);-webkit-background-clip:text;background-clip:text;color:transparent}
#qzWin .qz-title2 span{display:block;margin-top:6px;font-weight:600;font-size:11.5px;color:#C4B5FD}
#qzWin .qz-head{display:flex;align-items:center;gap:12px;padding-right:38px}
#qzWin .qz-emb{flex:0 0 54px;width:54px;height:54px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:24px;background:linear-gradient(135deg,#FE7600,#782CE9);border:1px solid rgba(255,255,255,.3);box-shadow:0 0 16px rgba(254,118,0,.45)}
#qzWin .qz-title{font-weight:900;font-size:18px;letter-spacing:-.01em;line-height:1}
#qzWin .qz-sub{font-weight:600;font-size:11.5px;color:#C4B5FD;margin-top:5px;line-height:1.35}
#qzWin .qz-prog{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:14px;background:rgba(20,3,38,.7);border:1px solid rgba(120,44,233,.3)}
#qzWin .qz-dots{display:flex;gap:5px}
#qzWin .qz-dot{width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;background:rgba(255,255,255,.06);border:1.5px solid rgba(196,161,255,.3);color:transparent;transition:all .25s}
#qzWin .qz-dot.cur{border-color:#FE7600;box-shadow:0 0 7px rgba(254,118,0,.6)}
#qzWin .qz-dot.ok{background:#22C55E;border-color:#86EFAC;color:#fff}
#qzWin .qz-dot.bad{background:#EF4444;border-color:#FCA5A5;color:#fff}
#qzWin .qz-cnt{display:flex;align-items:center;gap:5px;font-weight:900;font-size:12px;color:#FFD66B;white-space:nowrap}
#qzWin .qz-cnl{font-weight:700;font-size:9.5px;color:rgba(237,229,248,.55);text-transform:uppercase;letter-spacing:.04em}
.qz-coin{display:inline-block;flex:0 0 auto;font-size:14px;line-height:1;background:linear-gradient(160deg,#FFF3B0 0%,#FFC53D 45%,#E08A00 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 4px rgba(255,197,61,.55))}
#qzWin .qz-card{position:relative;padding:12px;border-radius:20px;background:linear-gradient(180deg,color-mix(in srgb,var(--tc,#782CE9) 20%,transparent),color-mix(in srgb,var(--tc,#782CE9) 7%,transparent));border:1px solid color-mix(in srgb,var(--tc,#A878F5) 45%,transparent);display:flex;flex-direction:column;gap:12px}
#qzWin .qz-meta{display:flex;align-items:center;gap:7px;min-height:0;padding-right:40px}
#qzWin .qz-chip{font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:8px;background:rgba(56,189,248,.16);color:#7DD3FC;border:1px solid rgba(56,189,248,.35)}
#qzWin .qz-sep{width:4px;height:4px;border-radius:50%;background:rgba(196,161,255,.55)}
#qzWin .qz-diff{font-weight:900;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em}
#qzWin .qz-tm{position:absolute;top:8px;right:8px;width:36px;height:36px;flex:0 0 36px}
#qzWin .qz-tm svg{position:absolute;inset:0;transform:rotate(-90deg)}
#qzWin .qz-tm circle{fill:none;stroke-width:3.2;stroke-linecap:round}
#qzWin .qz-tm .bg{stroke:rgba(196,161,255,.18)}
#qzWin .qz-tm .fg{stroke:#38BDF8;transition:stroke .3s}
#qzWin .qz-tm.ans .fg{stroke:#FE7600}
#qzWin .qz-tm.low .fg{stroke:#EF4444}
#qzWin .qz-tm b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
#qzWin .qz-tm i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#7DD3FC}
#qzWin .qz-q{font-weight:900;font-size:16px;line-height:1.33;padding:2px 44px 0 2px}
#qzWin .qz-rew{display:flex;align-items:center;gap:6px;font-weight:800;font-size:11px;color:#C4B5FD}
#qzWin .qz-rew b{color:#FFD66B;font-weight:900}
#qzWin .qz-opts{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#qzWin .qz-o{display:flex;align-items:center;gap:7px;min-height:40px;box-sizing:border-box;padding:7px;border-radius:12px;background:rgba(20,3,38,.6);border:1px solid rgba(120,44,233,.32);font:700 11.5px/1.22 Onest,sans-serif;color:#fff;text-align:left;transition:all .25s;min-width:0;cursor:pointer}
#qzWin .qz-o:disabled{cursor:default}
#qzWin .qz-o:focus-visible{outline:2px solid var(--c);outline-offset:2px}
#qzWin .qz-o span{display:block;min-width:0;overflow-wrap:break-word;-webkit-hyphens:auto;hyphens:auto}
#qzWin .qz-o b{flex:0 0 auto;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:10.5px;color:#fff;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
#qzWin .qz-o:not(.ok):not(.bad){border:1px solid color-mix(in srgb,var(--c,#A878F5) 38%,transparent);padding:7px;background:rgba(20,3,38,.6);box-shadow:none}
#qzWin .qz-o.ok{background:rgba(34,197,94,.2);border-color:#22C55E}
#qzWin .qz-o.bad{background:rgba(239,68,68,.2);border-color:#EF4444}
#qzWin .qz-o.dim{opacity:.45}
#qzWin .qz-abcd{display:flex;justify-content:center;gap:clamp(8px,calc((100% - 232px) / 3),44px);padding:4px 6px 2px}
#qzWin .qz-ball{flex:0 0 auto;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;color:#fff;cursor:pointer;border:2px solid rgba(255,255,255,.55);
 background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.55),rgba(255,255,255,0) 42%),var(--c);box-shadow:0 0 14px var(--c),inset 0 -5px 0 rgba(0,0,0,.22);text-shadow:0 2px 3px rgba(0,0,0,.3);transition:transform .15s,opacity .25s,filter .25s}
#qzWin .qz-ball:active{transform:scale(.92)}
#qzWin .qz-ball.press{animation:qzPress .26s ease-out forwards}
@keyframes qzPress{0%{transform:scale(1) translateY(0)}45%{transform:scale(.84) translateY(3px);box-shadow:0 0 6px var(--c),inset 0 4px 8px rgba(0,0,0,.4)}100%{transform:scale(1.04) translateY(0);box-shadow:0 0 22px var(--c),inset 0 -5px 0 rgba(0,0,0,.22)}}
#qzWin .qz-abcd.lock .qz-ball.ok{animation:qzBallOk 1.4s ease-in-out infinite}
@keyframes qzBallOk{0%,100%{box-shadow:0 0 12px #22C55E,inset 0 -5px 0 rgba(0,0,0,.22)}50%{box-shadow:0 0 26px #4ADE80,0 0 0 4px rgba(74,222,128,.25),inset 0 -5px 0 rgba(0,0,0,.22)}}
#qzWin .qz-abcd.lock .qz-ball.picked{animation:qzBack .35s cubic-bezier(.2,1.6,.4,1)}
#qzWin .qz-abcd.lock .qz-ball.ok.picked{animation:qzBack .35s cubic-bezier(.2,1.6,.4,1),qzBallOk 1.4s ease-in-out .35s infinite}
@keyframes qzBack{0%{transform:scale(.86)}100%{transform:scale(1.08)}}
#qzWin .qz-o.ok{animation:qzOkGlow 1.4s ease-in-out infinite;border-width:2px;padding:6px}
#qzWin .qz-o.bad{border-width:2px;padding:6px;box-shadow:0 0 12px rgba(239,68,68,.55)}
#qzWin .qz-o.bad b{background:#EF4444!important}
#qzWin .qz-o.ok b{background:#22C55E!important}
@keyframes qzOkGlow{0%,100%{box-shadow:0 0 6px rgba(34,197,94,.4)}50%{box-shadow:0 0 16px rgba(74,222,128,.75),inset 0 0 8px rgba(74,222,128,.25)}}
.qz-star{position:absolute;font-style:normal;font-size:var(--s);line-height:1;margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);color:var(--c);text-shadow:0 0 8px var(--c),0 0 2px #fff;pointer-events:none;z-index:3;animation:qzStar .6s ease-out forwards}
@keyframes qzStar{0%{opacity:1;transform:translate(0,0) scale(.4) rotate(0)}60%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1) rotate(160deg)}}
.qz-ripple{position:absolute;border-radius:50%;border:2px solid var(--c);pointer-events:none;z-index:3;transform:translate(-50%,-50%);animation:qzRip .45s ease-out forwards}
@keyframes qzRip{0%{width:40px;height:40px;opacity:.9}100%{width:96px;height:96px;opacity:0}}
#qzWin .qz-abcd.wait .qz-ball{pointer-events:none;opacity:.4;filter:saturate(.5)}
#qzWin .qz-abcd.lock .qz-ball{pointer-events:none;opacity:.35;filter:saturate(.4)}
#qzWin .qz-abcd.lock .qz-ball.ok{opacity:1;filter:none;--c:#22C55E!important;transform:scale(1.08)}
#qzWin .qz-abcd.lock .qz-ball.bad{opacity:1;filter:none;--c:#EF4444!important}
#qzWin .qz-note{text-align:center;font-weight:800;font-size:12.5px;min-height:18px}
#qzWin .qz-note.ok{color:#4ADE80} #qzWin .qz-note.bad{color:#F87171} #qzWin .qz-note.read{color:#7DD3FC}
#qzWin .qz-bonus{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:9px 10px;border-radius:14px;background:rgba(255,197,61,.09);border:1px solid rgba(255,197,61,.3);color:#FFD66B;font:800 11px/1.28 Onest,sans-serif}
#qzWin .qz-bonus>span{display:flex;align-items:center;gap:7px}
#qzWin .qz-bonus button{border:0;border-radius:9px;padding:6px 8px;background:#FFD66B;color:#351952;font:900 10.5px Onest,sans-serif;cursor:pointer}
#qzWin .qz-bonus button:disabled{opacity:.55;cursor:default}
#qzWin .qz-trials{display:flex;flex-wrap:wrap;gap:7px}
#qzWin .qz-trials .qz-chg{color:#FFE8A0;border-color:rgba(255,197,61,.4)}
#qzWin .qz-res{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:6px 4px 2px}
#qzWin .qz-big{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#fff;margin:4px 0}
#qzWin .qz-big.win{background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFC53D 55%,#E08A00);color:#7C4A00;box-shadow:0 0 30px rgba(255,197,61,.6);animation:qzPop .6s cubic-bezier(.2,1.6,.4,1)}
#qzWin .qz-big.start{background:radial-gradient(circle at 35% 30%,#BAE6FD,#38BDF8 55%,#0369A1);box-shadow:0 0 26px rgba(56,189,248,.55)}
@keyframes qzPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
#qzWin .qz-rt{font-weight:900;font-size:20px;line-height:1.1}
#qzWin .qz-rt.win{color:#FFC53D}
#qzWin .qz-rd{font-weight:600;font-size:12.5px;line-height:1.45;color:#DDD6FE}
#qzWin .qz-rd b{color:#fff;font-weight:900}
#qzWin .qz-rules{display:flex;flex-direction:column;gap:9px;width:100%;margin:2px 0}
#qzWin .qz-rule{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:13px;background:rgba(20,3,38,.6);border:1px solid rgba(120,44,233,.3);font-weight:700;font-size:12px;text-align:left;line-height:1.35}
#qzWin .qz-rule>i{flex:0 0 28px;text-align:center;color:#38BDF8;font-size:18px}
#qzWin .qz-btns{display:flex;flex-direction:column;gap:10px}
#qzWin .qz-btn{width:100%;padding:13px 10px;border-radius:16px;font-weight:900;font-size:13px;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
#qzWin .qz-btn.sec{background:rgba(45,14,82,.9);border:1px solid rgba(168,85,247,.5);color:#fff;font-size:11px;padding:10px}
#qzWin.busy .qz-x{opacity:.3;pointer-events:none}
#qzWin .qz-btn.sec[disabled]{opacity:.35;pointer-events:none;filter:saturate(.5)}
#qzWin .qz-btn.sec i{color:#FE7600}
#qzWin .qz-btn.gold{background:linear-gradient(180deg,#FFD66B,#FFB020);color:#4A2600;border:1px solid rgba(255,240,190,.8);box-shadow:0 0 14px rgba(255,197,61,.45)}
#qzWin .qz-timer{font-weight:800;font-size:11px;color:#7DD3FC}
#qzWin .qz-ready{display:flex;flex-direction:column;align-items:center;gap:12px;padding:18px 10px;border-radius:20px;background:linear-gradient(180deg,rgba(120,44,233,.2),rgba(120,44,233,.06));border:1px dashed rgba(168,120,245,.5);text-align:center}
#qzWin .qz-ready .n{font-weight:900;font-size:13px;letter-spacing:.08em;color:#C4B5FD;text-transform:uppercase}
#qzWin .qz-ready .t{font-weight:600;font-size:12px;color:#DDD6FE;line-height:1.4}
#qzWin .qz-cnt.pop{animation:qzCntPop .6s cubic-bezier(.2,1.5,.4,1)}
@keyframes qzCntPop{0%{transform:scale(1)}35%{transform:scale(1.18)}100%{transform:scale(1)}}
#qzWin .qz-cnt.pop .qz-cn{background:linear-gradient(100deg,#FFD66B 0 35%,#FFFFFF 47%,#FFE9A8 53%,#FFD66B 65% 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:qzCnFlow 1.1s ease-out}
@keyframes qzCnFlow{from{background-position:100% 0}to{background-position:0% 0}}
#qzWin .qz-cnt.pop .qz-coin{animation:qzCoinFlip .8s ease-out}
@keyframes qzCoinFlip{0%{transform:rotateY(0) scale(1)}40%{transform:rotateY(180deg) scale(1.25);filter:drop-shadow(0 0 8px #FFE08A)}100%{transform:rotateY(360deg) scale(1)}}
.qz-gain{position:absolute;transform:translate(-50%,0);display:flex;align-items:center;gap:5px;font:900 16px Onest,sans-serif;color:#FFE08A;text-shadow:0 0 10px rgba(255,197,61,.9),0 2px 3px rgba(0,0,0,.4);pointer-events:none;z-index:3;white-space:nowrap;animation:qzGain .9s cubic-bezier(.2,.8,.3,1) forwards}
.qz-gain .qz-coin{font-size:17px}
@keyframes qzGain{0%{opacity:0;transform:translate(-50%,8px) scale(.6)}25%{opacity:1;transform:translate(-50%,-4px) scale(1.12)}55%{opacity:1;transform:translate(-50%,-7px) scale(1)}100%{opacity:0;transform:translate(-50%,-11px) scale(.92)}}
.qz-spark{position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#FFE08A;box-shadow:0 0 8px #FFC53D;pointer-events:none;z-index:3;animation:qzSpark .75s ease-out forwards}
@keyframes qzSpark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3)}}
.qz-plus{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;font:900 26px Onest,sans-serif;color:#FFD66B;text-shadow:0 0 14px rgba(255,197,61,.8);pointer-events:none;animation:qzPlus 1.2s ease-out forwards;z-index:3}
.qz-plus .qz-coin{font-size:22px}
@keyframes qzPlus{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-140%) scale(1)}}
/* выбор темы и сложности */
#qzWin .qz-sec{display:flex;align-items:center;gap:7px;font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#C4B5FD;margin-bottom:-6px}
#qzWin .qz-sec i{color:#7DD3FC;font-size:12px}
#qzWin .qz-msg{padding:10px 12px;border-radius:12px;background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.45);color:#FDE68A;font-weight:700;font-size:12px;text-align:center}
#qzWin .qz-themes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#qzWin .qz-th{position:relative;display:flex;align-items:center;gap:8px;min-height:50px;padding:7px 9px;border-radius:14px;text-align:left;cursor:pointer;color:#fff;font-family:Onest,sans-serif;
 background:linear-gradient(135deg,var(--tcB),rgba(20,3,38,.7) 70%);border:1.5px solid var(--tcA);transition:transform .15s,box-shadow .25s,border-color .25s,background .25s}
#qzWin .qz-th.wide{grid-column:1 / -1;min-height:56px}
#qzWin .qz-th:active{transform:scale(.96)}
#qzWin .qz-th.on{border-color:var(--tc);box-shadow:0 0 14px var(--tcA),inset 0 0 12px var(--tcB);background:linear-gradient(135deg,var(--tcA),rgba(20,3,38,.65) 75%)}
#qzWin .qz-th.empty{opacity:.4;cursor:default}
#qzWin .qz-th.campaign-locked{cursor:default;transform:none}
#qzWin .qz-themes:has(.on) .qz-th.campaign-locked{opacity:1;filter:none}
#qzWin .qz-th.campaign-locked .qz-thi{opacity:.72;box-shadow:none}
#qzWin .qz-th.campaign-locked .qz-thn{white-space:normal;padding-right:8px}
#qzWin .qz-th.campaign-locked .qz-thc{white-space:normal;color:#DDD6FE}
#qzWin .qz-th.campaign-locked .qz-thb i{min-width:0}
#qzWin .qz-thi{flex:0 0 30px;width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;background:var(--tc);box-shadow:0 0 10px var(--tcA),inset 0 -3px 0 rgba(0,0,0,.2)}
#qzWin .qz-thtx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;padding-right:0}
#qzWin .qz-thn{font-weight:800;font-size:12px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#qzWin .qz-thc{font-weight:700;font-size:9.5px;color:rgba(237,229,248,.6);white-space:nowrap}
#qzWin .qz-thb{display:block;height:3px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:1px}
#qzWin .qz-thb i{display:block;height:100%;min-width:3px;border-radius:2px;background:var(--tc);box-shadow:0 0 6px var(--tc)}
#qzWin .qz-stick{position:sticky;bottom:-22px;z-index:2;margin:0 -18px -22px;padding:12px 18px 18px;background:linear-gradient(180deg,rgba(29,9,54,0),rgba(29,9,54,.96) 30%)}
#qzWin .qz-thk{position:absolute;top:6px;right:8px;font-size:11px;color:var(--tc);opacity:0;transform:scale(.4);transition:all .2s}
#qzWin .qz-th.on .qz-thk{opacity:1;transform:scale(1)}
#qzWin .qz-lvls{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#qzWin .qz-lv{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px;border-radius:13px;cursor:pointer;color:#fff;font-family:Onest,sans-serif;background:rgba(20,3,38,.65);border:1.5px solid var(--lcA);transition:all .2s}
#qzWin .qz-lv b{font-weight:900;font-size:10.5px;color:var(--lc);letter-spacing:.02em}
#qzWin .qz-lv span{display:flex;align-items:center;gap:4px;font-weight:900;font-size:13px;color:#FFD66B}
#qzWin .qz-lv .qz-coin{font-size:13px}
#qzWin .qz-lv:not(.on){opacity:.5;filter:saturate(.6)}
#qzWin .qz-lv.on{border-color:var(--lc);box-shadow:0 0 16px var(--lcA),0 0 4px var(--lc),inset 0 0 12px var(--lcA);background:linear-gradient(180deg,var(--lcA),rgba(20,3,38,.55));transform:scale(1.04)}
#qzWin .qz-themes:has(.on) .qz-th:not(.on){opacity:.62;filter:saturate(.75)}
#qzWin .qz-lv:active{transform:scale(.95)}
#qzWin .qz-btn[disabled]{opacity:.45;pointer-events:none;filter:saturate(.5)}
#qzWin .qz-cur{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--tc) 18%,transparent),rgba(20,3,38,.7) 70%);border:1px solid color-mix(in srgb,var(--tc) 45%,transparent)}
#qzWin .qz-curt{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0}
#qzWin .qz-curt b{font-weight:900;font-size:13px;line-height:1.15;display:block}
#qzWin .qz-curt span{display:flex;align-items:center;gap:4px;font-weight:800;font-size:11px;line-height:1.15;color:#fff}
#qzWin .qz-curt em{font-style:normal}
#qzWin .qz-curt .qz-coin{font-size:12px}
#qzWin .qz-chg[disabled]{opacity:.35;pointer-events:none}
#qzWin .qz-nav{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#qzWin .qz-nav .qz-btn{width:auto}
#qzWin .qz-nav .qz-btn[disabled]{opacity:.35;pointer-events:none;filter:saturate(.5)}
#qzWin .qz-nav .qz-btn i{color:#FE7600}
#qzWin .qz-chg{flex:0 0 auto;padding:7px 10px;border-radius:10px;font:800 11px Onest,sans-serif;color:#fff;background:color-mix(in srgb,var(--tc,#782CE9) 28%,transparent);border:1px solid color-mix(in srgb,var(--tc,#A878F5) 60%,transparent);cursor:pointer}
/* платный доступ: замочки на уровнях и темах, статус подписки */
#qzWin .qz-lv{position:relative}
#qzWin .qz-lv .qz-lk{position:absolute;top:-6px;right:-5px;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#FFD66B;background:#2a0f4d;border:1px solid rgba(255,214,107,.6);box-shadow:0 0 6px rgba(255,197,61,.35)}
#qzWin .qz-lv:not(.on) .qz-lk{opacity:1}
#qzWin .qz-thl{position:absolute;top:6px;right:8px;font-size:9.5px;color:#FFD66B;opacity:.9;filter:drop-shadow(0 0 4px rgba(255,197,61,.5))}
#qzWin .qz-btn.gold i{color:#7C4A00}
#qzWin .qz-title2 .qz-subst{display:inline-flex;align-items:center;gap:6px;margin-top:7px;padding:3px 10px;border-radius:999px;font:800 11px/1.2 Onest,sans-serif;color:#86EFAC;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.4)}
#qzWin .qz-title2 .qz-subst>i{font-size:10px}
#qzWin .qz-title2 .qz-subst.soon{color:#FDBA74;background:rgba(254,118,0,.15);border-color:rgba(254,118,0,.75);box-shadow:0 0 10px rgba(254,118,0,.3);padding:2px 3px 2px 10px}
#qzWin .qz-subst button{padding:3px 9px;border-radius:999px;font:900 10px/1.2 Onest,sans-serif;letter-spacing:.03em;color:#fff;background:#FE7600;border:1px solid rgba(255,214,150,.8);cursor:pointer}
#qzWin.busy .qz-subst button{opacity:.4;pointer-events:none}
/* окно оплаты — в стиле лавки */
#quizModal.pay #qzWin{display:none}
#pwWin{display:none;position:relative;width:100%;max-width:380px;max-height:100%;overflow-y:auto;scrollbar-width:none;box-sizing:border-box;border-radius:28px;padding:16px 16px 18px;flex-direction:column;gap:14px;font-family:Onest,sans-serif;color:#fff;
 background:radial-gradient(110% 45% at 50% -8%,rgba(255,197,61,.2),transparent 62%),radial-gradient(80% 40% at 0% 105%,rgba(168,85,247,.16),transparent 60%),rgba(29,9,54,.97);border:1.5px solid rgba(255,197,61,.35);box-shadow:0 10px 40px rgba(0,0,0,.5)}
#pwWin::-webkit-scrollbar{display:none}
#quizModal.pay #pwWin{display:flex}
#pwWin>*{flex-shrink:0}
#pwWin .pw-x{position:absolute;top:10px;right:10px;z-index:2;width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#FFE08A;background:rgba(255,197,61,.1);border:1px solid rgba(255,197,61,.35);font-size:14px;cursor:pointer}
#pwWin .pw-x:active{transform:scale(.92)}
#pwWin .pw-top{display:flex;justify-content:center}
#pwWin .pw-emb{position:relative;width:106px;height:106px;display:flex;align-items:center;justify-content:center}
#pwWin .pw-glow{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,rgba(255,197,61,.24),rgba(168,85,247,.1) 55%,transparent 72%);animation:qzPulse 3.2s ease-in-out infinite}
@property --pwA{syntax:'<angle>';inherits:false;initial-value:0deg}
#pwWin .pw-ring{position:absolute;inset:6px;border-radius:50%;padding:1.5px;background:conic-gradient(from var(--pwA),rgba(255,197,61,0) 0deg,#FFE08A 70deg,#C4A1FF 140deg,rgba(168,85,247,0) 200deg,rgba(255,197,61,0) 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:pwRing 3.6s linear infinite}
@keyframes pwRing{to{--pwA:360deg}}
#pwWin .pw-core{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#pwWin .pw-core i{font-size:42px;background:linear-gradient(110deg,#FFC53D 0%,#FFF3B0 22%,#FFC53D 40%,#C4A1FF 60%,#FFC53D 80%,#FFF3B0 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 6px rgba(255,197,61,.45));animation:qzFlow 4.5s linear infinite}
#pwWin .pw-tw{position:absolute;font-style:normal;font-size:var(--s);color:#FFF3B0;text-shadow:0 0 8px #FFC53D;animation:qzTw 2.4s ease-in-out infinite;animation-delay:var(--d)}
#pwWin .pw-title{text-align:center;margin-top:-6px}
#pwWin .pw-title b{display:block;font-weight:900;font-size:25px;letter-spacing:.02em;line-height:1;background:linear-gradient(90deg,#FFD66B,#FFF3B0 45%,#C4A1FF);-webkit-background-clip:text;background-clip:text;color:transparent}
#pwWin .pw-title span{display:block;margin-top:6px;font-weight:600;font-size:12px;line-height:1.35;color:#C4B5FD}
#pwWin .pw-perks{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
#pwWin .pw-perk{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;font:900 11px/1 Onest,sans-serif;color:var(--lc);background:rgba(20,3,38,.6);border:1px solid color-mix(in srgb,var(--lc) 50%,transparent)}
#pwWin .pw-perk em{font-style:normal;color:#FFD66B}
#pwWin .pw-perk .qz-coin{font-size:11px}
#pwWin .pw-btns{display:flex;flex-direction:column;gap:10px}
#pwWin .pw-btn{width:100%;padding:13px 10px;border-radius:16px;font-weight:900;font-size:13px;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
#pwWin .pw-btn:disabled{background:rgba(45,14,82,.7);border:1px solid rgba(168,85,247,.35);color:#DDD6FE;cursor:default}
#pwWin .pw-btn.sec{background:rgba(45,14,82,.9);border:1px solid rgba(168,85,247,.5);color:#fff;font-size:11px;padding:11px 10px}
#pwWin .pw-btn.sec i{color:#FE7600}
#qzWin .qz-msg.ok{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.5);color:#BBF7D0}
`;
        document.head.appendChild(st);
    } catch (e) {}
})();

const QZ_COIN = '<i class="fa-solid fa-coins qz-coin"></i>';   // монетки — как на плашке монет в меню
const QZ_BONUS_LEVELS = ['s', 'l'], QZ_TRIAL_LVL = 'l';
const QZ_TRIAL_TOPICS = { music: ['music'], kino: ['kino'], series: ['series'], cartoons: ['cartoons'], fun: ['hp', 'games', 'memes'] };
const QZ_NEARBY = { music: ['kino', 'art'], kino: ['series', 'cartoons'], series: ['kino', 'cartoons'], cartoons: ['kino', 'games'], games: ['memes', 'hp'], memes: ['humor', 'games'], hp: ['lit', 'kino'], lit: ['art', 'history'], history: ['geo', 'art'], geo: ['nature', 'history'], chem: ['phys', 'nature'], phys: ['chem', 'space'], space: ['phys', 'nature'], nature: ['geo', 'chem'], sport: ['games', 'history'], food: ['nature', 'geo'], art: ['lit', 'music'], humor: ['memes', 'kino'] };
const QS = { mode: 'daily', phase: 'idle', raf: 0, revealT: 0, attempt: null };
let qzRoot = null, qzPrevMusic = null, qzAdminPreview = '';

function qzBonusStatus() {
    return typeof FlightQuizBonus === 'undefined' ? { enabled: false, available: 0 } : FlightQuizBonus.status();
}
function qzReward(lvl, bonus = QS.mode === 'bonus') {
    const coins = qzLevel(lvl).coins;
    return bonus ? Math.ceil(coins / 2) : coins;
}
function qzBonusStock(includeButton = true) {
    const { enabled, available } = qzBonusStatus();
    if (!enabled) return '';
    const label = available ? 'Бонусных вопросов: ' + available : 'Бонусы за значки «?» в полёте';
    return '<div class="qz-bonus"><span><i class="fa-solid fa-gift" aria-hidden="true"></i>' + label + '</span>'
        + (available && includeButton ? '<button type="button" data-qa="bonus">Сыграть бонус</button>' : '') + '</div>';
}
function qzThemeAllowed(theme, lvl) {
    if (theme === 'all') return true;
    if (QZ_PAID_LV.includes(lvl)) return QZ_THEMES.some(t => t.id === theme);
    return QZ_BONUS_LEVELS.includes(lvl) && Boolean(window.BuboCampaignTopics?.isUnlocked(theme));
}
function qzTrialTopics(key) {
    const playable = theme => qzThemeAllowed(theme, QZ_TRIAL_LVL) && qzLeft(theme, QZ_TRIAL_LVL) > 0;
    const topics = QZ_TRIAL_TOPICS[key];
    if (topics) return topics.filter(playable);
    if (key !== 'logic') return [];
    const choices = (window.BuboCampaignTopics?.list() || []).map(theme => theme.id).filter(playable);
    const today = new Date();
    const offset = (today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate()) % Math.max(choices.length, 1);
    return choices.slice(offset).concat(choices.slice(0, offset)).slice(0, 2);
}
function qzTrialChoices() {
    if (!qzBonusStatus().thematicEnabled) return '';
    const choices = FlightQuizBonus.themes().flatMap(token => qzTrialTopics(token).map(theme =>
        '<button type="button" class="qz-chg" data-qa="trial" data-trial="' + token + '" data-trial-theme="' + theme + '">' + qzTheme(theme).name + '</button>'
    ));
    return choices.length
        ? '<div class="qz-sec"><i class="fa-solid fa-unlock"></i>Дополнительный вопрос «Лайт» по открытой теме</div><div class="qz-trials">' + choices.join('') + '</div>'
        : '';
}
function qzNearbyTheme(theme, lvl) {
    return (QZ_NEARBY[theme] || []).concat('all').find(next => next !== theme && qzThemeAllowed(next, lvl) && qzLeft(next, lvl)) || '';
}

function qzBuild() {
    if (qzRoot) return qzRoot;
    const host = document.getElementById('gameContainer') || document.body;
    qzRoot = document.createElement('div');
    qzRoot.id = 'quizModal'; qzRoot.className = 'hidden';
    qzRoot.innerHTML = '<div id="qzWin"><button type="button" class="qz-x" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button><div id="qzBody"></div></div><div id="pwWin"></div>';
    host.appendChild(qzRoot);
    ['click', 'pointerdown', 'touchstart'].forEach((ev) => qzRoot.addEventListener(ev, (e) => e.stopPropagation()));
    qzRoot.querySelector('.qz-x').addEventListener('click', closeQuiz);
    qzRoot.addEventListener('click', (e) => {
        if (e.target === qzRoot && qzRoot.classList.contains('pay')) { qzPayClose(); return; }
        if (e.target === qzRoot) { const w = document.getElementById('qzWin'); if (!(w && w.classList.contains('busy'))) closeQuiz(); return; }
        const pw = e.target.closest('[data-pw]');
        if (pw) { if (pw.dataset.pw === 'back') qzPayClose(); return; }
        const tb = e.target.closest('[data-th]'), lb = e.target.closest('[data-lv]');
        if (tb && !tb.disabled && qzThemeAllowed(tb.dataset.th, QS.selL)) { QS.selT = tb.dataset.th; qzPickSync(); try { AudioFX.playRouletteTick(); } catch (er) {} return; }
        if (lb) { QS.selL = lb.dataset.lv; qzPickSync(true); qzSubSync(); try { AudioFX.playRouletteTick(); } catch (er) {} return; }
        const b = e.target.closest('[data-qa]'); if (!b) return;
        const a = b.dataset.qa;
        if (a === 'go') qzStartQuestion();
        else if (a === 'close') closeQuiz();
        else if (a === 'shop') { closeQuiz(); if (typeof openShop === 'function') openShop(); }
        else if (a === 'pick') { QS.selT = undefined; QS.selL = undefined; qzRenderPick(); }
        else if (a === 'bonus') openQuizBonus();
        else if (a === 'daily') openQuiz();
        else if (a === 'trial' && QS.mode === 'bonus') qzStartBonus(b.dataset.trial, b.dataset.trialTheme);
        else if (a === 'retry') qzRetryAttempt();
        else if (a === 'pickgo') qzPickGo();
        else if (a === 'unlock') { if (QS.phase !== 'read' && QS.phase !== 'answer') qzPayOpen(QS.selL); }
        else if (a.length === 1) qzPick(a);
    });
    return qzRoot;
}
function qzHead() {
    return '<div class="qz-top"><div class="qz-emb2"><div class="qz-glow"></div><div class="qz-ring"></div><div class="qz-core"><i class="fa-solid fa-comments"></i></div>'
        + [[-50, -18, 8, 0], [52, 10, 7, .9], [36, -40, 6, 1.7]].map(([x, y, s, d]) => `<i class="qz-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('') + '</div>'
        + '<div class="qz-title2">' + (QS.mode === 'bonus'
            ? '<b>БОНУС ЗА ПОЛЁТ</b><span>Дополнительно к десяти вопросам дня</span>'
            : '<b>ВОПРОСЫ ДНЯ</b>' + qzSubBadge()) + '</div></div>';
}

// ---------- платный доступ: Суперлайт и Лайт бесплатно, Средне и Сложно — по подписке ----------
const QZ_SUB_KEY = 'bubo_quiz_sub', QZ_PAID_LV = ['m', 'x'];
function qzSubAll() {
    try {
        const s = JSON.parse(localStorage.getItem(QZ_SUB_KEY) || 'null') || {};
        if (s.until && !s.m && !s.x) return { m: +s.until, x: +s.until };   // старая общая подписка — на оба уровня
        return { m: +s.m || 0, x: +s.x || 0 };
    } catch (e) { return { m: 0, x: 0 }; }
}
function qzSubUntil(lv) { const a = qzSubAll(); return lv ? (a[lv] || 0) : Math.max(a.m, a.x); }
function qzSubOn(lv) { return qzSubUntil(lv) > Date.now(); }
function qzLvLocked(id) { return QZ_PAID_LV.includes(id) && id !== qzAdminPreview && !qzSubOn(id); }
function qzSetAdminPreview(level) {
    if (level !== '' && !QZ_PAID_LV.includes(level)) return false;
    qzAdminPreview = level;
    if (qzRoot && !qzRoot.classList.contains('hidden')) {
        if (QS.phase === 'pick' && QS.mode === 'daily') {
            QS.selL = level || undefined;
            qzRenderPick();
        } else qzSubSync();
    }
    return true;
}
function qzFmtDate(t) {
    const d = new Date(t);
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
}
function qzSubBadge() {
    const lv = QS.selL;
    if (lv && lv === qzAdminPreview) return '<div class="qz-subst"><i class="fa-solid fa-flask"></i>Тестовый доступ</div>';
    if (!QZ_PAID_LV.includes(lv) || !qzSubOn(lv)) return '<span>Отвечайте и зарабатывайте монеты для лавки</span>';
    return '<div class="qz-subst"><i class="fa-solid fa-crown"></i>Доступ до ' + qzFmtDate(qzSubUntil(lv)) + '</div>';
}
function qzSubSync() { const st = document.querySelector('#qzWin .qz-title2'); if (st) { const o = st.querySelector('.qz-subst, span'); if (o) o.outerHTML = qzSubBadge(); } }
function qzPayOpen(lv) {
    if (!qzRoot) return;
    QS.payLv = QZ_PAID_LV.indexOf(lv) >= 0 ? lv : (QZ_PAID_LV.find(l => qzLvLocked(l)) || 'm');
    qzPayRender();
    qzRoot.classList.add('pay');
    const w = document.getElementById('pwWin'); if (w) w.scrollTop = 0;
    try { AudioFX.playRouletteTick(); } catch (e) {}
}
function qzPayClose() { if (qzRoot) qzRoot.classList.remove('pay'); }
function qzPayRender() {
    const w = document.getElementById('pwWin'); if (!w) return;
    const lv = qzLevel(QS.payLv);
    const tw = [[-50, -18, 8, 0], [52, 10, 7, .9], [36, -40, 6, 1.7]].map(([x, y, s, d]) => `<i class="pw-tw" style="left:calc(50% + ${x}px - ${s / 2}px);top:calc(50% + ${y}px - ${s / 2}px);--s:${s}px;--d:${d}s">✦</i>`).join('');
    w.innerHTML = `<button type="button" class="pw-x" data-pw="back" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button>`
        + `<div class="pw-top"><div class="pw-emb"><div class="pw-glow"></div><div class="pw-ring"></div><div class="pw-core"><i class="fa-solid fa-crown"></i></div>${tw}</div></div>`
        + `<div class="pw-title"><b>Уровень «${lv.name}»</b><span>Монеты за верный ответ</span></div>`
        + `<div class="pw-perks"><span class="pw-perk" style="--lc:${lv.col}">${QZ_COIN} +${lv.coins}</span></div>`
        + `<div class="pw-btns"><button type="button" class="pw-btn" disabled><i class="fa-solid fa-lock"></i>Оплата пока недоступна</button>`
        + `<button type="button" class="pw-btn sec" data-pw="back"><i class="fa-solid fa-arrow-left"></i>ВЕРНУТЬСЯ</button></div>`;
}
function qzProg(d, curIdx) {
    let dots = '';
    for (let i = 0; i < QUIZ_PER_DAY; i++) {
        const r = d.res[i];
        dots += `<div class="qz-dot${r === 1 ? ' ok' : r === 0 ? ' bad' : i === curIdx ? ' cur' : ''}">${r === 1 ? '<i class="fa-solid fa-check"></i>' : r === 0 ? '<i class="fa-solid fa-xmark"></i>' : ''}</div>`;
    }
    return `<div class="qz-prog"><div class="qz-dots">${dots}</div><div class="qz-cnt" title="Заработано на вопросах сегодня"><span class="qz-cnl">за день</span>${QZ_COIN}<span class="qz-cn">${d.earned}</span></div></div>`;
}
function qzUntilTomorrow() {
    const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.max(0, Math.floor((t - n) / 1000));
    return `${Math.floor(s / 3600)} ч ${String(Math.floor(s / 60) % 60).padStart(2, '0')} мин`;
}
function qzBody() { return document.getElementById('qzBody'); }

// экран «готов?» перед каждым вопросом (и первый экран с правилами)
function qzRenderReady() {
    qzMusicBrowse();
    const d = quizDay(), body = qzBody(); if (!body) return;
    { const w = document.getElementById('qzWin'); if (w) w.classList.remove('busy'); }
    QS.phase = 'ready';
    if (d.ids.length >= QUIZ_PER_DAY) { qzRenderDone(); return; }
    if (d.lvl && qzLvLocked(d.lvl)) { d.lvl = ''; quizSaveDay(d); }   // не начинать следующий вопрос с истёкшим доступом
    if (!d.theme || !d.lvl) { if (d.ids.length) { qzRenderPick(); return; } qzRenderIntro(d, body); return; }
    if (!qzThemeAllowed(d.theme, d.lvl)) { d.theme = 'all'; quizSaveDay(d); }
    QS.selT = d.theme;
    QS.selL = d.lvl;
    const n = d.ids.length + 1;
    const rules = d.ids.length ? '' : qzRulesHtml();
    body.innerHTML = qzHead() + qzCurPlate(d, true) + qzProg(d, d.ids.length) + rules + qzBonusStock()
        + `<div class="qz-ready"><div class="n">Вопрос ${n} из ${QUIZ_PER_DAY}</div><div class="t">Как будете готовы — нажмите кнопку.<br>Можно выйти и вернуться позже: продолжите с этого места.</div></div>`
        + `<div class="qz-btns"><button type="button" class="btn-bubo qz-btn" data-qa="go"><i class="fa-solid fa-play"></i>${n === 1 ? 'НАЧАТЬ' : 'К ВОПРОСУ'}</button>`
        + `<div class="qz-rd" style="text-align:center">Монет сейчас: <b style="color:#FFD66B">${qzCoinsTotal()}</b></div></div>`;
}
// первый экран: описание и правила, кнопка ИГРАТЬ ведёт к выбору темы
function qzRulesHtml() {
    return `<div class="qz-rules">`
        + `<div class="qz-rule"><i class="fa-solid fa-list-ol"></i><span>В день — ${QUIZ_PER_DAY} вопросов. ${QZ_READ} с на чтение, потом ${QZ_ANSWER} с на ответ</span></div>`
        + `<div class="qz-rule"><i class="fa-solid fa-layer-group"></i><span>«Обо всём» доступно сразу. Темы открывают парные отметки в Походе</span></div>`
        + `<div class="qz-rule"><i class="fa-solid fa-coins"></i><span>За верный ответ: ${qzLevelsOn().map(l => `<b style="color:${l.col}">${l.name.toLowerCase()}</b> — ${l.coins}`).join(', ')} ${ruPlural(qzLevelsOn().slice(-1)[0].coins, ['монета', 'монеты', 'монет'])}</span></div>`
        + `<div class="qz-rule"><i class="fa-solid fa-store"></i><span>Монеты тратятся в лавке на попытки, жизни и бонусы</span></div></div>`;
}
function qzRenderIntro(d, body) {
    QS.phase = 'intro';
    body.innerHTML = qzHead() + qzProg(d, 0) + qzRulesHtml() + qzBonusStock()
        + `<div class="qz-btns"><button type="button" class="btn-bubo qz-btn" data-qa="pick"><i class="fa-solid fa-play"></i>ИГРАТЬ</button>`
        + `<div class="qz-rd" style="text-align:center">Монет сейчас: <b style="color:#FFD66B">${qzCoinsTotal()}</b></div></div>`;
}
// выбор темы и сложности: карточки тем своего цвета, ниже — уровни и сколько монет за вопрос
// вне вопроса (выбор темы, итоги) — обычная музыка окна вопросов
function qzMusicBrowse() { try { if (AudioFX.mode === 'think' || AudioFX._pendMode === 'think') AudioFX.setMode('quiz', { fade: true }); } catch (e) {} }
function qzRenderPick(msg, ok) {
    qzMusicBrowse();
    const d = quizDay(), body = qzBody(); if (!body) return;
    { const w = document.getElementById('qzWin'); if (w) w.classList.remove('busy'); }
    QS.phase = 'pick';
    const bonus = QS.mode === 'bonus';
    const lvOn = qzLevelsOn().filter(l => !bonus || QZ_BONUS_LEVELS.includes(l.id));
    let sT = '', sL = '';
    try { sT = localStorage.getItem('bubo_quiz_theme') || ''; sL = localStorage.getItem('bubo_quiz_lvl') || ''; } catch (e) {}
    if (QS.selT === undefined) QS.selT = d.theme || sT || 'all';
    if (QS.selL === undefined) {
        const last = (!bonus && qzAdminPreview) || d.lvl || sL;
        QS.selL = lvOn.some(l => l.id === last) && !qzLvLocked(last) ? last : lvOn[0]?.id || '';
    }
    if (!lvOn.some(l => l.id === QS.selL)) QS.selL = lvOn[0]?.id || '';
    if (!qzThemeAllowed(QS.selT, QS.selL)) QS.selT = 'all';
    if (!qzLeft(QS.selT, QS.selL)) {
        const exhausted = QS.selT;
        QS.selT = qzNearbyTheme(exhausted, QS.selL);
        if (!msg) msg = qzExhaustedMessage(exhausted, QS.selT);
    }
    const themes = qzThemeCards(QS.selL);
    const lvls = lvOn.map(l => `<button type="button" class="qz-lv${QS.selL === l.id ? ' on' : ''}" data-lv="${l.id}" style="--lc:${l.col};--lcA:${l.col}55"><b>${l.name}</b><span>${QZ_COIN}${qzReward(l.id, bonus)}</span>${qzLvLocked(l.id) ? '<i class="fa-solid fa-lock qz-lk"></i>' : ''}</button>`).join('');
    body.innerHTML = qzHead() + (bonus ? qzBonusStock(false) : qzProg(d, d.ids.length) + qzBonusStock())
        + (msg ? `<div class="qz-msg${ok ? ' ok' : ''}">${msg}</div>` : '')
        + (bonus && qzBonusStatus().available ? qzTrialChoices() : '')
        + `<div class="qz-sec"><i class="fa-solid fa-coins"></i>Выберите сложность</div><div class="qz-lvls n${lvOn.length}" style="grid-template-columns:repeat(${lvOn.length},minmax(0,1fr))">${lvls}</div>`
        + `<div class="qz-sec"><i class="fa-solid fa-layer-group"></i>Выберите тему</div><div class="qz-themes">${themes}</div>`
        + `<div class="qz-btns qz-stick">${qzGoBtn(d)}${bonus ? '<button type="button" class="qz-btn sec" data-qa="daily">ВОПРОСЫ ДНЯ</button>' : ''}</div>`;
}
function qzExhaustedMessage(theme, nearby) {
    const label = qzTheme(theme).name;
    return nearby
        ? `В теме «${label}» вопросы этой сложности закончились. Можно попробовать «${qzTheme(nearby).name}».`
        : `В теме «${label}» вопросы этой сложности закончились. Выберите другую сложность.`;
}
// нижняя кнопка выбора: «Начать» или, если уровень закрыт, «Разблокировать»
function qzGoBtn(d) {
    if (QS.mode === 'bonus') {
        const { enabled, available } = qzBonusStatus();
        const canStart = enabled && available > 0 && QZ_BONUS_LEVELS.includes(QS.selL) && qzThemeAllowed(QS.selT, QS.selL);
        return `<button type="button" class="btn-bubo qz-btn" data-qa="pickgo"${canStart ? '' : ' disabled'}><i class="fa-solid fa-play"></i>ИГРАТЬ БОНУС</button>`;
    }
    if (qzLvLocked(QS.selL)) return '<button type="button" class="qz-btn gold" data-qa="unlock"><i class="fa-solid fa-key"></i>ОБ УРОВНЕ</button>';
    return `<button type="button" class="btn-bubo qz-btn" data-qa="pickgo"${QS.selL && qzThemeAllowed(QS.selT, QS.selL) ? '' : ' disabled'}><i class="fa-solid fa-play"></i>${d.ids.length ? 'ПРОДОЛЖИТЬ' : 'НАЧАТЬ'}</button>`;
}
// карточки тем: сколько вопросов выбранной сложности пройдено из скольких
function qzThemeCards(lv) {
    const paid = QZ_PAID_LV.includes(lv);
    const topics = window.BuboCampaignTopics;
    const campaign = topics?.list() || [];
    const list = paid ? QZ_THEMES : [qzTheme('all'), ...campaign.map(t => qzTheme(t.id))];
    const levelLocked = qzLvLocked(lv);
    const seen = new Set(quizSeen());
    return list.map(t => {
        const chapter = !paid && campaign.find(topic => topic.id === t.id);
        const locked = chapter && !topics.isUnlocked(t.id);
        const pool = qzPool(t.id).filter(q => !lv || q.lvl === lv);
        const total = pool.length, done = pool.filter(q => seen.has(q.id)).length;
        const empty = done === total;
        const on = QS.selT === t.id && !locked && !empty;
        const count = locked ? topics.progress(t.id) : done;
        const chapterName = chapter?.phase === 'night' ? 'Ночной город' : 'Дневной город';
        const note = locked ? chapterName + ' · ' + count + '/2'
            : empty ? (total ? 'Всё пройдено!' : 'Пока нет вопросов') : 'Пройдено ' + done + '/' + total;
        const progress = locked ? count * 50 : (total ? Math.round(done / total * 100) : 0);
        const icon = locked || levelLocked ? 'fa-lock qz-thl' : 'fa-check qz-thk';
        return `<button type="button" class="qz-th${t.id === 'all' ? ' wide' : ''}${on ? ' on' : ''}${locked ? ' campaign-locked' : ''}${empty && !locked ? ' empty' : ''}" data-th="${t.id}"${locked || empty ? ' disabled' : ''} style="--tc:${t.col};--tcA:${t.col}55;--tcB:${t.col}22">`
            + `<span class="qz-thi"><i class="fa-solid ${t.icon}" aria-hidden="true"></i></span><span class="qz-thtx"><span class="qz-thn">${t.name}</span><span class="qz-thc">${note}</span><span class="qz-thb"><i style="width:${progress}%"></i></span></span><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
    }).join('');
}
function qzPickSync(lvChanged) {
    const b = qzBody(); if (!b) return;
    if (lvChanged) {   // сменили сложность — пересчитываем карточки тем; выбранная тема без вопросов этой сложности снимается
        if (!qzThemeAllowed(QS.selT, QS.selL) || !qzLeft(QS.selT, QS.selL)) { qzRenderPick(); return; }
        const box = b.querySelector('.qz-themes'); if (box) box.innerHTML = qzThemeCards(QS.selL);
    }
    b.querySelectorAll('.qz-th').forEach(e => e.classList.toggle('on', e.dataset.th === QS.selT));
    b.querySelectorAll('.qz-lv').forEach(e => e.classList.toggle('on', e.dataset.lv === QS.selL));
    const current = b.querySelector('.qz-stick button'); if (current) current.outerHTML = qzGoBtn(quizDay());
}
function qzPickGo() {
    if (!qzLevelsOn().some(level => level.id === QS.selL)) return;
    if (!qzThemeAllowed(QS.selT, QS.selL)) { qzRenderPick(); return; }
    if (QS.mode === 'bonus') { qzStartBonus(); return; }
    if (qzLvLocked(QS.selL)) { qzPayOpen(QS.selL); return; }
    const d = quizDay();
    d.theme = QS.selT; d.lvl = QS.selL; quizSaveDay(d);
    try { localStorage.setItem('bubo_quiz_lvl', QS.selL); localStorage.setItem('bubo_quiz_theme', QS.selT); } catch (e) {}
    QS.phase = 'ready'; qzStartQuestion();
}
function qzRenderDone() {
    qzMusicBrowse();
    const d = quizDay(), body = qzBody(); if (!body) return;
    { const w = document.getElementById('qzWin'); if (w) w.classList.remove('busy'); }
    QS.phase = 'done';
    const ok = d.res.filter(r => r === 1).length;
    body.innerHTML = qzHead() + qzProg(d, -1) + qzBonusStock() + `<div class="qz-res"><div class="qz-big win"><i class="fa-solid fa-coins"></i></div>`
        + `<div class="qz-rt win">+${d.earned} ${ruPlural(d.earned, ['МОНЕТА', 'МОНЕТЫ', 'МОНЕТ'])}</div><div class="qz-rd">На сегодня всё! Верных ответов: <b>${ok} из ${QUIZ_PER_DAY}</b>.<br>Всего монет: <b style="color:#FFD66B">${qzCoinsTotal()}</b></div>`
        + `<div class="qz-timer"><i class="fa-regular fa-clock"></i> Новые вопросы через ${qzUntilTomorrow()}</div></div>`
        + `<div class="qz-btns"><button type="button" class="qz-btn gold" data-qa="shop"><i class="fa-solid fa-store"></i>В ЛАВКУ</button>`
        + `<button type="button" class="qz-btn sec" data-qa="close"><i class="fa-solid fa-house"></i>В ГЛАВНОЕ МЕНЮ</button></div>`;
}
// вопрос: pickL — что выбрали (после ответа), reveal — показать правильный
// плашка выбранной темы и сложности (над кружками вопросов); во время вопроса сменить нельзя
function qzCurPlate(d, canChange) {
    const th = qzTheme(d.theme), lv = qzLevel(d.lvl);
    return `<div class="qz-cur" style="--tc:${th.col}"><span class="qz-thi"><i class="fa-solid ${th.icon}"></i></span><span class="qz-curt"><b>${th.name}</b><span><em style="color:${lv.col}">${lv.name}</em> · ${QZ_COIN} +${qzReward(lv.id)}</span></span><button type="button" class="qz-chg" data-qa="pick"${canChange ? '' : ' disabled'}>Сменить</button></div>`;
}
// две кнопки в ряд: назад к выбору темы и в главное меню
function qzNavRow(on) {
    const dis = on ? '' : ' disabled';
    return `<div class="qz-nav"><button type="button" class="qz-btn sec" data-qa="pick"${dis}><i class="fa-solid fa-arrow-left"></i>НАЗАД</button>`
        + `<button type="button" class="qz-btn sec" data-qa="close"${dis}><i class="fa-solid fa-house"></i>В МЕНЮ</button></div>`;
}
function qzRenderQ(reveal) {
    const a = QS.attempt, body = qzBody();
    if (!a || !body) return;
    const d = reveal ? QS.dayResult : quizDay(a.day);
    const q = QUIZ_QUESTIONS.find(x => x.id === a.question);
    const ord = a.ord.split('');
    const corL = QZ_LETTERS[ord.indexOf(q.correct)], pickL = a.outcome?.letter;
    const reward = qzReward(q.lvl), bonus = a.mode === 'bonus';
    const idx = reveal ? d.ids.length - 1 : d.ids.length;
    const disabled = reveal || QS.phase !== 'answer' ? ' disabled' : '';
    const opts = QZ_LETTERS.map((L, i) => {
        const cls = reveal ? (L === corL ? ' ok' : L === pickL ? ' bad' : ' dim') : '';
        return `<button type="button" class="qz-o${cls}" data-qa="${L}"${disabled} style="--c:${QZ_BALL_COL[L]}"><b style="background:${QZ_BALL_COL[L]}${qzTxt(L)}">${L}</b><span>${q.options[ord[i]]}</span></button>`;
    }).join('');
    const balls = QZ_LETTERS.map(L => `<button type="button" class="qz-ball${reveal ? (L === corL ? ' ok' : L === pickL ? ' bad' : '') + (L === pickL ? ' picked' : '') : ''}" data-qa="${L}"${disabled} style="--c:${QZ_BALL_COL[L]}${qzTxt(L)}">${L}</button>`).join('');
    const C = 2 * Math.PI * 15;
    const ring = `<div class="qz-tm" id="qzTm"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15"/><circle class="fg" id="qzTmFg" cx="18" cy="18" r="15" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"/></svg><i class="fa-solid fa-eye" id="qzTmI"></i><b id="qzTmN"></b></div>`;
    let note = '', btns = '';
    if (reveal) {
        const okA = pickL === corL;
        note = okA ? `<div class="qz-note ok">Верно! +${reward} ${ruPlural(reward, ['монета', 'монеты', 'монет'])}</div>` : (pickL ? '<div class="qz-note bad">Неверно</div>' : '<div class="qz-note bad">Время вышло</div>');
        const last = d.ids.length >= QUIZ_PER_DAY;
        const { enabled, available } = qzBonusStatus();
        const newDay = !bonus && a.day !== qzToday();
        const action = bonus ? (enabled && available ? 'bonus' : 'daily') : 'go';
        const label = bonus ? (action === 'bonus' ? 'СЛЕДУЮЩИЙ БОНУС' : 'К ВОПРОСАМ ДНЯ')
            : newDay ? 'К ВОПРОСАМ НОВОГО ДНЯ' : last ? 'ИТОГИ ДНЯ' : 'СЛЕДУЮЩИЙ ВОПРОС';
        btns = `<div class="qz-btns"><button type="button" class="btn-bubo qz-btn" data-qa="${action}"><i class="fa-solid fa-forward"></i>${label}</button>`
            + qzNavRow(true) + '</div>';
    } else {
        note = `<div class="qz-note read" id="qzNote">${QS.phase === 'read' ? 'Читайте вопрос…' : 'Выбирайте ответ!'}</div>`;
        // пока идёт вопрос — выйти в меню нельзя: кнопка неактивна, включится, когда покажется ответ
        btns = `<div class="qz-btns">${qzNavRow(false)}</div>`;
    }
    { const w = document.getElementById('qzWin'); if (w) w.classList.toggle('busy', !reveal); }
    const tcc = qzLevel(q.lvl).col || qzTheme(a.theme).col;
    body.innerHTML = qzHead() + qzCurPlate(a, reveal) + (bonus ? qzBonusStock(false) : qzProg(d, idx))
        + `<div class="qz-card" style="--tc:${tcc}">${reveal ? '' : ring}`
        + `<div class="qz-q">${q.question}</div><div class="qz-rew">${QZ_COIN}<span>За верный ответ: <b>+${reward}</b></span></div><div class="qz-opts">${opts}</div></div>`
        + `<div class="qz-abcd${reveal ? ' lock' : (QS.phase === 'read' ? ' wait' : '')}" id="qzAbcd">${balls}</div>` + note + btns;
}
// таймер на обводке: при чтении кольцо заполняется голубым (5 с), потом убывает оранжевым — 10 с на ответ
function qzTick() {
    cancelAnimationFrame(QS.raf);
    if (QS.phase !== 'read' && QS.phase !== 'answer') return;
    const t = Math.max(0, (Date.now() - QS.attempt.startedAt) / 1000), C = 2 * Math.PI * 15;
    if (t >= QZ_READ + QZ_ANSWER) { qzAnswer(null); return; }
    const fg = document.getElementById('qzTmFg'), tm = document.getElementById('qzTm'), nb = document.getElementById('qzTmN'), ic = document.getElementById('qzTmI');
    if (QS.phase === 'read' && t >= QZ_READ) {
        QS.phase = 'answer';
        const ab = document.getElementById('qzAbcd'); if (ab) ab.classList.remove('wait');
        const note = document.getElementById('qzNote'); if (note) { note.textContent = 'Выбирайте ответ!'; note.className = 'qz-note'; }
        const body = qzBody(); if (body) body.querySelectorAll('.qz-o, .qz-ball').forEach(button => { button.disabled = false; });
        if (tm) tm.classList.add('ans');
        if (ic) ic.style.display = 'none';
        try { AudioFX.playShazamArm && AudioFX.playShazamArm(); } catch (e) {}
    }
    if (QS.phase === 'read') {
        if (fg) fg.setAttribute('stroke-dashoffset', (C * (1 - t / QZ_READ)).toFixed(2));
    } else {
        const left = QZ_READ + QZ_ANSWER - t;
        if (fg) fg.setAttribute('stroke-dashoffset', (C * (1 - left / QZ_ANSWER)).toFixed(2));
        if (nb) nb.textContent = String(Math.ceil(left));
        if (tm) tm.classList.toggle('low', left <= 3);
    }
    QS.raf = requestAnimationFrame(qzTick);
}
// в свёрнутой игре кадры не рисуются — таймер всё равно идёт: проверяем по часам и сразу при возвращении
setInterval(() => { if (document.hidden && (QS.phase === 'read' || QS.phase === 'answer')) qzTick(); }, 500);
document.addEventListener('visibilitychange', () => { if (!document.hidden && (QS.phase === 'read' || QS.phase === 'answer')) qzTick(); });
// во время вопроса кнопка/жест «назад» не уводит из игры
function qzTrapBack() { try { if (!history.state?.qz) history.pushState({ qz: 1 }, ''); } catch (e) {} }
window.addEventListener('popstate', () => { if (['read', 'answer', 'picking', 'pick'].includes(QS.phase)) qzTrapBack(); });
function qzStartQuestion() {
    const pending = qzReadAttempt();
    if (pending) { qzResumeAttempt(pending); return; }
    const d = quizDay();
    QS.mode = 'daily';
    if (d.ids.length >= QUIZ_PER_DAY) { qzRenderDone(); return; }
    if (!d.theme || !qzLevelsOn().some(level => level.id === d.lvl)) { qzRenderPick(); return; }
    if (qzLvLocked(d.lvl)) {
        d.lvl = ''; quizSaveDay(d); QS.selL = undefined;
        qzRenderPick('Доступ к выбранной сложности закончился. Выберите открытый уровень.');
        return;
    }
    if (!qzThemeAllowed(d.theme, d.lvl)) { d.theme = 'all'; quizSaveDay(d); }
    const question = quizNextId(d);
    if (!question) {
        QS.selT = d.theme; QS.selL = d.lvl;
        qzRenderPick();
        return;
    }
    qzBegin('daily', question, d.theme, d.lvl);
}
function qzStartBonus(token = '', theme = QS.selT) {
    const pending = qzReadAttempt();
    if (pending) { qzResumeAttempt(pending); return; }
    const { enabled, available, thematicEnabled } = qzBonusStatus();
    if (!enabled || available < 1) { qzRenderPick('Заработайте ещё один бонусный вопрос в полёте.'); return; }
    const lvl = token ? QZ_TRIAL_LVL : QS.selL;
    if (token && (!thematicEnabled || !FlightQuizBonus.themes().includes(token) || !qzTrialTopics(token).includes(theme))) {
        qzRenderPick('Этот тематический бонус уже недоступен. Выберите другой вопрос.');
        return;
    }
    if (!QZ_BONUS_LEVELS.includes(lvl) || !qzThemeAllowed(theme, lvl)) { qzRenderPick(); return; }
    const question = quizNextId({ theme, lvl, ids: [] });
    if (!question) { qzRenderPick(); return; }
    qzBegin('bonus', question, theme, lvl, token);
}
function qzBegin(mode, question, theme, lvl, token = '') {
    const startedAt = Date.now();
    const id = globalThis.crypto?.randomUUID?.() || startedAt + '-' + Math.random().toString(36).slice(2);
    const a = { id, mode, question, theme, lvl, token, startedAt, day: qzToday(), ord: qzShuffleOrd() };
    if (!qzSaveAttempt(a)) { qzRenderPick('Не удалось сохранить вопрос. Попробуйте начать ещё раз.'); return; }
    qzResumeAttempt(a);
}
function qzResumeAttempt(a) {
    clearTimeout(QS.revealT);
    QS.attempt = a; QS.mode = a.mode;
    QS.selT = a.theme; QS.selL = a.lvl;
    if (a.outcome) { qzFinishAttempt(a); return; }
    if (a.mode === 'bonus' && typeof FlightQuizBonus !== 'undefined' && typeof FlightQuizBonus.reserve === 'function'
        && !FlightQuizBonus.reserve(a.id, a.token || '')) {
        qzSaveAttempt(null);
        QS.attempt = null;
        qzRenderPick('Этот бонус недоступен. Вернитесь в полёт или к вопросам дня.');
        return;
    }
    if (a.selected) { QS.phase = 'answer'; qzAnswer(a.selected.letter); return; }
    QS.phase = 'read';
    qzTrapBack();
    try {
        AudioFX.thinkLv = a.lvl;
        if (AudioFX.mode !== 'think' && AudioFX._pendMode !== 'think') AudioFX.setMode('think', { fade: true });
    } catch (e) {}
    qzRenderQ(false);
    qzTick();
}
function qzRetryAttempt() {
    const a = qzReadAttempt();
    if (a) qzResumeAttempt(a);
    else qzOpen(QS.mode);
}
function qzSaveRetry() {
    const body = qzBody();
    if (!body) return;
    document.getElementById('qzWin')?.classList.remove('busy');
    QS.phase = 'retry';
    body.innerHTML = qzHead() + '<div class="qz-msg">Сохранение ответа не завершилось. Попробуйте ещё раз.</div>'
        + '<button type="button" class="btn-bubo qz-btn" data-qa="retry">ПОВТОРИТЬ СОХРАНЕНИЕ</button>';
}
function qzRecordDay(a, reward) {
    const d = quizDay(a.day);
    if (!d.ids.includes(a.question)) {
        d.ids.push(a.question);
        d.res.push(a.outcome.correct ? 1 : 0);
        if (a.outcome.correct) d.earned += reward;
    }
    d.cur = 0; d.ord = ''; d.shown = false;
    QS.dayResult = d;
    const stored = qzStoredDay();
    return (a.day !== qzToday() && stored && stored.d !== a.day) || quizSaveDay(d);
}
function qzFinishAttempt(a) {
    if (qzReadAttempt()?.id !== a.id) { qzOpen(a.mode); return; }
    const { correct, letter, elapsedMs } = a.outcome, bonus = a.mode === 'bonus';
    const reward = qzReward(a.lvl, bonus), receipt = 'quiz:' + a.id;
    if (bonus) {
        const spent = typeof FlightQuizBonus !== 'undefined' && FlightQuizBonus.spend(a.id, a.token || '');
        if (!spent) { qzSaveRetry(); return; }
        QS.dayResult = quizDay(a.day);
    } else if (!qzRecordDay(a, reward)) { qzSaveRetry(); return; }
    if (!quizMarkSeen(a.question)) { qzSaveRetry(); return; }
    if (correct && typeof coinsAddOnce === 'function' && !coinsAddOnce(reward, receipt)) { qzSaveRetry(); return; }
    if (typeof profOnQuizOnce === 'function' && !profOnQuizOnce(correct, reward, receipt)) { qzSaveRetry(); return; }
    if (!qzSaveAttempt(null)) { qzSaveRetry(); return; }
    if (correct && typeof coinsAddOnce !== 'function' && typeof coinsAdd === 'function') coinsAdd(reward);
    if (typeof profOnQuizOnce !== 'function' && typeof profOnQuiz === 'function') profOnQuiz(correct, reward);
    QS.phase = 'reveal'; QS.attempt = a;
    qzRenderQ(true);
    window.BuboPlaytest?.record?.('quiz:answered', { mode: a.mode, correct, timedOut: letter === null, elapsedMs, level: a.lvl, coins: correct ? reward : 0 });
    try {
        if (correct) { AudioFX.playThemeCollect(); Haptics.collectTheme(); }
        else { (AudioFX.playThemeLose || AudioFX.playHit).call(AudioFX); Haptics.hit(); }
    } catch (e) {}
    if (correct) qzGainFx(reward);
    quizMenuBadge();
}
// Ответ сохраняется вместе с идентификатором попытки до начисления наград.
function qzAnswer(L) {
    if (!['read', 'answer', 'picking'].includes(QS.phase)) return;
    if (QS.phase === 'read' && L !== null) return;
    cancelAnimationFrame(QS.raf);
    const a = qzReadAttempt();
    if (!a || a.id !== QS.attempt?.id) { qzOpen(QS.mode); return; }
    if (!a.outcome) {
        const q = QUIZ_QUESTIONS.find(x => x.id === a.question);
        const selectedAt = a.selected?.at || Date.now();
        const elapsedMs = Math.min(QZ_ANSWER * 1000, Math.max(0, selectedAt - a.startedAt - QZ_READ * 1000));
        const letter = a.selected?.letter || (elapsedMs < QZ_ANSWER * 1000 && QZ_LETTERS.includes(L) ? L : null);
        a.outcome = { letter, elapsedMs, correct: letter !== null && a.ord[QZ_LETTERS.indexOf(letter)] === q.correct };
        if (!qzSaveAttempt(a)) { qzSaveRetry(); return; }
    }
    qzFinishAttempt(a);
}
// заработали монеты: у счётчика «+N» справа от кружков всплывает прибавка, счётчик вспыхивает золотом, разлетаются искорки
function qzGainFx(n) {
    const w = document.getElementById('qzWin'), c = w && w.querySelector('.qz-cnt'); if (!c) return;
    // точно над иконкой монет: считаем по offset-цепочке (не зависит от zoom окна на ПК)
    const ic = c.querySelector('.qz-coin') || c;
    let x = ic.offsetWidth / 2, y = 0, el = ic;
    while (el && el !== w) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    if (el !== w) { const wr = w.getBoundingClientRect(), rr = ic.getBoundingClientRect(); x = rr.left - wr.left + rr.width / 2; y = rr.top - wr.top + w.scrollTop; }
    const r = { height: ic.offsetHeight || 14 };
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    const g = document.createElement('div'); g.className = 'qz-gain';
    g.style.left = x + 'px'; g.style.top = (y - 18) + 'px'; g.innerHTML = '+' + n;
    w.appendChild(g); setTimeout(() => g.remove(), 950);
    for (let i = 0; i < 9; i++) {
        const s = document.createElement('i'); s.className = 'qz-spark';
        const a = Math.PI * 2 * i / 9 + Math.random() * 0.4, d = 14 + Math.random() * 10;
        s.style.left = x + 'px'; s.style.top = (y + r.height / 2) + 'px';
        s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(1) + 'px');
        w.appendChild(s); setTimeout(() => s.remove(), 800);
    }
}
function qzPick(L) {
    if (QS.phase !== 'answer') return;
    const a = qzReadAttempt(), now = Date.now();
    if (!a || a.id !== QS.attempt?.id) { qzOpen(QS.mode); return; }
    if (a.outcome || a.selected) { qzResumeAttempt(a); return; }
    if (now >= a.startedAt + (QZ_READ + QZ_ANSWER) * 1000) { qzAnswer(null); return; }
    a.selected = { letter: L, at: now };
    if (!qzSaveAttempt(a)) { qzSaveRetry(); return; }
    // кнопка проминается, от неё разлетаются звёздочки, и только потом показываем ответ
    QS.phase = 'picking'; cancelAnimationFrame(QS.raf);
    const w = document.getElementById('qzWin'), ab = document.getElementById('qzAbcd'), b = ab && ab.querySelector(`[data-qa="${L}"]`);
    if (ab) ab.style.pointerEvents = 'none';
    qzBody()?.querySelectorAll('.qz-o, .qz-ball').forEach(button => { button.disabled = true; });
    try { AudioFX.playRouletteTick(); Haptics.vibrate(18); } catch (e) {}
    if (w && b) {
        b.classList.add('press');
        const wr = w.getBoundingClientRect(), r = b.getBoundingClientRect(), c = getComputedStyle(b).getPropertyValue('--c') || '#fff';
        const x = r.left - wr.left + r.width / 2, y = r.top - wr.top + w.scrollTop + r.height / 2;
        const rp = document.createElement('i'); rp.className = 'qz-ripple'; rp.style.left = x + 'px'; rp.style.top = y + 'px'; rp.style.setProperty('--c', c);
        w.appendChild(rp); setTimeout(() => rp.remove(), 500);
        for (let i = 0; i < 10; i++) {
            const s = document.createElement('i'); s.className = 'qz-star'; s.textContent = i % 2 ? '✦' : '★';
            const a = Math.PI * 2 * i / 10 + Math.random() * 0.5, d = 38 + Math.random() * 22;
            s.style.left = x + 'px'; s.style.top = y + 'px';
            s.style.setProperty('--s', (8 + Math.random() * 6).toFixed(0) + 'px'); s.style.setProperty('--c', i % 3 ? c : '#FFE08A');
            s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(1) + 'px');
            w.appendChild(s); setTimeout(() => s.remove(), 650);
        }
    }
    QS.revealT = setTimeout(() => { if (QS.phase === 'picking') qzAnswer(L); }, 260);
}
function openQuiz(e) {
    e?.stopPropagation?.();
    qzOpen('daily');
}
function openQuizBonus(e) {
    e?.stopPropagation?.();
    qzOpen('bonus');
}
function qzOpen(mode) {
    clearTimeout(QS.revealT);
    cancelAnimationFrame(QS.raf);
    QS.attempt = null;
    QS.mode = mode === 'bonus' && qzBonusStatus().enabled ? 'bonus' : 'daily';
    QS.selT = undefined; QS.selL = undefined;
    try { AudioFX.resume(); } catch (er) {}
    qzBuild();
    qzRoot.classList.remove('hidden');
    try { if (AudioFX.mode !== 'quiz' && AudioFX.mode !== 'think') { qzPrevMusic = AudioFX.mode; AudioFX.setMode('quiz', { fade: true }); } } catch (er) {}
    const pending = qzReadAttempt();
    if (pending) { qzResumeAttempt(pending); return; }
    // Старое сохранение не содержит времени начала; закрытый вопрос уже считался неотвеченным.
    const d = quizDay();
    if (d.cur) {
        if (d.shown && !d.ids.includes(d.cur) && QUIZ_QUESTIONS.some(q => q.id === d.cur)) {
            d.ids.push(d.cur); d.res.push(0); quizMarkSeen(d.cur);
        }
        d.cur = 0; d.ord = ''; d.shown = false;
        quizSaveDay(d);
    }
    if (QS.mode === 'bonus') qzRenderPick();
    else qzRenderReady();
}
function closeQuiz(e) {
    if (e) e.stopPropagation();
    cancelAnimationFrame(QS.raf); clearTimeout(QS.revealT);
    QS.phase = 'idle';
    if (qzRoot) { qzRoot.classList.add('hidden'); qzRoot.classList.remove('pay'); }
    quizMenuBadge();
    try { if (AudioFX.mode === 'quiz' || AudioFX._pendMode === 'quiz' || AudioFX.mode === 'think' || AudioFX._pendMode === 'think') AudioFX.setMode((AudioFX._wantMode && AudioFX._wantMode()) || (qzPrevMusic && qzPrevMusic !== 'quiz' && qzPrevMusic !== 'shop' ? qzPrevMusic : 'menu'), { fade: true }); } catch (er) {}
    try { updateHUDAll(); if (typeof shopSyncBtn === 'function') shopSyncBtn(); } catch (er) {}
}
function quizMenuBadge() {
    const b = document.getElementById('openQuizBtn'); if (!b) return;
    const { enabled, available } = qzBonusStatus(), count = enabled ? available : 0;
    const on = quizDayLeft() || count > 0;
    b.classList.toggle('has-q', on);
    const dot = document.getElementById('qzMenuBadge');
    if (dot) dot.classList.toggle('hidden', !on || count > 0);
}
(function () {
    const b = document.getElementById('openQuizBtn'); if (b) b.addEventListener('click', openQuiz);
    quizMenuBadge();
    setInterval(quizMenuBadge, 60000);   // наступил новый день — значок снова светится
    window.addEventListener('bubo:flight-bonus-change', quizMenuBadge);
    window.addEventListener('bubo:campaign-topics', () => {
        if (QS.phase === 'pick' && qzRoot && !qzRoot.classList.contains('hidden')) qzRenderPick();
    });
})();

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
            + '#adminModal .adq-o.ok i{margin-left:auto;color:#22C55E}'
            + '#adminModal .adq-filt{display:flex;flex-direction:column;gap:6px;padding:2px 0;min-width:0;max-width:100%;flex:0 0 auto}'
            + '#adminModal .adq-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px;min-width:0;max-width:100%}'
            + '#adminModal .adq-row::-webkit-scrollbar{display:none}'
            + '#adminModal .adq-f{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font:800 11px Onest,sans-serif;color:var(--fc);background:rgba(255,255,255,.04);border:1px solid color-mix(in srgb,var(--fc) 45%,transparent);cursor:pointer;white-space:nowrap}'
            + '#adminModal .adq-f b{font-weight:900;color:rgba(237,229,248,.6)}'
            + '#adminModal .adq-f.on{background:color-mix(in srgb,var(--fc) 22%,transparent);border-color:var(--fc);box-shadow:0 0 8px color-mix(in srgb,var(--fc) 40%,transparent)}'
            + '#adminModal .adq-cnt{font:700 11px Onest,sans-serif;color:rgba(196,161,255,.75);flex:0 0 auto}'
            + '#adminModal .adq-list{display:flex;flex-direction:column;gap:10px;flex:0 0 auto}'
            + '#adminModal .adq-more{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;font:700 12px Onest,sans-serif;color:rgba(196,161,255,.75);flex:0 0 auto}';
        document.head.appendChild(st);
    } catch (e) {}
})();
// админка «Вопросы»: сверху фильтры по темам (листаются вбок) и уровням, список подгружается порциями при прокрутке
const QZA = { th: 'all', lv: '', shown: 0, list: [] };
function quizAdminHtml() {
    const seen = quizSeen();
    const chips = [{ id: 'all', name: 'Все', col: '#C4A1FF', icon: 'fa-list' }].concat(QZ_THEMES.filter(t => t.id !== 'all'), [{ id: 'misc', name: 'Разное', col: '#94A3B8', icon: 'fa-shuffle' }])
        .map(t => { const n = t.id === 'all' ? QUIZ_QUESTIONS.length : QUIZ_QUESTIONS.filter(q => q.theme === t.id).length;
            return `<button type="button" class="adq-f${QZA.th === t.id ? ' on' : ''}" data-qf="${t.id}" style="--fc:${t.col}"><i class="fa-solid ${t.icon}"></i>${t.name}<b>${n}</b></button>`; }).join('');
    const lvls = [{ id: '', name: 'Любой', col: '#C4A1FF' }].concat(QZ_LEVELS).map(l => `<button type="button" class="adq-f${QZA.lv === l.id ? ' on' : ''}" data-ql="${l.id}" style="--fc:${l.col}">${l.name}${l.coins ? ' · ' + l.coins : ''}</button>`).join('');
    return `<div class="adm-sum"><span>Вопросов в базе / уже показано</span><b>${QUIZ_QUESTIONS.length} / ${seen.filter(id => QUIZ_QUESTIONS.some(q => q.id === id)).length}</b></div>`
        + `<div class="adq-acts"><button type="button" class="adq-btn pri" data-q="today"><i class="fa-solid fa-calendar-day"></i>Сбросить день</button>`
        + `<button type="button" class="adq-btn" data-q="reset"><i class="fa-solid fa-rotate-left"></i>Сбросить показанные</button></div>`
        + `<div class="adq-filt"><div class="adq-row">${chips}</div><div class="adq-row">${lvls}</div></div>`
        + `<div id="adqCount" class="adq-cnt"></div><div id="adqList" class="adq-list"></div><div id="adqMore" class="adq-more"><i class="fa-solid fa-spinner fa-spin"></i>Загрузка…</div>`;
}
function qzAdminCard(q, n, seen) {
    const was = seen.indexOf(q.id) >= 0, th = qzTheme(q.theme), lv = qzLevel(q.lvl);
    return `<div class="adq-card${was ? ' seen' : ''}"><div class="adq-head"><span class="adq-chip" style="color:${th.col};background:${th.col}22">${th.name}</span><span class="adq-chip" style="color:${lv.col}">${lv.name} · ${lv.coins}</span>${was ? '<span class="adq-chip seen">уже был</span>' : ''}<span class="adq-num">№${n + 1}</span></div>`
        + `<div class="adq-q">${q.question}</div><div class="adq-opts">`
        + QZ_LETTERS.filter(L => q.options[L] !== undefined).map(L => `<div class="adq-o${L === q.correct ? ' ok' : ''}"><b style="background:${QZ_BALL_COL[L]}">${L}</b><span>${q.options[L]}</span>${L === q.correct ? '<i class="fa-solid fa-check"></i>' : ''}</div>`).join('')
        + `</div></div>`;
}
function qzAdminMore(body) {
    const list = document.getElementById('adqList'), more = document.getElementById('adqMore'); if (!list) return;
    const seen = quizSeen(), from = QZA.shown, to = Math.min(QZA.list.length, from + 25);
    list.insertAdjacentHTML('beforeend', QZA.list.slice(from, to).map((q, i) => qzAdminCard(q, from + i, seen)).join(''));
    QZA.shown = to;
    if (more) more.style.display = QZA.shown < QZA.list.length ? '' : 'none';
}
function qzAdminFilter(body) {
    QZA.list = QUIZ_QUESTIONS.filter(q => (QZA.th === 'all' || q.theme === QZA.th) && (!QZA.lv || q.lvl === QZA.lv));
    QZA.shown = 0;
    const list = document.getElementById('adqList'); if (list) list.innerHTML = '';
    const c = document.getElementById('adqCount'); if (c) c.textContent = 'Найдено вопросов: ' + QZA.list.length;
    body.querySelectorAll('[data-qf]').forEach(e => e.classList.toggle('on', e.dataset.qf === QZA.th));
    body.querySelectorAll('[data-ql]').forEach(e => e.classList.toggle('on', e.dataset.ql === QZA.lv));
    qzAdminMore(body);
}
// вызывается админкой после вставки вкладки
function quizAdminMount(body) {
    qzAdminFilter(body);
    if (body.__adqBound) return;
    body.__adqBound = true;
    body.addEventListener('click', (e) => {
        const f = e.target.closest('[data-qf]'), l = e.target.closest('[data-ql]');
        if (f) { QZA.th = f.dataset.qf; qzAdminFilter(body); }
        else if (l) { QZA.lv = l.dataset.ql; qzAdminFilter(body); }
    });
    // подгрузка при прокрутке: когда до конца списка остаётся меньше экрана
    body.addEventListener('scroll', () => {
        if (!document.getElementById('adqList') || QZA.shown >= QZA.list.length) return;
        if (body.scrollTop + body.clientHeight > body.scrollHeight - 300) qzAdminMore(body);
    }, { passive: true });
}
