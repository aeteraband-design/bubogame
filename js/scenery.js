// ===== Ночной город на горизонте: еле заметный, тёплые окна, бесконечная бесшовная лента в два слоя =====
let cityOffset = 0;
let citySprites = null, citySpritesKey = '';
function cityRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Строит слой города: силуэты домов рисуются один раз в картинку, а окна живут отдельно (загораются и гаснут)
function cityShade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function buildCityLayer(tileW, H, opt, S, seed) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(tileW * S); c.height = Math.ceil(H * S);
    const g = c.getContext('2d');
    g.scale(S, S);
    const r = cityRng(seed);
    // Раскладка домов по ленте: ни один дом не пересекает стык ленты и не накладывается на соседа,
    // между домами всегда просвет (иначе «живые» окна просвечивали бы сквозь чужой дом)
    const bodies = [];
    let sumW = 0;
    const maxHf = Math.min(opt.maxH, (H - 26) / H);   // высота домов с запасом под шпиль сверху (без «срезания» до одной высоты)
    while (true) {
        const w = opt.minW + r() * (opt.maxW - opt.minW);
        const h = H * (opt.minH + Math.pow(r(), 1.3) * (maxHf - opt.minH));   // запас сверху (26) — шпиль и надстройки не обрезаются краем слоя
        if (sumW + w + (bodies.length + 2) * opt.gapMin > tileW) break;
        bodies.push({ x: 0, w, h, style: r(), seed: Math.floor(r() * 1e9) });
        sumW += w;
    }
    {   // Высоты домов по ленте: все разные и равномерно разбросаны от низких к высоким, а соседние (в том числе на стыке ленты)
        // всегда сильно отличаются — дом сзади не «теряется». Порядок задаёт перестановка с шагом ≈ 0,38 числа домов.
        const n = bodies.length, lo = H * opt.minH, hi = H * maxHf;
        const gcd = (x, y) => y ? gcd(y, x % y) : x;
        let m = Math.max(2, Math.round(n * 0.38));
        while (n > 2 && gcd(m, n) !== 1) m++;
        for (let i = 0; i < n; i++) {
            const t = n > 1 ? ((i * m) % n) / (n - 1) : 0.5;
            const jit = (r() - 0.5) * 0.4 / Math.max(1, n - 1);
            bodies[i].h = lo + (hi - lo) * Math.max(0, Math.min(1, t + jit));
        }
    }
    {
        const n = bodies.length;
        const free = tileW - sumW - n * opt.gapMin;          // свободное место сверх минимальных просветов
        const rnd = bodies.map(() => 0.4 + r());
        const rs = rnd.reduce((a, v) => a + v, 0);
        let x = 0;
        bodies.forEach((b, i) => { b.x = x; x += b.w + opt.gapMin + free * rnd[i] / rs; });
    }

    const windows = [];
    const beacons = [];
    const drawBody = (b, ox, collect, prev) => {
        const bx = b.x + ox, by = H - b.h;
        const grd = g.createLinearGradient(0, by, 0, H);
        // каждый дом чуть своего оттенка, чтобы соседние не сливались
        const k = 0.93 + (b.seed % 1000) / 1000 * 0.14;
        grd.addColorStop(0, cityShade(opt.top, k)); grd.addColorStop(1, cityShade(opt.bottom, k));
        g.fillStyle = grd;
        g.fillRect(bx, by, b.w, b.h);
        // ===== крыша: надстройки и шпили в том же стиле, что и дом (тот же цвет, тонкие грани) =====
        const topCol = cityShade(opt.top, k);
        const box = (x, y, w, h) => {
            g.fillStyle = topCol; g.fillRect(x, y, w, h);
            const ed = Math.max(1.5, w * 0.07);
            g.fillStyle = 'rgba(6, 1, 18, 0.20)'; g.fillRect(x, y, ed, h);                 // слева темнее
            g.fillStyle = 'rgba(200, 175, 255, 0.07)'; g.fillRect(x + w - ed, y, ed, h);   // справа светлее
            g.fillStyle = 'rgba(200, 175, 255, 0.07)'; g.fillRect(x, y, w, 1.4);           // верхняя кромка
        };
        const tall = b.h > H * 0.6;
        const maxBodyH = bodies.reduce((a2, q) => Math.max(a2, q.h), 0);
        const isTallest = b.h >= maxBodyH - 0.5;       // самый высокий дом ленты
        const rr = b.style;
        const spire = (cx, hgt) => {
            const sw = Math.max(9, b.w * 0.24);                                   // широкое основание
            box(cx - sw / 2, by - 6, sw, 6);
            g.fillStyle = topCol; g.fillRect(cx - 1, by - 6 - hgt, 2, hgt);        // невысокий шпиль
            g.fillStyle = 'rgba(200, 175, 255, 0.10)'; g.fillRect(cx + 0.3, by - 6 - hgt, 0.7, hgt);
            beacons.push({ x: cx, y: by - 6 - hgt, ph: (b.seed % 628) / 100 });   // красная лампа мигает отдельно и сидит ровно на верхушке шпиля
        };
        // Шпиль с красной лампой: чаще всего на самых высоких домах (особенно на дальнем плане), на низких — изредка.
        // Остальные крыши простые: не больше двух ярусов, широкие невысокие надстройки, редкая невысокая антенна
        const rr2 = cityRng((b.seed ^ 0x5bd1e995) >>> 0);
        const topHs = bodies.map(q => q.h).sort((a2, c2) => c2 - a2), tallThr = topHs[Math.min(4, topHs.length - 1)];
        const skyscraper = opt.far && b.h >= tallThr;   // лампа мигает только на пяти самых высоких небоскрёбах дальнего плана на ленту
        if (skyscraper) {
            spire(bx + b.w * (0.3 + rr2() * 0.4), 8 + rr2() * 6);
        } else {
            const kind = rr2();
            const nBlocks = opt.far ? 0 : (kind < 0.5 ? 0 : 1);   // у дальних домов надстроек нет (их верх прикрывают ближние дома и торчат «обрезки»); у ближних — не больше одной
            let cx0 = bx + b.w * (0.08 + rr2() * 0.2);
            const limit = bx + b.w - Math.max(4, b.w * 0.08);
            for (let i = 0; i < nBlocks; i++) {
                const bw = b.w * (0.34 + rr2() * 0.34);                // не узкие, ширина разная
                if (cx0 + bw > limit) break;
                const bh = 4 + rr2() * (tall ? 8 : 6);                 // пониже
                box(cx0, by - bh, bw, bh);
                let topY = by - bh;
                if (rr2() < 0.35) {   // второй ярус (всего на крыше не больше двух ярусов) — иногда, низкий и широкий
                    const tw = bw * (0.6 + rr2() * 0.25), th = 3 + rr2() * 3;
                    box(cx0 + (bw - tw) * rr2(), topY - th, tw, th);
                    topY -= th;
                }
                if (false) {                                        // отдельные антенны убраны
                    const ax = cx0 + bw * (0.25 + rr2() * 0.5), al = 4 + rr2() * 5;
                    g.fillStyle = topCol; g.fillRect(ax - 0.7, topY - al, 1.4, al);
                }
                cx0 += bw + b.w * (0.06 + rr2() * 0.1);
            }
        }
        // ===== детали и объём (очень мягко, в тон дому) =====
        // боковые грани: слева чуть темнее, справа чуть светлее (луна справа)
        // тонкие боковые грани (дом остаётся квадратным): слева чуть темнее, справа чуть светлее
        const edge = Math.max(3, b.w * 0.045);
        g.fillStyle = 'rgba(6, 1, 18, 0.20)'; g.fillRect(bx, by, 2, H - by);   // слева тень всего в пару пикселей
        g.fillStyle = 'rgba(200, 175, 255, 0.07)'; g.fillRect(bx + b.w - edge, by, edge, H - by);
        // карниз: светлая полоска сверху и тень под ней
        g.fillStyle = 'rgba(200, 175, 255, 0.07)'; g.fillRect(bx, by, b.w, 2);
        g.fillStyle = 'rgba(6, 1, 18, 0.16)'; g.fillRect(bx, by + 2, b.w, 2.5);
        // цоколь внизу
        const pg = g.createLinearGradient(0, H - 14, 0, H);
        pg.addColorStop(0, 'rgba(6, 1, 18, 0)'); pg.addColorStop(1, 'rgba(6, 1, 18, 0.28)');
        g.fillStyle = pg; g.fillRect(bx, H - 14, b.w, 14);
        // окна ровной сеткой по центру фасада
        const margin = Math.max(6, b.w * 0.08);
        const cols = Math.max(1, Math.floor((b.w - 2 * margin - opt.winW) / opt.stepX) + 1);
        const gridW = (cols - 1) * opt.stepX + opt.winW;
        const startX = bx + (b.w - gridW) / 2;
        const wr = cityRng(b.seed);
        for (let wy = by + margin + 2; wy < H - 6; wy += opt.stepY) {
            for (let ci = 0; ci < cols; ci++) {
                const wx = startX + ci * opt.stepX;
                const v = wr();
                if (v < opt.lit) {
                    // «живое» окно: свет загорается и гаснет; бывает яркий и тусклый
                    if (collect) windows.push({
                        x: wx, y: wy, w: opt.winW, h: opt.winH,
                        rgb: `rgb(255,${175 + Math.floor(wr() * 45)},${95 + Math.floor(wr() * 50)})`,
                        maxA: opt.litA * (wr() < 0.35 ? 0.4 + 0.15 * wr() : 0.75 + 0.25 * wr()),
                        on: wr() < 0.68, a: 0
                    });
                } else if (v < opt.lit + 0.22) {
                    g.fillStyle = 'rgba(168, 120, 255, 0.07)';
                    g.fillRect(wx, wy, opt.winW, opt.winH);
                }
            }
        }
    };
    for (let bi = 0; bi < bodies.length; bi++) {
        const b = bodies[bi], prev = bodies[bi - 1];
        drawBody(b, 0, true, prev);
        if (b.x + b.w > tileW) drawBody(b, -tileW, false, bodies[bi - 1]);
    }
    // окна домов, переехавших через край, переносим в начало ленты
    const wrapped = windows.filter(w => w.x + w.w > tileW).map(w => ({ ...w, x: w.x - tileW, twin: w }));
    for (const w of windows) w.a = w.on ? w.maxA : 0;
    return { canvas: c, windows, wrapped, beacons, bodies };
}

// ===== Фейерверки над городом: изредка, пара залпов разного цвета =====
let fireworks = [], fwTimer = 600 + Math.random() * 600;
function fwMix(hex, t) {   // смешивает цвет с белым (t = 0..1)
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255;
    const m = (c) => Math.round(c + (255 - c) * t);
    return `rgb(${m(r)},${m(g2)},${m(b)})`;
}
function launchFireworkShow(levelColor, count) {
    // count — сколько фейерверков: Лайт — 2, Медиум — 3 … Хард+ — 6
    const base = levelColor || '#FFD166';
    const palette = [[fwMix(base, 0), fwMix(base, 0.1)], [fwMix(base, 0.03), fwMix(base, 0.12)], [fwMix(base, 0.02), fwMix(base, 0.08)]];   // цвет уровня, почти без белого
    const n = Math.max(1, count || 3);
    for (let i = 0; i < n; i++) {
        const p = palette[i % palette.length];
        const slot = (i + 0.5) / n;   // равномерно по ширине экрана, чтобы залпы не слипались
        fireworks.push({
            stage: 'rocket', delay: i * (12 + Math.random() * 12),
            x: width * (0.1 + 0.8 * slot) + (Math.random() - 0.5) * 24, y: height * 0.98, px: 0, py: 0,
            targetY: height * (0.40 + Math.random() * 0.12),   // салют раскрывается невысоко, прямо над крышами
            vy: -(4.6 + Math.random() * 1.2),
            color: p[0], light: p[1], flash: 0,
            sparks: []
        });
    }
}
// Готовые звёздочки (4 луча + светлая сердцевина), по 3 поворота на цвет: одна drawImage вместо двух сложных контуров на каждую искру
const fwSpriteCache = {};
function fwSprite(col) {
    if (fwSpriteCache[col]) return fwSpriteCache[col];
    const arr = [];
    for (let v = 0; v < 3; v++) {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d'); g.translate(16, 16); g.rotate(v * Math.PI / 6);
        const star = (ss) => { g.beginPath(); g.moveTo(0, -ss); g.quadraticCurveTo(0, 0, ss, 0); g.quadraticCurveTo(0, 0, 0, ss); g.quadraticCurveTo(0, 0, -ss, 0); g.quadraticCurveTo(0, 0, 0, -ss); g.fill(); };
        g.fillStyle = col; star(15);
        g.fillStyle = 'rgba(255,255,255,0.2)'; star(5.5);   // лёгкая светлая точка в центре
        arr.push(c);
    }
    return (fwSpriteCache[col] = arr);
}
// Мягкая вспышка взрыва: картинка с плавным градиентом, рисуется один раз на цвет — гладко и без нагрузки
const fwFlashCache = {};
function fwFlashSprite(col) {
    if (fwFlashCache[col]) return fwFlashCache[col];
    const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'destination-in';                       // плавная маска: яркий центр, мягкое затухание к краю
    const m = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.28, 'rgba(0,0,0,0.6)'); m.addColorStop(0.62, 'rgba(0,0,0,0.18)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';                          // светлая сердцевина
    const w = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.22);
    w.addColorStop(0, 'rgba(255,255,255,0.95)'); w.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = w; g.fillRect(0, 0, S, S);
    return (fwFlashCache[col] = c);
}
function updateDrawFireworks() {
    if (!fireworks.length) return;
    ctx.save();
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i];
        f.x -= 0.25 * dtMult;   // медленно уплывают вместе с городом
        if (f.delay > 0) { f.delay -= dtMult; continue; }
        if (f.stage === 'rocket') {
            const oy = f.y;
            f.y += f.vy * dtMult;
            // светящийся хвост ракеты
            ctx.strokeStyle = 'rgba(255, 236, 200, 0.7)'; ctx.lineWidth = 1.4; ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, oy + 14); ctx.stroke();
            if (f.y <= f.targetY) {
                f.stage = 'burst'; f.flash = 1;
                f.glit = [];
                // три круга искр с разной скоростью + случайные искры — получается полный шар, а не кольцо
                const rings = [[22, 2.9, f.color], [14, 1.9, f.light], [8, 1.0, f.color], [10, -1, f.light]];
                rings.forEach(([cnt, spd, col]) => {
                    for (let k = 0; k < cnt; k++) {
                        const a = (k / cnt) * Math.PI * 2 + Math.random() * 0.25;
                        const sp = spd > 0 ? spd * (0.8 + Math.random() * 0.4) : 0.35 + Math.random() * 2.5;
                        f.sparks.push({ x: f.x, y: f.y, px: f.x, py: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col, tw: Math.random() * 6, vi: Math.floor(Math.random() * 3),
                                        r0: Math.random() * Math.PI, rs: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.09), dec: 0.0085 + Math.random() * 0.006 });
                    }
                });
            }
        } else {
            let alive = false;
            // вспышка в момент взрыва
            if (f.flash > 0) {
                const fr2 = 34 + 46 * (1 - f.flash);                         // вспышка расплывается и тает
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = Math.min(1, f.flash * 0.9);
                ctx.drawImage(fwFlashSprite(f.light), f.x - fr2, f.targetY - fr2, fr2 * 2, fr2 * 2);
                ctx.globalCompositeOperation = 'source-over';
                f.flash -= 0.08 * dtMult;
            }
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'lighter';   // искры складываются в яркое свечение

            for (const s of f.sparks) {
                if (s.life <= 0) continue;
                alive = true;
                const dr = Math.pow(0.974, dtMult);
                s.vx *= dr; s.vy = s.vy * dr + 0.004 * dtMult;   // искры летят в стороны, почти не падая
                s.x += s.vx * dtMult - 0.25 * dtMult; s.y += s.vy * dtMult;
                s.life -= s.dec * dtMult;
                const L = Math.max(0, s.life);
                // искорки разлетаются от каждой искры в разные стороны
                if (L > 0.2 && Math.random() < 0.1 * dtMult && f.glit.length < 36) {
                    const a = Math.random() * Math.PI * 2, sp = 0.3 + Math.random() * 1.1;
                    f.glit.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp + s.vx * 0.2, vy: Math.sin(a) * sp + s.vy * 0.2, life: 1, col: s.col, r0: Math.random() * 3 });
                }
                // переливание: цвет искры плавно перетекает к белому и обратно; к концу — мерцание
                const sh = 0.5 + 0.5 * Math.sin(frame * 0.18 + s.tw);
                const twinkle = L < 0.4 ? (0.35 + 0.65 * Math.abs(Math.sin(frame * 0.5 + s.tw))) : (0.8 + 0.2 * sh);
                const ss = 1.7 + 2.4 * L;
                const sp3 = fwSprite(s.col);
                ctx.globalAlpha = Math.min(1, L * 1.25) * twinkle;
                ctx.drawImage(sp3[s.vi | 0], s.x - ss, s.y - ss, ss * 2, ss * 2);
            }
            // мелкие искорки-«блёстки»
            for (let gi = f.glit.length - 1; gi >= 0; gi--) {
                const g = f.glit[gi];
                g.life -= 0.035 * dtMult;
                if (g.life <= 0) { f.glit.splice(gi, 1); continue; }
                alive = true;
                g.vx *= Math.pow(0.95, dtMult); g.vy *= Math.pow(0.95, dtMult);
                g.x += g.vx * dtMult - 0.25 * dtMult; g.y += g.vy * dtMult;
                const gs = 1.1 + 1.1 * g.life;
                ctx.globalAlpha = g.life * (0.5 + 0.5 * Math.abs(Math.sin(frame * 0.7 + g.r0)));
                ctx.drawImage(fwSprite(g.col)[(g.r0 * 3 | 0) % 3], g.x - gs, g.y - gs, gs * 2, gs * 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            if (!alive) fireworks.splice(i, 1);
        }
    }
    ctx.restore();
}

// ===== Подсветка домов залпами: в момент взрыва дома рядом слегка окрашиваются в цвет залпа и поблёскивают, пока горят искры =====
let fwTmpCv = null, fwTmpCtx = null;
function fwLightsNow() {
    const out = [];
    for (const f of fireworks) {
        if (f.stage !== 'burst' || f.delay > 0) continue;
        let sum = 0; for (const sp of f.sparks) if (sp.life > 0) sum += sp.life;
        const avg = f.sparks.length ? sum / f.sparks.length : 0;
        const tw = 0.82 + 0.18 * Math.sin(frame * 0.35 + f.x * 0.05);          // лёгкое мерцание
        const I = Math.max(0, f.flash) * 0.8 + avg * 0.35 * tw;                  // вспышка в момент взрыва + слабое свечение, пока горят искры
        if (I < 0.03) continue;
        const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(f.light || f.color || '');
        if (!m) continue;
        out.push({ x: f.x, y: f.targetY, r: +m[1], g: +m[2], b: +m[3], I: Math.min(1.1, I) });
    }
    return out;
}
function fwGlowLayer(L, off, y0, lights, far) {
    const cv = ctx.canvas; if (!cv) return;
    if (!fwTmpCv) { fwTmpCv = document.createElement('canvas'); fwTmpCtx = fwTmpCv.getContext('2d'); }
    // подсветка мягкая, поэтому считаем её втрое меньшим разрешением — в 9 раз меньше пикселей, при такой прозрачности на глаз разницы нет
    const fw = Math.ceil(cv.width / 3), fh = Math.ceil(cv.height / 3);
    if (fwTmpCv.width !== fw || fwTmpCv.height !== fh) { fwTmpCv.width = fw; fwTmpCv.height = fh; }
    const T = ctx.getTransform(), t = fwTmpCtx;
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, fw, fh);
    t.setTransform(T.a / 3, T.b / 3, T.c / 3, T.d / 3, T.e / 3, T.f / 3);
    t.globalCompositeOperation = 'lighter';
    const R = 220, amp = far ? 0.10 : 0.15;                                      // подсветка еле заметная; дальний ряд чуть слабее
    for (const lt of lights) {
        const g = t.createRadialGradient(lt.x, lt.y, 0, lt.x, lt.y, R);
        const a = Math.min(0.17, lt.I * amp);
        g.addColorStop(0, `rgba(${lt.r},${lt.g},${lt.b},${a})`); g.addColorStop(0.45, `rgba(${lt.r},${lt.g},${lt.b},${a * 0.45})`); g.addColorStop(1, `rgba(${lt.r},${lt.g},${lt.b},0)`);
        t.fillStyle = g; t.fillRect(lt.x - R, lt.y - R, R * 2, R * 2);
    }
    t.globalCompositeOperation = 'destination-in';                                // свет остаётся только на самих домах
    const k = L.canvas.width / L.tileW;
    for (let x = -off; x < width; x += L.tileW) {
        const d0 = Math.max(0, x), d1 = Math.min(width, x + L.tileW);
        if (d1 <= d0) continue;
        t.drawImage(L.canvas, (d0 - x) * k, 0, (d1 - d0) * k, L.canvas.height, d0, y0, d1 - d0, L.H);
    }
    // на экран переносим только прямоугольник вокруг залпов, а не весь кадр
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const lt of lights) { bx0 = Math.min(bx0, lt.x - R); by0 = Math.min(by0, lt.y - R); bx1 = Math.max(bx1, lt.x + R); by1 = Math.max(by1, lt.y + R); }
    const px0 = Math.max(0, Math.floor((T.a * bx0 + T.e) / 3) * 3), py0 = Math.max(0, Math.floor((T.d * by0 + T.f) / 3) * 3);
    const px1 = Math.min(cv.width, Math.ceil((T.a * bx1 + T.e) / 3) * 3), py1 = Math.min(cv.height, Math.ceil((T.d * by1 + T.f) / 3) * 3);
    if (px1 > px0 && py1 > py0) {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
        ctx.drawImage(fwTmpCv, px0 / 3, py0 / 3, (px1 - px0) / 3, (py1 - py0) / 3, px0, py0, px1 - px0, py1 - py0); ctx.restore();
    }
}

function drawCity() {
    const S = Math.max(1, viewScale * renderScale);
    const key = `${Math.round(height)}|${S.toFixed(2)}|${gfxQuality}`;
    // автоматическое понижение качества: высота та же, а чёткость ниже — уже готовый город просто рисуется как есть (без пересборки и рывка)
    if (citySprites && citySpritesKey !== key && __gfxSoft && citySpritesKey.split('|')[0] === String(Math.round(height)) && S <= parseFloat(citySpritesKey.split('|')[1])) {
        if (gfxQuality === 'low' && citySprites.length > 1) citySprites = [citySprites[citySprites.length - 1]];
        citySpritesKey = key;
    }
    if (!citySprites || citySpritesKey !== key) {
        citySpritesKey = key;
        const tileW = 1400;
        // дома крупнее и реже; цвета к низу теплеют — в тон свечения города у горизонта
        citySprites = [
            { speed: 0.10, tileW, H: height * 0.68,
              ...buildCityLayer(tileW, height * 0.68, { far: true, minW: 62, maxW: 124, minH: 0.68, maxH: 1.0, top: '#140627', bottom: '#12051e', gapMin: 6, gapVar: 16, stepX: 10, stepY: 12, winW: 3, winH: 4, lit: 0.15, litA: 0.42 }, S, 7) },
            { speed: 0.22, tileW, H: height * 0.44,
              ...buildCityLayer(tileW, height * 0.44, { minW: 82, maxW: 156, minH: 0.32, maxH: 1.0, top: '#190833', bottom: '#150627', gapMin: 8, gapVar: 22, stepX: 12, stepY: 15, winW: 4, winH: 5, lit: 0.18, litA: 0.72 }, S, 42) }
        ];
        if (gfxQuality === 'low') citySprites = [citySprites[1]];
    }
    if (!window.__cityHaze || window.__cityHazeH !== height) {
        const hz = ctx.createLinearGradient(0, height * 0.45, 0, height);
        hz.addColorStop(0, 'rgba(254, 140, 60, 0)');
        hz.addColorStop(1, 'rgba(254, 140, 60, 0.11)');
        window.__cityHaze = hz; window.__cityHazeH = height;
    }
    ctx.fillStyle = window.__cityHaze;
    ctx.fillRect(0, height * 0.45, width, height * 0.55);
    // с ростом сложности дымка внизу чуть теплеет и становится оранжевее, как у труб (до +5% на последнем уровне)
    let warm = 0;
    try { warm = Math.max(0, Math.min(1, getTotalCollectedThemes() / Math.max(1, TOTAL_THEMES * (DIFF_LEVELS.length - 1) / DIFF_LEVELS.length))); } catch (e) {}
    if (warm > 0.02) {
        if (!window.__cityGlow || window.__cityGlowH !== height) {
            const gl = ctx.createLinearGradient(0, height * 0.4, 0, height);
            gl.addColorStop(0, 'rgba(254, 110, 0, 0)'); gl.addColorStop(1, 'rgba(254, 110, 0, 0.09)');
            window.__cityGlow = gl; window.__cityGlowH = height;
        }
        ctx.globalAlpha = warm; ctx.fillStyle = window.__cityGlow;
        ctx.fillRect(0, height * 0.4, width, height * 0.6);
        ctx.globalAlpha = 1;
    }

    const fwL = fireworks.length ? fwLightsNow() : [];
    citySprites.forEach((L, li) => {
        const off = ((cityOffset * L.speed) % L.tileW + L.tileW) % L.tileW;
        const y0 = height - L.H;
        {
            // рисуем только видимый кусок ленты — заметно быстрее
            const k = L.canvas.width / L.tileW;
            ctx.globalAlpha = 1;   // все дома непрозрачные — звёзды сквозь них не видны
            const moonLit = moonPhase > 0 ? Math.max(0, Math.min(1, (moonPhase - 0.06) / 0.94)) : 0;
            for (let pass = 0; pass < (moonLit > 0.04 ? 2 : 1); pass++) {
                if (pass === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 * moonLit; }   // луна светит: все элементы города светлеют
                for (let x = -off; x < width; x += L.tileW) {
                    const d0 = Math.max(0, x), d1 = Math.min(width, x + L.tileW);
                    if (d1 <= d0) continue;
                    ctx.drawImage(L.canvas, (d0 - x) * k, 0, (d1 - d0) * k, L.canvas.height, d0, y0, d1 - d0, L.H);
                }
            }
            ctx.globalCompositeOperation = 'source-over';
            // ШАЗАМ: город чуть смазан скоростью — два полупрозрачных «следа» позади домов
            const sb = (typeof SHZ !== 'undefined') ? SHZ.blur : 0;
            if (sb > 0.03) {
                for (const [gx, ga] of [[6 + 6 * li, 0.22], [14 + 10 * li, 0.1]]) {
                    ctx.globalAlpha = ga * sb;
                    for (let x = -off; x < width; x += L.tileW) {
                        const d0 = Math.max(0, x), d1 = Math.min(width, x + L.tileW);
                        if (d1 <= d0) continue;
                        ctx.drawImage(L.canvas, (d0 - x) * k, 0, (d1 - d0) * k, L.canvas.height, d0 + gx * sb, y0, d1 - d0, L.H);
                    }
                }
            }
            ctx.globalAlpha = 1;
            if (moonLit > 0.03 && L.bodies) {                       // светлые боковые грани домов становятся ярче на 2–3% к последнему уровню
                ctx.fillStyle = `rgba(200, 175, 255, ${(0.03 * moonLit).toFixed(4)})`;
                for (let x = -off; x < width; x += L.tileW) {
                    if (x > width) break;
                    for (let bi = 0; bi < L.bodies.length; bi++) {
                        const bd = L.bodies[bi], ew = Math.max(3, bd.w * 0.045), ex = x + bd.x + bd.w - ew;
                        if (ex + ew < 0 || ex > width) continue;
                        ctx.fillRect(ex, y0 + (L.H - bd.h), ew, bd.h);
                    }
                }
            }
        }
        // жизнь в окнах: свет то загорается, то гаснет, плавно
        for (let t = 0; t < 2; t++) {
            const wn = L.windows[Math.floor(Math.random() * L.windows.length)];
            if (wn && Math.random() < 0.06 * dtMult) wn.on = !wn.on;
        }
        for (let wl = 0; wl < 2; wl++) { const arr = wl ? L.wrapped : L.windows; if (!arr) continue;   // без склейки массивов каждый кадр (меньше мусора в памяти)
        for (let wi = 0; wi < arr.length; wi++) { const wn = arr[wi];
            const src = wn.twin || wn;
            if (!wn.twin) {
                const target = src.on ? src.maxA : 0;
                src.a += (target - src.a) * Math.min(1, 0.05 * dtMult);
            }
            if (src.a < 0.02) continue;
            for (let x = -off; x < width; x += L.tileW) {
                const sx = x + wn.x;
                if (sx < -5 || sx > width + 5) continue;
                ctx.fillStyle = src.rgb;
                if (li > 0) {   // мягкий ореол только у ближних окон
                    ctx.globalAlpha = src.a * 0.18;
                    ctx.fillRect(sx - 1.2, y0 + wn.y - 1.2, wn.w + 2.4, wn.h + 2.4);
                }
                ctx.globalAlpha = src.a;
                ctx.fillRect(sx, y0 + wn.y, wn.w, wn.h);
            }
        } }
        if (fwL.length) fwGlowLayer(L, off, y0, fwL, li === 0 && citySprites.length > 1);   // залпы подсвечивают дома
        // красные лампы на шпилях мигают, каждая в своём ритме
        if (L.beacons && L.beacons.length) {
            ctx.fillStyle = '#FF4B4B';
            for (const bc of L.beacons) {
                const pulse = 0.12 + 0.88 * Math.pow(Math.max(0, Math.sin(frame * 0.04 + bc.ph)), 5);
                for (let x = -off; x < width; x += L.tileW) {
                    const sx = x + bc.x;
                    if (sx < -6 || sx > width + 6) continue;
                    ctx.globalAlpha = pulse * 0.22;
                    ctx.beginPath(); ctx.arc(sx, y0 + bc.y, li === 0 ? 3.6 : 4.6, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = pulse * 0.95;
                    ctx.beginPath(); ctx.arc(sx, y0 + bc.y, li === 0 ? 1.1 : 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
        if (li === citySprites.length - 2) updateDrawFireworks();   // фейерверки — за ближним городом
    });
    if (citySprites.length === 1) updateDrawFireworks();
    // низ домов мягко тонет в тёплом свечении города
    if (!window.__cityWarm || window.__cityWarmH !== height) {
        const wg = ctx.createLinearGradient(0, height * 0.72, 0, height);
        wg.addColorStop(0, 'rgba(254, 140, 60, 0)'); wg.addColorStop(1, 'rgba(254, 140, 60, 0.07)');
        window.__cityWarm = wg; window.__cityWarmH = height;
    }
    ctx.fillStyle = window.__cityWarm;
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
}

let moonSprite = null;
let moonPhase = -1, moonRendered = -1;   // фаза луны: доля освещённой части (0.06 — тонкий серп … 1 — полнолуние)
// Фаза луны растёт вместе с прогрессом сложности: от тонкого серпа в начале до полной луны к концу
function moonPhaseTarget() {
    let p = 0;
    try { p = Math.min(1, getTotalCollectedThemes() / TOTAL_THEMES); } catch (e) {}
    // полная луна наступает, когда начинается последний уровень сложности (Хард+), а не в самом конце
    const lastLevelStart = (DIFF_LEVELS.length - 1) / DIFF_LEVELS.length;
    return 0.06 + 0.94 * Math.min(1, p / lastLevelStart);
}
function drawMoon() {
    const moonRadius = 40;
    const moonX = Math.min(width - 64, Math.max(416, width * 2 / 3));
    const moonY = 130;
    const half = Math.ceil(moonRadius * 2.8) + 2;
    const S = Math.max(1, viewScale * renderScale);
    // плавно подтягиваем показанную фазу к целевой — смена почти незаметна
    const target = moonPhaseTarget();
    if (moonPhase < 0) moonPhase = target;
    else moonPhase += (target - moonPhase) * Math.min(1, 0.02 * dtMult);
    // луна перерисовывается, когда фаза заметно сдвинулась (шаг 0,007 — раньше 0,003: после каждой темы луна перерисовывалась 4–5 раз подряд,
    // и каждая перерисовка с большим мягким свечением давала подёргивание). Холст луны используется повторно, новый не создаётся
    if (!moonSprite || Math.abs(moonPhase - moonRendered) > 0.007 || (Math.abs(target - moonPhase) < 0.0005 && Math.abs(moonPhase - moonRendered) > 0.0005)) {
        moonRendered = moonPhase;
        const f = moonPhase;
        moonSprite = makeSprite(half * 2, half * 2, S, (c) => {
            const mx = half, my = half, r = moonRadius;
            // ореол слабее, пока луна тонкая
            const aura = c.createRadialGradient(mx, my, r * 0.5, mx, my, r * 2.8);
            aura.addColorStop(0, `rgba(255, 245, 220, ${0.4 * (0.25 + 0.75 * f)})`);
            aura.addColorStop(0.5, `rgba(180, 100, 255, ${0.12 * (0.4 + 0.6 * f)})`);
            aura.addColorStop(1, 'rgba(20, 4, 40, 0)');
            c.fillStyle = aura;
            c.beginPath(); c.arc(mx, my, r * 2.8, 0, Math.PI * 2); c.fill();
            // тёмная сторона луны едва видна
            if (f < 0.995) {
                c.fillStyle = 'rgba(70, 50, 120, 0.12)';
                c.beginPath(); c.arc(mx, my, r, 0, Math.PI * 2); c.fill();
            }
            // освещённая часть: правая половина диска плюс/минус эллипс терминатора (свет справа, как луна в игре)
            const k = 1 - 2 * f;                      // 1 — новолуние, 0 — половина, -1 — полнолуние
            const litPath = () => {
                c.beginPath();
                c.arc(mx, my, r, -Math.PI / 2, Math.PI / 2, false);                      // правая дуга сверху вниз
                c.ellipse(mx, my, Math.max(0.01, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, k > 0); // терминатор обратно вверх (серп — через правую сторону, «пузатая» луна — через левую)
                c.closePath();
            };
            // мягкое свечение по форме освещённой части
            c.save();
            litPath();
            c.shadowColor = '#FFE8A3';
            c.shadowBlur = gfxQuality === 'low' ? 0 : 22 * S * (0.35 + 0.65 * f);
            c.fillStyle = '#F3E5AB';
            c.fill();
            c.restore();
            // сама поверхность луны — в точности как полная луна, но только на освещённой части
            c.save();
            litPath(); c.clip();
            const moonGrad = c.createRadialGradient(mx - 10, my - 10, 5, mx, my, r);
            moonGrad.addColorStop(0, '#FFFFFF');
            moonGrad.addColorStop(0.7, '#F3E5AB');
            moonGrad.addColorStop(1, '#D4B86A');
            c.fillStyle = moonGrad;
            c.beginPath(); c.arc(mx, my, r, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(180, 155, 90, 0.32)';
            c.beginPath(); c.arc(mx - 12, my - 8, 7, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(mx + 10, my + 12, 9, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(mx + 14, my - 10, 5, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(mx - 8, my + 14, 4, 0, Math.PI * 2); c.fill();
            c.restore();
        }, moonSprite);
    }
    ctx.drawImage(moonSprite, moonX - half, moonY - half, half * 2, half * 2);
    window.__moonPos = [moonX - half, moonY - half, half * 2];   // для грозы: луна поверх туч
}

let cloudSprite = null;
const CLOUD_OX = 42, CLOUD_OY = 58, CLOUD_W = 140, CLOUD_H = 106;
function drawClouds() {
    if (!cloudSprite) {
        cloudSprite = makeSprite(CLOUD_W, CLOUD_H, Math.max(1, viewScale * renderScale), (c) => {
            c.translate(CLOUD_OX, CLOUD_OY);
            const cloudGrad = c.createLinearGradient(0, -30, 0, 30);
            cloudGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
            cloudGrad.addColorStop(1, 'rgba(88, 28, 135, 0.18)');
            c.fillStyle = cloudGrad;
            c.shadowColor = 'rgba(168, 85, 247, 0.3)';
            c.shadowBlur = gfxQuality === 'low' ? 0 : 10 * Math.max(1, viewScale * renderScale);
            c.beginPath();
            c.arc(0, 0, 26, 0, Math.PI * 2);
            c.arc(26, -10, 32, 0, Math.PI * 2);
            c.arc(58, -4, 24, 0, Math.PI * 2);
            c.arc(38, 10, 22, 0, Math.PI * 2);
            c.fill();
        });
    }
    const sk = stormSmooth(0, 0.85, stormCover), stormSpr = sk > 0.001 ? stormBuildClouds() : null;
    clouds.forEach(cl => {
        cl.x -= cl.speed * dtMult;
        if (cl.x < -140) cl.x = width + 80;
        const k = cl.scale;
        // в грозу сиреневые облачка плавно темнеют до цвета туч, после грозы — так же плавно возвращают свой цвет
        const dx = cl.x - CLOUD_OX * k, dy = cl.y - CLOUD_OY * k, dw = CLOUD_W * k, dh = CLOUD_H * k;
        if (sk < 0.999) { ctx.globalAlpha = 1 - sk; ctx.drawImage(cloudSprite, dx, dy, dw, dh); }
        if (sk > 0.001) { ctx.globalAlpha = 0.92 * sk; ctx.drawImage(stormSpr.near, dx, dy, dw, dh); }
    });
    ctx.globalAlpha = 1;
}

// ===== Ускорение: из-за спины совы вылетают маленькие звёздочки =====
let speedStars = [];
let speedStarAcc = 0;
// Иконки в игровом мире: символ шрифта, либо плоская фигура (path:имя)
const BUBO_ICON_PATHS = { beer: "M3.2 7.4C2.4 6.3 3 4.7 4.5 4.6C4.7 2.8 6.6 1.9 8 2.9C9 1.5 11.2 1.5 12.1 2.9C13.2 1.8 15.3 2.3 15.5 3.9C17 3.9 17.9 5.4 17.2 6.6C17.9 7 18 7.6 17.7 8H3.4Z M4.2 8H16.8L15.6 21H5.4Z M17.2 9.6H18.6A2.7 2.7 0 0 1 18.6 15H17.2V13.4H18.6A1.1 1.1 0 0 0 18.6 11.2H17.2Z", squeeze: "M3.5 2h17A1.5 1.5 0 0 1 22 3.5V8.5H2V3.5A1.5 1.5 0 0 1 3.5 2z M8 8.5h8L12 12z M8 15.5h8L12 12z M2 15.5h20v5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 20.5z" };
function drawGlyph(c, code, x, y) {
    if (typeof code === 'string' && code.indexOf('path:') === 0) {
        const p = new Path2D(BUBO_ICON_PATHS[code.slice(5)] || '');
        c.save(); c.translate(x, y); const k = 22 / 24; c.scale(k, k); c.translate(-12, -12); c.fill(p); c.restore();
    } else c.fillText(code, x, y);
}
// Контур тела: плотные точки вдоль кривой + гладкий сплайн Катмулла—Рома — без изломов и «неровностей» на спине и животе
function owlSmoothClosed(c, shape) {
    const pts = shape.p, n = pts.length, closed = !!shape.closed;
    c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const g = (k) => closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))];
        const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
        c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
}
const OWL_BODY_PTS = { closed: true, p: [[10.00, -3.00], [9.29, -4.32], [8.52, -5.61], [7.71, -6.87], [6.86, -8.10], [5.96, -9.30], [5.01, -10.47], [4.04, -11.61], [3.12, -12.79], [2.18, -13.96], [1.05, -14.94], [-0.22, -14.66], [-1.41, -13.75], [-2.77, -13.16], [-4.14, -12.54], [-5.47, -11.84], [-6.74, -11.05], [-7.96, -10.18], [-9.14, -9.25], [-10.24, -8.23], [-11.16, -7.05], [-11.98, -5.80], [-12.69, -4.47], [-13.29, -3.10], [-13.78, -1.68], [-14.17, -0.23], [-14.46, 1.24], [-14.60, 2.73], [-14.60, 4.23], [-14.45, 5.72], [-14.11, 7.18], [-13.67, 8.61], [-13.00, 9.95], [-12.10, 11.15], [-11.03, 12.20], [-9.83, 13.11], [-8.56, 13.90], [-7.26, 14.65], [-5.93, 15.34], [-4.55, 15.92], [-3.11, 16.35], [-1.63, 16.61], [-0.14, 16.68], [1.36, 16.55], [2.82, 16.22], [4.23, 15.72], [5.58, 15.06], [6.85, 14.27], [8.05, 13.37], [9.17, 12.38], [10.16, 11.25], [10.97, 9.98], [11.56, 8.61], [11.94, 7.16], [12.10, 5.67], [12.07, 4.17], [11.88, 2.68], [11.55, 1.22], [11.12, -0.22], [10.60, -1.62]] };
const OWL_BREAST_PTS = { closed: false, p: [[8.50, -2.00], [9.35, -1.02], [10.15, 0.02], [10.87, 1.10], [11.50, 2.24], [12.01, 3.43], [12.40, 4.68], [12.62, 5.96], [12.67, 7.26], [12.54, 8.55], [12.23, 9.82], [11.77, 11.03], [11.18, 12.19], [10.52, 13.31], [9.74, 14.35], [8.81, 15.26], [7.73, 15.99], [6.54, 16.52], [5.28, 16.85], [3.99, 17.00], [2.69, 17.00], [1.40, 16.87], [0.11, 16.64], [-1.15, 16.32], [-2.35, 15.82], [-3.42, 15.08], [-4.26, 14.10], [-4.82, 12.93], [-5.09, 11.66], [-5.13, 10.36], [-5.01, 9.06], [-4.77, 7.78], [-4.45, 6.52], [-4.04, 5.29], [-3.51, 4.09], [-2.88, 2.96], [-2.13, 1.89], [-1.28, 0.91], [-0.32, 0.02], [0.72, -0.75], [1.83, -1.43], [3.00, -2.00]] };
let speedRamp = 0;   // плавная «громкость» звёздочек: 0 → 1 при ускорении и 1 → 0 после, без резких скачков
function updateSpeedStars() {
    const target = ((speedBoostTime > 0 || (typeof shazamActive === 'function' && shazamActive())) && gameActive && owl.visible) ? 1 : 0;
    speedRamp += (target - speedRamp) * Math.min(1, (target > speedRamp ? 0.03 : 0.07) * dtMult);   // вверх плавно, вниз быстрее
    if (speedRamp < 0.002) speedRamp = 0;
    if (speedRamp > 0 && owl.visible) {
        speedStarAcc += dtMult * speedRamp;   // чем меньше speedRamp, тем реже вылетают
        while (speedStarAcc >= 2.5) {
            speedStarAcc -= 2.5;
            const r = owl.radius;
            const k = owl.radius / owl.baseRadius; // при переедании сова больше — и звёздочки тоже
            // рождаются ЗА совой (рисуются под ней) внутри её силуэта и выплывают из-под неё, а не из пустоты у затылка
            const off = Math.random() * 2 - 1;
            const mid = 1 - Math.abs(off);
            speedStars.push({
                x: owl.x + (Math.random() * 0.5 - 0.15) * r, y: owl.y + off * r * 0.55,
                vx: -(2.0 + Math.random() * 1.8) * k, vy: off * 0.2 * k,
                size: (1.2 + 2.8 * mid + Math.random() * 0.7) * k, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
                life: 1, decay: 0.022 + Math.random() * 0.015,
                color: (typeof shazamActive === 'function' && shazamActive()) ? (Math.random() < 0.5 ? '#FFB347' : '#FF7A00') : (Math.random() < 0.6 ? '#FDE68A' : '#FBBF24')
            });
        }
    } else {
        speedStarAcc = 0;
    }
    for (let i = speedStars.length - 1; i >= 0; i--) {
        const s = speedStars[i];
        s.x += s.vx * dtMult; s.y += s.vy * dtMult; s.rot += s.vr * dtMult;
        s.life -= s.decay * dtMult;
        if (s.life <= 0) speedStars.splice(i, 1);
    }
}
function drawSpeedStars() {
    if (!speedStars.length) return;
    ctx.save();
    for (const s of speedStars) {
        const sz = s.size * (0.6 + 0.4 * s.life);
        ctx.globalAlpha = Math.max(0, s.life) * 0.1;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, sz * 1.2, 0, Math.PI * 2); ctx.fill();   // мягкое свечение
        ctx.globalAlpha = Math.max(0, s.life) * 0.85;   // ненавязчиво
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.beginPath();                                                          // четырёхлучевая звёздочка
        ctx.moveTo(0, -sz);
        ctx.quadraticCurveTo(0, 0, sz, 0);
        ctx.quadraticCurveTo(0, 0, 0, sz);
        ctx.quadraticCurveTo(0, 0, -sz, 0);
        ctx.quadraticCurveTo(0, 0, 0, -sz);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

// ===== Замёрзшая сова: синеет целиком и поблёскивает, как покрытая льдом =====
let frozenCanvas = null, frozenCtx = null;
function drawFrozenOwl() {
    const S = viewScale * renderScale, box = 150, px = Math.ceil(box * S);
    if (!frozenCanvas || frozenCanvas.width !== px) {
        frozenCanvas = document.createElement('canvas');
        frozenCanvas.width = frozenCanvas.height = px;
        frozenCtx = frozenCanvas.getContext('2d');
    }
    const fc = frozenCtx, mainCtx = ctx, fz = currentFreezeFactor;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.globalCompositeOperation = 'source-over';
    fc.clearRect(0, 0, px, px);
    fc.setTransform(S, 0, 0, S, (box / 2 - owl.x) * S, (box / 2 - owl.y) * S);
    ctx = fc;
    try { owl.draw(); } finally { ctx = mainCtx; }
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.globalCompositeOperation = 'source-atop';
    fc.fillStyle = `rgba(96, 175, 255, ${0.5 * fz})`;          // сова синеет
    fc.fillRect(0, 0, px, px);
    const t = (frame % 110) / 110, bx = (-0.45 + t * 1.9) * px; // ледяной блик пробегает по сове
    const g = fc.createLinearGradient(bx, 0, bx + px * 0.35, px * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${0.6 * fz})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    fc.fillStyle = g;
    fc.fillRect(0, 0, px, px);
    fc.globalCompositeOperation = 'source-over';
    ctx.drawImage(frozenCanvas, owl.x - box / 2, owl.y - box / 2, box, box);
}

// ===== Ледяные осколки: при замерзании разлетаются кристаллы, при оттаивании лёд отваливается =====
let iceShards = [];
function spawnIceBurst(kind) {
    const n = kind === 'thaw' ? 18 : 14;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = kind === 'thaw' ? 0.8 + Math.random() * 1.8 : 1.5 + Math.random() * 2.2;
        iceShards.push({
            x: owl.x + Math.cos(a) * owl.radius * 0.6, y: owl.y + Math.sin(a) * owl.radius * 0.6,
            vx: Math.cos(a) * sp - (kind === 'thaw' ? 0.6 : 0), vy: kind === 'thaw' ? -1.2 - Math.random() * 1.6 : Math.sin(a) * sp,
            g: kind === 'thaw' ? 0.22 : 0.02,
            size: 2.2 + Math.random() * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
            life: 1, decay: kind === 'thaw' ? 0.016 : 0.025,
            color: Math.random() < 0.5 ? '#E0F2FE' : (Math.random() < 0.5 ? '#7DD3FC' : '#FFFFFF')
        });
    }
}
function updateIceShards() {
    for (let i = iceShards.length - 1; i >= 0; i--) {
        const s = iceShards[i];
        s.vy += s.g * dtMult;
        s.x += s.vx * dtMult; s.y += s.vy * dtMult; s.rot += s.vr * dtMult;
        s.life -= s.decay * dtMult;
        if (s.life <= 0) iceShards.splice(i, 1);
    }
}
function drawIceShards() {
    if (!iceShards.length) return;
    ctx.save();
    for (const s of iceShards) {
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(s.rot);
        ctx.beginPath();
        ctx.moveTo(0, -s.size); ctx.lineTo(s.size * 0.55, s.size * 0.6); ctx.lineTo(-s.size * 0.5, s.size * 0.4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

// Шляпка трубы одинакова у всех труб: рисуем её один раз в заготовку (градиент, контур и блик по краю) и дальше копируем.
// Раньше блик обрезался по форме шляпки (clip) у каждой трубы каждый кадр — на телефоне это заметная нагрузка.
function drawPipeCap(capX, capY, capW, capH, r, rimY, pw, red) {
    const devR = tokDevScale(ctx), hw = capW / 2 + 1, hh = capH / 2 + 1;
    const spr = tokSprite(`cap|${red ? 'r' : ''}|${pw}|${capW}|${capH}|${r}|${rimY}|${devR}`, devR, hw, hh, (g) => {
        g.translate(-(capX + capW / 2), -capH / 2);
        const path = () => {
            g.beginPath();
            g.moveTo(capX + r, 0);
            g.lineTo(capX + capW - r, 0);
            g.quadraticCurveTo(capX + capW, 0, capX + capW, r);
            g.lineTo(capX + capW, capH - r);
            g.quadraticCurveTo(capX + capW, capH, capX + capW - r, capH);
            g.lineTo(capX + r, capH);
            g.quadraticCurveTo(capX, capH, capX, capH - r);
            g.lineTo(capX, r);
            g.quadraticCurveTo(capX, 0, capX + r, 0);
            g.closePath();
        };
        const cg = g.createLinearGradient(capX, 0, capX + capW, 0);
        const C = red ? ['#5e0010', '#8e0a1c', '#dc1f32', '#ff5262', '#b3122a', '#5e0010'] : ['#8c2400', '#bc3a00', '#f36500', '#ff8e24', '#d64d00', '#8c2400'];
        [0, 0.25, 0.58, 0.78, 0.92, 1].forEach((p, i) => cg.addColorStop(p, C[i]));
        const rg = g.createLinearGradient(capX, 0, capX + capW, 0);
        rg.addColorStop(0.0, 'rgba(255, 255, 255, 0.10)');
        rg.addColorStop(0.35, 'rgba(255, 255, 255, 0.22)');
        rg.addColorStop(0.76, 'rgba(255, 255, 255, 0.50)');
        rg.addColorStop(0.90, 'rgba(255, 255, 255, 0.24)');
        rg.addColorStop(1.0, 'rgba(255, 255, 255, 0.10)');
        g.fillStyle = cg; path(); g.fill();
        g.strokeStyle = red ? 'rgba(255, 140, 150, 0.3)' : 'rgba(255, 185, 110, 0.28)'; g.lineWidth = 0.8; g.stroke();
        g.save(); path(); g.clip();
        g.strokeStyle = rg; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(capX - 2, rimY); g.lineTo(capX + capW + 2, rimY); g.stroke();
        g.restore();
    });
    ctx.drawImage(spr.c, capX + capW / 2 + spr.x, capY + capH / 2 + spr.y, spr.w, spr.h);
}
const PIPE_GRADS = {};   // градиенты труб по ширине (создаются один раз)
function drawPipe(pipe) {
    ctx.save();
    ctx.translate(pipe.x, 0);   // рисуем в системе координат трубы: градиенты одинаковы для всех труб и создаются один раз

    const activeSqueeze = currentDifficultySqueeze + (currentCompressionFactor * compressionMaxForLevel());

    const effectiveTop = pipe.top + activeSqueeze;
    const effectiveBottom = pipe.bottom + activeSqueeze;

    const capH = 19;
    const overhang = 5;
    const capX = -overhang;
    const capW = pipe.width + overhang * 2;
    const capRadius = 6.0;

    let pgc = PIPE_GRADS[pipe.width];
    if (!pgc) {
        const sg = ctx.createLinearGradient(0, 0, pipe.width, 0);
        sg.addColorStop(0.0, '#120224');
        sg.addColorStop(0.18, '#260647');
        sg.addColorStop(0.50, '#4a0d8a');
        sg.addColorStop(0.72, '#7a22d6');
        sg.addColorStop(0.80, '#9534ed');
        sg.addColorStop(0.90, '#5a1399');
        sg.addColorStop(1.0, '#1c0333');
        const cg = ctx.createLinearGradient(capX, 0, capX + capW, 0);
        cg.addColorStop(0.0, '#8c2400');
        cg.addColorStop(0.25, '#bc3a00');
        cg.addColorStop(0.58, '#f36500');
        cg.addColorStop(0.78, '#ff8e24');
        cg.addColorStop(0.92, '#d64d00');
        cg.addColorStop(1.0, '#8c2400');
        const rg = ctx.createLinearGradient(capX, 0, capX + capW, 0);
        rg.addColorStop(0.0, 'rgba(255, 255, 255, 0.10)');
        rg.addColorStop(0.35, 'rgba(255, 255, 255, 0.22)');
        rg.addColorStop(0.76, 'rgba(255, 255, 255, 0.50)');
        rg.addColorStop(0.90, 'rgba(255, 255, 255, 0.24)');
        rg.addColorStop(1.0, 'rgba(255, 255, 255, 0.10)');
        const ts = ctx.createLinearGradient(0, 0, 0, -5);   // тень над верхней шляпкой (рисуется с переносом по Y)
        ts.addColorStop(0, 'rgba(10, 1, 20, 0.35)');
        ts.addColorStop(1, 'transparent');
        const bs = ctx.createLinearGradient(0, 0, 0, 5);    // тень под нижней шляпкой
        bs.addColorStop(0, 'rgba(10, 1, 20, 0.35)');
        bs.addColorStop(1, 'transparent');
        pgc = PIPE_GRADS[pipe.width] = { stem: sg, cap: cg, rim: rg, top: ts, bot: bs };
    }
    const stemGrad = pgc.stem, capGrad = pgc.cap, rimShineGrad = pgc.rim;

    const topStemH = Math.max(0, effectiveTop - capH + 2);
    ctx.fillStyle = stemGrad;
    const pOv = camZoom < 0.999 ? Math.ceil(height * (1 - camZoom) * 0.6) + 4 : 0;   // запас за краем — только при отдалении камеры
    ctx.fillRect(0, -pOv, pipe.width, topStemH + pOv);

    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.22)';   // слева приглушён, в тон трубе
    ctx.beginPath();
    ctx.moveTo(0 + 0.4, -pOv);
    ctx.lineTo(0 + 0.4, topStemH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(192, 132, 252, 0.26)';   // справа приглушён сильнее, но всё равно светлее левого и ближе к цвету трубы
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0 + pipe.width - 0.4, -pOv);
    ctx.lineTo(0 + pipe.width - 0.4, topStemH);
    ctx.stroke();

    const topCapY = effectiveTop - capH;
    ctx.save(); ctx.translate(0, topCapY);
    ctx.fillStyle = pgc.top;
    ctx.fillRect(0, Math.max(0, topCapY - 5) - topCapY, pipe.width, 5);
    ctx.restore();

    drawPipeCap(capX, topCapY, capW, capH, capRadius, capH - 2.5, pipe.width);   // шляпка — из заготовки (без дорогой обрезки каждый кадр)
    const redK = typeof crystalRedK === 'number' ? crystalRedK : 0;   // эффект «Опасные трубы»: шляпки плавно краснеют
    if (redK > 0.01) { ctx.globalAlpha = redK; drawPipeCap(capX, topCapY, capW, capH, capRadius, capH - 2.5, pipe.width, true); ctx.globalAlpha = 1; }

    const bottomY = height - effectiveBottom;
    const bottomStemY = bottomY + capH - 2;
    const bottomStemH = Math.max(0, effectiveBottom - capH + 2);

    ctx.fillStyle = stemGrad;
    ctx.fillRect(0, bottomStemY, pipe.width, bottomStemH + pOv);

    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.22)';   // слева приглушён, в тон трубе
    ctx.beginPath();
    ctx.moveTo(0 + 0.4, bottomStemY);
    ctx.lineTo(0 + 0.4, height + pOv);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(192, 132, 252, 0.26)';   // справа приглушён сильнее, но всё равно светлее левого и ближе к цвету трубы
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0 + pipe.width - 0.4, bottomStemY);
    ctx.lineTo(0 + pipe.width - 0.4, height + pOv);
    ctx.stroke();

    ctx.save(); ctx.translate(0, bottomY + capH);
    ctx.fillStyle = pgc.bot;
    ctx.fillRect(0, 0, pipe.width, 5);
    ctx.restore();

    drawPipeCap(capX, bottomY, capW, capH, capRadius, 2.5, pipe.width);
    if (redK > 0.01) {
        ctx.globalAlpha = redK; drawPipeCap(capX, bottomY, capW, capH, capRadius, 2.5, pipe.width, true);
        // мягкое свечение из устьев: овальное пятно без границ, слегка дышит
        const br = 0.75 + 0.25 * Math.sin(frame * 0.07 + pipe.x * 0.01);
        ctx.globalCompositeOperation = 'lighter';
        for (const [my, dir] of [[effectiveTop, 1], [bottomY, -1]]) {
            ctx.save(); ctx.translate(pipe.width / 2, my); ctx.scale(1, 0.6);
            const R = pipe.width * 0.85, rg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
            rg.addColorStop(0, `rgba(255, 110, 70, ${0.42 * redK * br})`); rg.addColorStop(0.45, `rgba(255, 60, 50, ${0.16 * redK * br})`); rg.addColorStop(1, 'rgba(255, 40, 40, 0)');
            ctx.globalAlpha = 1; ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(0, 0, R, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    // капельки дождя на верхней грани обеих шляпок (у верхней трубы шляпка перевёрнута — капли всё равно сверху)
    if (STORM.wet > 0.03 || (pipe._w && (pipe._w.beads.length || pipe._w.sp.length || pipe._w.drip))) pipeWater(pipe, effectiveTop, topCapY, bottomY, capX, capW);

    ctx.restore();
}
// Вода на трубах: капли оседают на верхней кромке обеих шляпок и подрастают, с верхней трубы срываются капли и падают вниз,
// при ударе о нижнюю шляпку и от дождя на кромках — мелкие брызги. Всё считается в системе координат трубы (после translate(pipe.x, 0)).
function pipeWater(pipe, dripY, topCapY, bottomY, capX, capW) {
    const W = pipe._w || (pipe._w = { beads: [], drip: null, sp: [] });
    const wet = STORM.wet, rk = stormRainK(Math.max(0, stormIntensity)), dt = dtMult;
    const edges = [topCapY, bottomY];
    const splash = (x, y, n, power) => {
        for (let i = 0; i < n; i++) W.sp.push({ x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 2.4 * power, vy: -(1.2 + Math.random() * 2.2) * power, l: 0, life: 16 + Math.random() * 14, r: 0.6 + Math.random() * 0.6 });
        if (W.sp.length > 40) W.sp.splice(0, W.sp.length - 40);
    };
    // новые капли на кромках: чем мокрее, тем чаще; от дождя — с маленьким всплеском
    for (let c = 0; c < 2; c++) {
        let cnt = 0; for (const b of W.beads) if (b.c === c) cnt++;
        if (cnt < 3 + Math.round(wet * 4) && Math.random() < 0.05 * wet * dt) {
            const x = capX + 5 + Math.random() * (capW - 10);
            W.beads.push({ c, x, rm: 1.0 + Math.random() * 1.2, age: 0, life: 260 + Math.random() * 360 });
            if (rk > 0.05) splash(x, edges[c], 2 + (Math.random() * 2 | 0), 0.8);
        }
    }
    // капля набухает под нижней кромкой шляпки верхней трубы и срывается
    if (!W.drip && wet > 0.1 && Math.random() < 0.012 * wet * dt) W.drip = { x: capX + 7 + Math.random() * (capW - 14), y: dripY, v: 0, g: 0, fall: false, r: 1.0 + Math.random() * 0.8 };
    ctx.fillStyle = 'rgb(172, 208, 245)';
    // лежащие капли-бусинки: появляются, чуть набухают и со временем высыхают
    for (let i = W.beads.length - 1; i >= 0; i--) {
        const b = W.beads[i]; b.age += dt;
        if (b.age > b.life || wet < 0.02) { W.beads.splice(i, 1); continue; }
        const gr = Math.min(1, b.age / 35), fd = Math.min(1, (b.life - b.age) / 60), r = b.rm * (0.4 + 0.6 * gr) * (0.6 + 0.4 * fd), y = edges[b.c];
        ctx.globalAlpha = 0.72 * Math.min(1, fd + 0.2);
        ctx.beginPath(); ctx.ellipse(b.x, y, r, r * 1.15, 0, Math.PI, 0); ctx.ellipse(b.x, y, r, r * 0.4, 0, 0, Math.PI); ctx.fill();
        ctx.globalAlpha = 0.9 * fd; ctx.fillStyle = '#F2FAFF';
        ctx.fillRect(b.x - r * 0.45, y - r * 0.85, Math.max(0.6, r * 0.45), Math.max(0.6, r * 0.45));
        ctx.fillStyle = 'rgb(172, 208, 245)';
    }
    // стекающая капля
    const d = W.drip;
    if (d) {
        if (!d.fall) {
            d.g += dt / 55;
            const k = Math.min(1, d.g), r = d.r * (0.5 + 0.5 * k);
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.ellipse(d.x, d.y + r * (0.6 + 0.9 * k), r, r * (1 + 0.7 * k), 0, 0, Math.PI * 2); ctx.fill();   // капля вытягивается вниз
            if (d.g >= 1) { d.fall = true; d.v = 0.6; d.y += r * 1.6; }
        } else {
            d.v = Math.min(10, d.v + 0.26 * dt); d.y += d.v * dt;
            ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(d.x - d.r * 0.55, d.y); ctx.lineTo(d.x, d.y - d.r * (1.4 + d.v * 0.55)); ctx.lineTo(d.x + d.r * 0.55, d.y); ctx.fill();   // хвостик
            ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
            if (d.y >= bottomY || d.y > height) {
                if (d.y >= bottomY) { splash(d.x, bottomY, 5, 1); W.beads.push({ c: 1, x: d.x, rm: 0.9 + Math.random() * 0.6, age: 0, life: 200 + Math.random() * 200 }); }
                W.drip = null;
            }
        }
    }
    // брызги: мелкие капли разлетаются и падают
    for (let i = W.sp.length - 1; i >= 0; i--) {
        const p = W.sp[i]; p.l += dt;
        if (p.l >= p.life) { W.sp.splice(i, 1); continue; }
        p.vy += 0.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = 0.8 * (1 - p.l / p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawSparkleStar(cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
