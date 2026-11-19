(function () {
    const CITY_WIDTH = 720;
    const CAP_HEIGHT = 19;
    const CAP_OVERHANG = 5;
    const STEM_RIB_STEP = 70;
    const pipeArt = new Map();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scenery = null, sunProgress = null, celebration = null;
    const DISTRICTS = {
        music: { sky: ['#322449', '#754867', '#bf746c', '#e6a775'], far: '#805570', city: ['#ac654f', '#b48055', '#a76473', '#8c5762'] },
        magic: { sky: ['#232348', '#514981', '#8776b1', '#ceacbf'], far: '#575581', city: ['#2a2b49', '#42375e', '#526080'], trim: '#b5a0d4', light: '#ffce8b' },
        jungle: { sky: ['#2b5c58', '#5e9d86', '#a9c69b', '#ebd6a0'], far: '#5e8776', city: ['#295247', '#3e7654', '#6b9666'], trim: '#2d4d41', light: '#b0bc72' }
    };
    const SKYLINE_HEIGHT = {
        dawn: [.54, .55],
        music: [.68, .69],
        magic: [.65, .69],
        jungle: [.70, .72]
    };
    const VENICE_PALACES = [
        [0, 58, .38], [55, 63, .31], [143, 70, .34], [207, 81, .26], [281, 71, .35],
        [348, 79, .28], [431, 61, .39], [518, 87, .29], [600, 65, .34], [661, 59, .30]
    ];
    const VENICE_FLAGS = ['#ce7765', '#dcc185', '#a3af98', '#af7aab'];

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

    function makeSky(width, height, scale, detail) {
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

            g.fillStyle = '#b0d1d7';
            g.beginPath();
            g.moveTo(0, height * .71);
            g.bezierCurveTo(width * .18, height * .57, width * .37, height * .74, width * .55, height * .65);
            g.quadraticCurveTo(width * .75, height * .59, width, height * .65);
            g.lineTo(width, height); g.lineTo(0, height); g.fill();

            g.fillStyle = '#98b9bb';
            g.beginPath();
            g.moveTo(0, height * .81);
            g.bezierCurveTo(width * .29, height * .63, width * .46, height * .82, width * .65, height * .74);
            g.quadraticCurveTo(width * .80, height * .68, width, height * .73);
            g.lineTo(width, height); g.lineTo(0, height); g.fill();
            if (detail > 1) {
                cloud(g, width * .60, height * .185, cloudScale * .26, .35);
                cloud(g, width * .09, height * .54, cloudScale * .31, .33);
            }
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

    function horizontalShade(g, x, w, from, to) {
        const gradient = g.createLinearGradient(x, 0, x + w, 0);
        gradient.addColorStop(0, from);
        gradient.addColorStop(1, to);
        return gradient;
    }

    function archedWindow(g, cx, y, half, length) {
        g.beginPath();
        g.arc(cx, y + half, half, Math.PI, 0);
        g.lineTo(cx + half, y + length);
        g.lineTo(cx - half, y + length);
        g.closePath();
        g.fill();
    }

    function makeDistantCity(height, scale, detail) {
        return layer(CITY_WIDTH, height, scale, g => {
            for (const [x, w, proportion] of DISTANT_ROOFS) {
                const top = height * (1 - proportion);
                g.fillStyle = '#91b6bc';
                g.fillRect(x, top, w, height - top);
                g.fillStyle = '#84a7af';
                g.fillRect(x + w * .75, top + 2, w * .25, height - top - 2);
                g.fillStyle = '#a6c3c4';
                g.fillRect(x - 2, top - 3, w + 4, 4);
                if (detail) {
                    for (let sy = top + 12; sy < height; sy += 17) {
                        for (let sx = x + 8; sx < x + w - 9; sx += 13) g.fillRect(sx, sy, 4, 6);
                    }
                }
            }
        });
    }

    function terracottaRoof(g, x, y, w, color, slope, detail) {
        const cap = y - slope;
        g.fillStyle = color;
        path(g, [x-4,y, x+w*.20,cap, x+w*.78,cap, x+w+4,y]);
        g.fill();
        g.fillStyle = '#673f482b';
        path(g, [x+w*.60,cap, x+w*.78,cap, x+w+4,y, x+w*.85,y]);
        g.fill();
        g.fillStyle = '#ffeac66b';
        g.fillRect(x+w*.20, cap, w*.58, .9);
        if (detail > 1) {
            g.strokeStyle = '#5c424044';
            g.lineWidth = .7;
            for (let i = 1; i < 4; i++) {
                const q = i/4, yy = cap+slope*q;
                g.beginPath();
                g.moveTo(x+w*.20*(1-q)-4*q, yy);
                g.lineTo(x+w*.78+(w*.22+4)*q, yy);
                g.stroke();
            }
        }
    }

    function dayHouse(g, x, top, w, bottom, index, detail) {
        const [sun, shadow, roof] = FACADES[index % FACADES.length];
        const front = Math.round(w * .76);
        g.fillStyle = detail ? horizontalShade(g, x, front, sun, shadow) : sun;
        g.fillRect(x, top, front, bottom - top);
        g.fillStyle = shadow;
        g.fillRect(x + front, top, w - front, bottom - top);
        if (index % 3 === 1) {
            g.fillStyle = roof;
            g.fillRect(x-3, top-5, w+6, 5);
            g.fillStyle = '#9d7b69';
            g.fillRect(x+front*.68, top-11, 7, 6);
        } else terracottaRoof(g, x, top, w, roof, w * (index % 2 ? .28 : .19), detail);

        g.fillStyle = '#f8ddb6cc';
        g.fillRect(x - 2, top + 1, w + 4, 2);
        if (detail && index % 3 !== 1) {
            g.fillStyle = '#8369534a';
            g.fillRect(x + 3, top + 5, front - 6, 1);
            g.fillStyle = '#f8ddb683';
            g.fillRect(x + 5, top + 7, front - 10, 1);
        }
        for (let wy = top + 13, row = 0; wy < bottom - 6; wy += 20, row++) {
            for (let wx = x + 8, col = 0; wx < x + front - 5; wx += 13, col++) {
                g.fillStyle = '#526d7b';
                if (row === 0 && index % 3 === 0) archedWindow(g, wx + 3, wy, 3, 10);
                else g.fillRect(wx, wy, 6, 9);
                if (!detail) continue;
                g.fillStyle = (index + row + col) % 4 === 0 ? '#f5d396' : '#a4c7cf';
                g.fillRect(wx + 1, wy + 2, 4, 5);
                g.fillStyle = '#f2d5ac';
                g.fillRect(wx - 1, wy + 9, 8, 1);
                if (detail > 1) {
                    g.fillStyle = '#758a8e';
                    g.fillRect(wx + 2.5, wy + 3, 1, 4);
                }
            }
            if (detail && row % 2 === 0) {
                g.fillStyle = '#8c5f5640';
                g.fillRect(x, wy - 5, w, .9);
            }
        }
        if (detail && index % 3 === 1) {
            const awningY = Math.min(bottom - 8, top + 40);
            g.fillStyle = '#f5dac3';
            g.fillRect(x + 1, awningY, front - 2, 5);
            g.fillStyle = roof;
            for (let strip = 0; strip < front - 6; strip += 6) g.fillRect(x + 2 + strip, awningY, 3, 5);
        }
    }

    function makeNearCity(height, scale, detail) {
        return layer(CITY_WIDTH, height, scale, g => {
            HOMES.forEach(([x, w, proportion], index) => {
                const top = height * (1 - proportion);
                dayHouse(g, x, top, w, height, index, detail);
            });
            drawClockTower(g, 138, height, detail);
            for (const x of [30, 115, 204, 292, 404, 522, 612, 708]) {
                const top = height * .88;
                g.fillStyle = '#a77962'; g.fillRect(x - 2, top, 4, height - top);
                g.fillStyle = '#618073'; disc(g, x, top, 8);
                g.fillStyle = '#83a881'; disc(g, x - 3, top - 3, 5);
                if (detail > 1) { g.fillStyle = '#b4be8d'; disc(g, x - 4, top - 6, 2.5); }
            }
            const haze = g.createLinearGradient(0, height * .64, 0, height);
            haze.addColorStop(0, 'rgba(241, 209, 169, 0)');
            haze.addColorStop(1, 'rgba(241, 209, 169, .26)');
            g.fillStyle = haze;
            g.fillRect(0, height * .64, CITY_WIDTH, height * .36);
        });
    }

    function drawClockTower(g, x, height, detail) {
        const peak = height * .08, top = height * .30, shoulder = height * .57;
        g.fillStyle = '#b38372';
        g.fillRect(x-22, shoulder, 44, height-shoulder);
        g.fillStyle = detail ? horizontalShade(g,x-16,32,'#f6ca91','#b58170') : '#dfac84';
        g.fillRect(x-16, top, 32, height-top);
        g.fillStyle = '#7d5250';
        path(g, [x-21,top, x-12,top*.82, x,peak, x+12,top*.82, x+21,top]);
        g.fill();
        g.fillStyle = '#c17f66';
        path(g, [x-17,top-1, x,peak, x+6,top-1]);
        g.fill();
        g.fillStyle = '#f5cd99';
        g.fillRect(x-19, top, 38, 2);
        g.fillRect(x-21, shoulder, 42, 3);
        if (detail) {
            g.fillStyle = '#9d7654';
            g.fillRect(x-.8, peak-7, 1.6, 8);
            disc(g,x,peak-7,2.3);
        }
        const cy = top + 20;
        g.fillStyle = '#7d584c'; disc(g, x, cy, 12);
        g.fillStyle = '#f6dfae'; disc(g, x, cy, 10);
        g.strokeStyle = '#755849';
        g.lineWidth = 1.45;
        g.beginPath(); g.moveTo(x,cy-6); g.lineTo(x,cy); g.lineTo(x+4,cy+3); g.stroke();
        if (detail > 1) {
            g.fillStyle = '#a17e5e';
            for (let index=0; index<8; index++) {
                const angle=index*Math.PI/4;
                disc(g,x+8*Math.cos(angle),cy+8*Math.sin(angle),.75);
            }
        }
        g.fillStyle = '#68556a';
        archedWindow(g,x,cy+19,3.6,14);
        if (detail) {
            g.fillStyle = '#ebc78a';
            archedWindow(g,x,cy+21,2.3,9);
        }
    }

    function districtSky(width, height, scale, id) {
        const { sky, far, light } = DISTRICTS[id];
        return layer(width, height, scale, g => {
            const gradient = g.createLinearGradient(0, 0, 0, height);
            sky.forEach((color, index) => gradient.addColorStop(index / 3, color));
            g.fillStyle = gradient;
            g.fillRect(0, 0, width, height);
            const mist = g.createRadialGradient(width * .71, height * .53, 0, width * .71, height * .53, height * .44);
            mist.addColorStop(0, id === 'jungle' ? 'rgba(255,238,158,.38)' : 'rgba(255,209,207,.20)');
            mist.addColorStop(1, 'rgba(255,209,207,0)');
            g.fillStyle = mist;
            g.fillRect(0, 0, width, height);
            if (id === 'jungle') {
                g.fillStyle = far;
                g.beginPath(); g.moveTo(0, height * .70);
                g.bezierCurveTo(width * .24, height * .57, width * .47, height * .74, width * .69, height * .65);
                g.quadraticCurveTo(width * .89, height * .59, width, height * .62);
                g.lineTo(width, height); g.lineTo(0, height); g.fill();
                cloud(g, width * .68, height * .32, Math.min(1.35, width / 380), .30);
            } else if (id === 'magic') {
                g.fillStyle = light;
                for (const [x, y, r] of [[.12,.34,2],[.21,.25,1.6],[.51,.29,3.6],[.59,.35,1.5],[.78,.23,3],[.88,.40,1.6],[.27,.49,2]]) {
                    const px = width * x, py = height * y;
                    path(g, [px-r,py, px,py-r*1.5, px+r,py, px,py+r*1.5]); g.fill();
                }
            } else {
                g.globalAlpha = .19;
                cloud(g, width * .77, height * .49, Math.min(1.6, width / 230), .59);
                g.globalAlpha = 1;
            }
        });
    }

    function foliage(g, x, top, w, base, palette, detail) {
        const trunk = x + w*.57;
        g.fillStyle = palette.trim;
        path(g, [trunk-w*.11,base, trunk-w*.07,top, trunk+w*.06,top, trunk+w*.13,base]);
        g.fill();
        if (detail) {
            g.fillStyle = '#859e785e';
            path(g, [trunk-w*.095,base, trunk-w*.06,top, trunk-w*.03,top, trunk-w*.028,base]);
            g.fill();
            g.strokeStyle = palette.trim;
            g.lineWidth = Math.max(1.8, w*.063);
            g.beginPath();
            g.moveTo(trunk, top+w*.60);
            g.quadraticCurveTo(trunk-w*.17, top+w*.32, x+w*.16, top+w*.04);
            g.moveTo(trunk+w*.012, top+w*.4);
            g.quadraticCurveTo(trunk+w*.16, top+w*.14, x+w*.85, top-w*.06);
            g.stroke();
        }

        g.fillStyle = palette.city[0];
        g.beginPath();
        g.moveTo(x-w*.02, top+w*.08);
        g.bezierCurveTo(x-w*.13,top-w*.18, x+w*.05,top-w*.38, x+w*.22,top-w*.30);
        g.bezierCurveTo(x+w*.32,top-w*.55, x+w*.64,top-w*.64, x+w*.79,top-w*.30);
        g.bezierCurveTo(x+w*1.03,top-w*.31, x+w*1.14,top-w*.06, x+w*.99,top+w*.10);
        g.quadraticCurveTo(x+w*.87,top+w*.25, x+w*.66,top+w*.19);
        g.quadraticCurveTo(x+w*.45,top+w*.33, x+w*.24,top+w*.22);
        g.quadraticCurveTo(x+w*.03,top+w*.25, x-w*.02,top+w*.08);
        g.fill();

        g.fillStyle = palette.city[1];
        for (const [cx, cy, r] of [[.19,-.11,.22],[.43,-.24,.29],[.66,-.23,.25],[.87,-.09,.18]]) {
            disc(g,x+w*cx,top+w*cy,w*r);
        }
        if (!detail) return;
        g.fillStyle = palette.city[2];
        for (const [cx, cy, r] of [[.14,-.17,.12],[.28,-.19,.165],[.43,-.38,.19],[.64,-.34,.135],[.83,-.19,.12]]) {
            disc(g,x+w*cx,top+w*cy,w*r);
        }
        g.strokeStyle = palette.trim;
        g.lineWidth = detail > 1 ? 1.45 : .95;
        for (const [cx,growth] of [[.22,.66],[.83,.82]]) {
            const vine = x+w*cx;
            g.beginPath();
            g.moveTo(vine,top+w*.11);
            g.bezierCurveTo(vine-w*.10,top+w*.35, vine+w*.06,top+w*.49, vine-w*.10,top+w*growth);
            g.stroke();
        }
        if (detail > 1) {
            g.fillStyle = '#476c5269';
            g.beginPath();
            g.moveTo(x+w*.13, top+w*.055);
            g.quadraticCurveTo(x+w*.43, top+w*.13, x+w*.70, top+w*.015);
            g.quadraticCurveTo(x+w*.50, top+w*.20, x+w*.23, top+w*.13);
            g.closePath();
            g.fill();
            for (const [cx,cy] of [[.19,.44],[.78,.55],[.80,.35]]) {
                g.fillStyle = palette.light;
                path(g,[x+w*cx,top+w*cy, x+w*(cx+.065),top+w*(cy-.043),
                    x+w*(cx+.078),top+w*(cy-.016), x+w*(cx+.027),top+w*(cy+.021)]);
                g.fill();
            }
        }
    }

    function makeJungle(height, scale, near, detail) {
        const palette = DISTRICTS.jungle;
        const far = { ...palette, trim: palette.far, city: ['#51766b', '#648c76', '#87a27d'] };
        return layer(CITY_WIDTH, height, scale, g => {
            for (let i=0; i<DISTANT_ROOFS.length; i++) {
                const [x, w, proportion] = DISTANT_ROOFS[i];
                const treeWidth = near ? w + (i % 3 === 0 ? 18 : 3) : w + 7;
                const y = height * (1 - proportion * (near ? 1.03 : .86));
                foliage(g,x-4,y,treeWidth,height,near ? palette : far,near ? detail : 0);
            }
            if (!near || !detail) return;
            g.fillStyle = '#2e594b';
            for (const x of [18, 96, 186, 280, 372, 475, 574, 674]) {
                const y=height*.91;
                path(g,[x-16,height,x-9,y,x+2,y+7,x+8,y-11,x+13,y+4,x+19,y-4,x+29,height]);
                g.fill();
            }
        });
    }

    function neonLamp(g, x, y, radius, color) {
        const glow = g.createRadialGradient(x,y,0,x,y,radius);
        glow.addColorStop(0,color);
        glow.addColorStop(1,'transparent');
        g.fillStyle = glow;
        disc(g,x,y,radius);
    }

    function veniceRoofline(g, height, color) {
        g.fillStyle = color;
        for (const [x, w, proportion] of DISTANT_ROOFS) {
            const y = height * (.59 - proportion * .43);
            g.fillRect(x, y, w, height - y);
            path(g, [x-2,y+1, x+w*.5,y-7, x+w+2,y+1]); g.fill();
        }
        for (const [x, y, w] of [[61,.32,38], [327,.30,43], [548,.36,40]]) {
            const base = height * y;
            g.fillRect(x, base, w, height - base);
            g.beginPath();
            g.moveTo(x-3, base);
            g.quadraticCurveTo(x+w*.06, base-w*.62, x+w*.5, base-w*.67);
            g.quadraticCurveTo(x+w*.94, base-w*.62, x+w+3, base);
            g.fill();
            g.fillRect(x+w*.47, base-w*.80, w*.06, w*.17);
        }
        for (const [x, y] of [[122,.17], [431,.23], [647,.19]]) {
            const top = height * y;
            g.fillRect(x, top, 13, height - top);
            path(g, [x-3,top+1, x+6.5,top-15, x+16,top+1]); g.fill();
        }
    }

    function venicePalace(g, x, top, w, bank, index, palette, detail) {
        const face = palette.city[index % palette.city.length];
        g.fillStyle = detail ? horizontalShade(g, x, w, face, '#8f595b') : face;
        g.fillRect(x, top, w, bank - top);
        g.fillStyle = '#643d51';
        path(g, [x-3,top+1, x+3,top-6, x+w-6,top-6, x+w+3,top+1]); g.fill();
        g.fillStyle = '#deb187';
        g.fillRect(x-1, top+1, w+2, 2);
        if (index % 3 === 1) {
            g.fillStyle = '#774b55';
            g.fillRect(x+w*.72, top-14, 6, 8);
        }
        for (let y = top + 11, row = 0; y < bank - 9; y += 24, row++) {
            for (let wx = x+9, col = 0; wx <= x+w-7; wx += 13, col++) {
                g.fillStyle = '#d3a88a';
                archedWindow(g, wx, y, 3.7, 12);
                g.fillStyle = (index + col + 2*row) % 4 === 0 ? '#efba7e' : '#694b59';
                archedWindow(g, wx, y+1.5, 2.4, 9);
                if (detail > 1 && row === 0) {
                    g.fillStyle = '#714554';
                    g.fillRect(wx-.45, y+4, .9, 6);
                }
            }
            if (detail && row % 2 === 0) {
                g.fillStyle = '#ebba9788';
                g.fillRect(x+2, y+14, w-4, 1.3);
            }
        }
        g.fillStyle = '#977176';
        g.fillRect(x, bank-3, w, 3);
    }

    function carnivalFlags(g, x, y, span) {
        g.strokeStyle = '#71505b';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x,y);
        g.quadraticCurveTo(x+span*.5,y+18,x+span,y+2);
        g.stroke();
        for (let index=0; index<7; index++) {
            const t = (index+.6)/7, flagX=x+span*t, flagY=y+36*t*(1-t)+2*t*t;
            g.fillStyle = VENICE_FLAGS[index % VENICE_FLAGS.length];
            path(g, [flagX-3,flagY, flagX+4,flagY+.8, flagX,flagY+6]); g.fill();
        }
    }

    function carnivalMask(g, x, y, detail) {
        g.fillStyle = '#724d5e';
        disc(g, x, y, 13);
        g.fillStyle = '#eabb78';
        g.beginPath();
        g.moveTo(x-11,y-4);
        g.quadraticCurveTo(x-7,y-8,x,y-3);
        g.quadraticCurveTo(x+7,y-8,x+11,y-4);
        g.quadraticCurveTo(x+9,y+7,x,y+2);
        g.quadraticCurveTo(x-9,y+7,x-11,y-4);
        g.fill();
        g.fillStyle = '#724d5e';
        g.beginPath();
        g.ellipse(x-5,y-1,2.6,1.2,.28,0,Math.PI*2);
        g.ellipse(x+5,y-1,2.6,1.2,-.28,0,Math.PI*2);
        g.fill();
        if (detail) {
            g.fillStyle = '#f9d49a';
            disc(g,x,y-2,1.2);
        }
    }

    function veniceBridge(g, x, water, w, detail) {
        const crest = water - 24, foot = water + 9;
        g.fillStyle = '#9c747b';
        g.beginPath();
        g.moveTo(x, foot); g.lineTo(x, water-4);
        g.quadraticCurveTo(x+w*.5, crest-27, x+w, water-4);
        g.lineTo(x+w, foot); g.lineTo(x+w*.83, foot);
        g.quadraticCurveTo(x+w*.5, crest-3, x+w*.17, foot);
        g.closePath(); g.fill();
        g.strokeStyle = '#d2a78d';
        g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x,water-6);
        g.quadraticCurveTo(x+w*.5,crest-29,x+w,water-6);
        g.stroke();
        if (detail) {
            g.strokeStyle = '#b28b83';
            g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(x+w*.17,foot);
            g.quadraticCurveTo(x+w*.5,crest-3,x+w*.83,foot); g.stroke();
        }
    }

    function veniceCanal(g, y, height, detail) {
        const water = g.createLinearGradient(0,y,0,height);
        water.addColorStop(0, '#86747c');
        water.addColorStop(.29, '#646771');
        water.addColorStop(1, '#485263');
        g.fillStyle = water; g.fillRect(0,y,CITY_WIDTH,height-y);
        g.fillStyle = '#e2b28c78'; g.fillRect(0,y,CITY_WIDTH,1);
        if (detail) {
            for (let index=0; index<46; index++) {
                const x = 5 + (index*73)%688, offset = 4 + (index*19)%91;
                g.fillStyle = offset < 26 ? '#edba9470' : '#d9a99638';
                g.fillRect(x,y+offset,11+(index*9)%22,offset < 40 ? 1.1 : .75);
            }
        }
        for (const [x, depth] of [[277,25], [606,40]]) {
            const base = y + depth;
            g.fillStyle = '#473d55';
            path(g, [x-30,base-7,x-22,base-3,x+21,base-3,x+27,base-8,x+33,base-10,x+31,base-2,x+21,base+2,x-20,base+2]);
            g.fill();
            g.fillStyle = '#cf93915d';
            g.fillRect(x-18,base+4,41,1);
        }
    }

    function makeVenice(height, scale, near, detail) {
        const palette = DISTRICTS.music;
        return layer(CITY_WIDTH, height, scale, g => {
            if (!near) {
                veniceRoofline(g, height, palette.far);
                return;
            }
            const bank = height * .565;
            VENICE_PALACES.forEach(([x,w,top],index) => venicePalace(g,x,height*top,w,bank,index,palette,detail));
            carnivalMask(g, 247, height*.26+43, detail);
            carnivalMask(g, 556, height*.29+43, detail);
            if (detail) {
                carnivalFlags(g, 158, height*.34+15, 143);
                carnivalFlags(g, 500, height*.35+12, 130);
            }
            veniceCanal(g, bank, height, detail);
            veniceBridge(g, 95, bank, 110, detail);
            veniceBridge(g, 452, bank, 86, detail);
        });
    }

    function stoneTower(g, x, y, w, bottom, palette, detail, spire) {
        g.fillStyle = detail ? horizontalShade(g,x,w,palette.city[1],palette.city[0]) : palette.city[0];
        g.fillRect(x,y,w,bottom-y);
        const peak = y - w*(spire ? .92 : .49);
        g.fillStyle = '#262845';
        path(g,[x-3,y+1, x+w*.17,y-w*.21, x+w*.46,peak, x+w*.81,y-w*.17, x+w+3,y+1]);g.fill();
        g.fillStyle='#7480a1';
        path(g,[x+w*.17,y-w*.21,x+w*.46,peak,x+w*.41,y+1,x-3,y+1]);g.fill();
        g.fillStyle=palette.trim;g.fillRect(x-3,y,w+6,1.7);
        if (spire) { g.fillStyle=palette.light;disc(g,x+w*.46,peak-1,1.55); }
        for (let wy=y+12,row=0;wy<bottom-6;wy+=24,row++) {
            const cx=x+w*.47;
            if (detail > 1 && row < 2) neonLamp(g,cx,wy+6,13,'#ffcf8b34');
            g.fillStyle=palette.light;
            archedWindow(g,cx,wy,3.8,10.4);
            if (detail) { g.fillStyle='#9c7779';g.fillRect(cx-.58,wy+2,1.15,8); }
            if (detail>1) { g.fillStyle='#9e86ae45';g.fillRect(x+2,wy+16,w-3,1); }
        }
    }

    function alchemyFlask(g, x, y, size, color) {
        g.fillStyle = color;
        path(g, [x-size*.21,y-size, x+size*.21,y-size,
            x+size*.21,y-size*.40, x+size*.78,y+size*.65,
            x+size*.62,y+size*.87, x-size*.62,y+size*.87,
            x-size*.78,y+size*.65, x-size*.21,y-size*.40]);
        g.fill();
    }

    function alchemistCastle(g, x, height, palette, detail, position) {
        const top = height*position, w=88;
        g.fillStyle = detail ? horizontalShade(g,x,w,'#5d4b70','#463857') : '#443650';
        g.fillRect(x,top,w,height-top);
        g.fillStyle='#302841';g.fillRect(x-3,top-5,w+6,6);
        for(let i=0;i<8;i++)g.fillRect(x+2+i*11,top-9,5.5,5);
        stoneTower(g,x-18,top-9,21,height,palette,detail,true);
        stoneTower(g,x+w-4,top-5,24,height,palette,detail,true);
        stoneTower(g,x+w*.36,top-20,23,height,palette,detail,true);
        const labX = x+w*.5, labY = top+37;
        if (detail > 1) neonLamp(g,labX,labY+17,32,'#ffb07650');
        if (detail) {
            g.fillStyle = '#302841a8';
            archedWindow(g,labX,labY-2,15.5,38);
        }
        g.fillStyle='#a582a0';
        archedWindow(g,labX,labY,13.5,34);
        if (detail) {
            const amber = g.createLinearGradient(0,labY+3,0,labY+29);
            amber.addColorStop(0,'#d9957d');
            amber.addColorStop(.55,'#ffdd9a');
            amber.addColorStop(1,'#ffc07c');
            g.fillStyle = amber;
        } else g.fillStyle = palette.light;
        archedWindow(g,labX,labY+4,10.5,25);
        alchemyFlask(g, labX-4.2, labY+23, 4.9, '#765068');
        alchemyFlask(g, labX+5.2, labY+24, 3.6, '#557b7a');
        g.fillStyle = '#866278';
        g.fillRect(labX-10.5,labY+28,21,1.5);
        if (detail) {
            const signX = x+18, signY = top+26;
            g.fillStyle = '#aa837c';
            g.fillRect(signX-8,signY-10,10,1.2);
            g.fillRect(signX-.5,signY-10,1,5);
            g.fillStyle = '#47364d';
            disc(g,signX,signY,7);
            alchemyFlask(g,signX,signY,4.2,'#d8a677');
        }
    }

    function districtBuildings(height, scale, id, near, detail) {
        if (id === 'jungle') return makeJungle(height,scale,near,detail);
        if (id === 'music') return makeVenice(height,scale,near,detail);
        const palette = DISTRICTS.magic;
        return layer(CITY_WIDTH, height, scale, g => {
            for (let i=0; i<DISTANT_ROOFS.length; i++) {
                const [x,w,proportion] = DISTANT_ROOFS[i];
                const top = height * (1 - proportion * (near ? 1.14 : .94));
                if (!near) {
                    g.fillStyle = palette.far;
                    g.fillRect(x,top,w,height-top);
                    path(g,[x-2,top+1,x+w*.38,top-w*.35,x+w+2,top+1]);g.fill();
                } else {
                    if ((x<143 || x>271) && (x<448 || x>567)) stoneTower(g,x,top,w,height,palette,detail,i%3===0);
                }
            }
            if (!near) return;
            alchemistCastle(g,165,height,palette,detail,.41);
            alchemistCastle(g,470,height,palette,detail,.54);
        });
    }

    function getScenery(width, height, scale, id) {
        const quality = document.documentElement?.dataset?.gfxQuality;
        const detail = quality === 'low' ? 0 : quality === 'high' ? 2 : 1;
        if (scenery?.width === width && scenery.height === height && scenery.scale === scale
            && scenery.id === id && scenery.detail === detail) return scenery;
        const [nearRatio, farRatio] = SKYLINE_HEIGHT[id];
        const near = height * nearRatio;
        const far = height * farRatio;
        if (id === 'dawn') {
            const radius = Math.min(width * .086, height * .085);
            scenery = {
                width, height, scale, id, near, far, radius, detail,
                sun: makeSun(radius, scale), sky: makeSky(width, height, scale, detail),
                distant: makeDistantCity(far, scale, detail), foreground: makeNearCity(near, scale, detail)
            };
        } else {
            scenery = {
                width, height, scale, id, near, far, detail,
                sky: districtSky(width, height, scale, id),
                distant: districtBuildings(far, scale, id, false, detail),
                foreground: districtBuildings(near, scale, id, true, detail)
            };
        }
        return scenery;
    }

    function blitCity(ctx, canvas, width, height, layerHeight, offset) {
        const start = (offset % CITY_WIDTH + CITY_WIDTH) % CITY_WIDTH;
        for (let x = -start; x < width; x += CITY_WIDTH) {
            ctx.drawImage(canvas, x, height - layerHeight, CITY_WIDTH, layerHeight);
        }
    }

    function drawSky(ctx, width, height, scale, id, progress, dt) {
        if (width <= 0 || height <= 0) return;
        const buffers = getScenery(width, height, scale, id);
        ctx.drawImage(buffers.sky, 0, 0, width, height);
        if (id !== 'dawn') return;
        const target = progress?.total > 0 ? Math.min(1, progress.passed / progress.total) : 0;
        if (sunProgress === null || reducedMotion.matches || Math.abs(target - sunProgress) < .002) sunProgress = target;
        else sunProgress += (target - sunProgress) * Math.min(1, .14 * dt);
        const reach = buffers.radius * 3;
        const sunY = height * (.335 - .165 * sunProgress);
        ctx.drawImage(buffers.sun, width * .73 - reach, sunY - reach, reach * 2, reach * 2);
    }

    function drawLand(ctx, width, height, offset, scale, id) {
        if (width <= 0 || height <= 0) return;
        const buffers = getScenery(width, height, scale, id);
        blitCity(ctx, buffers.distant, width, height, buffers.far, offset * .11);
        blitCity(ctx, buffers.foreground, width, height, buffers.near, offset * .24);
    }

    const CELEBRATION = {
        dawn: ['#ffd078', '#fff5bc'],
        music: ['#ef8fca', '#9be6f1'],
        magic: ['#d3b6ff', '#ffe0a5'],
        jungle: ['#efd08c', '#dcf2a3']
    };
    const BURST_POSITIONS = [[.22,.31], [.63,.26], [.83,.42]];
    const PARTICLES = Array.from({ length: 12 }, (_, i) => {
        const angle = i * Math.PI / 6;
        return [Math.cos(angle), Math.sin(angle), 1 - (i % 3) * .15];
    });

    function celebrate(id) {
        if (!Object.hasOwn(CELEBRATION, id)) return false;
        celebration = { id, start: performance.now() };
        return true;
    }

    function flyBirds(ctx, width, height, age, reduced) {
        const t = Math.min(1, age / 1450);
        const span = Math.min(width * .015, 7);
        ctx.strokeStyle = '#315367';
        ctx.lineWidth = Math.max(1, span * .23);
        ctx.lineCap = 'round';
        ctx.globalAlpha = reduced ? .75 : .88 * Math.min(1, (1 - t) * 3.4);
        for (let i = 0; i < 5; i++) {
            const wave = reduced ? 0 : Math.sin(t * 16 + i * .85) * span * .35;
            const x = width * (.33 + i * .073 + (reduced ? 0 : t * .19));
            const y = height * (.38 - i * .021 - (reduced ? 0 : t * .066)) + wave * .6;
            ctx.beginPath();
            ctx.moveTo(x - span, y - span * .35 + wave);
            ctx.quadraticCurveTo(x - span * .45, y - span * .80, x, y);
            ctx.quadraticCurveTo(x + span * .42, y - span * .78, x + span, y - span * .38 - wave);
            ctx.stroke();
        }
    }

    function drawCelebration(ctx, width, height, id) {
        if (celebration?.id !== id) return;
        const age = performance.now() - celebration.start;
        if (age >= 1450) { celebration = null; return; }
        const [accent, shine] = CELEBRATION[id];
        const reduced = reducedMotion.matches;
        ctx.save();
        if (id === 'dawn') flyBirds(ctx, width, height, age, reduced);
        for (let index = 0; index < BURST_POSITIONS.length; index++) {
            const [rx, ry] = BURST_POSITIONS[index];
            const x = width * rx, y = height * ry;
            const p = (age - (reduced ? 0 : index * 100)) / 1150;
            if (p < 0 || p >= 1) continue;
            ctx.globalAlpha = reduced ? .80 : Math.min(1, (1 - p) * 1.65);
            const radius = Math.min(width, 420) * (reduced ? .07 : .03 + .13 * (1 - (1-p) ** 2));
            const spread = id === 'music' ? .56 : 1;
            for (let k = 0; k < PARTICLES.length; k++) {
                const [dx,dy,step] = PARTICLES[k];
                const px = x + dx * radius * step, py = y + dy * radius * step * spread;
                const size = k % 3 === 0 ? 2.7 : 1.5;
                ctx.fillStyle = k % 2 ? accent : shine;
                if (id === 'dawn' || id === 'magic') {
                    path(ctx, [px-size,py, px,py-size*1.5, px+size,py, px,py+size*1.5]); ctx.fill();
                } else if (id === 'music') ctx.fillRect(px - 1, py - size, 2, size * 2);
                else disc(ctx, px, py, size);
            }
        }
        ctx.restore();
    }

    function metal(g, from, to, colors) {
        const gradient = g.createLinearGradient(from, 0, to, 0);
        const positions = [0, .10, .47, .74, .90, 1];
        positions.forEach((stop, index) => gradient.addColorStop(stop, colors[index]));
        return gradient;
    }

    function capOutline(g, width, inset) {
        g.beginPath();
        const w = width - inset * 2, h = CAP_HEIGHT - inset * 2;
        if (g.roundRect) g.roundRect(inset, inset, w, h, 6 - inset);
        else g.rect(inset, inset, w, h);
    }

    function getPipeArt(ctx, width, scale) {
        const key = width + '|' + scale;
        if (pipeArt.has(key)) return pipeArt.get(key);
        const capWidth = width + CAP_OVERHANG * 2;
        const stem = metal(ctx, 0, width, ['#163c51', '#246173', '#367f8c', '#72afa9', '#408895', '#1b4a61']);
        const cap = layer(capWidth, CAP_HEIGHT, scale, g => {
            g.fillStyle = metal(g, 0, capWidth, ['#62452f', '#a8794b', '#c49258', '#f3c481', '#cb934e', '#70412c']);
            capOutline(g, capWidth, .5);
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
        const fireRim = layer(capWidth, CAP_HEIGHT, scale, g => {
            const heat = g.createLinearGradient(0, 0, 0, CAP_HEIGHT);
            heat.addColorStop(0, '#ffd09d');
            heat.addColorStop(.30, '#ee7049');
            heat.addColorStop(1, '#ad312e');
            capOutline(g, capWidth, 1.2);
            g.strokeStyle = heat;
            g.lineWidth = 1.8;
            g.stroke();
        });
        const art = { stem, cap, capWidth, fireRim };
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

    function drawPipe(ctx, pipe, height, squeeze, zoom, scale, fireGlow = 0) {
        const top = pipe.top + squeeze, bottom = height - pipe.bottom - squeeze;
        const topStem = Math.max(0, top - CAP_HEIGHT + 2), bottomStem = bottom + CAP_HEIGHT - 2;
        const overdraw = zoom < .999 ? Math.ceil(height * (1 - zoom) * .6) + 4 : 0;
        const { stem, cap, capWidth, fireRim } = getPipeArt(ctx, pipe.width, scale);
        ctx.save();
        ctx.translate(pipe.x, 0);
        ctx.fillStyle = stem;
        drawStem(ctx, pipe.width, -overdraw, topStem, topStem - STEM_RIB_STEP, true);
        ctx.fillStyle = stem;
        drawStem(ctx, pipe.width, bottomStem, height + overdraw, bottomStem + STEM_RIB_STEP, false);
        ctx.drawImage(cap, -CAP_OVERHANG, top - CAP_HEIGHT, capWidth, CAP_HEIGHT);
        ctx.drawImage(cap, -CAP_OVERHANG, bottom, capWidth, CAP_HEIGHT);
        if (fireGlow > 0) {
            ctx.globalAlpha *= Math.min(fireGlow, 1);
            ctx.drawImage(fireRim, -CAP_OVERHANG, top - CAP_HEIGHT, capWidth, CAP_HEIGHT);
            ctx.drawImage(fireRim, -CAP_OVERHANG, bottom, capWidth, CAP_HEIGHT);
        }
        ctx.restore();
    }

    window.BuboCampaignDayArt = {
        drawSky, drawLand, drawPipe, celebrate, drawCelebration,
        supports: id => id === 'dawn' || Object.hasOwn(DISTRICTS, id),
        reset() { sunProgress = null; celebration = null; }
    };
})();
