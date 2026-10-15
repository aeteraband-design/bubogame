// BUBO Quiz Owl Flight — основная игра: состояние, сова, трубы, предметы, отрисовка, правила, сохранение


// ===== Общие настройки =====
// Качество графики: low / medium / high (сохраняется в браузере)
const GFX_KEY = 'bubo_gfx_quality';
let gfxQuality = 'medium';
try { const q = localStorage.getItem(GFX_KEY); if (q === 'low' || q === 'medium' || q === 'high') gfxQuality = q; } catch (e) {}
let renderScale = 1;
function computeRenderScale() {
    const dpr = window.devicePixelRatio || 1;
    if (gfxQuality === 'high') return Math.min(dpr, 3);     // максимальная чёткость
    if (gfxQuality === 'medium') return Math.min(dpr, 1.5); // середина
    return 1;                                               // низкая: как раньше, без лишней нагрузки
}
// ===== Настройки игры, которые меняются в админке (хранятся в браузере) =====
const ADMIN_KEY = 'bubo_admin_cfg_v1';
const ADMIN_DEFAULTS = {
    themes: { music: 20, logic: 15, kino: 10, series: 10, cartoons: 10, fun: 5 },   // сколько собрать каждой темы для победы
    overeatEvery: 3, overeatSec: 10,     // порций еды до переедания / его длительность
    drunkEvery: 6, drunkSec: 10,         // напитков до опьянения / его длительность
    freezeEvery: 3, freezeSec: 10,       // порций мороженого до заморозки / её длительность
    shieldSec: 10, slowSec: 10, speedSec: 10, compressSec: 10, infiniteSec: 10,   // длительности бонусов
    feathersForMax: 6,                   // волшебных перьев до роста максимума сил
    attempts: 2, questionsPerAttempt: 100,
    maxLives: 5                          // максимум сердечек: 5 или 6
};
const ADMIN_SPEC = {   // [минимум, максимум, шаг]
    overeatEvery: [1, 20, 1], overeatSec: [3, 60, 1], drunkEvery: [1, 30, 1], drunkSec: [3, 60, 1], freezeEvery: [1, 20, 1], freezeSec: [3, 60, 1],
    shieldSec: [3, 60, 1], slowSec: [3, 60, 1], speedSec: [3, 60, 1], compressSec: [3, 60, 1], infiniteSec: [3, 60, 1],
    feathersForMax: [1, 30, 1], attempts: [1, 9, 1], questionsPerAttempt: [10, 500, 10], maxLives: [5, 6, 1], theme: [1, 99, 1]
};
function normalizeAdminCfg(raw) {
    const out = JSON.parse(JSON.stringify(ADMIN_DEFAULTS));
    raw = (raw && typeof raw === 'object') ? raw : {};
    const cl = (v, sp, d) => { v = Math.round(Number(v)); return isFinite(v) ? Math.max(sp[0], Math.min(sp[1], v)) : d; };
    for (const k in ADMIN_SPEC) if (k !== 'theme' && k in raw) out[k] = cl(raw[k], ADMIN_SPEC[k], out[k]);
    if (raw.themes && typeof raw.themes === 'object') for (const k in out.themes) if (k in raw.themes) out.themes[k] = cl(raw.themes[k], ADMIN_SPEC.theme, out.themes[k]);
    return out;
}
let ADMIN_CFG = (function () { try { return normalizeAdminCfg(JSON.parse(localStorage.getItem(ADMIN_KEY))); } catch (e) { return normalizeAdminCfg(null); } })();
function ruPlural(n, f) { const a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? f[2] : (b > 1 && b < 5) ? f[1] : (b === 1) ? f[0] : f[2]; }
let MAX_ATTEMPTS = ADMIN_CFG.attempts; // сколько попыток в новой игре

// Уровни сложности (шкала делится на 6 равных частей)
const DIFF_LEVELS = [
    { name: 'СУПЕРЛАЙТ', color: '#22C55E', speedMult: 0.92, targetSqueeze: 0,    musicTempoMult: 0.95, negChance: 0.20 },
    { name: 'ЛАЙТ',      color: '#84CC16', speedMult: 1.00, targetSqueeze: 5,    musicTempoMult: 1.00, negChance: 0.32 },
    { name: 'МЕДИУМ',    color: '#FACC15', speedMult: 1.08, targetSqueeze: 11,    musicTempoMult: 1.08, negChance: 0.44 },
    { name: 'МЕДИУМ+',   color: '#FB923C', speedMult: 1.16, targetSqueeze: 16,   musicTempoMult: 1.16, negChance: 0.56 },
    { name: 'ХАРД',      color: '#EF4444', speedMult: 1.24, targetSqueeze: 22,   musicTempoMult: 1.24, negChance: 0.68 },
    { name: 'ХАРД+',     color: '#E11D48', speedMult: 1.32, targetSqueeze: 27,   musicTempoMult: 1.32, negChance: 0.80 }
];
// Сжатие от сложности растёт постепенно, но на Хард и Хард+ дополнительное сжатие от полёта (до 32 → 24) чуть слабее,
// чтобы проём при максимальном сжатии оставался проходимым для совы (радиус 25)
function compressionMaxForLevel() { return 32 - 1.6 * getDifficultyIndex(); }   // 32 → 24 плавно, по уровням
// Цвет шкалы по мере заполнения: зелёный → салатовый → жёлтый → красный
const DIFF_STOPS = [[0, [34, 197, 94]], [0.22, [34, 197, 94]], [0.52, [163, 230, 53]], [0.76, [251, 191, 36]], [1, [244, 63, 94]]];
function dId(prefix, name) { return (prefix ? 'menuDiff' : 'diff') + name; }
function buildDiffBars() {
    document.querySelectorAll('.diff-bar').forEach(bar => {
        const prefix = bar.dataset.prefix || '';
        let ticks = '';
        for (let k = 1; k < DIFF_LEVELS.length; k++) {
            ticks += `<div class="diff-tick" data-k="${k}" style="left:${(k / DIFF_LEVELS.length) * 100}%"></div>`;
        }
        bar.innerHTML = `<div class="diff-track"><div class="diff-mask" id="${dId(prefix, 'Mask')}"></div><div class="diff-shine"></div></div>${ticks}<div class="diff-glow" id="${dId(prefix, 'Glow')}"></div>`;
    });
}
buildDiffBars();

// ===== Отложенное обновление цифр на плашках =====
// Игра засчитывает подбор сразу, а цифры на плашках меняются только когда долетит анимация.
const HUD_THEME_KEYS = ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'];
const hudPending = { score: 0, stamina: 0, heart: 0, theme: 0 };
const hudDirty = {};
function hudGroup(t) { return HUD_THEME_KEYS.includes(t) ? 'theme' : t; }
function hudBlocked(g) {
    if ((hudPending[g] || 0) > 0) return true;
    try { for (const it of items) if (it.pendingFX && hudGroup(it.pendingFX.target) === g) return true; } catch (e) {}
    return false;
}
function flushHud() {
    for (const g in hudDirty) {
        if (!hudDirty[g] || hudBlocked(g)) continue;
        hudDirty[g] = false;
        if (g === 'heart') renderLivesHUD();
        else if (g === 'stamina') renderStaminaHUD();
        else if (g === 'theme') renderCollectionHUD();
        else if (g === 'score') { const el = document.getElementById('scoreVal'); if (el) el.innerText = `${score}`; const sb = document.getElementById('scoreBadge'); if (sb) sb.classList.toggle('score-wide', String(score).length >= 3); }
    }
}
function scheduleHud(g) {
    hudDirty[g] = true;
    let active = false;
    try { active = gameActive; } catch (e) {}
    if (!active) flushHud();   // вне полёта (меню, загрузка, сброс) — сразу
}
function updateLivesHUD() { scheduleHud('heart'); }

// ===== Каждые 100 вопросов — +1 попытка =====
let QUESTIONS_PER_ATTEMPT = ADMIN_CFG.questionsPerAttempt;
let attemptMilestone = -1;
function checkAttemptMilestone() {
    let active = false;
    try { active = gameActive; } catch (e) {}
    const m = Math.floor(score / QUESTIONS_PER_ATTEMPT);
    if (attemptMilestone < 0 || !active) { attemptMilestone = Math.max(attemptMilestone, m); return; }
    if (m > attemptMilestone) {
        const gained = m - attemptMilestone;
        attemptMilestone = m;
        attempts += gained;
        AudioFX.playStarCollect();
        Haptics.powerup();
        try { AudioFX.playAttemptBonus(); } catch (e) {}
        // подсказку «+1 попытка» покажет сам подобранный вопрос (вместе с «+1 вопрос»); иначе — показываем здесь
        if (window.__attemptHintPending) { window.__attemptHintPending = false; StorageManager.save(); return; }
        spawnFlyingArrivalFX(owl.x, owl.y, 'attempts', '', '#FFC53D', 'fa-rotate-right', true);
        showGoldBanner(gained > 1 ? `+${gained} попытки` : '+1 попытка', 'fa-rotate-right', '#FFC53D');
        flashAttemptsBadge();
        StorageManager.save();
    }
}
// Шарик долетел до «ПОПЫТКИ»: плашка вспыхивает золотом (отдельным слоем — не обрезается), стрелка делает оборот, число переливается
function flashAttemptsBadge() {
        setTimeout(() => {   // шарик долетел: плашка «ПОПЫТКИ» вспыхивает золотом, стрелка делает оборот, число переливается
            const ab = document.getElementById('attemptsBadge');
            if (ab) {
                ab.classList.remove('attempts-up'); void ab.offsetWidth; ab.classList.add('attempts-up'); setTimeout(() => ab.classList.remove('attempts-up'), 1400);
                // свечение рисуем отдельно поверх всего интерфейса — его ничто не обрезает
                try {
                    const layer = document.getElementById('hudFxLayer') || fxLayer, lr = layer.getBoundingClientRect(), r = ab.getBoundingClientRect();
                    const g = document.createElement('div');
                    g.className = 'attempts-glow';
                    g.style.left = (r.left - lr.left - 6) + 'px'; g.style.top = (r.top - lr.top - 4) + 'px';
                    g.style.width = (r.width + 12) + 'px'; g.style.height = (r.height + 8) + 'px';
                    layer.appendChild(g);
                    setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, 1300);
                } catch (e) {}
            }
        }, 500);
}
function updateStaminaHUD() { scheduleHud('stamina'); }
function updateCollectionHUD() { scheduleHud('theme'); }


const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d', { alpha: false }); // let: замёрзшая сова рисуется через отдельный холст
const container = document.getElementById('gameContainer');
const fxLayer = document.getElementById('hudFxLayer');

let width = 0;
let height = 0;

let lastTime = 0;
let dtMult = 1.0;
let pipeDistanceTracker = 0;
let viewScale = 1;
const WORLD_K = 1.16;   // во сколько раз крупнее мир (сова, трубы, луна, город); интерфейс не меняется
// Телефонный масштаб: игра свёрстана под ширину 360px; на более широком телефоне всё пропорционально крупнее, на узком — мельче.
// Ограничение по высоте (600px) — чтобы на очень низких экранах мир не становился слишком тесным
const PHONE_BASE_W = 394, PHONE_MIN_H = 600;
function phoneZoom(cw, ch) { return Math.max(0.85, Math.min(1.3, cw / PHONE_BASE_W, ch / PHONE_MIN_H)); }
// Эталон — Android с крупным системным текстом (шрифты и иконки ×1.3). Замеряем, во сколько раз устройство уже увеличивает текст,
// и добавляем недостающее (--tb), чтобы на iPhone и в любом браузере подписи и иконки панелей были такого же размера
const TEXT_TARGET = 1.3;
let deviceTextScale = 0;
// Некоторые браузеры (Chrome на Android с крупным системным шрифтом) увеличивают всю страницу целиком — тогда страница «уже»
// экрана. Учитываем это, чтобы не увеличивать второй раз
function pageZoomFactor() {
    try {
        const sw = Math.min(screen.width, screen.height), iw = window.innerWidth;
        if (!sw || !iw) return 1;
        const r = sw / iw;
        return (r > 1.05 && r < 2) ? r : 1;
    } catch (e) { return 1; }
}
function measureTextScale() {
    if (deviceTextScale) return deviceTextScale;
    try {
        const sp = document.createElement('span');
        sp.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font:100px sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%;';
        sp.textContent = 'WWWWWWWWWW';
        document.body.appendChild(sp);
        const w = sp.getBoundingClientRect().width;
        document.body.removeChild(sp);
        const c = document.createElement('canvas').getContext('2d'); c.font = '100px sans-serif';
        const cwid = c.measureText('WWWWWWWWWW').width;
        deviceTextScale = (cwid > 0 && w > 0) ? Math.max(0.8, Math.min(2, w / cwid)) : 1;
    } catch (e) { deviceTextScale = 1; }
    return deviceTextScale;
}
let gameSpeedFactor = 1, gameSpeedFrom = 1, gameSpeedTarget = 1, gameSpeedT = 1;
// расстояние между трубами меняется медленнее, чем скорость игры (около 2.5 секунд), чтобы трубы плавно сходились и расходились
let spacingFactor = 1, spacingFrom = 1, spacingTarget = 1, spacingT = 1;
const SPACING_RAMP_FRAMES = 150;
function getOwlStartX() { return Math.max(90, Math.round(width * 0.2)); }

let frame = 0;
let gameActive = false;
let waitingFirstTap = true;
let hoverAngle = 0;
let hasStartedCampaign = false;
let hasWonGame = false;
let isFlightPaused = false;
let deathFreeze = 0, deathFreezeReason = '';   // короткая пауза после секрета, забравшего последнюю жизнь
let lastKnownDiffIdx = -1;

let attempts = MAX_ATTEMPTS;
let score = 0;
let lives = 3.0;
let maxLives = ADMIN_CFG.maxLives;
let startLives = 3.0;   // с сколькими сердцами начинается полёт (бонус рулетки: 4 из 6)
let heartOverflow = 0;   // сердца, пойманные при полном запасе: каждые 2 → «Макс. жизнь +1»
let zeroDay = '';       // день (ГГГГ-ММ-ДД), когда закончились попытки: на следующий день — 1 новая попытка и полный сброс
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
let stamina = 100.0;
// Запас сил: после FEATHERS_FOR_MAX_UP волшебных перьев за игру максимум растёт со 100 до 130%
let FEATHERS_FOR_MAX_UP = ADMIN_CFG.feathersForMax;
let featherMaxBonus = 0;   // прибавка к максимуму сил от волшебных перьев — действует только до конца текущей попытки // каждое 4-е волшебное перо — +20% к максимуму сил (120, 140, 160...)
let maxStamina = 100;
// Чем выше сложность, тем быстрее тратятся силы (на Харде — в 2 раза быстрее)
const STAMINA_DRAIN_BY_LEVEL = [1.0, 1.25, 1.5, 1.75, 2.15, 2.4];   // чем выше сложность, тем быстрее уходят силы (чуть сильнее, чем было)
function staminaDrainMult() { try { return STAMINA_DRAIN_BY_LEVEL[getDifficultyIndex()] || 1; } catch (e) { return 1; } }
let magicFeathersCaught = 0;
let invulnerableTime = 0;
let shieldTime = 0;
let shieldAppearAnim = 0;
let infiniteStaminaTime = 0;
let speedBoostTime = 0;
let slowMotionTime = 0;
let compressionTime = 0;
let currentCompressionFactor = 0.0;
let currentDifficultySqueeze = 0.0;
let lastBuffStateKey = '';

// --- Новые состояния: Переедание и Опьянение ---
let OVEREAT_TRIGGER = ADMIN_CFG.overeatEvery;      // каждая N-я порция вредной еды вызывает переедание
let DRUNK_TRIGGER = ADMIN_CFG.drunkEvery;        // каждый N-й коктейль (любого вида) вызывает опьянение
let junkFoodCount = 0;
let drinkCount = 0;
let overeatTime = 0;
let drunkTime = 0;
let currentOvereatFactor = 0.0;
let currentDrunkFactor = 0.0;
// Замерзание: каждое 4-е мороженое (по умолчанию)
let FREEZE_TRIGGER = ADMIN_CFG.freezeEvery; // каждое N-е мороженое (по умолчанию 4)
let iceCreamCount = 0;
let freezeTime = 0;
let currentFreezeFactor = 0.0;
function registerIceCream() {
    iceCreamCount++;
    if (iceCreamCount >= FREEZE_TRIGGER) {
        iceCreamCount = 0;
        freezeTime = ADMIN_CFG.freezeSec * 60;
        owl.spinVel = (Math.random() < 0.5 ? -1 : 1) * 0.07;
        AudioFX.playFreeze();
        spawnIceBurst('freeze');
        Haptics.powerup();
        return { target: 'other', text: 'Вы замёрзли!', color: '#B5E4FF', icon: 'fa-snowflake' };
    }
    return null;
}
function easeFactor(f) { return f * f * (3 - 2 * f); }
let lowStaminaSoundTimer = 0;
let lastCompressSpawnTime = -9999;
let lastSpawnedItemType = '';
let prevDistMult = 1;
// Прогиб щита при ударе о трубу
let shieldDent = 0, shieldDentAng = 0, shieldBumpSoundT = 0, shieldHitPower = 0;
// ang — откуда удар (0 — спереди, -π/2 — сверху, π/2 — снизу), power 0..1 — насколько сильный
function shieldBump(ang, power) {
    const pw = Math.max(0.3, Math.min(1, power == null ? 0.7 : power));
    shieldDent = Math.max(shieldDent, pw);
    shieldHitPower = Math.max(shieldHitPower * 0.6, pw);
    shieldDentAng = ang;
    const t = performance.now();
    if (t - shieldBumpSoundT > 220) {
        shieldBumpSoundT = t;
        AudioFX.playShieldBump();
        Haptics.hit();
        // маленькие, еле заметные искорки из точки удара
        const R = owl.radius * 1.5;
        const cx = owl.x + Math.cos(ang) * R, cy = owl.y + Math.sin(ang) * R;
        const n = 3 + Math.round(4 * pw);
        for (let i = 0; i < n; i++) {
            const a = ang + Math.PI + (Math.random() - 0.5) * 2.2;
            const sp = 0.8 + Math.random() * 1.8 * pw;
            speedStars.push({
                x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                size: 0.9 + Math.random() * 1.0, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.3,
                life: 0.8, decay: 0.045 + Math.random() * 0.03,
                color: Math.random() < 0.5 ? '#BBF7D0' : '#FFFFFF'
            });
        }
    }
}
let pipesSinceIceCream = 0;
let pipesSinceTheme = 0;   // сколько труб прошло с последней темы
// момент (в кадрах игры, 60 = 1 с) последнего выпадения сжатия / ускорения / замедления / щита — чтобы между ними проходило время
let lastSpeedSpawnTime = -99999, lastSlowSpawnTime = -99999, lastShieldSpawnTime = -99999;
// при новой игре отсчёт времени между эффектами начинается заново (первое сжатие — не сразу)
function resetSpecialTimers() { lastCompressSpawnTime = frame; lastSpeedSpawnTime = frame; lastSlowSpawnTime = frame; lastShieldSpawnTime = frame; }
let lastThemeKey = '';     // какая тема была последней

const CATEGORIES = {
    music:        { name: 'Музыка',     color: '#E056FD', iconCode: '\uf001', faClass: 'fa-music', count: 20, weight: 6 },
    logic:        { name: 'Обо всём',   color: '#4ADE80', iconCode: '\uf5dc', faClass: 'fa-brain', count: 15, weight: 5 },
    kino:         { name: 'Кино',       color: '#00D2FF', iconCode: '\uf008', faClass: 'fa-film', count: 10, weight: 4 },
    series:       { name: 'Сериалы',    color: '#F43F5E', iconCode: '\ue131', faClass: 'fa-clapperboard', count: 10, weight: 4 },
    cartoons:     { name: 'Мультики',   color: '#38BDF8', iconCode: '\uf1b0', faClass: 'fa-paw', count: 10, weight: 4 },
    fun:          { name: 'Фан-дом',    color: '#2DD4BF', iconCode: '\uf6e8', faClass: 'fa-hat-wizard', count: 5, weight: 2 },
    secret:       { name: 'Секрет',     color: '#FFD700', iconCode: '\uf005', faClass: 'fa-star' },
    shield:       { name: 'Щит',        color: '#22C55E', iconCode: '\uf3ed', faClass: 'fa-shield-halved' },
    infinite:     { name: 'Макс. силы', color: '#00F0FF', faClass: 'fa-feather-pointed' },
    compress:     { name: 'Сжатие',     color: '#D946EF', iconCode: '\\uf066', faClass: 'fa-compress' },
    stamina:      { name: 'Перо силы',  color: '#67E8F9', iconCode: '\uf56b', faClass: 'fa-feather-pointed' },
    drink:        { name: 'Коктейль',   color: '#2DD4BF', iconCode: '\uf561', faClass: 'fa-martini-glass-citrus' },
    mocktail:     { name: 'Пиво',       color: '#F4B942', iconCode: '\uf0fc', faClass: 'fa-beer-mug-empty' },
    icecream:     { name: 'Мороженое',  color: '#B5E4FF', iconCode: '\uf810', faClass: 'fa-ice-cream' },
    heart:        { name: 'Жизнь',      color: '#EF4444', iconCode: '\uf004', faClass: 'fa-heart' },
    pizza:        { name: 'Пицца',      color: '#F97316', iconCode: '\uf818', faClass: 'fa-pizza-slice' },
    burger:       { name: 'Бургер',     color: '#F59E0B', iconCode: '\uf805', faClass: 'fa-burger' },
    hotdog:       { name: 'Хот-дог',    color: '#FB923C', iconCode: '\uf80f', faClass: 'fa-hotdog' },
    speedup:      { name: 'Ускорение',  color: '#F59E0B', iconCode: '\uf0e7', faClass: 'fa-bolt' },
    slowmo:       { name: 'Замедление', color: '#38BDF8', iconCode: '\uf252', faClass: 'fa-hourglass-half' },
    question:     { name: 'Вопрос',     color: '#FE7600', iconCode: '\uf128', faClass: 'fa-circle-question' }
};
// Сколько всего тем нужно собрать (считается из категорий). ТЕСТ: по 1 из каждой; для полной игры: 20, 15, 10, 10, 10, 5
for (const k in ADMIN_CFG.themes) if (CATEGORIES[k]) CATEGORIES[k].count = ADMIN_CFG.themes[k];   // сколько тем нужно собрать — из админки
let TOTAL_THEMES = Object.keys(CATEGORIES).reduce((a, k) => a + (CATEGORIES[k].count || 0), 0);
const THEME_KEYS_ALL = Object.keys(CATEGORIES).filter(k => CATEGORIES[k].count);
function renderRulesGoal() {
    const el = document.getElementById('rulesGoalText');
    if (!el) return;
    const parts = THEME_KEYS_ALL.map(k => `<span style="color:${CATEGORIES[k].color}" class="font-black">${CATEGORIES[k].name}: ${CATEGORIES[k].count}</span>`).join(', ');
    el.innerHTML = `Лети между труб и собирай значки тем. Нужно собрать все <span class="text-white font-black">${TOTAL_THEMES} тем</span> (${parts}) — тогда ты сможешь крутить рулетку призов!`;
}
renderRulesGoal();

let collected = { music: 0, logic: 0, kino: 0, series: 0, cartoons: 0, fun: 0 };

const StorageManager = {
    LOCAL_KEY: 'bubo_owl_flight_progress_v3',
    db: null,
    auth: null,
    userId: null,
    appId: typeof __app_id !== 'undefined' ? __app_id : 'bubo-quiz-app',

    loadLocal() {
        try {
            const raw = localStorage.getItem(this.LOCAL_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (typeof data.attempts === 'number') attempts = Math.max(0, Math.min(99, data.attempts));
                if (typeof data.score === 'number') score = data.score;
                if (typeof data.lives === 'number') lives = data.lives;
                if (typeof data.stamina === 'number') stamina = data.stamina;
                hasStartedCampaign = !!data.hasStartedCampaign;
                hasWonGame = !!data.hasWonGame;
                if (typeof data.maxStamina === 'number') maxStamina = Math.max(100, data.maxStamina);
                if (typeof data.magicFeathersCaught === 'number') magicFeathersCaught = data.magicFeathersCaught;
                if (typeof data.startLives === 'number') startLives = Math.max(3, Math.min(99, data.startLives));
                if (typeof data.maxLives === 'number') maxLives = Math.max(5, Math.min(99, data.maxLives));
                if (typeof data.heartOverflow === 'number') heartOverflow = Math.max(0, Math.min(1, data.heartOverflow));
                if (typeof data.zeroDay === 'string') zeroDay = data.zeroDay;
                if (typeof data.rouletteSpins === 'number') rouletteSpins = Math.max(0, Math.min(99, data.rouletteSpins));
                if (typeof data.featherMaxBonus === 'number') featherMaxBonus = Math.max(0, data.featherMaxBonus);
                if (data.collected) {
                    collected.music = data.collected.music || 0;
                    collected.logic = data.collected.logic || 0;
                    collected.kino = data.collected.kino || 0;
                    collected.series = data.collected.series || 0;
                    collected.cartoons = data.collected.cartoons || 0;
                    collected.fun = data.collected.fun || 0;
                }
                if (data.settings) {
                    if (typeof data.settings.musicVolume === 'number') AudioFX.setMusicVolume(data.settings.musicVolume);
                    if (typeof data.settings.sfxVolume === 'number') AudioFX.setSfxVolume(data.settings.sfxVolume);
                    if (typeof data.settings.isMusicMuted === 'boolean') AudioFX.setMuted(data.settings.isMusicMuted);
                    if (typeof data.settings.hapticsEnabled === 'boolean') Haptics.enabled = data.settings.hapticsEnabled;
                }
            }
        } catch(e) {}
        try { snapProgressVisuals(); } catch (e) {}   // луна и музыка сразу в положении сохранённого прогресса
    },

    saveLocal() {
        try {
            const payload = {
                attempts, score, lives, stamina, hasStartedCampaign, hasWonGame, maxStamina, magicFeathersCaught, featherMaxBonus, startLives, maxLives, rouletteSpins, heartOverflow, zeroDay,
                collected: { ...collected },
                settings: {
                    musicVolume: AudioFX.musicVolume,
                    sfxVolume: AudioFX.sfxVolume,
                    isMusicMuted: AudioFX.isMusicMuted,
                    isSfxMuted: AudioFX.isSfxMuted,
                    hapticsEnabled: Haptics.enabled
                },
                updatedAt: Date.now()
            };
            localStorage.setItem(this.LOCAL_KEY, JSON.stringify(payload));
        } catch(e) {}
    },

    async init() {
        this.loadLocal();
        updateMenuVisibility();
        updateHUDAll();

        try {
            if (typeof __firebase_config !== 'undefined') {
                const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
                const { getAuth, signInWithCustomToken, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
                const { getFirestore, doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                
                const firebaseConfig = JSON.parse(__firebase_config);
                const app = initializeApp(firebaseConfig);
                this.auth = getAuth(app);
                this.db = getFirestore(app);

                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(this.auth, __initial_auth_token);
                } else {
                    await signInAnonymously(this.auth);
                }

                this.userId = this.auth.currentUser?.uid;
                if (this.userId) {
                    const progressRef = doc(this.db, 'artifacts', this.appId, 'users', this.userId, 'progress', 'game_state');
                    const snap = await getDoc(progressRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        attempts = typeof data.attempts === 'number' ? Math.max(0, Math.min(99, data.attempts)) : attempts;
                        score = typeof data.score === 'number' ? data.score : score;
                        lives = typeof data.lives === 'number' ? data.lives : lives;
                        stamina = typeof data.stamina === 'number' ? data.stamina : stamina;
                        hasStartedCampaign = typeof data.hasStartedCampaign === 'boolean' ? data.hasStartedCampaign : hasStartedCampaign;
                        hasWonGame = typeof data.hasWonGame === 'boolean' ? data.hasWonGame : hasWonGame;
                        if (data.collected) {
                            collected.music = data.collected.music || 0;
                            collected.logic = data.collected.logic || 0;
                            collected.kino = data.collected.kino || 0;
                            collected.series = data.collected.series || 0;
                            collected.cartoons = data.collected.cartoons || 0;
                            collected.fun = data.collected.fun || 0;
                        }
                        if (data.settings) {
                            if (typeof data.settings.musicVolume === 'number') AudioFX.setMusicVolume(data.settings.musicVolume);
                            if (typeof data.settings.sfxVolume === 'number') AudioFX.setSfxVolume(data.settings.sfxVolume);
                            if (typeof data.settings.isMusicMuted === 'boolean') AudioFX.setMuted(data.settings.isMusicMuted);
                            if (typeof data.settings.hapticsEnabled === 'boolean') Haptics.enabled = data.settings.hapticsEnabled;
                        }
                        this.saveLocal();
                        updateMenuVisibility();
                        updateHUDAll();
                    }
                }
            }
        } catch(e) {}
    },

    async save() {
        this.saveLocal();
        updateMenuVisibility();
        if (!this.db || !this.userId) return;
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const progressRef = doc(this.db, 'artifacts', this.appId, 'users', this.userId, 'progress', 'game_state');
            await setDoc(progressRef, {
                attempts, score, lives, stamina, hasStartedCampaign, hasWonGame, maxStamina, magicFeathersCaught, featherMaxBonus, startLives, maxLives, rouletteSpins, heartOverflow, zeroDay,
                collected: { ...collected },
                settings: {
                    musicVolume: AudioFX.musicVolume,
                    sfxVolume: AudioFX.sfxVolume,
                    isMusicMuted: AudioFX.isMusicMuted,
                    isSfxMuted: AudioFX.isSfxMuted,
                    hapticsEnabled: Haptics.enabled
                },
                updatedAt: Date.now()
            }, { merge: true });
        } catch(e) {}
    }
};

StorageManager.loadLocal();   // полная инициализация (StorageManager.init) — в конце render.js, когда все функции уже загружены

// Частицы взмаха: снежинки (заморозка), пузырьки (опьянение) или привычные кружочки; общая для игры и для тестовой вкладки админки
