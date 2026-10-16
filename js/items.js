// ===== Лёгкая «живость» иконок: изредка иконка слегка покачивается (вместе со своими эффектами), плавно и аккуратно =====
// Возвращает прогресс короткого движения 0..1 или -1, если сейчас пауза (движение бывает не в каждом цикле)
function tiEvent(t, ph, period, dur, chance) {
    const x = t / period + ph * 3.7, idx = Math.floor(x), f = (x - idx) * period;
    if (f > dur) return -1;
    const h = Math.sin((idx + 1) * 12.9898 + ph * 78.233) * 43758.5453, r = h - Math.floor(h);
    return r > chance ? -1 : f / dur;
}
function tiInOut(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
// sway — качнётся из стороны в сторону (по умолчанию у всех); tiltlift — чуть приподнимется и наклонится; lift — мягко «вздохнёт»; turn — плавно повернётся и остановится
const GENTLE_MODE = { heart: 'lift', burger: 'tiltlift', hotdog: 'tiltlift', pizza: 'tiltlift' };
function tiApplyGentle(c, item) {
    const mode = GENTLE_MODE[item.type] || 'sway';
    const ph = item.floatOffset || 0;
    const period = (mode === 'turn' ? 7 : 4.8) + ((ph * 10) % 2), dur = mode === 'turn' ? 1.3 : 1.7, chance = mode === 'turn' ? 0.6 : 0.7;
    const u = tiEvent(frame / 60, ph, period, dur, chance);
    if (u < 0) return;
    const s = Math.sin(Math.PI * u);                 // плавное нарастание и затухание
    const wv = Math.sin(u * Math.PI * 4);                  // два полных качка: вправо — влево — вправо — влево, поровну в обе стороны
    if (mode === 'sway') { c.translate(wv * 1.1 * s, 0); c.rotate(wv * 0.17 * s); }
    else if (mode === 'tiltlift') { c.translate(wv * 0.8 * s, -2.4 * s); c.rotate(wv * 0.13 * s); }
    else if (mode === 'lift') { const kk = 1 + 0.09 * s; c.scale(kk, kk); c.translate(0, -1.2 * s); }
    else if (mode === 'turn') c.rotate(tiInOut(u) * Math.PI * 2);
}

// Мягкий ореол вокруг жетона — заготовленная картинка (не зависит от теней, поэтому виден и на «низкой» графике)
const __tokenHalo = {};
function tokenHalo(col) {
    if (__tokenHalo[col]) return __tokenHalo[col];
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'destination-in';
    const m = g.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S / 2);
    m.addColorStop(0, 'rgba(0,0,0,0.55)'); m.addColorStop(0.45, 'rgba(0,0,0,0.22)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, S, S);
    return (__tokenHalo[col] = c);
}
// Секретная звезда: золото внутри неё медленно переливается, иногда по ней пробегает блик, рядом изредка вспыхивают искорки
let __starCv = null;
function drawSecretStar(c, t, ph) {
    if (!__starCv) { __starCv = document.createElement('canvas'); __starCv.width = __starCv.height = 64; }
    const k = __starCv.getContext('2d');
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, 64, 64);
    k.translate(32, 32); k.font = '900 23px "Font Awesome 6 Free"'; k.textAlign = 'center'; k.textBaseline = 'middle';
    const gold = k.createLinearGradient(-10, -12, 10, 12);                  // лёгкий неподвижный градиент: светлее сверху слева, чуть насыщеннее снизу справа
    gold.addColorStop(0, '#FFD94F'); gold.addColorStop(0.55, '#FFC41A'); gold.addColorStop(1, '#F2A900');
    k.fillStyle = gold; k.fillText('\uf005', 0, 0.5);
    const u = tiEvent(t, ph, 2.2, 1.0, 0.92);                               // перелив пробегает по звезде очень часто: примерно раз в 2,5 секунды
    if (u >= 0) {
        const e = tiInOut(u), x = -24 + e * 48;
        k.globalCompositeOperation = 'source-atop';
        const soft = k.createLinearGradient(x - 11, -7, x + 11, 7);          // широкая мягкая тёплая полоса
        soft.addColorStop(0, 'rgba(255, 238, 170, 0)'); soft.addColorStop(0.5, 'rgba(255, 238, 170, 0.6)'); soft.addColorStop(1, 'rgba(255, 238, 170, 0)');
        k.fillStyle = soft; k.fillRect(-20, -20, 40, 40);
        const sharp = k.createLinearGradient(x - 8, -5, x - 1, 5);           // узкая яркая полоса чуть позади
        sharp.addColorStop(0, 'rgba(255, 255, 240, 0)'); sharp.addColorStop(0.5, 'rgba(255, 255, 240, 0.95)'); sharp.addColorStop(1, 'rgba(255, 255, 240, 0)');
        k.fillStyle = sharp; k.fillRect(-20, -20, 40, 40);
    }
    c.drawImage(__starCv, -32, -32);
    if (u >= 0) {                                                            // на пике перелива по краям звезды вспыхивают искорки
        const a = Math.sin(u * Math.PI);
        if (a > 0.2) { drawSparkleStar(8, -8, 4, 1.5 + 3.5 * a, 0.4 + 0.9 * a, '#FFF6C8', a); drawSparkleStar(-9, 3, 4, 1 + 2.5 * a, 0.3 + 0.7 * a, '#FFFFFF', a * 0.9); }
    }
}

// ===== Заготовленные картинки (спрайты) для жетонов =====
// Тень (shadowBlur) — самая тяжёлая операция на телефоне. Неподвижные части жетона (тёмный круг с кольцом и светом, иконка со свечением)
// рисуются один раз в отдельный маленький холст в разрешении экрана и дальше просто копируются — вид тот же, а нагрузки в разы меньше.
const __tokSpr = new Map();
// Разрешение заготовки: пикселей экрана на единицу мира. Берём базовый масштаб игры (без плавного приближения камеры при ускорении/замедлении),
// иначе во время наезда камеры заготовки пересоздавались бы на каждом шаге. Если холст рисуется совсем в другом масштабе (предпросмотр в админке) — берём его.
function tokDevScale(c, div, mul) {
    const base = viewScale * renderScale * WORLD_K * (mul || 1);
    let s = base;
    if (c.getTransform) { const m = c.getTransform(), t = Math.hypot(m.a, m.b) / (div || 1); if (t > base * 1.3 || t < base / 1.3) s = t; }
    return Math.max(0.5, Math.round(s * __tokHoldK * 10) / 10);
}
function tokSprite(key, R, hw, hh, paint) {
    let s = __tokSpr.get(key);
    if (s) return s;
    if (__tokSpr.size > 400) __tokSpr.clear();   // предметы держат ссылку на свою заготовку сами — очистка безопасна
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(hw * 2 * R)); c.height = Math.max(1, Math.ceil(hh * 2 * R));
    const g = c.getContext('2d');
    g.setTransform(R, 0, 0, R, c.width / 2, c.height / 2);
    paint(g);
    s = { c, x: -c.width / 2 / R, y: -c.height / 2 / R, w: c.width / R, h: c.height / R };
    __tokSpr.set(key, s);
    return s;
}
const __faReady = { ok: false };
function tokFontsReady() {
    if (__faReady.ok) return true;
    try { if (document.fonts && document.fonts.check('900 23px "Font Awesome 6 Free"')) __faReady.ok = true; } catch (e) {}
    return __faReady.ok;
}

// Оптический центр каждой иконки (в основном по её габаритам, с небольшой поправкой на «центр тяжести»): иконку сдвигаем на эту величину назад, чтобы она визуально стояла ровно в центре круга
const SHZ_TOKEN = { name: 'ШАЗАМ', color: '#FF7A00', iconCode: '\ue0b7', faClass: 'fa-bolt-lightning' };
const TOKEN_OPTICAL = { crystal: [0, 0.3], water: [0, 0.6], music: [0.49, 0.03], logic: [-0.02, 0.16], kino: [-0.01, 0.07], series: [-0.07, 0.46], cartoons: [-0.08, 0.35], fun: [0.13, 0.92], secret: [-0.06, 0.38], shield: [-0.39, -0.2], stamina: [0.46, -0.31], drink: [-0.19, -0.36], mocktail: [0.25, -0.02], icecream: [-0.06, -0.47], heart: [-0.06, -0.15], pizza: [-0.18, 0.18], burger: [-0.06, 0.22], hotdog: [-0.07, 0.07], speedup: [-0.06, 0.07], slowmo: [-0.06, 0.19], question: [-0.02, 0.14] };

const TOKEN_THEMATIC = new Set(['music', 'logic', 'kino', 'series', 'cartoons', 'fun', 'secret']);
function drawToken(item) {
    ctx.save();
    ctx.translate(item.x, item.y);

    const currentScale = (item.scale !== undefined) ? item.scale : 1.0;
    if (currentScale <= 0.01) {
        ctx.restore();
        return;
    }
    ctx.scale(currentScale * 1.05, currentScale * 1.05);   // кружки с иконками на 5% крупнее (вместе с содержимым)

    // ускорение, которое включит ШАЗАМ, выглядит как значок ШАЗАМа (оранжевая молния, как в правилах)
    // взятый значок доигрывает анимацию тем же видом, что был до подбора (иначе на миг мелькала обычная иконка ускорения)
    const shzCharged = item.type === 'speedup' && (item.__forceShz || (item.collected ? !!item.__shzLatch : (item.__shzLatch = typeof shazamNextCharged === 'function' && shazamNextCharged())));
    const cat = shzCharged ? SHZ_TOKEN : (CATEGORIES[item.type] || CATEGORIES.question);
    const col = cat.color;
    const isThematic = TOKEN_THEMATIC.has(item.type);

    {
        const R = item.radius * (isThematic ? 1.5 : 1.43);   // свечение выходит за кольцо вдвое меньше
        ctx.globalAlpha = isThematic ? 0.42 : 0.35;   // ореол вдвое мягче
        ctx.drawImage(tokenHalo(col), -R, -R, R * 2, R * 2);
        ctx.globalAlpha = 1;
    }
    const sBlur = isThematic ? 19 : 11, lowQ = gfxQuality === 'low';
    const devR = tokDevScale(ctx, currentScale, 1.05);   // разрешение заготовки — как у жетона обычного размера
    {
        // тёмный круг с цветным кольцом и светом вокруг — из заготовки
        const rad = item.radius, pad = rad + (lowQ ? 2 : (sBlur * 2 + 4) / devR), bk = (lowQ ? -devR : devR) + col;
        const spr = (item.__bk === bk && item.__bs) ? item.__bs : (item.__bk = bk, item.__bs = tokSprite(`b|${col}|${rad}|${sBlur}|${devR}|${lowQ ? 1 : 0}`, devR, pad, pad, (g) => {
            if (!lowQ) { g.shadowColor = col; g.shadowBlur = sBlur; }
            const bgGrad = g.createRadialGradient(-2, -2, 2, 0, 0, rad);
            bgGrad.addColorStop(0, '#361163');
            bgGrad.addColorStop(0.7, '#1b0735');
            bgGrad.addColorStop(1, '#0e021c');
            g.fillStyle = bgGrad;
            g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fill();
            g.lineWidth = 2.0;
            g.strokeStyle = col;
            g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.stroke();
        }));
        ctx.shadowBlur = 0;
        ctx.drawImage(spr.c, spr.x, spr.y, spr.w, spr.h);
    }
    ctx.shadowColor = col;
    ctx.shadowBlur = sBlur;   // искорки вокруг тематических жетонов светятся, как раньше

    if (isThematic) {
        const sparkles = [
            { dx: -item.radius * 0.85, dy: -item.radius * 0.8, size: 6.0, phase: 0 },
            { dx: item.radius * 0.95, dy: -item.radius * 0.55, size: 7.5, phase: 2.1 },
            { dx: -item.radius * 0.75, dy: item.radius * 0.85, size: 6.5, phase: 4.2 },
            { dx: item.radius * 0.8, dy: item.radius * 0.75, size: 5.5, phase: 1.3 }
        ];

        sparkles.forEach(s => {
            const shimmer = (Math.sin(frame * 0.08 + item.floatOffset + s.phase) + 1) / 2;
            const currentOuter = s.size * (0.55 + shimmer * 0.55);
            const currentInner = currentOuter * 0.28;
            const alpha = 0.35 + shimmer * 0.65;
            drawSparkleStar(s.dx, s.dy, 4, currentOuter, currentInner, '#FFFFFF', alpha);
            drawSparkleStar(s.dx, s.dy, 4, currentOuter * 0.6, currentInner * 0.3, col, alpha * 0.8);
        });
    }

    ctx.save();
    tiApplyGentle(ctx, item);   // иконка и её эффекты слегка покачиваются вместе
    if (item.type === 'compress') {
        ctx.save();
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = col;
        ctx.shadowBlur = 9;

        ctx.beginPath();
        ctx.moveTo(0, -14.5);
        ctx.lineTo(0, -3.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-5.5, -8.2);
        ctx.lineTo(0, -2.5);
        ctx.lineTo(5.5, -8.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 14.5);
        ctx.lineTo(0, 3.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-5.5, 8.2);
        ctx.lineTo(0, 2.5);
        ctx.lineTo(5.5, 8.2);
        ctx.stroke();

        ctx.restore();
    } else if (item.type === 'infinite') {
        ctx.save();
        ctx.shadowBlur = 9;
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.font = '900 16px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf56b', -4, -1);
        
        ctx.font = '900 13px Onest, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
        ctx.fillText('∞', 8, 4);
        ctx.restore();
    } else {
        { const oc = TOKEN_OPTICAL[item.type]; if (oc) ctx.translate(-oc[0], -oc[1]); }   // визуально точно по центру круга
        ctx.shadowBlur = 10;   // сама иконка подсвечена чуть сильнее
        ctx.shadowColor = col;
        ctx.fillStyle = col;
        ctx.font = '900 23px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (item.type === 'secret') drawSecretStar(ctx, frame / 60, item.floatOffset || 0);
        else if (tokFontsReady()) {
            // иконка со свечением — из заготовки (шрифт уже загружен)
            const code = cat.iconCode, pad = 16 + (lowQ ? 1 : 24 / devR), gk = (lowQ ? -devR : devR) + code;
            const spr = (item.__gk === gk && item.__gs) ? item.__gs : (item.__gk = gk, item.__gs = tokSprite(`g|${item.type}|${code}|${col}|${devR}|${lowQ ? 1 : 0}`, devR, pad, pad, (g) => {
                if (!lowQ) { g.shadowBlur = 10; g.shadowColor = col; }
                g.fillStyle = col;
                g.font = '900 23px "Font Awesome 6 Free"';
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                drawGlyph(g, code, 0, 0.5);
            }));
            ctx.shadowBlur = 0;
            ctx.drawImage(spr.c, spr.x, spr.y, spr.w, spr.h);
            ctx.shadowBlur = 10;
        }
        else drawGlyph(ctx, cat.iconCode, 0, 0.5);
        if (item.type === 'crystal') {
            // огонёк переливается искрами, как огненные шары: на пламени мерцает блик, вверх вылетают звёздочки-искры
            const ph = item.floatOffset || 0, n = gfxQuality === 'low' ? 4 : 8;
            ctx.shadowBlur = 0;
            const tw = (Math.sin(frame * 0.12 + ph * 3) + 1) / 2;
            ctx.globalAlpha = 0.06 + 0.3 * tw * tw; ctx.fillStyle = '#FFE7A8';
            drawGlyph(ctx, cat.iconCode, 0, 0.5);
            const cols = ['#FFD27A', '#FF4A3D', '#FFFFFF', '#FF8A3D'];
            for (let i = 0; i < n; i++) {
                const u = (frame * 0.022 + i / n + ph * 0.31) % 1;
                const sx = Math.sin(i * 2.39 + ph) * 7 + Math.sin(u * 6 + i) * 2.2, sy = 6 - u * 26;
                const al = Math.min(1, u / 0.12) * Math.pow(1 - u, 1.2);
                const o = (1.6 + (i % 3) * 0.7) * (1 - u * 0.5);
                drawSparkleStar(sx, sy, 4, o, o * 0.3, cols[i % 4], al);
            }
            ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.shadowBlur = 10;
        }
        if (item.type === 'water') {
            // капля переливается: пробегает блик, вокруг поднимаются пузырьки
            const ph = item.floatOffset || 0, n = gfxQuality === 'low' ? 4 : 7;
            ctx.shadowBlur = 0;
            const tw = (Math.sin(frame * 0.1 + ph * 3) + 1) / 2;
            ctx.globalAlpha = 0.05 + 0.3 * tw * tw; ctx.fillStyle = '#E0F6FF';
            drawGlyph(ctx, cat.iconCode, 0, 0.5);
            for (let i = 0; i < n; i++) {
                const u = (frame * 0.018 + i / n + ph * 0.31) % 1;
                const bx = Math.sin(i * 2.39 + ph) * 8 + Math.sin(u * 6 + i) * 1.6, by = 8 - u * 26;
                const br = (0.7 + (i % 3) * 0.35) * (0.8 + 0.4 * u), al = Math.min(1, u / 0.12) * Math.pow(1 - u, 1.2) * 0.9;
                ctx.globalAlpha = al;
                ctx.fillStyle = 'rgba(190, 230, 255, 0.25)'; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(220, 245, 255, 0.9)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.25, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.shadowBlur = 10;
        }
        if (item.type === 'drink' || item.type === 'mocktail') {
            const ph = item.floatOffset || 0, n = gfxQuality === 'low' ? 3 : 6;
            ctx.shadowBlur = 0;
            // аккуратный блеск только на самой иконке бокала
            const tw = (Math.sin(frame * 0.09 + ph * 3) + 1) / 2;
            ctx.globalAlpha = 0.04 + 0.26 * Math.pow(tw, 3);
            ctx.fillStyle = '#FFFFFF';
            drawGlyph(ctx, cat.iconCode, 0, 0.5);
            const sp = Math.pow(Math.max(0, Math.sin(frame * 0.07 + ph * 5)), 6);       // редкая крошечная искорка на кромке бокала
            if (sp > 0.03) {
                const sx = item.type === 'drink' ? -6.5 : 4.5, sy = item.type === 'drink' ? -8 : -9.5, ss = 1.2 + 2.2 * sp;
                ctx.globalAlpha = sp;
                ctx.beginPath();
                ctx.moveTo(sx, sy - ss); ctx.quadraticCurveTo(sx, sy, sx + ss, sy);
                ctx.quadraticCurveTo(sx, sy, sx, sy + ss); ctx.quadraticCurveTo(sx, sy, sx - ss, sy);
                ctx.quadraticCurveTo(sx, sy, sx, sy - ss); ctx.fill();
            }
            // пузырьки поднимаются из центра бокала: у мартини чаша левее центра иконки (долька лимона), у пивной кружки пена левее ручки
            const centerX = item.type === 'drink' ? -3 : -0.9, topY = item.type === 'drink' ? -9.5 : -11;
            for (let i = 0; i < n; i++) {
                const u = (frame * 0.019 + i / n + ph * 0.37) % 1;
                const bx = centerX - 3 + ((i * 2.5 + ph * 2) % 6) + Math.sin(u * 7 + i * 1.7) * 0.9;
                const by = topY - u * 24;                       // пузырьки выходят прямо с верхней кромки (у пива — с пены)
                const br = (0.7 + (i % 3) * 0.36) * (0.85 + 0.3 * u);
                const al = Math.min(1, u / 0.1) * Math.pow(1 - u, 1.15) * 0.8;
                ctx.globalAlpha = al;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 0.7;
                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.22, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        if (item.type === 'icecream') {
            // мороженое заметно блестит льдом: яркие белые вспышки по иконке и мерцающие кристаллики
            const ph = item.floatOffset || 0;
            const tw = (Math.sin(frame * 0.1 + ph) + 1) / 2;
            ctx.globalAlpha = 0.12 + 0.78 * Math.pow(tw, 3);
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#E0F7FF';
            ctx.shadowBlur = 4 + 10 * tw;
            drawGlyph(ctx, cat.iconCode, 0, 0.5);
            ctx.shadowBlur = 0;
            [[7, -9, 0], [-7, -4, 2.1], [4, 8, 4.2]].forEach(([sx, sy, off]) => {
                const a = Math.pow(Math.max(0, Math.sin(frame * 0.12 + ph + off)), 2);
                if (a < 0.02) return;
                const ss = 2.2 + 2.2 * a;
                ctx.globalAlpha = a;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(sx, sy - ss); ctx.quadraticCurveTo(sx, sy, sx + ss, sy);
                ctx.quadraticCurveTo(sx, sy, sx, sy + ss); ctx.quadraticCurveTo(sx, sy, sx - ss, sy);
                ctx.quadraticCurveTo(sx, sy, sx, sy - ss); ctx.fill();
                ctx.globalAlpha = a * 0.35;
                ctx.beginPath(); ctx.arc(sx, sy, ss * 1.1, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
    }
    if (shzCharged && !item.__forceShz) shazamDrawItemCharge(item);   // это ускорение включит ШАЗАМ — молния искрит
    ctx.restore();   // конец группы покачивания
    ctx.restore();
}

// Заготовки всех жетонов и шляпки трубы готовим заранее (при старте полёта), чтобы первый подбор/появление нового значка не создавал их посреди игры
function prewarmTokenSprites() {
    try {
        if (!tokFontsReady()) return;
        const c = document.createElement('canvas'); c.width = c.height = 4;
        const g = c.getContext('2d'), main = ctx, fr = frame, S = viewScale * renderScale * WORLD_K;
        ctx = g;
        try {
            for (const t of Object.keys(CATEGORIES)) { g.setTransform(S, 0, 0, S, 0, 0); drawToken({ x: 0, y: 0, radius: 26, type: t, floatOffset: 0, scale: 1 }); }
            g.setTransform(S, 0, 0, S, 0, 0); drawToken({ x: 0, y: 0, radius: 26, type: 'speedup', floatOffset: 0, scale: 1, __forceShz: true });
            g.setTransform(S, 0, 0, S, 0, 0); drawPipe({ x: 0, width: 86, top: 200, gap: 220, bottom: 200 });
        } finally { ctx = main; frame = fr; }
    } catch (e) {}
}
