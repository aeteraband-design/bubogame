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
        this.vy = this.jump;
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
        stamina = Math.max(0, stamina - 0.38 * staminaDrainMult() * (1 + 0.5 * currentOvereatFactor + 0.5 * currentFreezeFactor));   // взмах чуть дороже; объевшейся и замёрзшей сове — заметно тяжелее
        updateStaminaHUD();

        // замёрзшая сова роняет снежинки, опьяневшая — пузырьки коктейля; в обычном состоянии — привычные кружочки
        // вылетают так же, как обычные кружочки (то же место, скорость и время жизни) — меняется только вид частиц
        const isSnow = (currentFreezeFactor > 0.3 || (freezeTime > 0 && currentFreezeFactor > 0.05)), isBubble = drunkTime > 0;
        const flapKind = (isSnow && isBubble) ? 'both' : (isSnow ? 'snow' : (isBubble ? 'bubble' : null));
        spawnFlapParticles(this.x, this.y, flapKind, particles);
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
        this.vy += this.gravity * (1 + 0.3 * oe) * (1 + 0.15 * currentFreezeFactor) * dtMult;
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
        ctx.translate(this.x, this.y);
        // Наклон вперёд: чуть-чуть с каждым уровнем сложности (к Хард+ около 6°) и ещё немного при ускорении (до ~14° вместе)
        {
            let lvl = 0;
            try { lvl = getDifficultyIndex() / Math.max(1, DIFF_LEVELS.length - 1); } catch (e) {}
            const boostOn = (typeof speedBoostTime !== 'undefined' && speedBoostTime > 0 && gameActive && (currentFreezeFactor || 0) < 0.05) ? 1 : 0;   // замёрзшая сова застывает как есть: без наклона, взгляда и клюва «вперёд»
            const boostLean = Math.min(0.42, 0.13 + 0.035 * lvl);   // устремление вперёд: сильнее на высоких уровнях, но без перебора
            const leanT = gameActive ? (0.11 * lvl + boostLean * boostOn) * (1 - (currentFreezeFactor || 0)) : 0;
            this.lean = (this.lean || 0) + (leanT - (this.lean || 0)) * Math.min(1, 0.05 * dtMult);
            this.boostK = (this.boostK || 0) + (boostOn - (this.boostK || 0)) * Math.min(1, 0.07 * dtMult);
        }
        const bodyScale = 1.29 * (1 + 0.16 * easeFactor(currentOvereatFactor));   // сова немного меньше (было 1.36)
        // Визуальный центр совы (в единицах тела): по замеру рисунка (центр габаритов и центр «массы»). Вокруг него сова вращается,
        // в нём же центрируются щит и свечение пера — сова внутри них по центру, а кувыркание при заморозке без «перекоса»
        const OWL_CX = -1.1, OWL_CY = 2.7;
        ctx.translate(OWL_CX * bodyScale, OWL_CY * bodyScale);
        ctx.rotate(this.rotation + this.lean);
        ctx.translate(-OWL_CX * bodyScale, -OWL_CY * bodyScale);
        ctx.scale(bodyScale, bodyScale);

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
            const rotAngle = frame * 0.028;
            const notchRadius = shieldRadius + 2.5;

            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';   // концы штрихов щита закруглены
            ctx.shadowColor = '#22C55E';
            ctx.shadowBlur = 19;

            // при ударе щит вминается в сторону трубы и упруго выправляется
            const dentLocal = shieldDentAng - this.rotation;
            ctx.lineWidth = 1.6 + 1.4 * shieldDent;
            // место удара светится: чем сильнее удар, тем ярче
            if (shieldHitPower > 0.03) {
                const gR = notchRadius * (1 - 0.58 * shieldDent); const gx = Math.cos(dentLocal) * gR, gy = Math.sin(dentLocal) * gR;
                const gr = notchRadius * (0.55 + 0.35 * shieldHitPower);
                const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
                hg.addColorStop(0, `rgba(220, 255, 230, ${0.85 * shieldHitPower})`);
                hg.addColorStop(0.4, `rgba(74, 222, 128, ${0.45 * shieldHitPower})`);
                hg.addColorStop(1, 'rgba(34, 197, 94, 0)');
                const prevStroke = ctx.strokeStyle;
                ctx.fillStyle = hg;
                ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = prevStroke;
            }
            for (let s = 0; s < numNotches; s++) {
                const startAng = rotAngle + s * notchAngle + (arcMax - notchArc) / 2;   // середина штриха остаётся на месте
                ctx.lineWidth = 1.6 + 1.4 * shieldDent;
                ctx.beginPath();
                for (let k = 0; k <= 6; k++) {
                    const a = startAng + notchArc * k / 6;
                    let d = (a - dentLocal) % (Math.PI * 2);
                    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
                    const rr = notchRadius * (1 - 0.58 * shieldDent * Math.exp(-(d * d) / 0.6));   // прогиб глубже и шире — щит «мягче»
                    if (k === 3 && shieldHitPower > 0.05) {
                        // дуги рядом с ударом светлеют и становятся толще
                        const near = Math.exp(-(d * d) / 0.5) * shieldHitPower;
                        ctx.lineWidth = 1.6 + 1.4 * shieldDent + 2.2 * near;
                    }
                    if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
                }
                ctx.stroke();
            }


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
            ctx.restore();
        }

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
