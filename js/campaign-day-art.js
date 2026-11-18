(function () {
    const CITY_WIDTH = 720;
    const CAP_HEIGHT = 19;
    const CAP_OVERHANG = 5;
    const STEM_RIB_STEP = 70;
    const pipeArt = new Map();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scenery = null, sunProgress = null;

    function layer(width, height, scale, paint) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const g = canvas.getContext('2d');
        g.scale(canvas.width / width, canvas.height / height);
        paint(g);
        return canvas;
    }

    function path(g, coords) {
        g.beginPath();
        g.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
        g.closePath();
    }

    function disc(g, x, y, radius) {
        g.beginPath();
        g.arc(x, y, radius, 0, Math.PI * 2);
        g.fill();
    }

    function cloud(g, x, y, size, alpha) {
        g.save();
        g.translate(x, y);
        g.scale(size, size);
        g.globalAlpha = alpha;
        const shade = g.createLinearGradient(0, -26, 0, 15);
        shade.addColorStop(0, '#fffaf1');
        shade.addColorStop(.60, '#f8fcfa');
        shade.addColorStop(1, '#cde7e8');
        g.fillStyle = shade;
        g.beginPath();
        g.moveTo(-62, 10);
        g.bezierCurveTo(-66, 1, -55, -8, -42, -7);
        g.bezierCurveTo(-37, -21, -25, -23, -16, -18);
        g.bezierCurveTo(-4, -38, 20, -33, 28, -13);
        g.bezierCurveTo(40, -15, 44, -10, 49, -5);
        g.bezierCurveTo(66, -4, 77, 8, 65, 12);
        g.bezierCurveTo(28, 17, -33, 17, -62, 10);
        g.fill();
        g.restore();
    }

    function makeSky(width, height, scale) {
        return layer(width, height, scale, g => {
            const sky = g.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#4189ca');
            sky.addColorStop(.36, '#74bce7');
            sky.addColorStop(.70, '#c7e8e7');
            sky.addColorStop(1, '#ffdfad');
            g.fillStyle = sky;
            g.fillRect(0, 0, width, height);

            const cloudScale = Math.min(2, width / 310);
            cloud(g, width * .17, height * .35, cloudScale * .89, .79);
            cloud(g, width * .83, height * .43, cloudScale * .53, .59);
            cloud(g, width * .38, height * .53, cloudScale * .47, .43);

            g.fillStyle = '#a4c6cc';
            path(g, [0, height * .72, width * .20, height * .65, width * .39, height * .70,
                width * .58, height * .64, width * .76, height * .69, width, height * .63,
                width, height, 0, height]);
            g.fill();
        });
    }

    function makeSun(radius, scale) {
        const center = radius * 3;
        return layer(center * 2, center * 2, scale, g => {
            const halo = g.createRadialGradient(center, center, radius * .52, center, center, center);
            halo.addColorStop(0, 'rgba(255, 231, 164, .72)');
            halo.addColorStop(.40, 'rgba(255, 235, 174, .29)');
            halo.addColorStop(1, 'rgba(255, 239, 195, 0)');
            g.fillStyle = halo;
            disc(g, center, center, center);
            const sunlight = g.createRadialGradient(center - radius * .22, center - radius * .30, 0, center, center, radius);
            sunlight.addColorStop(0, '#fffbe4');
            sunlight.addColorStop(.75, '#ffe8a3');
            sunlight.addColorStop(1, '#ffcf76');
            g.fillStyle = sunlight;
            disc(g, center, center, radius);
        });
    }

    const DISTANT_ROOFS = [
        [4, 39, .29], [48, 51, .41], [104, 42, .32], [151, 34, .55], [191, 49, .40],
        [247, 35, .47], [287, 52, .35], [344, 42, .56], [392, 54, .38], [451, 35, .50],
        [490, 50, .29], [548, 34, .44], [589, 57, .51], [653, 61, .37]
    ];
    const HOMES = [
        [5, 49, .48], [61, 51, .59], [171, 52, .44], [229, 60, .59],
        [302, 54, .50], [389, 68, .48], [467, 58, .57], [539, 57, .36], [630, 72, .52]
    ];
    const FACADES = [
        ['#efbc8b', '#c38570', '#b56858'],
        ['#e6d2a7', '#ada68f', '#7c9996'],
        ['#f3d2a7', '#d29e7e', '#b67565'],
        ['#b7c8ae', '#89a296', '#7a9992']
    ];

    function makeDistantCity(height, scale) {
        return layer(CITY_WIDTH, height, scale, g => {
            for (const [x, w, proportion] of DISTANT_ROOFS) {
                const top = height * (1 - proportion);
                g.fillStyle = '#91b6bc';
                g.fillRect(x, top, w, height - top);
                g.fillStyle = '#84a8b0';
                g.fillRect(x + w * .80, top + 2, w * .20, height - top - 2);
                g.fillStyle = '#a3c4c6';
                g.fillRect(x - 2, top - 3, w + 4, 4);
                for (let sy = top + 12; sy < height; sy += 17) {
                    for (let sx = x + 8; sx < x + w - 9; sx += 13) g.fillRect(sx, sy, 4, 6);
                }
            }
        });
    }

    function makeNearCity(height, scale) {
        return layer(CITY_WIDTH, height, scale, g => {
            HOMES.forEach(([x, w, proportion], index) => {
                const top = height * (1 - proportion);
                const depth = Math.round(w * .21);
                const [sun, shadow, roof] = FACADES[index % FACADES.length];
                g.fillStyle = sun;
                g.fillRect(x, top, w - depth, height - top);
                g.fillStyle = shadow;
                g.fillRect(x + w - depth, top, depth, height - top);
                g.fillStyle = roof;
                path(g, [x - 3, top, x + w * .43, top - w * .20, x + w + 3, top]); g.fill();
                g.fillRect(x - 3, top - 1, w + 6, 4);
                for (let wy = top + 13; wy < height; wy += 17) {
                    for (let wx = x + 7; wx < x + w - depth - 5; wx += 13) {
                        g.fillStyle = '#7e939b'; g.fillRect(wx, wy, 5, 7);
                        g.fillStyle = '#b3c7bf'; g.fillRect(wx + 1, wy + 1, 3, 3);
                    }
                }
            });
            drawClockTower(g, 133, height);
            drawClockTower(g, 365, height * .82, height * .18);
            for (const x of [30, 115, 204, 292, 404, 522, 612, 708]) {
                const top = height * .88;
                g.fillStyle = '#ad856d'; g.fillRect(x - 2, top, 4, height - top);
                g.fillStyle = '#739985'; disc(g, x, top, 8);
                g.fillStyle = '#90ae8c'; disc(g, x - 3, top - 3, 5);
            }
            const haze = g.createLinearGradient(0, height * .64, 0, height);
            haze.addColorStop(0, 'rgba(241, 209, 169, 0)');
            haze.addColorStop(1, 'rgba(241, 209, 169, .37)');
            g.fillStyle = haze;
            g.fillRect(0, height * .64, CITY_WIDTH, height * .36);
        });
    }

    function drawClockTower(g, x, height, y = 0) {
        const roof = y + height * .13, top = y + height * .31, base = y + height;
        g.fillStyle = '#e4b185';
        g.fillRect(x - 12, top, 24, base - top);
        g.fillStyle = '#c28b76';
        g.fillRect(x + 6, top, 6, base - top);
        g.fillStyle = '#a96057';
        path(g, [x - 16, top, x, roof, x + 16, top]); g.fill();
        g.fillRect(x - 15, top, 30, 3);
        g.fillStyle = '#e7c6a5';
        g.fillRect(x - 7, top + height * .40, 11, 14);
        g.fillStyle = '#ae7d67';
        disc(g, x - 1, top + 14, 8);
        g.fillStyle = '#f6ddaf';
        disc(g, x - 1, top + 14, 6.3);
        g.strokeStyle = '#8a7167';
        g.lineWidth = 1.1;
        g.beginPath(); g.moveTo(x - 1, top + 10); g.lineTo(x - 1, top + 14); g.lineTo(x + 2, top + 16); g.stroke();
    }

    function getScenery(width, height, scale) {
        if (scenery?.width === width && scenery.height === height && scenery.scale === scale) return scenery;
        const near = height * .35, far = height * .42;
        const radius = Math.min(width * .086, height * .085);
        scenery = {
            width, height, scale, near, far, radius,
            sun: makeSun(radius, scale),
            sky: makeSky(width, height, scale),
            distant: makeDistantCity(far, scale),
            foreground: makeNearCity(near, scale)
        };
        return scenery;
    }

    function blitCity(ctx, canvas, width, height, layerHeight, offset) {
        const start = (offset % CITY_WIDTH + CITY_WIDTH) % CITY_WIDTH;
        for (let x = -start; x < width; x += CITY_WIDTH) {
            ctx.drawImage(canvas, x, height - layerHeight, CITY_WIDTH, layerHeight);
        }
    }

    function draw(ctx, width, height, offset, scale, progress, dt) {
        if (width <= 0 || height <= 0) return;
        const buffers = getScenery(width, height, scale);
        const target = progress?.total > 0 ? Math.min(1, progress.passed / progress.total) : 0;
        if (sunProgress === null || reducedMotion.matches || Math.abs(target - sunProgress) < .002) sunProgress = target;
        else sunProgress += (target - sunProgress) * Math.min(1, .14 * dt);
        const reach = buffers.radius * 3;
        const sunY = height * (.335 - .165 * sunProgress);
        ctx.drawImage(buffers.sky, 0, 0, width, height);
        ctx.drawImage(buffers.sun, width * .73 - reach, sunY - reach, reach * 2, reach * 2);
        blitCity(ctx, buffers.distant, width, height, buffers.far, offset * .11);
        blitCity(ctx, buffers.foreground, width, height, buffers.near, offset * .24);
    }

    function metal(g, from, to, colors) {
        const gradient = g.createLinearGradient(from, 0, to, 0);
        const positions = [0, .10, .47, .74, .90, 1];
        positions.forEach((stop, index) => gradient.addColorStop(stop, colors[index]));
        return gradient;
    }

    function getPipeArt(ctx, width, scale) {
        const key = width + '|' + scale;
        if (pipeArt.has(key)) return pipeArt.get(key);
        const capWidth = width + CAP_OVERHANG * 2;
        const stem = metal(ctx, 0, width, ['#163c51', '#246173', '#367f8c', '#72afa9', '#408895', '#1b4a61']);
        const cap = layer(capWidth, CAP_HEIGHT, scale, g => {
            g.fillStyle = metal(g, 0, capWidth, ['#62452f', '#a8794b', '#c49258', '#f3c481', '#cb934e', '#70412c']);
            g.beginPath();
            if (g.roundRect) g.roundRect(.5, .5, capWidth - 1, CAP_HEIGHT - 1, 5.5);
            else g.rect(.5, .5, capWidth - 1, CAP_HEIGHT - 1);
            g.fill();
            g.strokeStyle = '#514338';
            g.lineWidth = 1;
            g.stroke();
            g.fillStyle = 'rgba(255, 250, 209, .58)';
            g.fillRect(5, 3, capWidth - 10, 1);
            g.fillStyle = 'rgba(79, 58, 41, .48)';
            g.fillRect(4, CAP_HEIGHT - 4, capWidth - 8, 1);
            for (const x of [7, capWidth - 7]) {
                g.fillStyle = 'rgba(95, 65, 47, .66)'; disc(g, x, CAP_HEIGHT * .52, 1.35);
                g.fillStyle = 'rgba(255, 247, 205, .65)'; disc(g, x - .4, CAP_HEIGHT * .52 - .4, .53);
            }
        });
        const art = { stem, cap, capWidth };
        pipeArt.set(key, art);
        return art;
    }

    function drawStem(ctx, width, start, end, seamOrigin, nearUpper) {
        ctx.fillRect(0, start, width, Math.max(0, end - start));
        ctx.fillStyle = 'rgba(20, 52, 62, .34)';
        for (let y = seamOrigin; y > start + 2 && y < end - 2; y += nearUpper ? -STEM_RIB_STEP : STEM_RIB_STEP) {
            ctx.fillRect(0, y, width, 2);
        }
    }

    function drawPipe(ctx, pipe, height, squeeze, zoom, scale) {
        const top = pipe.top + squeeze, bottom = height - pipe.bottom - squeeze;
        const topStem = Math.max(0, top - CAP_HEIGHT + 2), bottomStem = bottom + CAP_HEIGHT - 2;
        const overdraw = zoom < .999 ? Math.ceil(height * (1 - zoom) * .6) + 4 : 0;
        const { stem, cap, capWidth } = getPipeArt(ctx, pipe.width, scale);
        ctx.save();
        ctx.translate(pipe.x, 0);
        ctx.fillStyle = stem;
        drawStem(ctx, pipe.width, -overdraw, topStem, topStem - STEM_RIB_STEP, true);
        ctx.fillStyle = stem;
        drawStem(ctx, pipe.width, bottomStem, height + overdraw, bottomStem + STEM_RIB_STEP, false);
        ctx.drawImage(cap, -CAP_OVERHANG, top - CAP_HEIGHT, capWidth, CAP_HEIGHT);
        ctx.drawImage(cap, -CAP_OVERHANG, bottom, capWidth, CAP_HEIGHT);
        ctx.restore();
    }

    window.BuboCampaignDayArt = { draw, drawPipe, reset: () => { sunProgress = null; } };
})();
