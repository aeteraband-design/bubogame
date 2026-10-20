// ===== v0.13.80: редкие «живые» эффекты главного меню =====
// Пока игрок сидит в меню, иногда: залп фейерверков (1, 3 или 5 разных цветов), «Водонапор» из труб меню или «Опасные трубы».
// Логотип — препятствие: вода разбивается о него брызгами, огненные шары отскакивают.
// Состояние эффектов поставленной на паузу игры на время меню убирается в сторону и возвращается при продолжении полёта.
const MFX = { next: 0, last: '', stash: null, WATER_SEC: 6, FIRE_SEC: 6 };
window.MENU_OBST = null;   // прямоугольник логотипа в мировых координатах: { x0, y0, x1, y1 }

function menuFxSchedule(minS, maxS) { MFX.next = performance.now() + (minS + Math.random() * (maxS - minS)) * 1000; }

// вошли в меню из игры: эффекты паузы — в сторону, меню начинает с чистого листа
function menuFxEnter() {
    try {
        MFX.stash = { waterTime, waterStreams, crystalTime, crystals, crystalRedK, wetT: WATERFX.wetT };
        waterTime = 0; waterStreams = []; crystalTime = 0; crystals = []; crystalRedK = 0;
    } catch (e) { MFX.stash = null; }
    menuFxSchedule(18, 35);
}
// уходим в полёт: убираем эффекты меню и возвращаем то, что было в игре
function menuFxLeave() {
    window.MENU_OBST = null;
    try {
        const s = MFX.stash; MFX.stash = null;
        waterTime = s ? s.waterTime : 0; waterStreams = s ? s.waterStreams : []; crystalTime = s ? s.crystalTime : 0;
        crystals = s ? s.crystals : []; crystalRedK = s ? s.crystalRedK : 0; if (s) WATERFX.wetT = s.wetT;
    } catch (e) {}
}

// прямоугольник логотипа (по доле от холста — не зависит от зума страницы)
function menuFxLogoRect() {
    const lg = document.querySelector('#startScreen > .menu-logo-wrap > div'), cv = document.getElementById('gameCanvas');
    if (!lg || !cv) return null;
    const a = lg.getBoundingClientRect(), c = cv.getBoundingClientRect();
    if (!c.width || !c.height || !a.width) return null;
    const fx = width / c.width, fy = height / c.height, pad = 2;
    return { x0: (a.left - c.left) * fx + pad, x1: (a.right - c.left) * fx - pad, y0: (a.top - c.top) * fy + pad, y1: (a.bottom - c.top) * fy - pad };
}

// залп фейерверков: 1, 3 или 5 ракет, у каждой свой случайный цвет
const MFX_COLORS = ['#22C55E', '#84CC16', '#FACC15', '#FB923C', '#EF4444', '#E11D48', '#38BDF8', '#A855F7', '#F472B6', '#2DD4BF'];
function menuFxFireworks() {
    if (typeof launchFireworkShow !== 'function') return;
    const n = 1 + Math.floor(Math.random() * 6);   // от 1 до 6 ракет, как в игре
    const before = fireworks.length;
    launchFireworkShow(MFX_COLORS[0], n);
    const pool = MFX_COLORS.slice();
    for (let i = before; i < fireworks.length; i++) {
        const col = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] || MFX_COLORS[i % MFX_COLORS.length];
        fireworks[i].color = fwMix(col, 0.02); fireworks[i].light = fwMix(col, 0.1);
    }
}

// каждый кадр в меню (вызывается из drawMenuPipes)
function menuFxTick(speed) {
    if (window.__booting) return;
    if (MFX.t === undefined || (MFX.t++ % 6) === 0) window.MENU_OBST = menuFxLogoRect();
    const now = performance.now();
    if (!MFX.next) menuFxSchedule(18, 35);
    const busy = (waterTime > 0) || (crystalTime > 0) || (typeof fireworks !== 'undefined' && fireworks.length > 0);
    if (!busy && now >= MFX.next && !document.hidden) {
        const k = 'fw';   // в меню — только фейерверки (вода и огонь отключены)
        MFX.last = k;
        if (k === 'fw') menuFxFireworks();
        else if (k === 'water') { waterTime = MFX.WATER_SEC * 60; WATERFX.id++; try { AudioFX.playWaterStart(); } catch (e) {} }
        else { crystalTime = MFX.FIRE_SEC * 60; CRYSTAL.id++; try { AudioFX.playPipesHeat(); } catch (e) {} }
        menuFxSchedule(20, 40);
    }
    // вода и огонь работают с трубами меню (на время расчёта подставляем их вместо игровых)
    const savedPipes = pipes, ox = owl.x;
    try {
        pipes = menuPipes; owl.x = -1000;   // в меню огонь вылетает из всех труб на экране
        if (typeof crystalUpdate === 'function') crystalUpdate(speed, 0);
        if (typeof waterUpdate === 'function') waterUpdate(speed, 0);
    } catch (e) {}
    finally { pipes = savedPipes; owl.x = ox; }
}
