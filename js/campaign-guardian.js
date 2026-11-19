(() => {
    const looks = {
        fire: {
            idleCore: [255, 215, 167], chargedCore: [255, 45, 68],
            idleGlow: [255, 108, 56], chargedGlow: [255, 29, 58], linger: 530, ready: .22,
            aim: { x: -.050, y: .013, angle: -.105, eye: -.51 },
            hit: { x: .029, y: -.004, angle: .068, eye: .14 }
        },
        water: {
            idleCore: [105, 152, 211], chargedCore: [132, 237, 255],
            idleGlow: [87, 127, 202], chargedGlow: [38, 182, 255], linger: 850, ready: .85,
            aim: { x: .019, y: -.029, angle: .055, eye: -.10 },
            hit: { x: -.017, y: .021, angle: -.066, eye: -.15 }
        },
        shazam: {
            idleCore: [255, 241, 190], chargedCore: [255, 241, 190],
            idleGlow: [226, 192, 102], chargedGlow: [255, 156, 64], linger: 670, ready: .82,
            aim: { x: -.041, y: .020, angle: -.088, eye: -.47 },
            hit: { x: .062, y: -.019, angle: .109, eye: -.28 }
        }
    };
    const SILHOUETTE = new Path2D(
        'M0 285Q12 230 55 200L99 170 119 120 117 70 99 9 150 48Q169 34 208 36'
        + 'Q247 34 265 48L319 3 302 78 307 115 335 165 381 196Q419 227 432 300'
        + 'L431 359 0 359Z'
    );
    const EYES = [
        { x: 162, y: 106, path: new Path2D('M-26 -8Q-7 -13 20 4L24 8Q3 15 -13 10Q-25 7 -26 -8Z') },
        { x: 247, y: 106, path: new Path2D('M-23 8L-19 4Q6 -13 25 -8Q23 7 12 10Q-5 15 -23 8Z') }
    ];
    const EAR_LIGHT = new Path2D('M310 12Q285 44 259 54L294 77Q301 47 310 12Z');
    const EAR_SHADE = new Path2D('M102 17Q132 49 152 56L123 78Q118 44 102 17Z');
    const FEATHER_RIM = new Path2D(
        'M322 144Q334 171 370 195Q330 178 311 162M340 182Q362 207 399 224Q366 215 351 204'
        + 'M92 163Q63 193 39 209Q79 194 103 177'
    );
    const EYE_GLINT = new Path2D('M-10 1Q-4 2 5 3Q0 6-8 4Z');
    const MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
    const DEFEAT_MS = 800;
    let sprite, spriteQuality, entered = null, wave = '', phaseAt = 0, impact = null, defeatedAt = null;
    let frameAt = 0, visiblePose = null, entranceDuration = 0, entranceDepth = 0;

    function getShadow(quality) {
        if (sprite && spriteQuality === quality) return sprite;
        sprite = document.createElement('canvas');
        spriteQuality = quality;
        sprite.width = 432;
        sprite.height = 360;
        const g = sprite.getContext('2d');
        const shade = g.createLinearGradient(90, 0, 250, 345);
        shade.addColorStop(0, '#181429');
        shade.addColorStop(.56, '#100d21');
        shade.addColorStop(1, 'rgba(16,13,33,.15)');
        g.fillStyle = shade;
        g.fill(SILHOUETTE);
        if (quality !== 'low') {
            g.save();
            g.clip(SILHOUETTE);
            const rim = g.createRadialGradient(320, 32, 12, 320, 32, 204);
            rim.addColorStop(0, '#8a65975c');
            rim.addColorStop(.45, '#64488b30');
            rim.addColorStop(1, '#64488b00');
            g.fillStyle = rim;
            g.fillRect(0, 0, sprite.width, sprite.height);
            g.fillStyle = '#b48ea44d';
            g.fill(EAR_LIGHT);
            g.fillStyle = '#7366a035';
            g.fill(EAR_SHADE);
            if (quality === 'high') {
                g.strokeStyle = '#9b7ec12b';
                g.lineWidth = 2.4;
                g.lineCap = 'round';
                g.stroke(FEATHER_RIM);
            }
            g.restore();
        }
        g.strokeStyle = 'rgba(124,105,158,.23)';
        g.lineWidth = 2;
        g.stroke(SILHOUETTE);
        const fade = g.createLinearGradient(0, 0, 0, sprite.height);
        fade.addColorStop(0, '#fff');
        fade.addColorStop(.64, '#fff');
        fade.addColorStop(1, 'transparent');
        g.globalCompositeOperation = 'destination-in';
        g.fillStyle = fade;
        g.fillRect(0, 0, sprite.width, sprite.height);
        return sprite;
    }

    function phase(kind) {
        const next = Object.hasOwn(looks, kind) ? kind : '';
        if (wave === next) return;
        wave = next;
        phaseAt = performance.now();
    }
    function strike(kind, pipe) {
        if (!Object.hasOwn(looks, kind)) return;
        const side = kind === 'fire' && pipe ? (pipe.campaign?.index % 2 === 0 ? -1 : 1) : 0;
        impact = { kind, at: performance.now(), side };
    }
    function defeat() {
        if (defeatedAt === null) defeatedAt = performance.now();
    }
    function reset() {
        entered = defeatedAt = null;
        wave = '';
        phaseAt = 0;
        impact = null;
        frameAt = 0;
        visiblePose = null;
    }
    function smooth(value) {
        const t = Math.min(1, Math.max(0, value));
        return t * t * (3 - 2 * t);
    }
    function warming(pipes, owlX, width) {
        let nearest = Infinity;
        for (const pipe of pipes) {
            const gate = pipe.campaign;
            if (pipe.passed || gate?.wave !== wave) continue;
            const pending = wave === 'fire' ? gate.hazard === 'fire' && !pipe.campaignFired
                : wave === 'water' ? gate.hazard === 'water' && !pipe.campaignJet : gate.item === 'shazam';
            if (!pending) continue;
            const distance = pipe.x + pipe.width / 2 - owlX;
            if (distance > 0) nearest = Math.min(nearest, distance);
        }
        // Первая поза появляется уже на входе в волну, пока следующие ворота ещё за экраном.
        return smooth(1 - (nearest - width * .20) / (width * 1.02));
    }

    function channels(start, end, amount) {
        return start.map((value, index) => value + (end[index] - value) * amount);
    }

    function easedPose(target, now, still) {
        if (!visiblePose || still) visiblePose = target;
        else {
            const elapsed = Math.max(0, Math.min(45, now - frameAt));
            const positionEase = 1 - Math.exp(-elapsed / 62);
            const colorEase = 1 - Math.exp(-elapsed / 54);
            for (const key of ['x', 'y', 'angle', 'eye', 'energy']) {
                visiblePose[key] += (target[key] - visiblePose[key]) * positionEase;
            }
            visiblePose.core = channels(visiblePose.core, target.core, colorEase);
            visiblePose.glow = channels(visiblePose.glow, target.glow, colorEase);
        }
        frameAt = now;
        return visiblePose;
    }
    function eye(ctx, eye, core, glow, blink, energy, quality) {
        ctx.save();
        ctx.translate(eye.x, eye.y);
        ctx.scale(1, blink);
        ctx.fillStyle = core;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 11 + energy * 14;
        ctx.fill(eye.path);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        if (quality === 'high') ctx.fill(EYE_GLINT);
        else ctx.fillRect(-6, 2, 8, 2);
        ctx.restore();
    }
    function draw(ctx, width, height, pipes, owlX, fullCharge = false, opacity = 1, telegraph = null) {
        const now = performance.now();
        const defeatProgress = defeatedAt === null ? 0 : (now - defeatedAt) / DEFEAT_MS;
        if (defeatProgress >= 1) return;
        const quality = typeof gfxQuality === 'undefined' ? 'medium' : gfxQuality;
        if (entered === null) {
            entered = now;
            const quickEntrance = fullCharge || telegraph?.warning;
            entranceDuration = quickEntrance ? 440 : 1030;
            entranceDepth = quickEntrance ? .10 : .20;
        }
        const age = now - entered;
        const still = MOTION.matches;
        const entrance = still ? 1 : 1 - (1 - Math.min(1, age / entranceDuration)) ** 3;
        const scale = Math.min(width * .95 / 432, height * .59 / 360);
        const palette = looks[wave] || looks.fire;
        let impactLook = palette, hit = 0, shotTilt = 0;
        if (impact) {
            impactLook = looks[impact.kind];
            const remaining = 1 - (now - impact.at) / impactLook.linger;
            if (remaining <= 0) impact = null;
            else {
                hit = remaining * remaining;
                shotTilt = impact.side * .024;
            }
        }
        const charge = telegraph?.warning ? .4 + .6 * smooth(telegraph.progress) : fullCharge ? 1 : wave
            ? Math.max(palette.ready * smooth((now - phaseAt) / 430), warming(pipes, owlX, width))
            : 0;
        const chroma = smooth(Math.max(charge * 1.18, hit));
        const ready = still ? 0 : charge * (1 - hit * .75);
        if (still) { hit = 0; shotTilt = 0; }
        const aim = palette.aim, recoil = impactLook.hit;
        const pose = easedPose({
            x: .67 + aim.x * ready + recoil.x * hit,
            y: (1 - entrance) * entranceDepth + aim.y * ready + recoil.y * hit,
            angle: aim.angle * ready + (recoil.angle + shotTilt) * hit,
            eye: 1 + aim.eye * ready + recoil.eye * hit,
            energy: still ? .3 : Math.min(1, ready * .78 + hit),
            core: channels(palette.idleCore, palette.chargedCore, chroma),
            glow: channels(palette.idleGlow, palette.chargedGlow, chroma)
        }, now, still);
        const sinceBlink = (age + 630) % 3720;
        const blink = still ? 1 : .12 + .88 * Math.min(1, Math.abs(sinceBlink - 96) / 74);
        const core = 'rgb(' + pose.core.map(Math.round) + ')';
        const glow = 'rgba(' + pose.glow.map(Math.round) + ',' + (.42 + pose.energy * .58) + ')';
        ctx.save();
        const fall = still ? 0 : smooth(defeatProgress) * .27;
        ctx.globalAlpha = opacity * (.18 + entrance * .82) * (1 - smooth((defeatProgress - .20) / .80));
        const flightPeek = telegraph && height > width ? .065 : 0;
        ctx.translate(width * pose.x, Math.max(57, height * .13) + height * (pose.y + flightPeek + fall));
        ctx.rotate(pose.angle);
        ctx.scale(scale, scale);
        ctx.translate(-208, 0);
        ctx.drawImage(getShadow(quality), 0, 0);
        if (defeatProgress < .25) {
            ctx.globalAlpha *= 1 - smooth(defeatProgress * 4);
            EYES.forEach(mark => eye(ctx, mark, core, glow, blink * pose.eye, pose.energy, quality));
        }
        ctx.restore();
    }

    function drawFlightWarning(ctx, pipes, width, height, squeeze, kind, isTarget) {
        ctx.save();
        ctx.strokeStyle = kind === 'fire' ? '#FF9977' : '#9FE9FF';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const pipe of pipes) {
            if (!isTarget(pipe, kind) || pipe.x > width || pipe.x + pipe.width < 0) continue;
            const left = pipe.x + 7, right = pipe.x + pipe.width - 7;
            const upper = pipe.top + squeeze, lower = height - pipe.bottom - squeeze;
            ctx.moveTo(left, upper); ctx.lineTo(right, upper);
            ctx.moveTo(left, lower); ctx.lineTo(right, lower);
        }
        ctx.stroke();
        ctx.restore();
    }

    window.BuboCampaignGuardian = { draw, phase, strike, defeat, defeatDuration: DEFEAT_MS, reset, drawFlightWarning };
})();
