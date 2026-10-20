function draw() {
    if (typeof quizActive === 'function' && quizActive()) {   // квиз-мир: вид из-за спины совы
        const ss = document.getElementById('startScreen'), go = document.getElementById('gameOverModal');
        if ((ss && !ss.classList.contains('hidden')) || (go && !go.classList.contains('hidden'))) quizAbort();   // вышли в меню — квиз закрываем вместе с подсказками
        else { quizDraw(); return; }
    }
    ctx.setTransform(viewScale * renderScale * WORLD_K, 0, 0, viewScale * renderScale * WORLD_K, 0, 0);
    const ssEl = draw.__ss || (draw.__ss = document.getElementById('startScreen'));
    const df = (ssEl && !ssEl.classList.contains('hidden')) ? 0 : currentDrunkFactor;   // в меню — без «пьяного» качания экрана: меню сразу ровное
    if (df > 0.001) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#090117';
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(Math.sin(frame * 0.035) * 0.04 * df);
        const z = 1 + (0.07 + 0.025 * Math.sin(frame * 0.05 + 1)) * df;
        ctx.scale(z, z);
        ctx.translate(-width / 2, -height / 2);
        drawScene();
        ctx.restore();
    } else {
        drawScene();
    }
}

let camZoom = 1;
// Маленькие заготовленные картинки для шлейфа: снежинка (холодная палитра) и пузырёк коктейля
let __flapSnow = null, __flapBubble = null;
function flapSnowSprite() {
    if (__flapSnow) return __flapSnow;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    g.translate(16, 16); g.strokeStyle = '#E0F2FE'; g.lineCap = 'round'; g.lineWidth = 2.2;
    g.shadowColor = '#7DD3FC'; g.shadowBlur = 5;
    for (let k = 0; k < 6; k++) {
        g.save(); g.rotate(k * Math.PI / 3);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -12); g.moveTo(0, -7); g.lineTo(-3.5, -10); g.moveTo(0, -7); g.lineTo(3.5, -10); g.stroke();
        g.restore();
    }
    g.fillStyle = '#BAE6FD'; g.beginPath(); g.arc(0, 0, 2.2, 0, Math.PI * 2); g.fill();
    return (__flapSnow = c);
}
function flapBubbleSprite() {
    if (__flapBubble) return __flapBubble;
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const grd = g.createRadialGradient(13, 12, 1, 16, 16, 14);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(0.55, 'rgba(45,212,191,0.18)'); grd.addColorStop(1, 'rgba(45,212,191,0.05)');
    g.fillStyle = grd; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(153,246,228,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(11, 10, 3.2, 2, -0.6, 0, Math.PI * 2); g.fill();
    return (__flapBubble = c);
}
// Отрисовка списка частиц (снежинки, пузырьки, кружочки, перья и т. д.) — общая для игры и для тестовой вкладки
function drawParticleList(list) {
    list.forEach(pt => {
        if ((pt.kind === 'wdrop' || pt.kind === 'wbub') && typeof waterDrawPart === 'function') { waterDrawPart(pt); return; }   // брызги «Водонапора»
        if (pt.kind === 'snow' || pt.kind === 'bubble') {
            const spr = pt.kind === 'snow' ? flapSnowSprite() : flapBubbleSprite(), s = pt.size * 2;
            ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
            if (pt.kind === 'snow') {
                ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.angle); ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.restore();
            } else ctx.drawImage(spr, pt.x - s / 2, pt.y - s / 2, s, s);
            ctx.globalAlpha = 1;
            return;
        }
        if (pt.isRing) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 1.6;
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (pt.isFeather) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.angle || 0);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, pt.size, pt.size * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-pt.size, 0);
            ctx.lineTo(pt.size, 0);
            ctx.stroke();
            ctx.restore();
        } else if (pt.isStar) {
            drawSparkleStar(pt.x, pt.y, 4, pt.size, pt.size * 0.28, pt.color, pt.alpha);
        } else if (pt.isWisp) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });
}

function drawScene() {
    ctx.clearRect(0, 0, width, height);
    
    stormUpdate();
    ctx.fillStyle = stormSkyGrad(); ctx.fillRect(0, 0, width, height);   // ночное небо; в грозу плавно уходит в сине-серые тона

    if (!window.__starGlow) {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d');
        const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
        window.__starGlow = c;
    }
    ctx.fillStyle = '#FFFFFF';
    const starK = stormStarK();   // в грозу звёзды почти скрыты тучами
    for (const st of stars) {
        st.alpha += (Math.random() - 0.5) * 0.05 * dtMult;
        st.alpha = Math.max(0.2, Math.min(0.95, st.alpha));
        ctx.globalAlpha = st.alpha * starK;
        if (starK < 0.05) continue;
        if (st.size > 1.2 / WORLD_K && gfxQuality !== 'low') ctx.drawImage(window.__starGlow, st.x - 6 / WORLD_K, st.y - 6 / WORLD_K, 12 / WORLD_K, 12 / WORLD_K);   // свечение крупных звёзд — как на загрузке
        ctx.beginPath(); ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const dsEl = drawScene.__el || (drawScene.__el = { s: document.getElementById('startScreen'), g: document.getElementById('gameOverModal') });
    const isStartMenuOpen = !dsEl.s.classList.contains('hidden');
    const isGameOverOpen = !dsEl.g.classList.contains('hidden');
    if (isStartMenuOpen && !drawScene.__wasMenu && !window.__booting) {   // вернулись из игры в меню — сразу готовый вид, как после загрузки: без доводки камеры, скорости фона и труб
        camZoom = 1; window.__bgSpeed = 1;
        if (typeof MENU_PIPE !== 'undefined') { MENU_PIPE.cy = null; MENU_PIPE.t = 0; MENU_PIPE.t0 = 0; }
    }
    drawScene.__wasMenu = isStartMenuOpen;
    { const mh = dsEl.h || (dsEl.h = document.getElementById('menuHalo')); const hOn = isStartMenuOpen && performance.now() < (window.__haloUntil || 0); if (mh && mh.__on !== hOn) { mh.__on = hOn; mh.classList.toggle('off', !hOn); } }   // свечение совы — только при переходе с загрузки, потом плавно гаснет: в меню логотип без свечения
    if (isStartMenuOpen && dsEl.h && typeof MENU_PIPE !== 'undefined' && MENU_PIPE.cy != null) {   // свечение всегда за логотипом (на загрузке — за совой) и едет вместе с проёмом труб
        const cr = (dsEl.c || (dsEl.c = document.getElementById('gameCanvas'))).getBoundingClientRect();
        const mr = dsEl.h.firstElementChild && dsEl.h.firstElementChild.getBoundingClientRect();   // base — центр свечения без сдвига (с учётом зума)
        if (cr.height && mr && mr.height) { const base = mr.top + mr.height / 2 - (dsEl.h.__dy || 0), dy = Math.round((cr.top + MENU_PIPE.cy / height * cr.height - base) * 2) / 2; if (dsEl.h.__dy !== dy) { dsEl.h.__dy = dy; dsEl.h.style.transform = 'translateY(' + dy + 'px)'; } }
    }   // свечение совы — только в меню
    drawMoon();
    stormDrawBack();      // гроза: тучи, зарницы и разряды — позади домов
    // фон на загрузке может ускоряться (сова в ускорении, рывок ШАЗАМа) — после загрузки плавно возвращается к обычному
    if (!window.__booting && (window.__bgSpeed || 1) > 1.001) window.__bgSpeed += (1 - window.__bgSpeed) * Math.min(1, 0.035 * dtMult);
    const bgK = window.__bgSpeed || 1;
    if (!gameActive) cityOffset += 0.5 * dtMult * bgK;   // в меню и на паузе город медленно плывёт
    drawCity();
    stormDrawCityLight(); // мокрые крыши и подсветка фасадов вспышкой
    shazamDrawStreaks();

    if (gameActive || waitingFirstTap || isStartMenuOpen || isGameOverOpen) {
        // в грозу обычные облака освещаются так же, как тучи (луна, тень, темнее книзу) — цвет у всех одинаковый
        if (typeof stormCover !== 'undefined' && stormCover > 0.01) stormLitLayer(0.85 * stormSmooth(0, 0.85, stormCover), drawClouds); else drawClouds();
    }

    // камера: при эффекте ускорения чуть отдаляется (видно больше), при замедлении чуть приближается; от уровня сложности не зависит
    {
        const zt = (gameActive && (speedBoostTime > 0 || shazamActive())) ? 0.95 : ((gameActive && slowMotionTime > 0) ? 1.07 : 1);
        camZoom += (zt - camZoom) * Math.min(1, 0.02 * dtMult);
        if (Math.abs(zt - camZoom) < 0.0005) camZoom = zt;
    }
    ctx.save();
    if (Math.abs(camZoom - 1) > 0.0005) { ctx.translate(width / 2, height / 2); ctx.scale(camZoom, camZoom); ctx.translate(-width / 2, -height / 2); }
    const owlInPlay = (gameActive || waitingFirstTap) && !isStartMenuOpen;   // в меню, его окнах и на экране поражения сову не рисуем
    const owlBehind = shazamOwlBehind() && owlInPlay;   // ШАЗАМ: сова пролетает за трубой — рисуем её до труб
    if (owlBehind) { drawSpeedStars(); owl.draw(); }
    window.__sceneDrawn = true;
    const booting = !!window.__booting;   // на экране загрузки — только фон: небо, город, облака (без труб, значков и совы)
    if (booting && window.__bootPipes && typeof drawMenuPipes === 'function') drawMenuPipes();   // тап на загрузке — трубы выезжают вокруг совы
    if (!booting) {
    drawCrystals();   // огненные шары «Опасных труб» — за трубами: выныривают из одной и скрываются в другой
    if (typeof drawWater === 'function') drawWater();   // потоки «Воды из труб» — тоже за трубами
    if (isStartMenuOpen && typeof drawMenuPipes === 'function') drawMenuPipes(); else pipes.forEach(drawPipe);   // в меню — свои декоративные трубы вокруг логотипа
    if (typeof quizDrawPortal2D === 'function') quizDrawPortal2D();   // портал в квиз-мир — в проёме между трубами
    if (typeof crystalDrawHeat === 'function') crystalDrawHeat(1);   // «Опасные трубы»: трубы калятся, из устьев — красный туман
    if (typeof drawWaterFront === 'function') drawWaterFront();   // пена и водяная пыль «Водонапора» — поверх труб

    items.forEach(it => {
        if ((it.type === 'stamina' || it.type === 'infinite') && it.trail && it.trail.length > 2) {
            ctx.save();
            const ringOffsets = [
                { idx: 2, alpha: 0.45, lineWidth: 1.6 },
                { idx: 5, alpha: 0.25, lineWidth: 1.3 },
                { idx: 7, alpha: 0.12, lineWidth: 1.0 }
            ];

            const trailColor = (CATEGORIES[it.type] && CATEGORIES[it.type].color) || '#00F0FF';
            // кольца-следы со свечением — из заготовки (тень рисуется один раз, а не каждый кадр)
            const devR = tokDevScale(ctx), lowQ = gfxQuality === 'low', rad = it.radius;
            ringOffsets.forEach(cfg => {
                if (cfg.idx < it.trail.length) {
                    const pt = it.trail[cfg.idx];
                    const pad = rad + cfg.lineWidth + (lowQ ? 2 : 16 / devR);
                    const spr = tokSprite(`r|${trailColor}|${rad}|${cfg.lineWidth}|${devR}|${lowQ ? 1 : 0}`, devR, pad, pad, (g) => {
                        g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2);
                        g.strokeStyle = trailColor; g.lineWidth = cfg.lineWidth;
                        if (!lowQ) { g.shadowColor = trailColor; g.shadowBlur = 6; }
                        g.stroke();
                    });
                    ctx.globalAlpha = cfg.alpha; ctx.shadowBlur = 0;
                    ctx.drawImage(spr.c, pt.x + spr.x, pt.y + spr.y, spr.w, spr.h);
                }
            });
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    });

    const litK = (typeof stormGradeK === 'function') ? stormGradeK() : 0;
    if (litK < 0.02) items.forEach(drawToken);   // в дождь значки рисуются позже, поверх серой «пелены»
    }

    drawParticleList(particles);

    if (!owlBehind && !booting && owlInPlay) {   // сова видна только в игре — на фоне меню и окон её нет
        drawSpeedStars();
        if (currentFreezeFactor > 0.01 && owl.visible) drawFrozenOwl(); else owl.draw();
    }
    if (typeof drawShieldBubbles === 'function') drawShieldBubbles();   // пузырьки от щита
    shazamDrawFx();
    drawIceShards();
    ctx.restore();   // конец слоя камеры
    if (typeof stormGrade === 'function') stormGrade();   // в дождь — серее и мрачнее
    if (!booting && typeof stormGradeK === 'function') { const lk = stormGradeK(); if (lk >= 0.02) { stormDrawHotFx(lk, camZoom); stormDrawLitTokens(lk, camZoom); if (typeof stormDrawLitOwl === 'function') stormDrawLitOwl(lk, camZoom); } }   // значки — яркие и светятся
    stormDrawRain();        // дождь — поверх труб, значков и совы
}

let perfAvgDt = 16.7, perfSlowFrames = 0, perfCooldown = 240;
let dtEma = 0, dtDebt = 0, dtOut = 0;   // сглаженная длительность кадра, накопленная разница со временем, счётчик выбившихся кадров
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    const rawDt = dt;
    if (dt > 100 || dt < 0) dt = 16.666; 
    // Ровный шаг: при стабильном потоке кадров (60/90/120 Гц) берём сглаженное значение — движение без «шажков» из-за дрожания таймера.
    // Если кадр явно выбился (пропуск, смена частоты экрана), берём настоящий шаг. Скорость игры по времени не меняется.
    if (!dtEma) dtEma = dt;
    let dtUse;
    if (Math.abs(dt - dtEma) < dtEma * 0.25) { dtOut = 0; dtEma += (dt - dtEma) * 0.05; dtUse = dtEma + dtDebt * 0.1; }
    else { if (++dtOut >= 6) { dtEma = dt; dtOut = 0; } dtUse = dt; }       // 6 «выбившихся» кадров подряд — экран сменил частоту
    dtDebt += dt - dtUse;                                                   // разница копится и возвращается — общее время точно сохраняется
    dt = dtUse;
    dtMult = dt / 16.666;
    // Автоматическое облегчение графики на слабых телефонах: если кадры стабильно долгие, снижаем качество на ступень.
    // Скорость игры от этого не меняется (она считается по реальному времени кадра).
    if (gameActive && !document.hidden && rawDt > 0 && rawDt < 250) {
        perfAvgDt += (rawDt - perfAvgDt) * 0.04;
        if (perfCooldown > 0) perfCooldown--;
        else if (perfAvgDt > 22 && gfxQuality !== 'low') {
            if (++perfSlowFrames > 150) {
                gfxQuality = gfxQuality === 'high' ? 'medium' : 'low';
                applyGfxQuality(true);   // мягко: без пересборки города и заготовок — без рывка
                perfSlowFrames = 0; perfCooldown = 360; perfAvgDt = 16.7;
            }
        } else perfSlowFrames = Math.max(0, perfSlowFrames - 2);
    }

    update(); 
    if (typeof updateShieldBubbles === 'function') updateShieldBubbles(dtMult);
    checkAttemptMilestone();
    flushHud();
    draw();
    requestAnimationFrame(gameLoop);
}

function initMenuScenery() {
    pipes = [];
    items = [];
    owl.visible = true;
    // в меню сова стоит ровно там же, где начнёт полёт
    owl.x = getOwlStartX();
    owl.baseY = height * 0.38;
    owl.y = height * 0.38;
    owl.vy = 0;
    waitingFirstTap = true;
    gameActive = false;
}

function startOrResumeFlight() {
    if (typeof menuFxLeave === 'function') menuFxLeave();   // эффекты меню убираем (фейерверки тоже), эффекты паузы возвращаем
    try { if (typeof window.logoAnimStop === 'function') window.logoAnimStop(); } catch (e) {}   // анимация логотипа и облачко-подсказка совы — сразу прочь
    window.__bootMoon = false;   // луна с экрана загрузки держится в меню до первого полёта, дальше — луна игры
    // попытки закончились — стартуем новую игру с полным набором попыток
    try { checkDailyReset(); } catch (e) {}
    if (attempts <= 0) { returnToHome(); try { openShop(); } catch (e) {} return; }   // попытки на сегодня кончились — в лавку
    // после победы — новый поход с первого уровня (иначе несколько секунд играла бы музыка и светила луна прошлого прохождения)
    if (hasWonGame) startNewQuestKeepScore();
    snapProgressVisuals();
    AudioFX.resume();
    AudioFX.setMode('game');
    const startScreen = document.getElementById('startScreen');
    const rulesModal = document.getElementById('rulesModal');
    const gameOverModal = document.getElementById('gameOverModal');
    const victoryModal = document.getElementById('rouletteModal');
    const tapMsg = document.getElementById('tapToStartMsg');
    const topHud = document.getElementById('topHud');
    const bottomHud = document.getElementById('bottomHud');

    if (startScreen) startScreen.classList.add('hidden');
    if (rulesModal) rulesModal.classList.add('hidden');
    if (gameOverModal) gameOverModal.classList.add('hidden');
    if (victoryModal) victoryModal.classList.add('hidden');
    if (tapMsg) tapMsg.classList.remove('hidden');

    if (topHud) topHud.classList.remove('hidden');
    if (bottomHud) bottomHud.classList.remove('hidden');

    hasStartedCampaign = true;
    try { currentDifficultySqueeze = getDifficultyMultipliers().targetSqueeze || 0; } catch (e) {}   // трубы сразу такой ширины, как на текущем уровне (без сжатия на глазах)
    // после потери попытки полёт продолжается с того же уровня: вопросы, темы, перья, силы и прокачанные сердца сохраняются
    if (lives <= 0.5) { lives = startLives; stamina = maxStamina; }

    if (!isFlightPaused) {
        invulnerableTime = 0; if (typeof shazamReset === 'function') shazamReset(); shieldTime = 0; shieldAppearAnim = 0; infiniteStaminaTime = 0; compressionTime = 0; currentCompressionFactor = 0; speedBoostTime = 0; slowMotionTime = 0; AudioFX._lastSpeedState = 'normal';
        lastBuffStateKey = '';
        resetOvereatDrunk();
        lowStaminaSoundTimer = 0;
        lastKnownDiffIdx = getDifficultyIndex();
        pausedSnapshot = null;
        speedStars = [];
        pipesSinceTheme = 0; lastThemeKey = ''; resetSpecialTimers();
        frame = 0; 
        pipeDistanceTracker = 0;
        owl.visible = true;
        owl.x = getOwlStartX(); 
        owl.y = height * 0.38; 
        owl.baseY = height * 0.38; 
        owl.vy = 0; 
        owl.wing = 0; 
        hoverAngle = 0;
        pipes = []; items = []; particles = [];
        spawnInitialPipes();
    } else {
        owl.visible = true;
        owl.x = getOwlStartX();
        owl.vy = 0;
        owl.wing = 0;
        if (pausedSnapshot) {
            // продолжаем ровно с того места, где поставили паузу
            pipes = pausedSnapshot.pipes;
            items = pausedSnapshot.items;
            particles = [];
            owl.x = pausedSnapshot.owlX;
            owl.y = pausedSnapshot.owlY;
            owl.baseY = pausedSnapshot.owlY;
            owl.rotation = pausedSnapshot.owlRot;
            pipeDistanceTracker = pausedSnapshot.tracker;
            frame = pausedSnapshot.frame;
            hoverAngle = 0;
            pausedSnapshot = null;
        }
        isFlightPaused = false;
    }

    lastTime = 0;
    updateHUDAll(); StorageManager.save();
    gameActive = false;
    waitingFirstTap = true;
    if (typeof prewarmTokenSprites === 'function') prewarmTokenSprites();   // заготовки значков — заранее, пока сова ждёт первого касания
}

// Новый поход после победы: все темы собираются заново, а вопросы и оставшиеся попытки сохраняются
// Луна, музыка и скорость сразу встают в положение текущего прогресса: ничего не «откатывается» и не разгоняется на глазах
function snapProgressVisuals() {
    try { moonPhase = moonPhaseTarget(); moonRendered = -1; moonSprite = null; } catch (e) {}
    try { AudioFX.snapSpeedFactor(); } catch (e) {}
    try { currentDifficultySqueeze = getDifficultyMultipliers().targetSqueeze || 0; } catch (e) {}   // трубы сразу сжаты по текущему уровню
    try { gameSpeedFactor = gameSpeedFrom = gameSpeedTarget = 1; gameSpeedT = 1; spacingFactor = spacingFrom = spacingTarget = 1; spacingT = 1; prevDistMult = 1; } catch (e) {}
}

function startNewQuestKeepScore() {
    // победа: попытка не тратится, все бонусы (вопросы, перья, сила, прокачанные сердца) переходят в новый поход; темы и сложность — с первого уровня
    const keep = { score, attempts, attemptMilestone, maxStamina, magicFeathersCaught, featherMaxBonus, startLives, maxLives, lives, heartOverflow, zeroDay };
    resetEntireGame();
    score = keep.score; attempts = keep.attempts; attemptMilestone = keep.attemptMilestone; coinMilestone = Math.floor(keep.score / 50);
    maxStamina = keep.maxStamina; magicFeathersCaught = keep.magicFeathersCaught; featherMaxBonus = keep.featherMaxBonus; stamina = maxStamina;
    startLives = keep.startLives; maxLives = keep.maxLives; heartOverflow = keep.heartOverflow; zeroDay = keep.zeroDay;
    lives = Math.min(maxLives, Math.max(startLives, keep.lives));
    hasStartedCampaign = true;
    try { currentDifficultySqueeze = getDifficultyMultipliers().targetSqueeze || 0; } catch (e) {}   // трубы сразу такой ширины, как на текущем уровне (без сжатия на глазах)
    snapProgressVisuals();
    StorageManager.save();
    updateHUDAll();
}

// Полный сброс. keepAttempts — сохранить текущее число попыток (ручной «Начать заново»); attempts — сколько попыток дать (ежедневный сброс: 1)
function resetEntireGame(opts) {
    const o = opts || {};
    attempts = o.keepAttempts ? attempts : (typeof o.attempts === 'number' ? o.attempts : MAX_ATTEMPTS); score = 0; heartOverflow = 0; zeroDay = ''; startLives = 3.0; maxLives = ADMIN_CFG.maxLives; lives = startLives; maxStamina = 100; magicFeathersCaught = 0; featherMaxBonus = 0; stamina = 100.0; hasStartedCampaign = false;
    hasWonGame = false;
    isFlightPaused = false;
    owl.visible = true;
    // Новая игра: сложность сбрасывается, и трубы СРАЗУ становятся стандартной ширины
    // (а не расширяются на глазах у игрока из сжатого состояния прошлой игры)
    lastKnownDiffIdx = 0;
    attemptMilestone = 0; coinMilestone = 0;
    currentDifficultySqueeze = 0;
    pipesSinceTheme = 0; lastThemeKey = '';
    collected = { music: 0, logic: 0, kino: 0, series: 0, cartoons: 0, fun: 0 };
    if (typeof quizResetProgress === 'function') quizResetProgress();   // новая игра: порталы квиза — снова с 10%
    resetSpecialTimers();
    if (typeof shazamReset === 'function') shazamReset(); shieldTime = 0; shieldAppearAnim = 0; infiniteStaminaTime = 0; compressionTime = 0; currentCompressionFactor = 0; speedBoostTime = 0; slowMotionTime = 0; AudioFX._lastSpeedState = 'normal'; invulnerableTime = 0;
    if (typeof stormClearNow === 'function') stormClearNow();   // новая игра — с ясного неба
    if (typeof STORM !== 'undefined') STORM.pausedWx = null;
    resetOvereatDrunk();
    pipes = []; items = []; particles = [];
    snapProgressVisuals();
    updateHUDAll(); StorageManager.save();
}

// Попытки закончились — новая игра: прогресс сбрасывается, снова MAX_ATTEMPTS попыток (без ожидания до завтра)
// Сутки: каждый новый день — 2 попытки и прогресс с нуля. В течение дня прогресс сохраняется; кончились попытки —
// их можно купить в лавке (монеты — за вопросы дня), иначе ждать завтра.
function checkDailyReset() {
    const t = todayKey();
    if (playDay === t) return false;
    const fresh = !playDay;
    playDay = t;
    if (!fresh) resetEntireGame({ attempts: MAX_ATTEMPTS });
    try { StorageManager.save(); updateHUDAll(); } catch (e) {}
    return !fresh;
}
setInterval(() => { try { if (!gameActive && playDay && playDay !== todayKey()) { checkDailyReset(); updateMenuVisibility(); } } catch (e) {} }, 30000);

// Пауза: запоминаем, где именно были сова, трубы и предметы (только до закрытия вкладки)
let pausedSnapshot = null;
// Все звуки эффектов идут через AudioFX.sfxGain одноразовыми узлами, отдельной «остановки» у них нет:
// ставим новую шину эффектов, старую (со всеми ещё звучащими хвостами) за 0,12 с уводим в тишину и отключаем.
// Погода (дождь/ветер) подключена к шине постоянно — её переносим на новую шину.
function cutGameSfx() {
    try {
        const A = AudioFX, ac = A.ctx, old = A.sfxGain;
        if (!ac || !old || !A.master) return;
        const nb = ac.createGain();
        nb.gain.setValueAtTime(A.isSfxMuted ? 0 : A.sfxVolume, ac.currentTime);
        nb.connect(A.master);
        const W = A._wx;
        if (W) [W.rg, W.wg].forEach(n => { try { if (n) { n.disconnect(); n.connect(nb); } } catch (e) {} });
        A.sfxGain = nb;
        const t = ac.currentTime;
        old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 0.12);
        setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 400);
    } catch (e) {}
}
function returnToHome() {
    // погода замирает вместе с игрой: запоминаем грозу как есть и вернём её при продолжении
    try { if (typeof WX !== 'undefined' && WX.left >= 0) STORM.pausedWx = { on: WX.on, left: WX.left, peak: WX.peak, cover: stormCover, si: Math.max(0, stormIntensity), fade: STORM.fade || 0, wet: STORM.wet || 0, ice: STORM.ice || 0 }; } catch (e) {}
    if (gameActive) {
        isFlightPaused = true;
        pausedSnapshot = {
            pipes: pipes, items: items,
            owlX: owl.x, owlY: owl.y, owlRot: owl.rotation,
            tracker: pipeDistanceTracker, frame: frame
        };
    } else {
        clearAllBuffs();
    }
    const bar = document.getElementById('buffBar');
    if (bar) bar.innerHTML = '';
    lastBuffStateKey = '';

    gameActive = false; waitingFirstTap = true;
    cutGameSfx();   // длинные звуки эффектов игры (ускорение, замедление, ШАЗАМ, вода…) обрываем мягко, в меню их не слышно
    AudioFX.setMode('menu');
    StorageManager.save(); updateMenuVisibility();
    const startScreen = document.getElementById('startScreen');
    const rulesModal = document.getElementById('rulesModal');
    const gameOverModal = document.getElementById('gameOverModal');
    const victoryModal = document.getElementById('rouletteModal');
    const tapMsg = document.getElementById('tapToStartMsg');
    const topHud = document.getElementById('topHud');
    const bottomHud = document.getElementById('bottomHud');

    if (startScreen) startScreen.classList.remove('hidden');
    if (rulesModal) rulesModal.classList.add('hidden');
    if (gameOverModal) gameOverModal.classList.add('hidden');
    if (victoryModal) victoryModal.classList.add('hidden');
    if (tapMsg) tapMsg.classList.add('hidden');

    if (topHud) topHud.classList.add('hidden');
    if (bottomHud) bottomHud.classList.add('hidden');

    initMenuScenery();
    if (typeof menuFxEnter === 'function') menuFxEnter();   // эффекты паузы — в сторону, в меню свои
}

// Запуск сохранения/интерфейса после загрузки всех файлов игры
StorageManager.init();
try { checkDailyReset(); } catch (e) {}
