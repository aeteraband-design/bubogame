function spawnFlapParticles(x, y, flapKind, list) {
    if (flapKind) {
        // 'both' — замёрзшая и пьяная одновременно: вылетают и снежинки, и пузырьки (по 3 каждого)
        const kinds = flapKind === 'both' ? ['snow', 'bubble'] : [flapKind], per = flapKind === 'both' ? 3 : 4;
        for (const kd of kinds) {
            for (let i = 0; i < per; i++) {
                list.push({ kind: kd, x: x - 14 - Math.random() * 6, y: y + 7 + Math.random() * 6,
                    vx: -1.0 - Math.random() * 1.4, vy: 0.4 + Math.random() * 1.1, alpha: 0.75, decay: 0.038,
                    size: kd === 'snow' ? (3.4 + Math.random() * 2.8) : (2.4 + Math.random() * 2.8), grow: kd === 'bubble' ? 0.02 : 0,   // крупнее и разного размера
                    angle: Math.random() * Math.PI, vAngle: (Math.random() - 0.5) * 0.12 });
            }
        }
        return;
    }
    const flapColors = ['#A855F7', '#C084FC', '#E9D5FF', '#782CE9'];
    for (let i = 0; i < 4; i++) {
        const col = flapColors[i % flapColors.length];
        const isMote = (i === 0);
        list.push({
            x: x - 14 - Math.random() * 6,
            y: y + 7 + Math.random() * 6,
            vx: -0.75 - Math.random() * 1.05,   // обычные кружочки разлетаются ближе к сове
            vy: 0.3 + Math.random() * 0.8,
            color: col,
            alpha: 0.75,
            size: isMote ? 3.2 : 4.0,
            decay: 0.038,
            grow: isMote ? 0 : 0.04,
            isStar: isMote,
            isWisp: !isMote
        });
    }
}

// Постоянные градиенты совы (в её собственных координатах): создаются один раз, а не на каждый кадр
const OWL_G = {};
function mkGrad(kind, a, stops) {
    const g = kind === 'r' ? ctx.createRadialGradient(a[0], a[1], a[2], a[3], a[4], a[5]) : ctx.createLinearGradient(a[0], a[1], a[2], a[3]);
    for (const st of stops) g.addColorStop(st[0], st[1]);
    return g;
}
const owl = {
    x: 90,
    y: 260,
    baseY: 260,
    radius: 25,
    baseRadius: 25,
    drunkOffset: 0,
    vy: 0,
    gravity: 0.26,
    jump: -5.2,
    rotation: 0,
    wing: 0,
    visible: true,
    flap() {
        this.vy = this.jump * ((typeof SHZ !== 'undefined' && SHZ.state === 'active') ? 0.9 : 1);   // в ШАЗАМе взмах мягче — управлять приятнее на скорости
        if (currentFreezeFactor > 0) {
            // замёрзшие крылья слушаются с трудом: взмах слабее и непредсказуемее, сова раскручивается
            const weak = Math.random() < 0.3 ? 0.55 : 0.75;
            this.vy = this.jump * (1 - (1 - weak) * currentFreezeFactor);
            this.spinVel = Math.max(-0.2, Math.min(0.2, (this.spinVel || 0) + ((Math.random() - 0.5) * 0.14 + 0.03 * Math.sign(this.spinVel || 1)) * currentFreezeFactor));
        }
        this.wing = 1.0;
        AudioFX.playFlap();
        Haptics.flap();

        // взмах тратит силы: чем чаще тапаешь, тем быстрее они уходят; объевшейся и замёрзшей сове каждый взмах даётся тяжелее
        stamina = Math.max(0, stamina - 0.399 * staminaDrainMult() * (1 + 0.5 * currentOvereatFactor + 0.5 * currentFreezeFactor));   // взмах чуть дороже; объевшейся и замёрзшей сове — заметно тяжелее
        updateStaminaHUD();

        // замёрзшая сова роняет снежинки, опьяневшая — пузырьки коктейля; в обычном состоянии — привычные кружочки
        // вылетают так же, как обычные кружочки (то же место, скорость и время жизни) — меняется только вид частиц
        const isSnow = (currentFreezeFactor > 0.3 || (freezeTime > 0 && currentFreezeFactor > 0.05)), isBubble = drunkTime > 0;
        const flapKind = (isSnow && isBubble) ? 'both' : (isSnow ? 'snow' : (isBubble ? 'bubble' : null));
        spawnFlapParticles(this.x, this.y, flapKind, particles);
        if (typeof SHZ !== 'undefined' && SHZ.state === 'active') {
            const wk = 1 - 0.55 * (SHZ.warn || 0);   // к концу ШАЗАМа искры мельче и их меньше
            for (let i = 0; i < (wk > 0.7 ? 3 : 2); i++) particles.push({ x: this.x - 12, y: this.y + 6 + Math.random() * 6, vx: -2 - Math.random() * 1.5, vy: 0.4 + Math.random() * 0.8, color: i ? '#FF9A3C' : '#FFD08A', alpha: 0.85, size: (2.6 + Math.random() * 1.4) * wk, decay: 0.05, isStar: true });
        }
    },
    update() {
        const oe = easeFactor(currentOvereatFactor);
        this.radius = this.baseRadius * (1 + 0.16 * oe);
        if (waitingFirstTap) {
            this.drunkOffset = 0;
            hoverAngle += 0.055 * dtMult;
            this.y = this.baseY + Math.sin(hoverAngle) * 7.5;
            this.rotation = Math.sin(hoverAngle) * 0.05;
            if (this.wing > 0) this.wing -= 0.04 * dtMult;
            return;
        }
        // «Тяжёлая» сова: гравитация сильнее на 30% при переедании
        this.vy += this.gravity * (1 + 0.3 * oe) * (1 + 0.15 * currentFreezeFactor + 0.22 * ((typeof STORM !== 'undefined' && STORM.ice) || 0)) * ((typeof SHZ !== 'undefined' && SHZ.state === 'active') ? 0.82 : 1) * dtMult;
        this.y += this.vy * dtMult;
        this.rotation = Math.min(0.48, Math.max(-0.38, this.vy * 0.055));
        // Замерзание: сова кувыркается, как брошенная ледышка
        if (freezeTime > 0) {
            this.spinVel = (this.spinVel || 0.07) * Math.pow(0.997, dtMult);
            this.spinAngle = (this.spinAngle || 0) + this.spinVel * dtMult;
        } else if (this.spinAngle) {
            // эффект прошёл — плавно встаёт ровно (к ближайшему полному обороту)
            const target = Math.round(this.spinAngle / (Math.PI * 2)) * Math.PI * 2;
            this.spinAngle += (target - this.spinAngle) * Math.min(1, 0.08 * dtMult);
            this.spinVel = 0;
            if (Math.abs(target - this.spinAngle) < 0.002) this.spinAngle = 0;
        }
        if (this.spinAngle || currentFreezeFactor > 0) {
            this.rotation = this.rotation * (1 - currentFreezeFactor) + (this.spinAngle || 0);
        }

        // Опьянение: сову водит по высоте по синусоиде
        const dr = currentDrunkFactor;
        const off = dr > 0 ? (Math.sin(frame * 0.045) * 20 + Math.sin(frame * 0.11) * 6) * dr : 0;
        this.y += off - this.drunkOffset;
        this.drunkOffset = off;
        if (dr > 0) this.rotation += Math.sin(frame * 0.09) * 0.12 * dr;
        if (this.wing > 0) this.wing -= 0.055 * dtMult;
    },
    draw() {
        if (!this.visible) return;
        ctx.save();
        const shz = (typeof SHZ !== 'undefined') ? SHZ : null;
        ctx.translate(this.x + (shz ? shz.dx : 0), this.y);
        // Наклон вперёд: чуть-чуть с каждым уровнем сложности (к Хард+ около 6°) и ещё немного при ускорении (до ~14° вместе)
        {
            let lvl = 0;
            try { lvl = getDifficultyIndex() / Math.max(1, DIFF_LEVELS.length - 1); } catch (e) {}
            const shzOn = typeof shazamBusy === 'function' && shazamBusy();
            const boostOn = (typeof speedBoostTime !== 'undefined' && (speedBoostTime > 0 || shzOn) && gameActive && (currentFreezeFactor || 0) < 0.05) ? (shzOn ? 1.3 : 1) : 0;   // в ШАЗАМе поза ускорения ещё сильнее   // замёрзшая сова застывает как есть: без наклона, взгляда и клюва «вперёд»
            const boostLean = Math.min(0.42, 0.13 + 0.035 * lvl);   // устремление вперёд: сильнее на высоких уровнях, но без перебора
            const leanT = gameActive ? (0.11 * lvl + boostLean * Math.min(1, boostOn) + (shz ? 0.07 * shz.k : 0)) * (1 - (currentFreezeFactor || 0)) : 0;   // в ШАЗАМе сова сильнее устремлена вперёд
            // после ШАЗАМа сова выходит из сильного наклона медленно и плавно (около 1,5 с), а не «выпрямляется» рывком
            if (this.__shzWas && !shzOn) this.shzRelax = 100;
            this.__shzWas = shzOn;
            if (this.shzRelax > 0) this.shzRelax -= dtMult;
            const relax = this.shzRelax > 0 ? 0.022 : 0;
            this.lean = (this.lean || 0) + (leanT - (this.lean || 0)) * Math.min(1, (relax && leanT < this.lean ? relax : 0.05) * dtMult);
            this.boostK = (this.boostK || 0) + (boostOn - (this.boostK || 0)) * Math.min(1, (relax && boostOn < this.boostK ? relax : 0.07) * dtMult);
        }
        const bodyScale = 1.29 * (1 + 0.16 * easeFactor(currentOvereatFactor)) * (shz ? (1 - 0.2 * shz.depthBack + 0.06 * shz.depthFront) : 1);   // за трубой сова «отдаляется», перед трубой — чуть ближе   // сова немного меньше (было 1.36)
        // Визуальный центр совы (в единицах тела): по замеру рисунка (центр габаритов и центр «массы»). Вокруг него сова вращается,
        // в нём же центрируются щит и свечение пера — сова внутри них по центру, а кувыркание при заморозке без «перекоса»
        const OWL_CX = -1.1, OWL_CY = 2.7;
        ctx.translate(OWL_CX * bodyScale, OWL_CY * bodyScale);
        ctx.rotate(this.rotation + this.lean);
        ctx.translate(-OWL_CX * bodyScale, -OWL_CY * bodyScale);
        ctx.scale(bodyScale, bodyScale);

        if (shz && shz.k > 0.02) {   // ШАЗАМ: тёплое оранжевое свечение вокруг совы
            ctx.save(); ctx.translate(OWL_CX, OWL_CY);
            const gp = 0.85 + 0.15 * Math.sin(frame * 0.2), gR = 34 * gp;
            const gg = ctx.createRadialGradient(0, 0, 6, 0, 0, gR);
            gg.addColorStop(0, 'rgba(255, 196, 120, 0.55)'); gg.addColorStop(0.45, 'rgba(255, 122, 0, 0.28)'); gg.addColorStop(1, 'rgba(255, 122, 0, 0)');
            ctx.globalAlpha = shz.k; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, gR, 0, Math.PI * 2); ctx.fill();
            shazamDrawShieldBolts(22, 1, 0);   // молнии вокруг совы
            ctx.restore();
        }
        if (shieldTime > 0) {
            let auraAlpha = 1.0;
            if (shieldTime <= 120) {
                const fadeRatio = shieldTime / 120;
                const blinkWave = 0.28 + 0.72 * Math.pow((Math.sin(frame * 0.26) + 1) / 2, 1.4);
                auraAlpha = Math.max(0.06, fadeRatio * blinkWave);
            }

            ctx.save();
            ctx.translate(OWL_CX, OWL_CY); // щит по визуальному центру совы
            ctx.globalAlpha = auraAlpha;

            let scaleAnim = 1.0;
            if (shieldAppearAnim > 0) {
                scaleAnim = 0.1 + 0.9 * (1 - (shieldAppearAnim / 12));
            }

            const shieldRadius = 25.0 * scaleAnim;
            const shTsec = Math.max(0, (ADMIN_CFG.shieldSec * 60 - shieldTime) / 60);
            const numNotches = 14;
            const notchAngle = (Math.PI * 2) / numNotches;
            // круг щита остаётся на месте, а штрихи плавно удлиняются и сжимаются (от коротких до чуть более длинных), цикл около 2.4 секунды
            const arcMax = notchAngle * 0.50 + 0.02, arcMin = notchAngle * 0.50 - 0.07;   // штрихи плавно короче — длиннее   // сжимаются до точки (круглые концы дают точку) и раскрываются обратно
            const notchArc = arcMin + (arcMax - arcMin) * (0.5 + 0.5 * Math.sin(shTsec * Math.PI * 2 / 2.4));
            const rotAngle = frame * 0.028 * (1 + (shz ? 2.2 * shz.shieldK : 0));
            const notchRadius = shieldRadius + 2.5;

            const shK = (shz && shz.shieldK > 0.01) ? shz.shieldK : 0;
            const shCol = shK ? shazamShieldColor() : '#22C55E';   // в ШАЗАМе щит рыжеет
            drawShieldSphere(notchRadius, shieldDentAng - this.rotation, -this.rotation, shK, shCol, this.rotation + (this.lean || 0));

            ctx.restore();
        } else if (invulnerableTime > 0 && Math.floor(frame / 5) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        if (infiniteStaminaTime > 0) {
            ctx.save();
            ctx.translate(OWL_CX, OWL_CY); // свечение пера — по визуальному центру совы
            const totalFeatherTime = ADMIN_CFG.infiniteSec * 60;
            const elapsedFeather = totalFeatherTime - infiniteStaminaTime;
            let featherFadeMultiplier = 1.0;
            const fadeDuration = 30; // 0.5 секунды на появление и исчезновение
            if (elapsedFeather < fadeDuration) {
                featherFadeMultiplier = elapsedFeather / fadeDuration;
            } else if (infiniteStaminaTime < fadeDuration) {
                featherFadeMultiplier = infiniteStaminaTime / fadeDuration;
            }
            featherFadeMultiplier = Math.max(0, Math.min(1, featherFadeMultiplier));

            const glowPulse = (Math.sin(frame * 0.12) + 1) / 2;
            const glowRadius = 24 + glowPulse * 6;
            
            const glowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, glowRadius);
            glowGrad.addColorStop(0, 'rgba(204, 251, 255, 0.65)');
            glowGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.3)');
            glowGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
            
            ctx.fillStyle = glowGrad;
            ctx.globalAlpha = (0.6 + glowPulse * 0.4) * featherFadeMultiplier;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(-8.5, 7.5); ctx.scale(1.04, 1.04); ctx.translate(8.5, -7.5);   // хвостик чуть меньше, чем был
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 2.5;

        const tailGrad = OWL_G.tail || (OWL_G.tail = mkGrad('l', [-8.5, 7.0, -16.5, 13.5], [[0, '#782CE9'], [0.55, '#5216BD'], [1, '#2B0762']]));
        ctx.fillStyle = tailGrad;
        ctx.strokeStyle = '#1D0542';
        ctx.lineWidth = 1.0 / 1.04;   // с учётом масштаба хвоста — контур такой же, как на теле

        ctx.beginPath();
        ctx.moveTo(-8.5, 7.0);
        ctx.quadraticCurveTo(-13.0, 8.5, -16.5, 11.8);
        ctx.quadraticCurveTo(-16.0, 13.5, -13.5, 13.5);
        ctx.quadraticCurveTo(-10.0, 13.0, -6.5, 11.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(233, 213, 255, 0.33)';
        ctx.lineWidth = 0.9; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-9.03, 8.25);
        ctx.quadraticCurveTo(-11.72, 9.28, -14.01, 11.00);   // вплотную к верхнему контуру хвоста, до края не доходит
        ctx.stroke();
        ctx.restore();

        // Переедание: тело слегка «раздувается» (шире и круглее)
        const puff = easeFactor(currentOvereatFactor);
        const puffX = 1 + 0.08 * puff, puffY = 1 + 0.04 * puff;
        ctx.translate(-3, 3);
        ctx.scale(puffX, puffY);
        ctx.translate(3, -3);
        const bodyGrad = OWL_G.body || (OWL_G.body = mkGrad('r', [-3, -10, 2, -3, -10, 28], [[0, '#9248FB'], [0.5, '#6A20D4'], [1, '#30066B']]));
        ctx.fillStyle = bodyGrad;
        
        ctx.strokeStyle = '#1D0542';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        owlSmoothClosed(ctx, OWL_BODY_PTS);
        ctx.closePath();
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.stroke(); 

        ctx.save();
        ctx.strokeStyle = 'rgba(235, 215, 255, 0.85)';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(1.14, -13.46);
        ctx.lineTo(3.34, -10.73);   // прямой блик вплотную к контуру хохолка
        ctx.stroke();

        // блик на спине — такой же, как на крыле: тонкая светлая линия с круглыми концами вплотную к контуру, не длинная
        ctx.save();
        ctx.strokeStyle = 'rgba(235, 215, 255, 0.41)';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5.04, -10.82);
        ctx.quadraticCurveTo(-9.37, -8.51, -11.44, -4.50);
        ctx.stroke();
        ctx.restore();


        ctx.restore();

        const breastGrad = OWL_G.breast || (OWL_G.breast = mkGrad('l', [0, -3, 2, 17], [[0, '#FFFFFF'], [0.65, '#FFFDF8'], [1, '#EDE5F8']]));
        ctx.fillStyle = breastGrad;
        
        ctx.strokeStyle = '#1D0542';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        owlSmoothClosed(ctx, OWL_BREAST_PTS);   // верх грудки скрыт под головой, замыкается прямой линией, как раньше
        ctx.closePath();
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.stroke(); 

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(3.5, -1.5);
        ctx.quadraticCurveTo(12.5, 3.0, 9.5, 12.0);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#481387';
        const breastDots = [
            { x: 9.0, y: 4.3, rx: 0.95, ry: 0.65 },     // все точки на ~1 пиксель ближе к правому краю пузика
            { x: 10.2, y: 7.0, rx: 1.05, ry: 0.70 },
            { x: 6.4, y: 6.6, rx: 0.90, ry: 0.60 },
            { x: 9.6, y: 9.6, rx: 1.00, ry: 0.68 },     // третья справа
            { x: 6.0, y: 10.0, rx: 0.88, ry: 0.60 },
            { x: 7.8, y: 12.6, rx: 0.92, ry: 0.62 }
        ];
        breastDots.forEach(dot => {
            ctx.beginPath();
            ctx.ellipse(dot.x, dot.y, dot.rx, dot.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        const footX = 0.5 - 3.1 * (this.boostK || 0);          // обычно лапка чуть левее прежней (0,5 вместо 1,0); при ускорении поджата назад, к левому краю белого овала (-2,6)
        const footBaseY = 17.6 - 2.6 * (this.boostK || 0);   // …и чуть вверх
        ctx.save();
        // При ускорении лапка остаётся на месте, но передняя часть чуть опускается вперёд (поворот по часовой вокруг задней части)
        const footTurn = 0.22 * (this.boostK || 0), footPivX = footX - 1.1;
        ctx.translate(footPivX, footBaseY); ctx.rotate(footTurn); ctx.translate(-footPivX, -footBaseY);

        // Лапка сбоку: пальчики смотрят вперёд, по направлению полёта
        ctx.fillStyle = '#FE7600';
        ctx.beginPath();
        ctx.ellipse(footX + 1.6, footBaseY + 0.2, 2.5, 1.05, 0.12, 0, Math.PI * 2);   // передний палец
        ctx.ellipse(footX + 0.9, footBaseY + 0.9, 2.1, 0.95, 0.38, 0, Math.PI * 2);   // второй палец, чуть ниже
        ctx.ellipse(footX - 1.1, footBaseY + 0.4, 1.2, 0.85, -0.2, 0, Math.PI * 2);   // маленький задний палец
        // тонкий тёмный контур, как у всего тела: сначала обводка, поверх заливка — остаётся только внешний край без линий внутри
        ctx.strokeStyle = '#1D0542'; ctx.lineWidth = 2.0; ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.fill();

        ctx.fillStyle = '#FFB870';
        ctx.beginPath();
        ctx.ellipse(footX + 0.9, footBaseY - 0.15, 1.1, 0.4, 0.12, 0, Math.PI * 2);   // блик
        ctx.fill();

        ctx.fillStyle = '#7A2C00';
        ctx.beginPath();
        ctx.arc(footX + 4.0, footBaseY + 0.55, 0.45, 0, Math.PI * 2);                  // коготки
        ctx.arc(footX + 2.8, footBaseY + 1.75, 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // конец «раздутого» тела: снимаем только масштаб, остальные настройки рисования не трогаем
        ctx.translate(-3, 3); ctx.scale(1 / puffX, 1 / puffY); ctx.translate(3, -3);
        ctx.save();
        ctx.translate(-4.0, 1.5);
        const wingAng = 0.52 * Math.max(0, this.wing) + (waitingFirstTap ? Math.sin(hoverAngle * 2) * 0.05 : 0) - 0.16 * (this.boostK || 0);   // при ускорении крыло машет под углом, отведено назад
        ctx.rotate(wingAng);
        ctx.translate(5.0, -1.0); ctx.rotate(-0.1); ctx.translate(-5.0, 1.0);   // крыло чуть опущено слева (естественнее): поворот вокруг плеча

        const wingGrad = OWL_G.wing || (OWL_G.wing = mkGrad('l', [6, -4, -22, 4], [[0, '#7C2CE8'], [0.5, '#5216AC'], [1, '#2E0868']]));
        ctx.fillStyle = wingGrad;
        ctx.strokeStyle = '#20044A';
        ctx.lineWidth = 1.0 / 1.02;   // контур такой же тонкий, как на теле
        ctx.save();
        ctx.translate(-5.0, 0.8); ctx.scale(1.016, 1.03); ctx.translate(5.0, -0.8);   // крыло чуть шире по краю — внешний силуэт остаётся прежним
        ctx.beginPath();
        // гладкий контур крыла без изломов (плавно у «подмышки»)
        ctx.moveTo(5.0, -3.6);
        ctx.bezierCurveTo(-1.5, -5.0, -10.5, -2.6, -15.2, 1.0);
        ctx.bezierCurveTo(-16.4, 2.0, -15.4, 3.5, -13.4, 3.9);
        ctx.bezierCurveTo(-8.8, 5.0, -3.5, 6.6, 1.2, 5.6);
        ctx.bezierCurveTo(4.6, 4.9, 6.6, 2.4, 6.5, -0.4);
        ctx.bezierCurveTo(6.5, -1.6, 6.3, -3.32, 5.0, -3.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const innerWingGrad = OWL_G.innerWing || (OWL_G.innerWing = mkGrad('l', [3, -2, -10, 2], [[0, '#9A46FF'], [0.55, '#6F1CDA'], [1, '#450F96']]));
        ctx.fillStyle = innerWingGrad;
        ctx.beginPath();
        ctx.moveTo(3.6, -2.3);
        ctx.bezierCurveTo(-1.5, -3.3, -7.5, -1.6, -11.0, 1.4);
        ctx.bezierCurveTo(-7.0, 3.6, -2.0, 4.1, 1.8, 3.4);
        ctx.bezierCurveTo(4.4, 2.9, 4.8, 0.6, 4.5, -0.9);
        ctx.bezierCurveTo(4.3, -1.8, 4.1, -2.1, 3.6, -2.3);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(235, 215, 255, 0.68)';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(3.60, -2.91);
        ctx.quadraticCurveTo(-4.84, -3.66, -12.59, 0.47);   // вплотную к верхнему контуру крыла
        ctx.stroke();

        ctx.strokeStyle = 'rgba(32, 4, 75, 0.7)';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.8, 0.5); ctx.lineTo(-9.5, 2.0);
        ctx.moveTo(0.8, 2.3);  ctx.lineTo(-6.8, 3.2);
        ctx.stroke();
        ctx.restore();

        // Клюв чуть меньше (масштаб от основания у лица)
        const beakK = 0.78;
        // при ускорении клюв поворачивается от основания так, чтобы смотреть вперёд по горизонтали, как и глаза
        const boostEff = (this.boostK || 0) * (1 - (currentFreezeFactor || 0));   // ускорение без заморозки: при льде все «вперёд»-эффекты плавно сходят на нет
        const beakT = 0;   // клюв при ускорении больше не поворачивается — всегда как обычно (без косяков при заморозке)   // клюв полностью выравнивается вперёд — смотрит по горизонтали, как глаза
        this.beakAimS = (this.beakAimS || 0) + (beakT - (this.beakAimS || 0)) * Math.min(1, 0.12 * dtMult);   // и плавно, без рывков
        const beakAim = this.beakAimS;
        ctx.save();
        ctx.translate(0.45 * puff, -0.35 * puff);   // при переедании голова чуть крупнее — клюв сдвигается за её краем, и его контур не наезжает на белую грудку
        ctx.translate(11.5, -0.8); ctx.rotate(beakAim); ctx.scale(beakK, beakK); ctx.translate(-11.5, 0.8);
        const beakGrad = OWL_G.beak || (OWL_G.beak = mkGrad('l', [11.5, -3.4, 18, 1.8], [[0, '#FE881C'], [0.5, '#FE7600'], [1, '#D95B00']]));
        ctx.fillStyle = beakGrad;
        ctx.beginPath();
        ctx.moveTo(11.2, -4.0);                           // основание у мордочки чуть шире
        ctx.quadraticCurveTo(15, -3.3, 18.3, -0.6);
        ctx.quadraticCurveTo(14.6, 1.8, 11.2, 2.4);
        ctx.closePath();
        ctx.fill();
        // тонкий контур клюва в тон контуру тела (без линии у основания, где клюв примыкает к голове)
        ctx.strokeStyle = '#1D0542'; ctx.lineWidth = 1.0 / beakK; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';   // без круглых концов у основания — не налезает на контур
        ctx.beginPath();
        ctx.moveTo(11.2, -4.0);
        ctx.quadraticCurveTo(15, -3.3, 18.3, -0.6);
        ctx.quadraticCurveTo(14.6, 1.8, 11.2, 2.4);
        ctx.stroke();

        ctx.strokeStyle = '#FFD29D';
        ctx.lineWidth = 1.0; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(11.94, -2.58);
        ctx.quadraticCurveTo(13.58, -2.16, 15.13, -1.30);   // вплотную к верхнему контуру клюва, повторяет его изгиб, не доходит до кончика
        ctx.stroke();
        ctx.restore();

        // Глаз целиком (обводка, белок, зрачок) чуть меньше обычного; при переедании плавно вырастает до прежнего размера
        const eyeS = (0.95 + 0.05 * puff) * (1 - 0.07 * (this.boostK || 0) * (1 - (currentFreezeFactor || 0)));   // при ускорении глаз чуть меньше (плавно, гаснет при заморозке)
        ctx.translate(5.2, -4.0); ctx.scale(eyeS, eyeS); ctx.translate(-5.2, 4.0);
        ctx.fillStyle = '#2F065A';
        ctx.beginPath(); ctx.arc(5.2, -4.0, 7.8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#FFF8E1';
        ctx.beginPath(); ctx.arc(5.2, -4.0, 6.7, 0, Math.PI * 2); ctx.fill();

        // Опьянение: зрачок вместе с бликами двигается по орбите внутри белка
        const eyeAng = frame * 0.17;
        // При ускорении зрачок смотрит строго вперёд (по горизонтали экрана), даже когда сова наклонена вниз/вверх:
        // его цель задаётся в мировых координатах и пересчитывается обратно в систему совы
        const gazeT = (this.rotation || 0) + (this.lean || 0), gb = (this.boostK || 0) * (1 - (currentFreezeFactor || 0));
        const cgT = Math.cos(-gazeT), sgT = Math.sin(-gazeT);
        const tgtX = 1.4 + 0.7 * gb, tgtY = 0.0;                // мировая цель: ровно на уровне центра белка и чуть правее — взгляд вперёд, с запасом от контура (не сливается с краем)
        const locX = (1 - gb) * 1.4 + gb * (cgT * tgtX - sgT * tgtY);
        const locY = (1 - gb) * -0.2 + gb * (sgT * tgtX + cgT * tgtY);
        // Зрачок вращается по орбите только при опьянении (в том числе и замёрзшей пьяной сове); просто замёрзшая — глаз неподвижен
        const orbitK = currentDrunkFactor;
        const eyeDx = (Math.cos(eyeAng) * 1.6 - 1.4) * orbitK + (locX - 1.4);
        const eyeDy = (Math.sin(eyeAng) * 1.6 + 0.2) * orbitK + (locY + 0.2);
        // Переедание: чуть-чуть увеличивается только чёрный зрачок с бликами («глаза навыкате»)
        const eyeK = 1; // зрачок увеличивается только вместе со всей совой
        const pcx = 6.6 + eyeDx, pcy = -4.2 + eyeDy;
        ctx.translate(pcx, pcy); ctx.scale(eyeK, eyeK); ctx.translate(-pcx, -pcy);
        ctx.fillStyle = '#150226';
        ctx.beginPath(); ctx.arc(6.6 + eyeDx, -4.2 + eyeDy, 3.7, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(5.6 + eyeDx, -5.6 + eyeDy, 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8.0 + eyeDx, -3.2 + eyeDy, 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.translate(pcx, pcy); ctx.scale(1 / eyeK, 1 / eyeK); ctx.translate(-pcx, -pcy); // конец увеличенного зрачка
        ctx.translate(5.2, -4.0); ctx.scale(1 / eyeS, 1 / eyeS); ctx.translate(-5.2, 4.0); // конец масштаба глаза

        // Замерзание: сова в ледяной корочке и с сосулькой на клюве
        if (currentFreezeFactor > 0.01) {
            const fz = currentFreezeFactor;
            ctx.save();
            ctx.globalAlpha = fz;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';            // грани льда
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-12, -14); ctx.lineTo(-6, -17);
            ctx.moveTo(-15, -6); ctx.lineTo(-10, -12);
            ctx.moveTo(9, 14); ctx.lineTo(14, 9);
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';                                  // искорки инея
            [[-9, -16, 1.1], [13, -12, 0.9], [-16, 4, 0.8], [6, 17, 0.9]].forEach(([sx, sy, sr]) => {
                ctx.beginPath(); ctx.arc(sx, sy, sr * (0.7 + 0.3 * Math.sin(frame * 0.2 + sx)), 0, Math.PI * 2); ctx.fill();
            });
            const icG = ctx.createLinearGradient(14.3, 0.3, 14.3, 6.5);  // сосулька под клювом
            icG.addColorStop(0, '#FFFFFF'); icG.addColorStop(1, 'rgba(125, 211, 252, 0.9)');
            ctx.fillStyle = icG;
            ctx.beginPath();
            ctx.moveTo(13.2, 0.6); ctx.lineTo(15.4, 0.4); ctx.lineTo(14.5, 0.5 + 6.0 * fz);
            ctx.closePath(); ctx.fill();
            // в дождь капли на сове замерзают: со временем по контуру налипают маленькие ледяные кристаллики, снизу растут сосульки
            const ice = (typeof STORM !== 'undefined' && STORM.ice) || 0;
            const P = (typeof OWL_BODY_PTS !== 'undefined') ? OWL_BODY_PTS.p : null;
            if (ice > 0.02 && P) {
                const n = P.length;
                if (!this._iceSlots2) {   // места на контуре и их порядок появления — один раз: по всему кругу, под разными углами
                    const s = []; let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                    for (let k = 0; k < 30; k++) s.push({ t: (k + rnd() * 0.7) / 30 * n, tilt: (rnd() - 0.5) * 1.6, L: 1.3 + rnd() * 1.6, side: rnd() < 0.55 ? (rnd() < 0.5 ? -1 : 1) : 0, sl: 0.45 + rnd() * 0.3 });
                    for (let k = s.length - 1; k > 0; k--) { const q = Math.floor(rnd() * (k + 1)); [s[k], s[q]] = [s[q], s[k]]; }
                    this._iceSlots2 = s;
                }
                const S = this._iceSlots2, cnt = S.length * ice;
                // кристаллик: вытянутый ромб с двумя гранями, наполовину «вмёрз» в контур; иногда рядом второй, поменьше, под другим углом
                const shard = (L, W) => {
                    ctx.fillStyle = 'rgba(232, 247, 255, 0.95)'; ctx.beginPath(); ctx.moveTo(-L * 0.4, 0); ctx.lineTo(0, -W); ctx.lineTo(L, 0); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(150, 205, 245, 0.92)'; ctx.beginPath(); ctx.moveTo(-L * 0.4, 0); ctx.lineTo(L, 0); ctx.lineTo(0, W); ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-L * 0.4, 0); ctx.lineTo(0, -W); ctx.lineTo(L, 0); ctx.lineTo(0, W); ctx.closePath(); ctx.stroke();
                };
                for (let k = 0; k < S.length && k < cnt; k++) {
                    const sl = S[k], gr = Math.min(1, cnt - k), i0 = Math.floor(sl.t) % n, i1 = (i0 + 1) % n, f = sl.t - Math.floor(sl.t);
                    const x = P[i0][0] + (P[i1][0] - P[i0][0]) * f, y = P[i0][1] + (P[i1][1] - P[i0][1]) * f;
                    let nx = -(P[i1][1] - P[i0][1]), ny = P[i1][0] - P[i0][0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
                    if (nx * (x + 1) + ny * (y - 3) < 0) { nx = -nx; ny = -ny; }   // наружу
                    const a = Math.atan2(ny, nx) + sl.tilt, L = sl.L * gr, W = L * 0.42;
                    ctx.save(); ctx.translate(x - nx * L * 0.35, y - ny * L * 0.35); ctx.rotate(a); shard(L, W); ctx.restore();
                    if (sl.side && gr > 0.5) {
                        const a2 = Math.atan2(ny, nx) - sl.tilt * 0.6 + sl.side * 0.7, L2 = L * sl.sl;
                        ctx.save(); ctx.translate(x - nx * L2 * 0.3 + ny * sl.side * 0.8, y - ny * L2 * 0.3 - nx * sl.side * 0.8); ctx.rotate(a2); shard(L2, L2 * 0.42); ctx.restore();
                    }
                }
            }
            ctx.restore();
        }
        if (typeof stormDrawOwlWet === 'function' && currentFreezeFactor < 0.5) stormDrawOwlWet(ctx, this);   // мокрая сова в дождь

        ctx.restore();

        if (invulnerableTime > 0) {
            ctx.save();
            ctx.translate(this.x, this.y - 18);
            
            let starAlpha = 1.0;
            const maxInvuln = 130;
            if (invulnerableTime > maxInvuln - 20) {
                starAlpha = (maxInvuln - invulnerableTime) / 20;
            } else if (invulnerableTime < 30) {
                starAlpha = invulnerableTime / 30;
            }
            starAlpha = Math.max(0, Math.min(1, starAlpha));

            const numStars = 3;
            const orbitRadiusX = 24;
            const orbitRadiusY = 8;
            for (let i = 0; i < numStars; i++) {
                const angle = frame * 0.025 + (i * (Math.PI * 2 / numStars));
                const sx = Math.cos(angle) * orbitRadiusX;
                const sy = Math.sin(angle) * orbitRadiusY;
                const scale = 1.0 + Math.sin(angle) * 0.35;
                
                ctx.save();
                ctx.translate(sx, sy);
                ctx.scale(scale, scale);
                
                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 6;
                
                drawSparkleStar(0, 0, 5, 2.5, 1.6, '#FFD700', starAlpha);
                ctx.shadowBlur = 0;
                drawSparkleStar(0, 0, 5, 1.2, 0.6, '#FFFFFF', starAlpha);
                
                ctx.restore();
            }
            ctx.restore();
        }
    }
};

// ===== Щит — зелёная переливающаяся сфера вокруг совы =====
// R — радиус (как у прежнего пунктира), dentLocal — куда вмят щит (в повёрнутых координатах совы),
// rot0 — поворот «мира» относительно совы (блик и касания держатся на месте при наклоне совы), shK — доля ШАЗАМа (щит рыжеет и вытягивается)
const SHS = { pts: new Float32Array(2 * 64) };
function shAngD(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
function drawShieldSphere(R, dentLocal, rot0, shK, shCol, shzRot) {
    const N = 64, P = SHS.pts, t = frame / 60;
    const dent = typeof shieldDent === 'number' ? shieldDent : 0, wob = typeof shieldWob === 'number' ? shieldWob : 0;
    // форма: вмятина от удара, упругая рябь после удара, еле заметное «дыхание»
    for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, d = shAngD(a, dentLocal);
        let rr = R * (1 - 0.5 * dent * Math.exp(-(d * d) / 0.55));
        rr *= 1 + 0.035 * wob * Math.sin(4 * a + t * 22) + 0.012 * Math.sin(3 * a + t * 1.7);
        if (shK) rr = shazamShieldR(rr, a + shzRot);
        P[i * 2] = Math.cos(a) * rr; P[i * 2 + 1] = Math.sin(a) * rr;
    }
    const path = () => {
        ctx.beginPath();
        let mx = (P[(N - 1) * 2] + P[0]) / 2, my = (P[(N - 1) * 2 + 1] + P[1]) / 2;
        ctx.moveTo(mx, my);
        for (let i = 0; i < N; i++) {
            const j = (i + 1) % N, x = P[i * 2], y = P[i * 2 + 1];
            ctx.quadraticCurveTo(x, y, (x + P[j * 2]) / 2, (y + P[j * 2 + 1]) / 2);
        }
        ctx.closePath();
    };
    const hue = shK ? 28 : 140 + 18 * Math.sin(t * 0.9);   // зелёный плавно уходит то в бирюзу, то в салатовый
    const hsl = (h, s, l, a) => `hsla(${h.toFixed(1)},${s}%,${l}%,${a.toFixed(3)})`;
    ctx.save();
    // тело сферы: почти прозрачная середина, к краю — плотнее
    const body = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R * 1.02);
    body.addColorStop(0, hsl(hue, 90, 75, 0.05));
    body.addColorStop(0.62, hsl(hue, 85, 55, 0.10));
    body.addColorStop(0.9, hsl(hue, 85, 50, 0.26));
    body.addColorStop(1, hsl(hue, 90, 60, 0.42));
    path(); ctx.fillStyle = body; ctx.fill();
    // общая вспышка сферы при ударе
    const fl = typeof shieldFlash === 'number' ? shieldFlash : 0;
    if (fl > 0.02) { ctx.save(); ctx.globalAlpha *= Math.min(1, fl); const fg = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.08); fg.addColorStop(0, hsl(hue, 90, 80, 0)); fg.addColorStop(0.75, hsl(hue, 95, 75, 0.28)); fg.addColorStop(1, hsl(hue, 100, 85, 0.6)); ctx.fillStyle = fg; path(); ctx.fill(); ctx.restore(); }
    // перелив по краю: бегущий по кругу градиент зелёного, бирюзового и салатового
    let rim;
    const ra = rot0 + t * 0.9;
    if (ctx.createConicGradient) {
        rim = ctx.createConicGradient(ra, 0, 0);
        const C = shK ? ['#FFB45C', '#FFE2B8', '#FF7A00', '#FFD27A', '#FFB45C'] : ['#4ADE80', '#5EEAD4', '#BEF264', '#22D3EE', '#86EFAC', '#4ADE80'];
        C.forEach((c, i) => rim.addColorStop(i / (C.length - 1), c));
    } else rim = shCol;
    ctx.shadowColor = shCol; ctx.shadowBlur = 14;
    ctx.lineWidth = 1.8 + 1.2 * dent;
    ctx.strokeStyle = rim; path(); ctx.stroke();
    ctx.shadowBlur = 0;
    // тонкий светлый внутренний ободок — объём
    ctx.save(); ctx.scale(0.86, 0.86); ctx.globalAlpha *= 0.35; ctx.lineWidth = 1; ctx.strokeStyle = hsl(hue, 90, 85, 0.6); path(); ctx.stroke(); ctx.restore();
    // блики: большой мягкий сверху-слева и маленький снизу-справа (держатся на месте при наклоне совы)
    ctx.save(); ctx.rotate(rot0);
    const hx = -R * 0.42, hy = -R * 0.5;
    const sp = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.42);
    sp.addColorStop(0, 'rgba(255,255,255,0.55)'); sp.addColorStop(0.5, 'rgba(230,255,240,0.18)'); sp.addColorStop(1, 'rgba(230,255,240,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.ellipse(hx, hy, R * 0.42, R * 0.28, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(R * 0.48, R * 0.5, R * 0.12, R * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // места касаний: ярче светится и сам край, и пятно возле него
    const T = (typeof shieldTouches !== 'undefined') ? shieldTouches : [];
    for (const tc of T) {
        if (tc.p < 0.03) continue;
        const la = tc.a + rot0;   // угол касания в координатах совы
        const i = ((Math.round(la / (Math.PI * 2) * N) % N) + N) % N;
        const gx = P[i * 2], gy = P[i * 2 + 1];
        const gr = R * (0.55 + 0.6 * tc.p);   // пятно касания — крупная яркая вспышка
        const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        hg.addColorStop(0, hsl(hue, 100, 95, Math.min(1, 1.1 * tc.p))); hg.addColorStop(0.4, hsl(hue, 95, 65, 0.55 * tc.p)); hg.addColorStop(1, hsl(hue, 90, 50, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
        // яркий отрезок края возле касания
        ctx.save();
        ctx.lineWidth = 2.2 + 3.4 * tc.p; ctx.lineCap = 'round';
        ctx.strokeStyle = hsl(hue, 100, 88, Math.min(1, 0.95 * tc.p)); ctx.shadowColor = hsl(hue, 100, 70, 1); ctx.shadowBlur = 16 * tc.p;
        ctx.beginPath();
        const span = Math.round(N * (0.06 + 0.08 * tc.p));
        for (let k = -span; k <= span; k++) { const j = ((i + k) % N + N) % N; if (k === -span) ctx.moveTo(P[j * 2], P[j * 2 + 1]); else ctx.lineTo(P[j * 2], P[j * 2 + 1]); }
        ctx.stroke(); ctx.restore();
    }
    ctx.restore();
}
