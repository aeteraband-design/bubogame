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
            idleGlow: [226, 192, 102], chargedGlow: [226, 192, 102], linger: 670, ready: .35,
            aim: { x: -.020, y: .008, angle: -.039, eye: -.17 },
            hit: { x: .069, y: -.024, angle: .125, eye: .26 }
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
    const MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sprite, entered = null, wave = '', phaseAt = 0, impact = null;

    function getShadow() {
        if (sprite) return sprite;
        sprite = document.createElement('canvas');
        sprite.width = 432;
        sprite.height = 360;
        const g = sprite.getContext('2d');
        const shade = g.createLinearGradient(90, 0, 250, 345);
        shade.addColorStop(0, '#181429');
        shade.addColorStop(.56, '#100d21');
        shade.addColorStop(1, 'rgba(16,13,33,.15)');
        g.fillStyle = shade;
        g.fill(SILHOUETTE);
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
    function reset() {
        entered = null;
        wave = '';
        phaseAt = 0;
        impact = null;
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
        return start.map((value, index) => Math.round(value + (end[index] - value) * amount)).join(',');
    }
    function eye(ctx, eye, core, glow, blink, energy) {
        ctx.save();
        ctx.translate(eye.x, eye.y);
        ctx.scale(1, blink);
        ctx.fillStyle = core;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 11 + energy * 14;
        ctx.fill(eye.path);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.fillRect(-6, 2, 8, 2);
        ctx.restore();
    }
    function draw(ctx, width, height, pipes, owlX) {
        const now = performance.now();
        if (entered === null) entered = now;
        const age = now - entered;
        const still = MOTION.matches;
        const entrance = still ? 1 : 1 - (1 - Math.min(1, age / 1030)) ** 3;
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
        const charge = wave
            ? Math.max(palette.ready * smooth((now - phaseAt) / 430), warming(pipes, owlX, width))
            : 0;
        const chroma = smooth(Math.max(charge * 1.18, hit));
        const ready = still ? 0 : charge * (1 - hit * .75);
        if (still) { hit = 0; shotTilt = 0; }
        const pose = palette.aim, recoil = impactLook.hit;
        const x = width * (.67 + pose.x * ready + recoil.x * hit);
        const y = Math.max(57, height * .13) + height * ((1 - entrance) * .20 + pose.y * ready + recoil.y * hit);
        const sinceBlink = (age + 630) % 3720;
        const blink = still ? 1 : .12 + .88 * Math.min(1, Math.abs(sinceBlink - 96) / 74);
        const eyeScale = blink * (1 + pose.eye * ready + recoil.eye * hit);
        const energy = still ? .3 : Math.min(1, ready * .78 + hit);
        const core = 'rgb(' + channels(palette.idleCore, palette.chargedCore, chroma) + ')';
        const glow = 'rgba(' + channels(palette.idleGlow, palette.chargedGlow, chroma) + ',' + (.42 + energy * .58) + ')';
        ctx.save();
        ctx.globalAlpha = .18 + entrance * .82;
        ctx.translate(x, y);
        ctx.rotate(pose.angle * ready + (recoil.angle + shotTilt) * hit);
        ctx.scale(scale, scale);
        ctx.translate(-208, 0);
        ctx.drawImage(getShadow(), 0, 0);
        EYES.forEach(mark => eye(ctx, mark, core, glow, eyeScale, energy));
        ctx.restore();
    }

    window.BuboCampaignGuardian = { draw, phase, strike, reset };
})();
