// ===== ВОПРОСЫ ЗА ПОПЫТКИ =====
// Кнопка в главном меню (под рулеткой) открывает окно «Вопросы дня». В день — до 5 вопросов; 3 верных ответа дают +1 попытку,
// после этого (или когда 3 верных уже не набрать) вопросы закрываются до завтра. Вопросы не повторяются, пока не пройдена вся база.
// Порядок вариантов перемешивается при каждом показе. Админка, вкладка «Вопросы»: список, сброс показанных и сброс дня.

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

const QUIZ_PER_DAY = 5, QUIZ_NEED_OK = 3;
const QUIZ_SEEN_KEY = 'bubo_quiz_seen', QUIZ_DAY_KEY = 'bubo_quiz_day';
const QZ_LETTERS = ['A', 'B', 'C', 'D'];
const QZ_BALL_COL = { A: '#FE7600', B: '#A855F7', C: '#38BDF8', D: '#F43F5E' };

// старый «квиз-мир» убран: заглушки для мест, которые его вызывали
const QZ = { on: false, phase: '' };
function quizActive() { return false; }
function quizUpdate() {} function quizUpdate2D() {} function quizDraw() {} function quizDrawPortal2D() {}
function quizOnTheme() {} function quizResetProgress() {} function quizAbort() {} function quizUI() {} function quizForcePortal() {}

// ---------- какие вопросы игрок уже видел ----------
function quizSeen() { try { return JSON.parse(localStorage.getItem(QUIZ_SEEN_KEY)) || []; } catch (e) { return []; } }
function quizMarkSeen(id) { try { const s = quizSeen(); if (s.indexOf(id) < 0) { s.push(id); localStorage.setItem(QUIZ_SEEN_KEY, JSON.stringify(s)); } } catch (e) {} }
function quizResetSeen() { try { localStorage.removeItem(QUIZ_SEEN_KEY); } catch (e) {} }
function quizNextId(day) {
    let seen = quizSeen();
    let free = QUIZ_QUESTIONS.filter(q => seen.indexOf(q.id) < 0 && day.ids.indexOf(q.id) < 0);
    if (!free.length) { quizResetSeen(); free = QUIZ_QUESTIONS.filter(q => day.ids.indexOf(q.id) < 0); }   // вся база пройдена — идём по кругу
    return free.length ? free[Math.floor(Math.random() * free.length)].id : QUIZ_QUESTIONS[0].id;
}

// ---------- прогресс дня ----------
function qzToday() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function quizDay() {
    let d = null; try { d = JSON.parse(localStorage.getItem(QUIZ_DAY_KEY)); } catch (e) {}
    if (!d || d.d !== qzToday()) d = { d: qzToday(), ids: [], res: [], ok: 0, cur: 0, ord: '', got: false, done: false };
    return d;
}
function quizSaveDay(d) { try { localStorage.setItem(QUIZ_DAY_KEY, JSON.stringify(d)); } catch (e) {} }
function quizResetDay() { try { localStorage.removeItem(QUIZ_DAY_KEY); } catch (e) {} quizMenuBadge(); }
function quizDayLeft() { const d = quizDay(); return !d.done; }
function qzShuffleOrd() { const a = QZ_LETTERS.slice(); for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(''); }

// ---------- окно ----------
(function () {
    try {
        const st = document.createElement('style');
        st.textContent = `
#openQuizBtn.rw-menu-btn{z-index:6;zoom:var(--ui-zoom,1);position:absolute!important;top:56px!important;right:14px!important;left:auto!important;width:36px!important;height:36px!important;border-radius:12px!important;font-size:13px!important;color:#E9D5FF!important;background-color:rgba(29,9,54,.72)!important;border:1px solid rgba(120,44,233,.6)!important;box-shadow:0 6px 14px rgba(0,0,0,.3)!important}
#openQuizBtn.rw-menu-btn.has-q{color:#38BDF8!important;border-color:#38BDF8!important;box-shadow:0 0 12px rgba(56,189,248,.5)!important}
#openQuizBtn .rw-badge{top:-5px;right:-5px;min-width:10px;width:10px;height:10px;padding:0;background:#38BDF8;border:1.5px solid #1d0936;font-size:0}
#openAdminBtn.rw-menu-btn{zoom:var(--ui-zoom,1);top:100px!important;right:14px!important;width:36px!important;height:36px!important;border-radius:12px!important;font-size:12px!important}
#quizModal{position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(20,3,38,.25);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
#quizModal.hidden{display:none}
#qzWin{position:relative;width:100%;max-width:360px;max-height:100%;overflow-y:auto;border-radius:28px;padding:22px 18px 22px;display:flex;flex-direction:column;gap:16px;font-family:Onest,sans-serif;color:#fff;
 background:radial-gradient(120% 60% at 50% -10%,rgba(56,189,248,.16),transparent 60%),radial-gradient(90% 50% at 100% 110%,rgba(254,118,0,.12),transparent 60%),rgba(29,9,54,.97);border:1px solid rgba(120,44,233,.6);box-shadow:0 10px 40px rgba(0,0,0,.5)}
#qzWin .qz-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#C4A1FF;background:rgba(120,44,233,.18);border:1px solid rgba(120,44,233,.4);font-size:13px;cursor:pointer}
#qzWin .qz-head{display:flex;align-items:center;gap:10px;padding-right:38px}
#qzWin .qz-emb{flex:0 0 40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:18px;background:linear-gradient(135deg,#FE7600,#782CE9);border:1px solid rgba(255,255,255,.3);box-shadow:0 0 16px rgba(254,118,0,.45)}
#qzWin .qz-title{font-weight:900;font-size:18px;letter-spacing:-.01em;line-height:1}
#qzWin .qz-sub{font-weight:600;font-size:11.5px;color:#C4B5FD;margin-top:5px;line-height:1.35}
#qzWin .qz-prog{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:14px;background:rgba(20,3,38,.7);border:1px solid rgba(120,44,233,.3)}
#qzWin .qz-dots{display:flex;gap:6px}
#qzWin .qz-dot{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;background:rgba(255,255,255,.06);border:1.5px solid rgba(196,161,255,.3);color:transparent;transition:all .25s}
#qzWin .qz-dot.cur{border-color:#FE7600;box-shadow:0 0 8px rgba(254,118,0,.6)}
#qzWin .qz-dot.ok{background:#22C55E;border-color:#86EFAC;color:#fff}
#qzWin .qz-dot.bad{background:#EF4444;border-color:#FCA5A5;color:#fff}
#qzWin .qz-cnt{font-weight:800;font-size:11px;color:#C4B5FD;white-space:nowrap}
#qzWin .qz-cnt b{color:#fff;font-weight:900}
#qzWin .qz-card{padding:16px 14px 14px;border-radius:20px;background:linear-gradient(180deg,rgba(120,44,233,.22),rgba(120,44,233,.08));border:1px solid rgba(168,120,245,.45);display:flex;flex-direction:column;gap:14px}
#qzWin .qz-meta{display:flex;align-items:center;gap:6px}
#qzWin .qz-chip{font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:8px;background:rgba(56,189,248,.16);color:#7DD3FC;border:1px solid rgba(56,189,248,.35)}
#qzWin .qz-n{margin-left:auto;font-weight:800;font-size:11px;color:rgba(196,161,255,.75)}
#qzWin .qz-q{font-weight:900;font-size:17px;line-height:1.35;padding:2px 2px 0}
#qzWin .qz-opts{display:grid;grid-template-columns:1fr 1fr;gap:9px}
#qzWin .qz-o{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-height:74px;padding:10px 11px 11px;border-radius:15px;background:rgba(20,3,38,.6);border:1px solid rgba(120,44,233,.32);font-weight:700;font-size:13px;line-height:1.3;transition:all .25s}
#qzWin .qz-o b{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#fff;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
#qzWin .qz-o.ok{background:rgba(34,197,94,.2);border-color:#22C55E}
#qzWin .qz-o.bad{background:rgba(239,68,68,.2);border-color:#EF4444}
#qzWin .qz-o.dim{opacity:.45}
#qzWin .qz-abcd{display:flex;justify-content:space-between;gap:8px;padding:6px 6px 2px}
#qzWin .qz-ball{flex:0 0 auto;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:26px;color:#fff;cursor:pointer;border:2px solid rgba(255,255,255,.55);
 background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.55),rgba(255,255,255,0) 42%),var(--c);box-shadow:0 0 14px var(--c),inset 0 -5px 0 rgba(0,0,0,.22);text-shadow:0 2px 3px rgba(0,0,0,.3);transition:transform .15s,opacity .25s,filter .25s}
#qzWin .qz-ball:active{transform:scale(.92)}
#qzWin .qz-abcd.lock .qz-ball{pointer-events:none;opacity:.35;filter:saturate(.4)}
#qzWin .qz-abcd.lock .qz-ball.ok{opacity:1;filter:none;--c:#22C55E!important;transform:scale(1.08)}
#qzWin .qz-abcd.lock .qz-ball.bad{opacity:1;filter:none;--c:#EF4444!important}
#qzWin .qz-res{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:8px 4px 4px}
#qzWin .qz-big{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#fff;margin:4px 0}
#qzWin .qz-big.win{background:radial-gradient(circle at 35% 30%,#FFD27A,#FE7600 60%,#C2410C);box-shadow:0 0 30px rgba(254,118,0,.65);animation:qzPop .6s cubic-bezier(.2,1.6,.4,1)}
#qzWin .qz-big.lose{background:radial-gradient(circle at 35% 30%,#C4A1FF,#782CE9 60%,#4C1D95);box-shadow:0 0 22px rgba(120,44,233,.55)}
#qzWin .qz-big.start{background:radial-gradient(circle at 35% 30%,#BAE6FD,#38BDF8 55%,#0369A1);box-shadow:0 0 26px rgba(56,189,248,.55)}
@keyframes qzPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
#qzWin .qz-rt{font-weight:900;font-size:20px;line-height:1.1}
#qzWin .qz-rt.win{color:#FE7600}
#qzWin .qz-rd{font-weight:600;font-size:12.5px;line-height:1.4;color:#DDD6FE}
#qzWin .qz-rd b{color:#fff;font-weight:900}
#qzWin .qz-rules{display:flex;flex-direction:column;gap:9px;width:100%;margin:4px 0}
#qzWin .qz-rule{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:13px;background:rgba(20,3,38,.6);border:1px solid rgba(120,44,233,.3);font-weight:700;font-size:12px;text-align:left}
#qzWin .qz-rule i{flex:0 0 22px;text-align:center;color:#38BDF8;font-size:14px}
#qzWin .qz-btn{width:100%;padding:13px 10px;border-radius:16px;font-weight:900;font-size:13px;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
#qzWin .qz-btn.sec{background:rgba(45,14,82,.9);border:1px solid rgba(168,85,247,.5);color:#fff;font-size:11px;padding:10px}
#qzWin .qz-timer{font-weight:800;font-size:11px;color:#7DD3FC}
`;
        document.head.appendChild(st);
    } catch (e) {}
})();

let qzRoot = null, qzLock = false;
function qzBuild() {
    if (qzRoot) return qzRoot;
    const host = document.getElementById('gameContainer') || document.body;
    qzRoot = document.createElement('div');
    qzRoot.id = 'quizModal'; qzRoot.className = 'hidden';
    qzRoot.innerHTML = '<div id="qzWin"><button type="button" class="qz-x" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button><div id="qzBody"></div></div>';
    host.appendChild(qzRoot);
    ['click', 'pointerdown', 'touchstart'].forEach((ev) => qzRoot.addEventListener(ev, (e) => e.stopPropagation()));
    qzRoot.querySelector('.qz-x').addEventListener('click', closeQuiz);
    qzRoot.addEventListener('click', (e) => {
        if (e.target === qzRoot) { closeQuiz(); return; }
        const b = e.target.closest('[data-qa]'); if (!b) return;
        const a = b.dataset.qa;
        if (a === 'start') qzNext();
        else if (a === 'close') closeQuiz();
        else if (a.length === 1) qzPick(a);
    });
    return qzRoot;
}
function qzHead() {
    return '<div class="qz-head"><div class="qz-emb"><i class="fa-solid fa-circle-question"></i></div><div><div class="qz-title">ВОПРОСЫ ДНЯ</div>'
        + '<div class="qz-sub">Отвечая на вопросы, вы можете заработать попытки в игре</div></div></div>';
}
function qzProg(d, curIdx) {
    let dots = '';
    for (let i = 0; i < QUIZ_PER_DAY; i++) {
        const r = d.res[i];
        dots += `<div class="qz-dot${r === 1 ? ' ok' : r === 0 ? ' bad' : i === curIdx ? ' cur' : ''}">${r === 1 ? '<i class="fa-solid fa-check"></i>' : r === 0 ? '<i class="fa-solid fa-xmark"></i>' : ''}</div>`;
    }
    return `<div class="qz-prog"><div class="qz-dots">${dots}</div><div class="qz-cnt">Верно: <b>${d.ok}</b> / ${QUIZ_NEED_OK}</div></div>`;
}
function qzUntilTomorrow() {
    const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.max(0, Math.floor((t - n) / 1000));
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return `${h} ч ${String(m).padStart(2, '0')} мин`;
}
function qzRender(pickL, dShow) {
    const body = document.getElementById('qzBody'); if (!body) return;
    const d = dShow || quizDay();
    if (d.done) {
        const win = d.got;
        body.innerHTML = qzHead() + qzProg(d, -1) + `<div class="qz-res"><div class="qz-big ${win ? 'win' : 'lose'}"><i class="fa-solid ${win ? 'fa-rotate-right' : 'fa-moon'}"></i></div>`
            + (win ? `<div class="qz-rt win">+1 ПОПЫТКА!</div><div class="qz-rd">Отлично! <b>${d.ok} верных ответа</b> — попытка уже добавлена. Новые вопросы будут завтра.</div>`
                   : `<div class="qz-rt">Сегодня не вышло</div><div class="qz-rd">Верных ответов: <b>${d.ok} из ${QUIZ_NEED_OK}</b>. Завтра будут новые вопросы и новый шанс заработать попытку.</div>`)
            + `<div class="qz-timer"><i class="fa-regular fa-clock"></i> Новые вопросы через ${qzUntilTomorrow()}</div></div>`
            + `<button type="button" class="btn-bubo qz-btn" data-qa="close"><i class="fa-solid fa-check"></i>ПОНЯТНО</button>`;
        return;
    }
    if (!d.cur) {
        body.innerHTML = qzHead() + `<div class="qz-res"><div class="qz-big start"><i class="fa-solid fa-lightbulb"></i></div>`
            + `<div class="qz-rules"><div class="qz-rule"><i class="fa-solid fa-list-ol"></i><span>В день — ${QUIZ_PER_DAY} вопросов из разных тем</span></div>`
            + `<div class="qz-rule"><i class="fa-solid fa-circle-check"></i><span>Ответьте верно на ${QUIZ_NEED_OK} — и получите <b style="color:#FE7600">+1 попытку</b></span></div>`
            + `<div class="qz-rule"><i class="fa-solid fa-hand-pointer"></i><span>Выбирайте ответ большими кнопками A, B, C, D</span></div></div>`
            + (d.ids.length ? `<div class="qz-rd">Отвечено: <b>${d.ids.length} из ${QUIZ_PER_DAY}</b>, верно: <b>${d.ok}</b></div>` : '')
            + `</div><button type="button" class="btn-bubo qz-btn" data-qa="start"><i class="fa-solid fa-play"></i>${d.ids.length ? 'ПРОДОЛЖИТЬ' : 'НАЧАТЬ'}</button>`;
        return;
    }
    const q = QUIZ_QUESTIONS.find(x => x.id === d.cur) || QUIZ_QUESTIONS[0];
    const ord = (d.ord || 'ABCD').split('');   // ord[i] — какой исходный вариант стоит под буквой QZ_LETTERS[i]
    const idx = d.ids.indexOf(q.id) >= 0 ? d.ids.indexOf(q.id) : d.ids.length;
    const corL = QZ_LETTERS[ord.indexOf(q.correct)];
    const opts = QZ_LETTERS.map((L, i) => {
        const cls = pickL ? (L === corL ? ' ok' : L === pickL ? ' bad' : ' dim') : '';
        return `<div class="qz-o${cls}"><b style="background:${QZ_BALL_COL[L]}">${L}</b><span>${q.options[ord[i]]}</span></div>`;
    }).join('');
    const balls = QZ_LETTERS.map(L => `<button type="button" class="qz-ball${pickL ? (L === corL ? ' ok' : L === pickL ? ' bad' : '') : ''}" data-qa="${L}" style="--c:${QZ_BALL_COL[L]}">${L}</button>`).join('');
    body.innerHTML = qzHead() + qzProg(d, idx)
        + `<div class="qz-card"><div class="qz-meta"><span class="qz-chip">${q.cat || 'Вопрос'}</span><span class="qz-n">Вопрос ${idx + 1} из ${QUIZ_PER_DAY}</span></div><div class="qz-q">${q.question}</div><div class="qz-opts">${opts}</div></div>`
        + `<div class="qz-abcd${pickL ? ' lock' : ''}">${balls}</div>`;
}
function qzNext() {
    const d = quizDay(); if (d.done) { qzRender(); return; }
    if (!d.cur) { d.cur = quizNextId(d); d.ord = qzShuffleOrd(); quizSaveDay(d); }
    qzRender();
}
function qzPick(L) {
    if (qzLock) return;
    const d = quizDay(); if (d.done || !d.cur) return;
    const q = QUIZ_QUESTIONS.find(x => x.id === d.cur); if (!q) return;
    const ord = (d.ord || 'ABCD').split('');
    const ok = ord[QZ_LETTERS.indexOf(L)] === q.correct;
    d.ids.push(q.id); d.res.push(ok ? 1 : 0); if (ok) d.ok++;
    quizMarkSeen(q.id);
    const cur = d.cur; d.cur = 0;
    let award = false;
    if (d.ok >= QUIZ_NEED_OK) { d.done = true; d.got = true; award = true; }
    else if (d.ids.length >= QUIZ_PER_DAY || (QUIZ_PER_DAY - d.ids.length) < (QUIZ_NEED_OK - d.ok)) d.done = true;   // 3 верных уже не набрать — до завтра
    quizSaveDay(d);
    if (award) qzAward();
    try { if (ok) { AudioFX.playThemeCollect(); Haptics.collectTheme(); } else { (AudioFX.playThemeLose || AudioFX.playHit).call(AudioFX); Haptics.hit(); } } catch (e) {}
    // показываем ответ на том же вопросе, потом — следующий или итог
    const dd = Object.assign({}, d, { cur: cur, ids: d.ids.slice(0, -1).concat([cur]) });
    dd.done = false; qzLock = true; qzRender(L, dd);
    setTimeout(() => { qzLock = false; if (qzRoot && !qzRoot.classList.contains('hidden')) { const d2 = quizDay(); if (d2.done) qzRender(); else qzNext(); } }, 1500);
    quizMenuBadge();
}
function qzAward() {
    try {
        attempts = Math.min(99, attempts + 1); zeroDay = '';
        StorageManager.save(); updateHUDAll();
        setTimeout(() => { try { AudioFX.playAttemptBonus(); Haptics.powerup(); } catch (e) {} }, 350);
    } catch (e) {}
}
function openQuiz(e) {
    if (e) e.stopPropagation();
    try { AudioFX.resume(); } catch (er) {}
    qzBuild(); qzLock = false;
    qzRender();
    qzRoot.classList.remove('hidden');
}
function closeQuiz(e) {
    if (e) e.stopPropagation();
    if (qzRoot) qzRoot.classList.add('hidden');
    quizMenuBadge();
    try { updateHUDAll(); } catch (er) {}
}
function quizMenuBadge() {
    const b = document.getElementById('openQuizBtn'); if (!b) return;
    const on = quizDayLeft(); b.classList.toggle('has-q', on);
    const dot = document.getElementById('qzMenuBadge'); if (dot) dot.classList.toggle('hidden', !on);
}
(function () {
    const b = document.getElementById('openQuizBtn'); if (b) b.addEventListener('click', openQuiz);
    const g = document.getElementById('earnAttemptBtn');
    if (g) g.addEventListener('click', (e) => { e.stopPropagation(); try { returnToHome(); } catch (er) {} openQuiz(); });
    quizMenuBadge();
    setInterval(quizMenuBadge, 60000);   // наступил новый день — значок снова светится
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
            + '#adminModal .adq-o.ok i{margin-left:auto;color:#22C55E}';
        document.head.appendChild(st);
    } catch (e) {}
})();
function quizAdminHtml() {
    const seen = quizSeen();
    return `<div class="adm-sum"><span>Вопросов в базе / уже показано</span><b>${QUIZ_QUESTIONS.length} / ${seen.filter(id => QUIZ_QUESTIONS.some(q => q.id === id)).length}</b></div>`
        + `<div class="adq-acts"><button type="button" class="adq-btn pri" data-q="today"><i class="fa-solid fa-calendar-day"></i>Сбросить день</button>`
        + `<button type="button" class="adq-btn" data-q="reset"><i class="fa-solid fa-rotate-left"></i>Сбросить показанные</button></div>`
        + QUIZ_QUESTIONS.map((q, n) => {
            const was = seen.indexOf(q.id) >= 0;
            return `<div class="adq-card${was ? ' seen' : ''}"><div class="adq-head"><span class="adq-chip">${q.cat || 'Вопрос'}</span>${was ? '<span class="adq-chip seen">уже был</span>' : ''}<span class="adq-num">№${n + 1}</span></div>`
                + `<div class="adq-q">${q.question}</div><div class="adq-opts">`
                + QZ_LETTERS.filter(L => q.options[L] !== undefined).map(L => `<div class="adq-o${L === q.correct ? ' ok' : ''}"><b style="background:${QZ_BALL_COL[L]}">${L}</b><span>${q.options[L]}</span>${L === q.correct ? '<i class="fa-solid fa-check"></i>' : ''}</div>`).join('')
                + `</div></div>`;
        }).join('');
}
