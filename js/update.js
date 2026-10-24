function update() {
    if (deathFreeze > 0) {
        deathFreeze -= dtMult;
        if (deathFreeze <= 0) { deathFreeze = 0; handleRunFailure(deathFreezeReason); }
        return;
    }
    owl.update();
    updateSpeedStars();
    updateIceShards();

    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dtMult; 
        pt.y += pt.vy * dtMult; 
        if (pt.kind === 'snow') pt.angle += pt.vAngle * dtMult;   // снежинка лишь чуть поворачивается
        if (pt.isFeather) {
            pt.vy += 0.12 * dtMult;
            pt.vx *= Math.pow(0.97, dtMult);
            pt.angle = (pt.angle || 0) + ((pt.vAngle || 0.05) * dtMult);
        }
        if (pt.grav) pt.vy += pt.grav * dtMult;   // брызги воды падают
        pt.alpha -= (pt.decay || 0.025) * dtMult;
        if (pt.grow) pt.size += pt.grow * dtMult;
        if (pt.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    shazamUpdate();
    if (!gameActive) return;
    frame += dtMult;
    if (typeof quizActive === 'function' && quizActive()) { quizUpdate(); return; }   // квиз-мир: свой полёт, обычный мир стоит

    if (infiniteStaminaTime > 0) {
        infiniteStaminaTime -= dtMult;
        stamina = maxStamina;
        updateStaminaHUD();
    } else {
        stamina = Math.max(0, stamina - 0.0462 * staminaDrainMult() * dtMult);   // +5% к расходу   // в покое силы уходят чуть быстрее (было 0,04)
        updateStaminaHUD();
    }

    if (stamina <= 25 && infiniteStaminaTime <= 0) {
        lowStaminaSoundTimer += dtMult;
        const alertInterval = stamina <= 12 ? 85 : 120;
        if (lowStaminaSoundTimer >= alertInterval) {
            lowStaminaSoundTimer = 0;
            AudioFX.playLowStaminaAlert();
            Haptics.vibrate(12);
        }
    } else {
        lowStaminaSoundTimer = 0;
    }

    if (stamina <= 0 && infiniteStaminaTime <= 0) {
        handleStaminaDepletion();
        return;
    }

    if (shieldTime > 0) {
        shieldTime -= dtMult;
        if (shieldAppearAnim > 0) shieldAppearAnim -= dtMult;
    }

    if (speedBoostTime > 0) {
        speedBoostTime -= dtMult;
        if (speedBoostTime <= 0) AudioFX.onSpeedChanged();
    }
    if (slowMotionTime > 0) {
        slowMotionTime -= dtMult;
        if (slowMotionTime <= 0) AudioFX.onSpeedChanged();
    }

    if (overeatTime > 0) {
        overeatTime -= dtMult;
        if (overeatTime <= 0) { overeatTime = 0; AudioFX.playOverEatEnd(); }
    }
    if (drunkTime > 0) {
        // вода отрезвляет: под дождём опьянение проходит быстрее, под струёй «Водонапора» — намного быстрее
        let sob = 0;
        try { if (typeof stormSmooth === 'function' && typeof stormCover === 'number') sob = stormSmooth(0.3, 1, stormCover); } catch (e) {}
        const inW = (window.__owlInWater || 0) > 0 && typeof waterTime !== 'undefined' && waterTime > 0;
        // дождь — время идёт в 1,5 раза быстрее, под струёй — вдвое; скорость меняется плавно
        const tgt = 1 + 0.5 * sob + (inW ? 0.5 : 0);
        window.__sobRate = (window.__sobRate || 1) + (tgt - (window.__sobRate || 1)) * Math.min(1, 0.06 * dtMult);
        const rate = window.__sobRate;
        drunkTime -= dtMult * rate;
        const lv = rate > 1.6 ? 2 : (rate > 1.15 ? 1 : 0);
        if (lv !== window.__soberLv) {   // таймер опьянения «смывается»: светится голубым, при струе — сильнее
            window.__soberLv = lv;
            try { const el = document.querySelector('#buffBar .buff-tag[data-key="drunk"]'); if (el) { el.classList.toggle('sober1', lv === 1); el.classList.toggle('sober2', lv === 2); } } catch (e) {}
        }
        if (drunkTime <= 0) { drunkTime = 0; window.__soberLv = -1; AudioFX.playDrunkEnd(); }
    }
    if (freezeTime > 0) {
        freezeTime -= dtMult;
        if (freezeTime <= 0) { freezeTime = 0; AudioFX.playFreezeEnd(); spawnIceBurst('thaw'); Haptics.hit(); }
    }
    // заморозка в дождь: капли на сове тоже замерзают — лёд налипает со временем (за 10 с — до максимума), сова тяжелеет
    if (typeof STORM !== 'undefined') {
        const iceWet = Math.max(STORM.wet || 0, owl._wWet || 0);   // мокрая от дождя или от «Водонапора» — замёрзшая сова обрастает льдом; щит прикрывает — новый лёд не налипает
        if (freezeTime > 0 && iceWet > 0.1 && shieldTime <= 0) STORM.ice = Math.min(1, (STORM.ice || 0) + dtMult / (owl._wWet > 0.1 ? 300 : 600) * Math.min(1, iceWet * 1.3));
        else if (freezeTime <= 0) STORM.ice = Math.max(0, (STORM.ice || 0) - 0.05 * dtMult);
    }
    {
        const fStep = 0.025 * dtMult;
        const fTarget = freezeTime > 0 ? 1 : 0;
        currentFreezeFactor += Math.max(-fStep, Math.min(fStep, fTarget - currentFreezeFactor));
    }
    {
        const oStep = 0.02 * dtMult;
        const oTarget = overeatTime > 0 ? 1 : 0;
        currentOvereatFactor += Math.max(-oStep, Math.min(oStep, oTarget - currentOvereatFactor));
        const dStep = 0.02 * dtMult;
        const dTarget = drunkTime > 0 ? 1 : 0;
        currentDrunkFactor += Math.max(-dStep, Math.min(dStep, dTarget - currentDrunkFactor));
    }

    if (compressionTime > 0) {
        compressionTime -= dtMult;
        currentCompressionFactor = Math.min(1.0, currentCompressionFactor + 0.04 * dtMult);
        if (compressionTime <= 0) {
            AudioFX.playCompressEnd();
            Haptics.powerup();
        }
    } else {
        currentCompressionFactor = Math.max(0.0, currentCompressionFactor - 0.04 * dtMult);
    }

    const diffInfo = getDifficultyMultipliers();
    if (currentDifficultySqueeze < diffInfo.targetSqueeze) {
        currentDifficultySqueeze = Math.min(diffInfo.targetSqueeze, currentDifficultySqueeze + 0.4 * dtMult);
    } else if (currentDifficultySqueeze > diffInfo.targetSqueeze) {
        currentDifficultySqueeze = Math.max(diffInfo.targetSqueeze, currentDifficultySqueeze - 0.4 * dtMult);
    }

    if (invulnerableTime > 0) invulnerableTime -= dtMult;

    updateBuffHUD();

    // Ограничение полёта (потолок и пол)
    if (owl.y + owl.radius > height) {
        owl.y = height - owl.radius;
        if (shieldTime <= 0 && invulnerableTime <= 0 && !shazamBusy()) {
            handleHit('Сова упала на землю — это была последняя жизнь.');
        } else {
            if (shieldTime > 0 && owl.vy > 0.5) shieldBump(Math.PI / 2, owl.vy / 8);
            owl.vy = -3.8; // Пружиним вверх
        }
    } else if (owl.y - owl.radius < 0) {
        owl.y = owl.radius;
        if (shieldTime <= 0 && invulnerableTime <= 0 && !shazamBusy()) {
            handleHit('Сова вылетела за верхний край экрана — это была последняя жизнь.');
            owl.vy = 2.0; // Отталкиваем вниз
        } else {
            if (shieldTime > 0 && owl.vy < -0.5) shieldBump(-Math.PI / 2, -owl.vy / 8);
            owl.vy = 2.0; // Пружиним вниз
        }
    }

    let baseSpeed = 2.24;
    baseSpeed *= diffInfo.speedMult;

    let currentSpeed = baseSpeed;
    // Плавный разгон/торможение игры (~0.9 с), синхронно с музыкой
    const gsTarget = shazamGsTarget() || (speedBoostTime > 0 ? 1.30 : (slowMotionTime > 0 ? 0.70 : 1.0));
    if (gsTarget !== gameSpeedTarget) { gameSpeedFrom = gameSpeedFactor; gameSpeedTarget = gsTarget; gameSpeedT = 0; }
    gameSpeedT = Math.min(1, gameSpeedT + dtMult / (shazamBusy() ? 100 : 54));   // в ШАЗАМ разгон плавный, начинается ещё на зарядке
    gameSpeedFactor = gameSpeedFrom + (gsTarget - gameSpeedFrom) * (gameSpeedT * gameSpeedT * (3 - 2 * gameSpeedT));
    currentSpeed *= gameSpeedFactor * shazamSpeedMul();   // ШАЗАМ: на зарядке игра почти замирает
    const spTarget = shazamBusy() ? 1.0 : gsTarget;   // в ШАЗАМе трубы не расходятся шире — скорость чувствуется
    if (spTarget !== spacingTarget) { spacingFrom = spacingFactor; spacingTarget = spTarget; spacingT = 0; }
    spacingT = Math.min(1, spacingT + dtMult / SPACING_RAMP_FRAMES);
    spacingFactor = spacingFrom + (spTarget - spacingFrom) * (spacingT * spacingT * (3 - 2 * spacingT));

    pipeDistanceTracker += currentSpeed * dtMult;
    cityOffset += currentSpeed * dtMult;   // ночной город уезжает назад вместе с полётом (медленнее — он далеко)
    
    // Расстояние между трубами меняется плавно: +14% при полном ускорении, -25% при полном замедлении (базовое расстояние чуть меньше: 262 вместо 275)
    const distMult = spacingFactor >= 1 ? 1 + (spacingFactor - 1) * (0.14 / 0.30) : 1 - (1 - spacingFactor) * (0.25 / 0.30);
    let targetPipeDistance = 262 * distMult;

    // Трубы, которые уже летят на экране, плавно сдвигаются ближе (замедление) или дальше (ускорение):
    // не нужно ждать, пока долетят новые трубы из-за края экрана
    const dRatio = distMult / prevDistMult;
    prevDistMult = distMult;
    if (gameActive && Math.abs(dRatio - 1) > 1e-6 && Math.abs(dRatio - 1) < 0.05) {
        for (const it of items) {
            for (const p of pipes) {
                if (p.x > owl.x && Math.abs(it.x - (p.x + p.width / 2)) < 60) { it.x += (p.x - owl.x) * (dRatio - 1); break; }
            }
        }
        let newestX = -1e9;
        for (const p of pipes) {
            if (p.x > owl.x) p.x += (p.x - owl.x) * (dRatio - 1);
            if (p.x > newestX) newestX = p.x;
        }
        // без обрезки до нуля: если трубу растянуло за край экрана, следующая должна подождать (раньше из-за этого трубы налезали друг на друга)
        if (newestX > -1e8) pipeDistanceTracker = (width + 25) - newestX;
    }

    if (pipeDistanceTracker >= targetPipeDistance) {
        // страховка: новая труба никогда не появляется слишком близко к предыдущей
        let newestPipeX = -1e9;
        for (const q of pipes) if (q.x > newestPipeX) newestPipeX = q.x;
        const realGap = (width + 25 + Math.ceil(width * 0.03)) - newestPipeX;
        if (realGap >= targetPipeDistance * 0.9) {
            spawnPipe();
            pipeDistanceTracker = 0;
        } else {
            pipeDistanceTracker = realGap;
        }
    }

    const activeSqueeze = currentDifficultySqueeze + (currentCompressionFactor * compressionMaxForLevel());

    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= currentSpeed * dtMult;

        if (shazamBusy()) {
            // ШАЗАМ: сова пролетает трубы насквозь (то за трубой, то перед ней)
        } else if (shieldTime <= 0 && invulnerableTime <= 0 && !p.shzPass) {   // shzPass — труба, которую облетали в ШАЗАМе
            const effectiveTop = p.top + activeSqueeze;
            const effectiveBottom = p.bottom + activeSqueeze;
            if (owl.x + owl.radius > p.x && owl.x - owl.radius < p.x + p.width && (owl.y - owl.radius < effectiveTop || owl.y + owl.radius > height - effectiveBottom)) {
                handleHit('Сова врезалась в трубу — это была последняя жизнь.');
            }
        } else if (shieldTime > 0 && invulnerableTime <= 0 && !p.shieldPass) {
            // Щит: сердца не теряются, но сквозь трубу не пролететь — сова отскакивает, щит прогибается
            const effTop = p.top + activeSqueeze;
            const effBot = height - (p.bottom + activeSqueeze);
            const r = owl.radius;
            if (owl.x + r > p.x && owl.x - r < p.x + p.width && (owl.y - r < effTop || owl.y + r > effBot)) {
                const hitTop = owl.y - r < effTop;
                const penSide = (owl.x + r) - p.x;
                const penV = hitTop ? effTop - (owl.y - r) : (owl.y + r) - effBot;
                if (owl.x < p.x && penSide < penV) {
                    // удар в торец трубы: труба толкает сову назад, сова отскакивает к проходу
                    const pw = 0.5 + Math.min(0.5, Math.abs(owl.vy) * 0.05 + (penSide > 3 ? 0.2 : 0));
                    owl.x = p.x - r;
                    owl.vy = hitTop ? Math.max(owl.vy, 2.6) : Math.min(owl.vy, -3.4);
                    shieldBump(0, pw);
                } else if (hitTop) {
                    const pw = Math.abs(owl.vy) / 8;
                    owl.y = effTop + r; owl.vy = Math.max(owl.vy, 2.2);
                    shieldBump(-Math.PI / 2, pw);
                } else {
                    const pw = Math.abs(owl.vy) / 8;
                    owl.y = effBot - r; owl.vy = Math.min(owl.vy, -3.4);
                    shieldBump(Math.PI / 2, pw);
                }
                // если трубой прижало к самому краю экрана — щит всё же проталкивает сову сквозь неё
                if (owl.x - r < 4) p.shieldPass = true;
            }
        }
        if (p.x + p.width < -40 - width * 0.03) pipes.splice(i, 1);
    }

    // Сова плавно возвращается на своё место, если труба её оттолкнула
    {
        const sx = getOwlStartX();
        if (owl.x < sx) owl.x = Math.min(sx, owl.x + 0.9 * dtMult);
        shieldDent *= Math.pow(0.925, dtMult);   // распрямляется медленнее — прогиб дольше виден
        shieldHitPower *= Math.pow(0.9, dtMult);
        shieldWob *= Math.pow(0.94, dtMult);
        for (let i = shieldTouches.length - 1; i >= 0; i--) { shieldTouches[i].p *= Math.pow(0.9, dtMult); if (shieldTouches[i].p < 0.02) shieldTouches.splice(i, 1); }
    }

    crystalUpdate(currentSpeed, activeSqueeze);   // эффект «Опасные трубы»
    if (typeof waterUpdate === 'function') waterUpdate(currentSpeed, activeSqueeze);
    if (typeof quizUpdate2D === 'function') quizUpdate2D(currentSpeed, activeSqueeze);   // портал в квиз-мир   // эффект «Вода из труб»
    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];

        if (!it.centerX) {
            it.centerX = it.x;
            it.centerY = it.y;
        }

        if (it.isCollecting) {
            it.shrinkStep = (it.shrinkStep || 0) + 1 * dtMult;
            
            if (it.shrinkStep <= 2) {
                it.scale = 1.0 + it.shrinkStep * 0.07;
            } else {
                const progress = (it.shrinkStep - 2) / 5;
                it.scale = Math.max(0, 1.14 * (1 - progress * progress));
            }

            if (it.shrinkStep >= 7 || it.scale <= 0.02) {
                const burstX = it.centerX;
                const burstY = it.centerY;
                const itemCat = CATEGORIES[it.type] || CATEGORIES.question;

                spawnCollectionStarBurst(burstX, burstY, itemCat.color);

                if (it.pendingFX) {
                    spawnFlyingArrivalFX(burstX, burstY, it.pendingFX.target, it.pendingFX.text, it.pendingFX.color, it.pendingFX.icon);
                    if (it.pendingFX.preHeld) hudPending[it.pendingFX.preHeld] = Math.max(0, (hudPending[it.pendingFX.preHeld] || 0) - 1);
                    if (it.extraFX) { spawnFlyingArrivalFX(burstX, burstY, it.extraFX.target, it.extraFX.text, it.extraFX.color, it.extraFX.icon, true); if (it.extraFX.onShow) it.extraFX.onShow(); }
                }

                items.splice(i, 1);
                continue;
            }

            it.centerX -= currentSpeed * dtMult;
            it.x = it.centerX;
            it.y = it.centerY;
            continue;
        }

        if (it.isMoving) {
            it.x -= (currentSpeed + (it.speedX || 1.2)) * dtMult;
            it.y = it.baseY + Math.sin(frame * it.waveSpeed + it.floatOffset) * it.waveAmp;
            it.centerX = it.x;
            it.centerY = it.y;

            if (!it.trail) it.trail = [];
            it.trail.unshift({ x: it.x, y: it.y });
            if (it.trail.length > 8) it.trail.pop();
        } else {
            it.x -= currentSpeed * dtMult;
            it.y = it.baseY + Math.sin(frame * 0.07 + it.floatOffset) * 3.5;
            it.centerX = it.x;
            it.centerY = it.y;
        }
        shazamMagnet(it);   // ШАЗАМ: значки притягиваются к сове

        if (Math.hypot(owl.x - it.x, owl.y - it.y) < owl.radius + it.radius && !it.collected) {
            it.collected = true;
            it.isCollecting = true;
            it.shrinkStep = 0;
            it.scale = 1.0;
            Haptics.collectTheme();

            const collectX = it.x;
            const collectY = it.y;

            const oldDiffLevel = getDifficultyMultipliers().level;

            const shzBlock = shazamBusy() && ['shield', 'slowmo', 'compress', 'infinite'].includes(it.type);
            if (shzBlock) {
                AudioFX.playCollect(true);   // в ШАЗАМе эффект не включается
                if (it.type === 'infinite') { stamina = maxStamina; updateStaminaHUD(); it.pendingFX = { target: 'stamina', text: '+100% Сил', color: '#00F0FF', icon: 'fa-feather-pointed' }; }
            } else if (it.type === 'question') {
                AudioFX.playCollect(false);
                score++; scheduleHud('score');
                StorageManager.save();
                it.pendingFX = { target: 'score', text: '+1 Вопрос', color: '#FE7600', icon: 'fa-circle-question' };
                if (attemptMilestone >= 0 && Math.floor(score / QUESTIONS_PER_ATTEMPT) > attemptMilestone) {   // этот вопрос даёт попытку: подсказки появятся и исчезнут вместе
                    hudPending.attempts = (hudPending.attempts || 0) + 1;   // число попыток сменится, когда долетит шарик
                    it.extraFX = { target: 'attempts', text: '', color: '#FFC53D', icon: 'fa-rotate-right', onShow: () => { hudPending.attempts = Math.max(0, (hudPending.attempts || 0) - 1); flashAttemptsBadge(); showGoldBanner('+1 попытка', 'fa-rotate-right', '#FFC53D'); } };   // крупное уведомление внизу, над панелью
                    window.__attemptHintPending = true;
                }
            } else if (it.type === 'stamina') {
                AudioFX.playCollect(true);
                stamina = Math.min(maxStamina, stamina + 50.0);
                updateStaminaHUD(); StorageManager.save();
                it.pendingFX = { target: 'stamina', text: '+50% Сил', color: '#67E8F9', icon: 'fa-feather-pointed' };
            } else if (it.type === 'infinite') {
                AudioFX.playStarCollect();
                infiniteStaminaTime = ADMIN_CFG.infiniteSec * 60;
                magicFeathersCaught++;
                let maxUp = false;
                if (magicFeathersCaught % FEATHERS_FOR_MAX_UP === 0) {
                    maxStamina += 20; featherMaxBonus += 20; maxUp = true;
                    setTimeout(triggerMaxStaminaUp, 650);   // блеск плашки, когда долетит шарик
                }
                stamina = maxStamina;
                updateStaminaHUD();
                Haptics.powerup();
                it.pendingFX = { target: 'stamina', text: `Макс. силы ${ADMIN_CFG.infiniteSec}с`, color: '#00F0FF', icon: 'svg-infinite-feather' };
                if (maxUp) setTimeout(() => showGoldBanner('Макс. сила +20%', 'fa-feather-pointed', '#38BDF8'), 900);   // уведомление внизу, над панелью тем
            } else if (it.type === 'drink') {
                AudioFX.playCollect(true);
                stamina = Math.min(maxStamina, stamina + 15.0);   // коктейль
                updateStaminaHUD(); StorageManager.save();
                it.pendingFX = { target: 'stamina', text: '+15% Сил', color: '#2DD4BF', icon: 'fa-martini-glass-citrus' };
                it.extraFX = registerDrink();
            } else if (it.type === 'mocktail') {
                AudioFX.playCollect(true);
                stamina = Math.min(maxStamina, stamina + 10.0);   // пиво
                updateStaminaHUD(); StorageManager.save();
                it.pendingFX = { target: 'stamina', text: '+10% Сил', color: '#F4B942', icon: 'fa-beer-mug-empty' };
                it.extraFX = registerDrink();
            } else if (it.type === 'coin') {
                const n = it.coins || 50;
                if (typeof coinsAdd === 'function') coinsAdd(n);
                try { AudioFX.playStarCollect(); AudioFX.playCollect(true); Haptics.collectTheme(); } catch (e) {}
                showGoldBanner(`+${n} монет`, 'fa-coins', '#FFC53D');   // в углу напротив таймеров
            } else if (it.type === 'water') {
                it.pendingFX = registerWater();   // 10 с: из труб льётся вода
            } else if (it.type === 'crystal') {
                it.pendingFX = registerCrystal();   // 10 с: из труб падают светящиеся кристаллы
            } else if (it.type === 'icecream') {
                AudioFX.playCollect(true);
                stamina = Math.min(maxStamina, stamina + 20.0);   // мороженое
                updateStaminaHUD(); StorageManager.save();
                it.pendingFX = { target: 'stamina', text: '+20% Сил', color: '#B5E4FF', icon: 'fa-ice-cream' };
                it.extraFX = registerIceCream();
            } else if (it.type === 'heart') {
                AudioFX.playStarCollect();
                // максимум сердец фиксирован (5); 6 — только из рулетки. Полный запас — сердце не копится
                lives = Math.min(maxLives, Math.round((lives + 1.0) * 10) / 10);
                updateLivesHUD(); StorageManager.save();
                // при прокачке максимума маленькой подсказки нет — только крупное уведомление внизу
                it.pendingFX = { target: 'heart', text: it.__maxUp ? '' : '+1.0 Жизнь', color: '#EF4444', icon: 'fa-heart' };
            } else if (it.type === 'pizza') {
                AudioFX.playCollect(true);
                lives = Math.min(maxLives, Math.round((lives + 0.5) * 10) / 10);
                updateLivesHUD(); StorageManager.save();
                it.pendingFX = { target: 'heart', text: '+0.5 Жизни', color: '#F97316', icon: 'fa-pizza-slice' };
                it.extraFX = registerJunkFood();
            } else if (it.type === 'burger') {
                AudioFX.playCollect(true);
                lives = Math.min(maxLives, Math.round((lives + 0.5) * 10) / 10);
                updateLivesHUD(); StorageManager.save();
                it.pendingFX = { target: 'heart', text: '+0.5 Жизни', color: '#F59E0B', icon: 'fa-burger' };
                it.extraFX = registerJunkFood();
            } else if (it.type === 'hotdog') {
                AudioFX.playCollect(true);
                lives = Math.min(maxLives, Math.round((lives + 0.5) * 10) / 10);
                updateLivesHUD(); StorageManager.save();
                it.pendingFX = { target: 'heart', text: '+0.5 Жизни', color: '#FB923C', icon: 'fa-hotdog' };
                it.extraFX = registerJunkFood();
            } else if (it.type === 'shield') {
                AudioFX.playShieldCollect();
                shieldTime = Math.max(shieldTime, ADMIN_CFG.shieldSec * 60);
                shieldAppearAnim = 12;
                Haptics.powerup();
                it.pendingFX = { target: 'other', text: `Щит ${ADMIN_CFG.shieldSec}с`, color: '#22C55E', icon: 'fa-shield-halved' };
            } else if (it.type === 'compress') {
                AudioFX.playCompressStart();
                compressionTime = ADMIN_CFG.compressSec * 60;
                Haptics.powerup();
                it.pendingFX = { target: 'other', text: `Сжатие ${ADMIN_CFG.compressSec}с`, color: '#D946EF', icon: 'svg-compress' };
            } else if (it.type === 'speedup') {
                AudioFX.playStarCollect();
                slowMotionTime = 0;
                const shzWas = shazamBusy();
                speedBoostTime = ADMIN_CFG.speedSec * 60; const shz = shazamOnSpeedup();
                AudioFX.onSpeedChanged();
                Haptics.powerup();
                if (!shzWas) it.pendingFX = shz ? { target: 'other', text: `ШАЗАМ ${Math.round((SHZ.DUR + SHZ.FADE) / 60)}с`, color: '#FF7A00', icon: 'fa-bolt-lightning' }
                                   : { target: 'other', text: `Ускорение ${ADMIN_CFG.speedSec}с`, color: '#FACC15', icon: 'fa-bolt' };
            } else if (it.type === 'slowmo') {
                AudioFX.playStarCollect();
                speedBoostTime = 0;
                slowMotionTime = ADMIN_CFG.slowSec * 60;
                AudioFX.onSpeedChanged();
                Haptics.powerup();
                it.pendingFX = { target: 'other', text: `Замедление ${ADMIN_CFG.slowSec}с`, color: '#38BDF8', icon: 'fa-hourglass-half' };
            } else if (it.type === 'secret') {
                const rouletteResult = handleSecretRoulette(collectX, collectY);
                if (!rouletteResult.skip) {
                    it.pendingFX = { target: rouletteResult.target || (rouletteResult.isScoreAdd ? 'score' : 'other'), text: rouletteResult.label, color: rouletteResult.color, icon: rouletteResult.icon };
                    if (rouletteResult.target === 'heart' || rouletteResult.target === 'stamina') {   // жизнь/силы засчитаются в плашке, когда долетит шарик
                        const hg = hudGroup(rouletteResult.target);
                        hudPending[hg] = (hudPending[hg] || 0) + 1;
                        it.pendingFX.preHeld = hg;
                    }
                }
                StorageManager.save();
            } else {
                AudioFX.playThemeCollect();
                const cat = CATEGORIES[it.type];
                const maxLimit = cat.count;
                if (collected[it.type] < maxLimit) {
                    collected[it.type]++;
                    if (typeof quizOnTheme === 'function') quizOnTheme();   // каждые 10% тем — портал в квиз-мир
                    crystalOnTheme();   // редкий значок «Опасные трубы»/«Водонапор»: считаем собранные темы
                    const labelText = collected[it.type] === maxLimit ? `+1 ${cat.name} (${maxLimit}/${maxLimit})` : `+1 ${cat.name}`;
                    it.pendingFX = { target: it.type, text: labelText, color: cat.color, icon: cat.faClass };
                    updateCollectionHUD();
                    StorageManager.save();
                    checkVictoryCondition();
                } else {
                    it.pendingFX = { target: it.type, text: `${maxLimit}/${maxLimit} ${cat.name}`, color: cat.color, icon: cat.faClass };
                }
            }

            const newDiffLevel = getDifficultyMultipliers().level;
            if (oldDiffLevel !== newDiffLevel) {
                AudioFX.onSpeedChanged();
            }

            continue;
        }
        if (it.x < -40) items.splice(i, 1);
    }
}

// Подсказка эффекта с отсчётом («Щит 10с», «Замедление 10с»…) после появления улетает в свой таймер вверху
// и превращается в него: текст меняется на «Щит: 10с», ширина плавно подстраивается, таймер проявляется на её месте
const buffArrive = {};
let lastBuffKeySet = new Set();
const lastBuffLeft = {};
const buffRefreshed = {};
function pulseBuff(key) {
    const t = document.querySelector(`#buffBar [data-key="${key}"]`);
    if (!t) return;
    restartClass(t, ['buff-pulse'], 'buff-pulse');
    setTimeout(() => t.classList.remove('buff-pulse'), 520);
}
// есть ли у какого-то подобранного предмета ещё не показанная подсказка для этого таймера
function buffTagPending(key) {
    try {
        for (const it of items) {
            if (it.pendingFX && buffKeyForLabel(it.pendingFX.text) === key) return true;
            if (it.extraFX && buffKeyForLabel(it.extraFX.text) === key) return true;
        }
    } catch (e) {}
    return false;
}
function buffKeyForLabel(t) {
    t = String(t || '');
    if (/^Щит \d+с$/i.test(t)) return 'shield';
    if (/^Макс\. силы \d+с$/i.test(t)) return 'infinite';
    if (/^Сжатие \d+с$/i.test(t)) return 'compress';
    if (/^Ускорение \d+с$/i.test(t)) return shazamBusy() ? 'shazam' : 'speed';   
    if (/^ШАЗАМ \d+с$/i.test(t)) return 'shazam';   // в ШАЗАМе подсказка улетает в таймер ШАЗАМа
    if (/^Замедление \d+с$/i.test(t)) return 'slow';
    if (/^Опасные трубы \d+с$/i.test(t)) return 'crystal';
    if (/^Водонапор \d+с$/i.test(t)) return 'water';
    if (/переели/i.test(t)) return 'overeat';
    if (/замёрзли|замерзли/i.test(t)) return 'freeze';
    if (/опьянели/i.test(t)) return 'drunk';
    return null;
}
function sendTagToTimer(tag, key) {
    tag.__toTimer = true;
    const existing = document.querySelector(`#buffBar [data-key="${key}"]`);
    const alreadyShown = existing && existing.style.opacity !== '0' && !buffArrive[key];
    if (!alreadyShown) buffArrive[key] = performance.now() + 2500;
    lastBuffStateKey = ''; updateBuffHUD();
    tag.style.animation = 'buffTagIntro 0.45s linear forwards';   // в начале движется так же, как обычные подсказки — соседние не наезжают
    const showTimer = () => {
        delete buffArrive[key];
        const t = document.querySelector(`#buffBar [data-key="${key}"]`);
        if (t) { t.style.transition = 'none'; t.style.opacity = '1'; void t.offsetWidth; t.style.transition = ''; }   // появляется мгновенно — на месте прилетевшей подсказки
    };
    const startFly = () => {
        if (tag.__holdUntil && performance.now() < tag.__holdUntil) { setTimeout(startFly, tag.__holdUntil - performance.now()); return; }   // ждём, пока верхняя подсказка начнёт таять
        if (!tag.__lifted && tag.parentNode) {   // сначала, как обычная подсказка, чуть поднимается вверх — и уже потом летит к таймеру
            tag.__lifted = true;
            const zz = uiFx();
            tag.style.transition = 'top 0.2s ease-out';
            tag.style.top = (parseFloat(tag.style.top) - 12 * zz) + 'px';
            setTimeout(startFly, 200); return;
        }
        const el = document.querySelector(`#buffBar [data-key="${key}"]`);
        if (!el || !tag.parentNode) { if (tag.parentNode) tag.parentNode.removeChild(tag); showTimer(); return; }
        // превращение в надпись таймера: фиксируем ширину, меняем содержимое и плавно растягиваем до новой
        const w0 = tag.offsetWidth;
        tag.style.width = w0 + 'px'; tag.style.overflow = 'hidden';
        tag.innerHTML = el.innerHTML.replace(/<span class="shz-zap[\s\S]*?<\/svg><\/span>/g, '');   // молнии по краям — только у самого таймера
        tag.style.width = 'auto'; const w1 = tag.offsetWidth; tag.style.width = w0 + 'px';
        void tag.offsetWidth;
        const er = el.getBoundingClientRect(), tr = tag.getBoundingClientRect();
        // сколько экранных пикселей в одном «пикселе» стиля left/top: на iPhone zoom и scale считаются иначе, поэтому меряем, а не угадываем
        tag.style.transition = 'none';
        const L0 = parseFloat(tag.style.left) || 0, T0 = parseFloat(tag.style.top) || 0;
        tag.style.left = (L0 + 100) + 'px'; tag.style.top = (T0 + 100) + 'px';
        const pr = tag.getBoundingClientRect();
        const sx = Math.abs(pr.left - tr.left) / 100 || 1, sy = Math.abs(pr.top - tr.top) / 100 || 1;
        tag.style.left = L0 + 'px'; tag.style.top = T0 + 'px';
        tag.style.transition = 'left 0.55s cubic-bezier(0.22, 1, 0.36, 1), top 0.55s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s ease';
        const fx = tr.width / Math.max(1, w0);   // подсказка масштабирована (scale --fx) от центра
        tag.style.left = (L0 + (er.right - tr.right) / sx - (w1 - w0) * (1 + fx) / 2) + 'px';   // таймеры прижаты вправо: совпадают правые края
        tag.style.top = (T0 + ((er.top + er.height / 2) - (tr.top + tr.height / 2)) / sy) + 'px';
        tag.style.width = w1 + 'px';
        setTimeout(() => {
            showTimer();
            tag.style.animation = 'none';   // анимация появления держит opacity:1 и мешала спрятать подсказку — два свечения складывались
            if (alreadyShown) {   // эффект продлён: подсказка «вливается» в таймер, таймер вздрагивает
                tag.style.transition = 'opacity 0.18s ease, transform 0.18s ease'; tag.style.transform = 'scale(0.7)'; tag.style.opacity = '0';
                const t2 = document.querySelector(`#buffBar [data-key="${key}"]`);
                if (t2) { restartClass(t2, ['buff-pulse'], 'buff-pulse'); setTimeout(() => t2.classList.remove('buff-pulse'), 500); }
            } else {
                // подсказка уже выглядит ровно как таймер — убираем её сразу, без плавного угасания поверх таймера (иначе два свечения складываются и «мигают»)
                tag.style.transition = 'none'; tag.style.opacity = '0'; tag.style.visibility = 'hidden';
            }
            setTimeout(() => { if (tag.parentNode) tag.parentNode.removeChild(tag); }, 230);
        }, 570);
    };
    setTimeout(startFly, 450);
}

let lastBuffSig = -1;
function updateBuffHUD() {
    const bar = document.getElementById('buffBar');
    if (!bar) return;
    const sig = Math.ceil(shieldTime / 60) + Math.ceil(infiniteStaminaTime / 60) * 31 + Math.ceil(compressionTime / 60) * 961 + Math.ceil(speedBoostTime / 60) * 29791 +
                Math.ceil(slowMotionTime / 60) * 923521 + Math.ceil(overeatTime / 60) * 28629151 + Math.ceil(freezeTime / 60) * 887503681 + Math.ceil(drunkTime / 60) * 27512614111 + Math.ceil(crystalTime / 60) * 3571 + Math.ceil(((typeof waterTime !== 'undefined') ? waterTime : 0) / 60) * 7919 + '|' + shazamSecLeft() + (shazamBusy() ? 'b' : '');
    if (sig === lastBuffSig && lastBuffStateKey !== '') return;   // ни одна секунда не сменилась — нечего перерисовывать
    // (при продлении эффекта секунда подскакивает вверх — это тоже смена, проверка ниже сработает сразу)
    lastBuffSig = sig;

    const activeBuffs = [];
    if (shazamBusy()) activeBuffs.push({ key: 'shazam', left: 1e9, text: `ШАЗАМ: ${shazamSecLeft()}с`, color: '#FF7A00', icon: 'fa-bolt-lightning' });
    if (shieldTime > 0) {
        activeBuffs.push({
            key: 'shield', left: shieldTime, text: `ЩИТ: ${Math.ceil(shieldTime / 60)}с`,
            color: '#22C55E',
            icon: 'fa-shield-halved'
        });
    }
    if (infiniteStaminaTime > 0) {
        activeBuffs.push({
            key: 'infinite', left: infiniteStaminaTime, text: `МАКС. СИЛЫ: ${Math.ceil(infiniteStaminaTime / 60)}с`,
            color: '#00F0FF',
            svgIcon: `<div style="position:relative;display:inline-flex;align-items:center;justify-content:flex-start;width:15px;height:14px;margin-right:0;color:#00F0FF;flex-shrink:0"><i class="fa-solid fa-feather-pointed" style="font-size:11px"></i><span class="inf-sign" style="position:absolute;right:-1px;bottom:-2px;font-weight:900;color:#fff;line-height:1;text-shadow:0 0 2px #000,0 0 4px #000">∞</span></div>`
        });
    }
    if (compressionTime > 0) {
        activeBuffs.push({
            key: 'compress', left: compressionTime, text: `СЖАТИЕ: ${Math.ceil(compressionTime / 60)}с`,
            color: '#D946EF',
            svgIcon: `<svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#D946EF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v7.5m-4-3.5L12 9.5l4-3.5M12 22v-7.5m-4 3.5L12 14.5l4 3.5"/></svg>`
        });
    }
    if (speedBoostTime > 0 && !shazamBusy()) {   // в ШАЗАМе вместо ускорения в таймере ШАЗАМ
        activeBuffs.push({
            key: 'speed', left: speedBoostTime, text: `УСКОРЕНИЕ: ${Math.ceil(speedBoostTime / 60)}с`,
            color: '#FACC15',
            icon: 'fa-bolt'
        });
    }
    if (slowMotionTime > 0) {
        activeBuffs.push({
            key: 'slow', left: slowMotionTime, text: `ЗАМЕДЛЕНИЕ: ${Math.ceil(slowMotionTime / 60)}с`,
            color: '#38BDF8',
            icon: 'fa-hourglass-half'
        });
    }

    if (overeatTime > 0) {
        activeBuffs.push({
            key: 'overeat', left: overeatTime, text: `ПЕРЕЕДАНИЕ: ${Math.ceil(overeatTime / 60)}с`,
            color: '#FB923C',
            icon: 'fa-burger'
        });
    }
    if (crystalTime > 0) {
        activeBuffs.push({
            key: 'crystal', left: crystalTime, text: `ОПАСНЫЕ ТРУБЫ: ${Math.ceil(crystalTime / 60)}с`,
            color: '#FF4A3D',   // тот же красный, что у подсказки при взятии
            icon: 'fa-fire'
        });
    }
    if (typeof waterTime !== 'undefined' && waterTime > 0) {
        activeBuffs.push({
            key: 'water', left: waterTime, text: `ВОДОНАПОР: ${Math.ceil(waterTime / 60)}с`,
            color: '#7DD3FC',
            icon: 'fa-droplet'
        });
    }
    if (freezeTime > 0) {
        activeBuffs.push({
            key: 'freeze', left: freezeTime, text: `ЗАМЕРЗАНИЕ: ${Math.ceil(freezeTime / 60)}с`,
            color: '#B5E4FF',
            icon: 'fa-snowflake'
        });
    }
    if (drunkTime > 0) {
        activeBuffs.push({
            key: 'drunk', left: drunkTime, text: `ОПЬЯНЕНИЕ: ${Math.ceil(drunkTime / 60)}с`,
            color: '#2DD4BF',
            icon: 'fa-martini-glass-citrus'
        });
    }

    // Новый таймер, к которому вот-вот полетит подсказка, не показываем заранее: он проявится, когда подсказка долетит
    {
        const keysNow = activeBuffs.map(b => b.key);
        for (const b of activeBuffs) {
            const k = b.key;
            const refreshed = lastBuffLeft[k] !== undefined && b.left > lastBuffLeft[k] + 30;   // эффект взяли ещё раз — время подскочило
            if (!lastBuffKeySet.has(k) && !buffArrive[k] && buffTagPending(k)) buffArrive[k] = performance.now() + 1600;
            if (refreshed && lastBuffKeySet.has(k)) buffRefreshed[k] = performance.now() + 1500;   // продление: подсказку не создаём, таймер пульсирует
            lastBuffLeft[k] = b.left;
        }
        for (const k in lastBuffLeft) if (!keysNow.includes(k)) delete lastBuffLeft[k];
        lastBuffKeySet = new Set(keysNow);
    }
    activeBuffs.sort((a, b) => b.left - a.left);   // у кого больше времени — выше
    const stateKey = activeBuffs.map(b => b.key + ':' + b.text).join('|');
    if (stateKey === lastBuffStateKey) return;
    lastBuffStateKey = stateKey;
    renderBuffBar(bar, activeBuffs);
    for (const k in buffRefreshed) { if (performance.now() < buffRefreshed[k] && !buffRefreshed[k + ':p']) { buffRefreshed[k + ':p'] = 1; pulseBuff(k); } }
}

function makeBuffEl(b) {
    const el = document.createElement('div');
    el.dataset.key = b.key;
    el.className = 'buff-tag text-[10px] font-black rounded-xl shadow-lg flex items-center' + (b.key === 'shazam' ? ' buff-shazam' : '') + (b.key === 'drunk' && window.__soberLv > 0 ? ' sober' + window.__soberLv : '');
    el.style.cssText = `transition: opacity 0.2s; padding: 3px 6px 3px 6px; gap: 3px; background-color: rgba(20, 3, 38, 0.95); border: 1.5px solid ${b.color}; box-shadow: 0 0 12px ${b.color}88; color: ${b.color};`;
    el.innerHTML = `<span style="display:inline-flex;min-width:11px;height:14px;justify-content:center;align-items:center;flex-shrink:0">${b.svgIcon ? b.svgIcon : `<i class="fa-solid ${b.icon}" style="color: ${b.color};"></i>`}</span><span class="buff-txt" style="font-weight:900!important;">${buffTxtHtml(b.text)}</span>`;
    return el;
}
function renderBuffBar(bar, list) {
    if (typeof alignBuffBar === 'function' && !bar.children.length) alignBuffBar();   // первый таймер — выравниваем по краю панели
    const z = uiFx();   // панель таймеров масштабируется transform: scale(--fx)
    const els = new Map();
    [...bar.children].forEach(el => { if (!el.dataset.leaving) els.set(el.dataset.key, el); });
    // те же таймеры в том же порядке — меняются только секунды: обновляем текст и ничего не меряем и не переставляем
    {
        const cur = [...els.keys()];
        if (cur.length === list.length && list.every((b, i) => b.key === cur[i])) {
            list.forEach((b) => {
                const el = els.get(b.key);
                buffTxtSet(el.querySelector('.buff-txt'), b.text);
                const hidden = !!(buffArrive[b.key] && performance.now() < buffArrive[b.key]);
                if (hidden) { el.style.transition = 'opacity 0.12s'; el.style.opacity = '0'; } else if (el.style.opacity === '0' && !buffArrive[b.key]) el.style.opacity = '1';
            });
            return;
        }
    }
    const before = new Map();
    els.forEach((el, k) => before.set(k, el.getBoundingClientRect().top));
    const keep = new Set(list.map(b => b.key));
    // закончившиеся: плавно тают, не занимая места
    els.forEach((el, k) => {
        if (keep.has(k)) return;
        el.dataset.leaving = '1';
        // запоминаем место ДО отрыва от потока и держим таймер ровно там (со своей стороны экрана), затем быстро растворяем — никуда не улетает
        const lft = document.documentElement.classList.contains('hud-ll');
        const ol = el.offsetLeft, orr = bar.clientWidth - ol - el.offsetWidth, ot = el.offsetTop;
        el.style.transition = 'none'; el.style.position = 'absolute'; el.style.top = ot + 'px';
        if (lft) { el.style.left = ol + 'px'; el.style.right = 'auto'; } else { el.style.left = 'auto'; el.style.right = orr + 'px'; }
        void el.offsetWidth;
        el.style.transition = 'opacity 0.22s ease'; el.style.opacity = '0';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 270);
    });
    // обновляем / добавляем в нужном порядке
    list.forEach((b) => {
        let el = els.get(b.key);
        if (!el) el = makeBuffEl(b);
        buffTxtSet(el.querySelector('.buff-txt'), b.text);
        const hidden = !!(buffArrive[b.key] && performance.now() < buffArrive[b.key]);
        if (hidden) { el.style.transition = 'opacity 0.12s'; el.style.opacity = '0'; } else if (el.style.opacity === '0' && !buffArrive[b.key]) el.style.opacity = '1';
        bar.appendChild(el);   // переставляет в нужный порядок
    });
    // плавный сдвиг тех, кто поменял место (FLIP)
    els.forEach((el, k) => {
        if (!keep.has(k) || !before.has(k)) return;
        const dy = (before.get(k) - el.getBoundingClientRect().top) / z;
        if (Math.abs(dy) < 0.5) return;
        el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
        void el.offsetWidth;
        el.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s';
        el.style.transform = '';
    });
}

function registerJunkFood() {
    if (shazamBusy()) return null;   // в ШАЗАМе не считается
    junkFoodCount++;
    if (junkFoodCount >= OVEREAT_TRIGGER) {
        junkFoodCount = 0;
        overeatTime = ADMIN_CFG.overeatSec * 60;
        AudioFX.playOverEat();
        Haptics.powerup();
        return { target: 'other', text: 'Вы переели!', color: '#FB923C', icon: 'fa-burger' };
    }
    return null;
}

function registerDrink() {
    if (shazamBusy()) return null;   // в ШАЗАМе не пьянеем и не считаем
    drinkCount++;
    if (drinkCount >= DRUNK_TRIGGER) {
        drinkCount = 0;
        drunkTime = ADMIN_CFG.drunkSec * 60;
        AudioFX.playDrunk();
        Haptics.powerup();
        return { target: 'other', text: 'Вы опьянели!', color: '#2DD4BF', icon: 'fa-martini-glass-citrus' };
    }
    return null;
}

function resetOvereatDrunk() {
    junkFoodCount = 0; drinkCount = 0;
    overeatTime = 0; drunkTime = 0;
    currentOvereatFactor = 0; currentDrunkFactor = 0;
    iceCreamCount = 0; freezeTime = 0; currentFreezeFactor = 0;
    crystalReset();
    if (typeof waterReset === 'function') waterReset();
    if (typeof QZ !== 'undefined' && QZ.on) { QZ.on = false; quizUI(false); }
    owl.spinAngle = 0; owl.spinVel = 0;
    owl.drunkOffset = 0;
    owl.radius = owl.baseRadius;
    gameSpeedFactor = gameSpeedFrom = gameSpeedTarget = 1; gameSpeedT = 1;
    spacingFactor = spacingFrom = spacingTarget = 1; spacingT = 1; prevDistMult = 1;
}

function clearAllBuffs() {
    if (typeof shazamReset === 'function') shazamReset();
    resetOvereatDrunk();
    shieldTime = 0;
    shieldAppearAnim = 0;
    infiniteStaminaTime = 0;
    compressionTime = 0;
    currentCompressionFactor = 0;
    speedBoostTime = 0;
    slowMotionTime = 0;
    invulnerableTime = 0;
    lastBuffStateKey = '';
    const bar = document.getElementById('buffBar');
    if (bar) bar.innerHTML = '';
    if (AudioFX && AudioFX.onSpeedChanged) {
        AudioFX.onSpeedChanged();
    }
}

// секретная звезда не даёт один и тот же штраф два раза подряд (например, «−1 жизнь» и снова «−1 жизнь»)
const __lastPick = {};
function pickWeightedNoRepeat(tag, options) {
    // сравниваем по виду эффекта (kind), а не по номеру варианта: «−35% сил» и «−25% сил» — один и тот же штраф
    const kindOf = (o) => (typeof o.kind === 'function' ? o.kind() : (o.kind || options.indexOf(o)));
    const prev = __lastPick[tag];
    const pool = options.filter((o) => kindOf(o) !== prev);
    const o = pickWeighted(pool.length ? pool : options);
    __lastPick[tag] = kindOf(o);
    return o;
}
function pickWeighted(options) {
    let r = Math.random() * options.reduce((sum, o) => sum + o.w, 0);
    for (const o of options) { if ((r -= o.w) < 0) return o; }
    return options[options.length - 1];
}

// Секретная звезда: шанс штрафа зависит от уровня сложности (см. DIFF_LEVELS).
// Все подсказки: «Штраф: ...» — плохо, «Бонус: ...» — хорошо.
function handleSecretRoulette(originX, originY) {
    const negativeChance = getDifficultyMultipliers().negChance;
    const THEME_KEYS = ['music', 'logic', 'kino', 'series', 'cartoons', 'fun'];

    if (Math.random() < negativeChance) {
        return pickWeightedNoRepeat('neg', [
            { w: 25, kind: 'life', run() {
                if (lives <= 1.5) {
                    // Последняя жизнь: обычная подсказка «Штраф: -1 Жизнь», игра останавливается, сова разлетается перьями,
                    // после короткой паузы — стандартный экран смерти
                    lives = 0;
                    updateLivesHUD();
                    AudioFX.playHit();
                    Haptics.hit();
                    try { spawnFlyingArrivalFX(originX, originY, 'other', 'Штраф: -1 Жизнь', '#EF4444', 'fa-heart-crack'); } catch (e) {}
                    handleRunFailure('Секретная звезда дала штраф «−1 жизнь» — это была последняя жизнь.', { delay: 1500 });
                    return { skip: true, label: '', color: '#EF4444', icon: 'fa-heart-crack', isScoreAdd: false };
                }
                lives = Math.round((lives - 1.0) * 10) / 10;
                AudioFX.playHit();
                Haptics.hit();
                updateLivesHUD();
                triggerTopHUDPop('heart');
                return { label: 'Штраф: -1 Жизнь', color: '#EF4444', icon: 'fa-heart-crack', isScoreAdd: false };
            } },
            { w: 22, kind: 'stamina', run() {
                stamina = Math.max(5.0, stamina - 35.0);
                updateStaminaHUD();
                AudioFX.playHit();
                triggerTopHUDPop('stamina');
                return { label: 'Штраф: -35% Сил', color: '#F43F5E', icon: 'fa-feather-pointed', isScoreAdd: false };
            } },
            { w: 22, kind: () => (THEME_KEYS.some((k) => (collected[k] || 0) > 0) ? 'theme' : 'stamina'), run() {
                const existing = THEME_KEYS.filter(k => (collected[k] || 0) > 0);
                if (existing.length === 0) {
                    stamina = Math.max(5.0, stamina - 25.0);
                    updateStaminaHUD();
                    AudioFX.playHit();
                    return { label: 'Штраф: -25% Сил', color: '#F43F5E', icon: 'fa-feather-pointed', isScoreAdd: false };
                }
                const lostKey = existing[Math.floor(Math.random() * existing.length)];
                collected[lostKey]--;
                updateCollectionHUD();
                AudioFX.playThemeLose();   // потеря темы — свой звук «вычитания», не удар
                triggerBadgeAnimation(lostKey, true);
                return { label: `Штраф: -1 ${CATEGORIES[lostKey].name}`, color: '#F43F5E', icon: 'fa-triangle-exclamation', isScoreAdd: false };
            } },
            { w: 13, kind: 'compress', run() {
                AudioFX.playCompressStart();
                compressionTime = ADMIN_CFG.compressSec * 60;
                Haptics.powerup();
                return { label: `Сжатие ${ADMIN_CFG.compressSec}с`, color: '#D946EF', icon: 'svg-compress', isScoreAdd: false };
            } },
            { w: 14, kind: 'speed', run() {
                AudioFX.playStarCollect();
                slowMotionTime = 0;
                speedBoostTime = ADMIN_CFG.speedSec * 60;
                if (shazamOnSpeedup()) { AudioFX.onSpeedChanged(); Haptics.powerup(); return { label: `ШАЗАМ ${Math.round((SHZ.DUR + SHZ.FADE) / 60)}с`, color: '#FF7A00', icon: 'fa-bolt-lightning', isScoreAdd: false }; }
                AudioFX.onSpeedChanged();
                Haptics.powerup();
                return { label: `Ускорение ${ADMIN_CFG.speedSec}с`, color: '#FACC15', icon: 'fa-bolt', isScoreAdd: false };
            } }
        ]).run();
    }

    __lastPick.neg = null;   // выпал бонус — серия штрафов прервалась
    return pickWeighted([
        { w: 14, run() {
            stamina = maxStamina;
            updateStaminaHUD();
            Haptics.powerup();
            AudioFX.playCollect(true);
            return { label: `Бонус: Силы ${maxStamina}%`, color: '#67E8F9', icon: 'fa-feather-pointed', isScoreAdd: false, target: 'stamina' };
        } },
        { w: 5, run() {
            if (lives < maxLives) {
                lives = Math.min(maxLives, Math.round((lives + 1.0) * 10) / 10);
                updateLivesHUD();
                triggerTopHUDPop('heart');
            }
            AudioFX.playStarCollect();
            return { label: 'Бонус: +1 Жизнь', color: '#EF4444', icon: 'fa-heart', isScoreAdd: false, target: 'heart' };
        } },
        { w: 6, run() {
            if (lives < maxLives) {
                lives = Math.min(maxLives, Math.round((lives + 0.5) * 10) / 10);
                updateLivesHUD();
            }
            AudioFX.playCollect(true);
            return { label: 'Бонус: +0.5 Жизни', color: '#F97316', icon: 'fa-pizza-slice', isScoreAdd: false, target: 'heart' };
        } },
        { w: 18, run() {
            shieldTime = Math.max(shieldTime, ADMIN_CFG.shieldSec * 60);
            shieldAppearAnim = 12;
            AudioFX.playShieldCollect();
            Haptics.powerup();
            return { label: `Щит ${ADMIN_CFG.shieldSec}с`, color: '#22C55E', icon: 'fa-shield-halved', isScoreAdd: false };
        } },
        { w: 17, run() {
            speedBoostTime = 0;
            slowMotionTime = ADMIN_CFG.slowSec * 60;
            AudioFX.playStarCollect();
            AudioFX.onSpeedChanged();
            Haptics.powerup();
            return { label: `Замедление ${ADMIN_CFG.slowSec}с`, color: '#38BDF8', icon: 'fa-hourglass-half', isScoreAdd: false };
        } },
        { w: 20, run() {
            const open = THEME_KEYS.filter(k => (collected[k] || 0) < CATEGORIES[k].count);
            if (open.length > 0) {
                const key = open[Math.floor(Math.random() * open.length)];
                collected[key]++;
                updateCollectionHUD();
                AudioFX.playThemeCollect();
                StorageManager.save();
                checkVictoryCondition();
                return { label: `+1 ${CATEGORIES[key].name}`, color: CATEGORIES[key].color, icon: CATEGORIES[key].faClass, isScoreAdd: false, target: key };   // иконка темы летит вниз в свою плашку, как при обычном сборе
            }
            return null;
        } },
        { w: 20, run() {
            score += 3;
            scheduleHud('score');
            triggerTopHUDPop('score');
            AudioFX.playCollect(false);
            StorageManager.save();
            return { label: 'Бонус: +3 Вопроса', color: '#FE7600', icon: 'fa-circle-question', isScoreAdd: true };
        } }
    ]).run() || (() => {
        score += 3;
        scheduleHud('score');
        triggerTopHUDPop('score');
        AudioFX.playCollect(false);
        StorageManager.save();
        return { label: 'Бонус: +3 Вопроса', color: '#FE7600', icon: 'fa-circle-question', isScoreAdd: true };
    })();
}

function handleHit(cause = 'Сова врезалась в трубу — это была последняя жизнь.') {
    AudioFX.playHit();
    Haptics.hit();

    if (lives <= 1.5) {
        lives = 0;
        updateLivesHUD();
        handleRunFailure(cause);
        return;
    }

    lives = Math.round((lives - 1.0) * 10) / 10;
    invulnerableTime = 130;
    owl.vy = -3.8;
    updateLivesHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
}

function handleStaminaDepletion() {
    AudioFX.playHit();
    Haptics.hit();

    if (lives <= 1.5) {
        lives = 0;
        updateLivesHUD();
        handleRunFailure('У совы закончились силы — это была последняя жизнь.');
        return;
    }

    lives = Math.round((lives - 1.0) * 10) / 10;
    stamina = maxStamina;
    invulnerableTime = 130;
    updateLivesHUD(); updateStaminaHUD(); StorageManager.save();
    triggerTopHUDPop('heart');
}

function triggerOwlFeatherExplosion() {
    owl.visible = false;
    const featherColors = ['#8B3CF7', '#621BCA', '#A855F7', '#C084FC', '#FE7600', '#FFA040', '#FFFFFF', '#EDE5F8'];
    for (let i = 0; i < 34; i++) {
        const speed = 2.0 + Math.random() * 5.0;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
            x: owl.x + (Math.random() - 0.5) * 16,
            y: owl.y + (Math.random() - 0.5) * 16,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            color: featherColors[Math.floor(Math.random() * featherColors.length)],
            alpha: 1.0,
            size: 5.5 + Math.random() * 4.5,
            decay: 0.013 + Math.random() * 0.009,
            isFeather: true,
            angle: Math.random() * Math.PI * 2,
            vAngle: (Math.random() - 0.5) * 0.22
        });
    }
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: owl.x,
            y: owl.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: '#FE7600',
            alpha: 1.0,
            size: 3.0,
            decay: 0.03,
            isStar: true
        });
    }
}

function handleRunFailure(reason, opts) {
    gameActive = false;
    waitingFirstTap = false;
    isFlightPaused = false;
    clearAllBuffs();
    triggerOwlFeatherExplosion();
    Haptics.death();
    const delay = (opts && opts.delay) || 750;
    AudioFX._silentUntil = performance.now() + delay + 1500;   // тишина до экрана поражения — страховка музыки её не прерывает
    AudioFX.stopMusic();

    setTimeout(() => {
        attempts = Math.max(0, attempts - 1);
        if (attempts <= 0 && !zeroDay) zeroDay = todayKey();
        StorageManager.save();

        // Если за это время игрок уже вышел в главное меню — экран поражения не показываем
        const startScreenEl = document.getElementById('startScreen');
        if (startScreenEl && !startScreenEl.classList.contains('hidden')) {
            updateMenuVisibility();
            return;
        }

        AudioFX.setMode('death');
        showGameOverScreen(reason);
    }, delay);
}

// Экран смерти: понятная причина и что будет с попытками и прогрессом
function showGameOverScreen(reason) {
    const $ = (id) => document.getElementById(id);
    const totalItems = getTotalCollectedThemes();
    if ($('finalScore')) $('finalScore').innerText = score;
    if ($('finalTokens')) $('finalTokens').innerText = `${totalItems}/${TOTAL_THEMES}`;   // без пробелов — влезает и 120/120
    if ($('finalAttempts')) $('finalAttempts').innerText = `${attempts}`;
    if ($('gameOverReason')) $('gameOverReason').innerText = reason;
    let lvlName = '';
    try { lvlName = getDifficultyMultipliers().level; } catch (e) {}
    const has = attempts > 0;
    if ($('gameOverTitle')) $('gameOverTitle').innerText = has ? 'ПОПЫТКА ПОТЕРЯНА' : 'ПОПЫТКИ ЗАКОНЧИЛИСЬ';
    if ($('gameOverSubtext')) $('gameOverSubtext').innerText = has ? 'Списана 1 попытка' : 'Списана последняя попытка';
    const modalEl = $('gameOverModal');
    if (modalEl) modalEl.classList.toggle('go-none', !has);
    if ($('goIcon')) $('goIcon').className = 'fa-solid ' + (has ? 'fa-heart-crack' : 'fa-hourglass-end');
    const info = $('gameOverInfo');
    if (info) {
        info.classList.toggle('go-warn', !has);
        info.innerHTML = has
            ? `<div class="go-ii"><i class="fa-solid fa-floppy-disk"></i></div><div><b>Прогресс сохранён</b>Продолжите с того же места${lvlName ? ` — сложность <span class="go-lvl">${lvlName}</span>` : ''}. Темы, вопросы, перья и силы остаются.</div>`
            : `<div class="go-ii"><i class="fa-solid fa-triangle-exclamation"></i></div><div><b>Попытки на сегодня закончились</b>Прогресс сохранён до конца дня — купите попытку в лавке за монеты. Завтра — ${MAX_ATTEMPTS} новые попытки и игра с начала.</div>`;
    }
    const contBtn = $('continueAttemptBtn'), restartBtn = $('restartFromGameOverBtn'), homeBtn = $('gameOverHomeBtn'), okBtn = $('gameOverOkBtn');
    if (contBtn) contBtn.classList.toggle('hidden', !has);
    if ($('continueAttemptTitle')) $('continueAttemptTitle').innerText = 'ПРОДОЛЖИТЬ';
    if ($('continueAttemptSub')) $('continueAttemptSub').innerText = `ОСТАЛОСЬ ПОПЫТОК: ${attempts}`;
    if (restartBtn) restartBtn.classList.add('hidden');
    if (homeBtn) homeBtn.classList.toggle('hidden', !has);
    if (okBtn) okBtn.classList.toggle('hidden', has);
    if ($('earnAttemptBtn')) $('earnAttemptBtn').classList.toggle('hidden', has);   // попыток нет — можно купить в лавке
    updateMenuVisibility();
    const modal = $('gameOverModal');
    if (modal) modal.classList.remove('hidden');
}
