// Живой логотип в главном меню: время от времени сова «ворует» джойстик или превращается из него
(function () {
    const wrap = document.querySelector('#startScreen > .menu-logo-wrap');
    if (!wrap) return;
    const icon = wrap.querySelector('.fa-gamepad'), tile = icon && icon.parentElement;
    if (!icon || !tile) return;
    wrap.style.position = 'relative';
    const cv = document.createElement('canvas');
    cv.className = 'logo-fx';
    wrap.appendChild(cv);
    const g = cv.getContext('2d');
    const st = document.createElement('style');
    st.textContent = '#startScreen > .menu-logo-wrap .logo-fx{position:absolute;left:-40px;right:-40px;top:-70px;bottom:-50px;width:calc(100% + 80px);height:calc(100% + 120px);pointer-events:none;z-index:3}'
        + '#startScreen > .menu-logo-wrap .fa-gamepad{display:inline-block;will-change:transform}';
    document.head.appendChild(st);

    // кадры совы (крылья вниз / посередине / вверх) — рисуем один раз той же функцией, что и в игре
    const SPR = [];
    function makeSprites() {
        if (SPR.length || typeof owl === 'undefined' || !owl.draw || typeof ctx === 'undefined') return SPR.length > 0;
        const keys = ['x', 'y', 'rotation', 'visible', 'wing', 'lean', 'boostK', 'spinAngle'];
        const save = {}; keys.forEach(k => save[k] = owl[k]);
        const main = ctx, ga = gameActive, wft = waitingFirstTap, d = currentDrunkFactor, fz = currentFreezeFactor, ov = currentOvereatFactor;
        try {
            gameActive = false; waitingFirstTap = false; currentDrunkFactor = 0; currentFreezeFactor = 0; currentOvereatFactor = 0;
            [0, 0.5, 1].forEach(w => {
                const c = document.createElement('canvas'); c.width = c.height = 240; const o = c.getContext('2d');
                const k = 240 / 96; o.setTransform(k, 0, 0, k, 120, 120);
                owl.x = 0; owl.y = 0; owl.rotation = 0; owl.visible = true; owl.wing = w; owl.lean = 0; owl.boostK = 0; owl.spinAngle = 0;
                ctx = o; owl.draw();
                SPR.push(c);
            });
        } catch (e) { SPR.length = 0; }
        finally {
            ctx = main; gameActive = ga; waitingFirstTap = wft; currentDrunkFactor = d; currentFreezeFactor = fz; currentOvereatFactor = ov;
            keys.forEach(k => owl[k] = save[k]);
        }
        return SPR.length > 0;
    }

    const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const back = (t) => { t = Math.max(0, Math.min(1, t)); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const SCENES = [{ name: 'steal', dur: 3.6 }, { name: 'morph', dur: 3.4 }];
    let scene = null, t0 = 0, raf = 0, nextAt = performance.now() + 5000, which = 0, sparks = [];

    function canRun() {
        const ss = document.getElementById('startScreen');
        if (!ss || ss.classList.contains('hidden') || document.hidden) return false;
        if (document.documentElement.classList.contains('booting') || window.__booting) return false;
        if (getComputedStyle(ss).visibility === 'hidden' || +getComputedStyle(ss).opacity < 0.5) return false;
        // открыто какое-нибудь окно поверх меню — не отвлекаем
        const open = ['#quizModal', '#shopModal', '#rouletteModal', '#settingsModal', '#rulesModal', '#adminModal'].some(s => { const m = document.querySelector(s); return m && !m.classList.contains('hidden') && m.offsetParent !== null; });
        return !open;
    }
    function sizeCanvas() {
        const r = cv.getBoundingClientRect(), k = cv.offsetWidth ? r.width / cv.offsetWidth : 1;
        const dpr = Math.min(2.5, window.devicePixelRatio || 1) * k;
        const W = Math.round(cv.offsetWidth * dpr), H = Math.round(cv.offsetHeight * dpr);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const tr = tile.getBoundingClientRect();
        return { w: cv.offsetWidth, h: cv.offsetHeight, tx: (tr.left - r.left + tr.width / 2) / k, ty: (tr.top - r.top + tr.height / 2) / k, ts: tr.width / k };
    }
    function drawOwl(x, y, size, rot, wing, alpha) {
        const s = SPR[wing]; if (!s) return;
        g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.translate(x, y); g.rotate(rot);
        g.drawImage(s, -size / 2, -size / 2, size, size); g.restore();
    }
    function glow(x, y, r, a, col) {
        if (a <= 0.01) return;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${col},${(0.55 * a).toFixed(3)})`); gr.addColorStop(0.5, `rgba(${col},${(0.22 * a).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    function burst(x, y, n, col) {
        for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n + Math.random() * 0.4, v = 40 + Math.random() * 50; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.55 + Math.random() * 0.3, col, s: 5 + Math.random() * 5 }); }
    }
    function drawSparks(dt) {
        sparks = sparks.filter(p => (p.life += dt) < p.max);
        sparks.forEach(p => {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95;
            const k = 1 - p.life / p.max;
            g.save(); g.globalAlpha = k; g.fillStyle = p.col; g.shadowColor = p.col; g.shadowBlur = 8;
            g.font = `900 ${(p.s * (0.6 + k * 0.6)).toFixed(1)}px Onest,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('✦', p.x, p.y); g.restore();
        });
    }
    function setIcon(dx, dy, sx, sy, rot, op) {
        icon.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${(rot || 0).toFixed(3)}rad) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
        icon.style.opacity = op == null ? '' : String(op);
    }
    function resetIcon() { icon.style.transform = ''; icon.style.opacity = ''; }

    let lastT = 0, flags = {};
    function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
        if (!scene) {
            if (now >= nextAt) {
                if (canRun() && makeSprites()) { scene = SCENES[which % SCENES.length]; which++; t0 = now; flags = {}; sparks = []; }
                else nextAt = now + 2000;
            }
            if (!scene) return;   // ждём — проверку раз в секунду делает таймер ниже
        }
        if (!canRun()) { stop(); return; }
        const L = sizeCanvas(), t = (now - t0) / 1000, { tx, ty, ts } = L;
        g.clearRect(0, 0, L.w, L.h);
        const flap = Math.floor(now / 70) % 4, wingIx = flap === 0 ? 0 : flap === 2 ? 2 : 1;
        const OS = ts * (scene.name === "steal" ? 1.7 : 1.25);   // размер совы на логотипе
        if (scene.name === 'steal') {
            // 1) сова прилетает слева по дуге и зависает над джойстиком
            if (t < 1.0) {
                const k = ease(t / 1.0);
                const x = lerp(-OS, tx, k), y = lerp(ty - 40, ty - ts * 0.55, k) - Math.sin(k * Math.PI) * 26;
                glow(tx, ty, ts * 1.3, k * 0.6, '254,118,0');
                drawOwl(x, y, OS, lerp(0.25, 0, k), wingIx);
                setIcon(0, 0, 1, 1, 0);
            } else if (t < 1.35) {   // подхватывает: джойстик подпрыгивает к лапкам
                const k = (t - 1.0) / 0.35, y = ty - ts * 0.55 + Math.sin(k * Math.PI) * 4;
                glow(tx, ty, ts * 1.3, 0.6, '254,118,0');
                setIcon(0, -ts * 0.22 * ease(k), 1 - 0.1 * Math.sin(k * Math.PI), 1 + 0.12 * Math.sin(k * Math.PI), 0);
                drawOwl(tx, y, OS, 0, wingIx);
                if (!flags.grab && k > 0.5) { flags.grab = 1; burst(tx, ty - ts * 0.2, 6, '#FFD08A'); }
            } else if (t < 2.4) {   // улетает вправо-вверх вместе с джойстиком
                const k = ease((t - 1.35) / 1.05);
                const x = lerp(tx, L.w + OS, k), y = lerp(ty - ts * 0.55, -OS * 0.6, k * k);
                glow(tx, ty, ts * 1.3, 0.6 * (1 - k), '254,118,0');
                drawOwl(x, y, OS, -0.25 * k, wingIx);
                setIcon(x - tx, y - ty + OS * 0.32, 0.8, 0.8, -0.3 * k, 1 - Math.max(0, (k - 0.85) / 0.15));
            } else if (t < 2.85) {   // пустая плитка
                setIcon(0, 0, 0, 0, 0, 0);
            } else {   // хоп — джойстик снова на месте
                const k = (t - 2.85) / 0.45, s = back(k);
                if (!flags.pop) { flags.pop = 1; burst(tx, ty, 10, '#FFE08A'); }
                glow(tx, ty, ts * 1.2, 0.7 * (1 - k), '255,224,138');
                setIcon(0, 0, s, s, 0, 1);
            }
        } else {
            // 1) джойстик сжимается и исчезает со вспышкой
            if (t < 0.45) {
                const k = t / 0.45;
                const sx = k < 0.5 ? 1 + 0.25 * ease(k * 2) : lerp(1.25, 0, ease((k - 0.5) * 2)), sy = k < 0.5 ? 1 - 0.35 * ease(k * 2) : lerp(0.65, 0, ease((k - 0.5) * 2));
                setIcon(0, 0, sx, sy, 0);
                glow(tx, ty, ts * 1.4, ease(k) * 0.8, '168,85,247');
            } else if (t < 2.75) {   // 2) появляется сова в мягкой размытой подсветке
                setIcon(0, 0, 0, 0, 0, 0);
                if (!flags.pop) { flags.pop = 1; burst(tx, ty, 10, '#C4A1FF'); }
                const k = (t - 0.45);
                const s = back(Math.min(1, k / 0.4)), bob = Math.sin(k * 4.2) * 2.5;
                const pulse = 0.8 + 0.2 * Math.sin(k * 5);
                glow(tx, ty, ts * 1.5 * pulse, 0.9, '168,85,247');
                glow(tx, ty, ts * 0.9, 0.6, '255,200,120');
                const w = k < 0.4 ? 1 : (Math.floor(k * 6) % 3);   // пару раз машет крыльями
                drawOwl(tx, ty + bob - 2, OS * 1.05 * s, Math.sin(k * 3) * 0.06, w);
            } else {   // 3) сова сжимается — джойстик возвращается
                const k = (t - 2.75) / 0.65;
                const os = 1 - ease(Math.min(1, k / 0.45));
                glow(tx, ty, ts * 1.5, 0.9 * (1 - k), '168,85,247');
                if (os > 0.01) drawOwl(tx, ty - 2, OS * 1.05 * os, 0, 1);
                if (k > 0.35) { if (!flags.back) { flags.back = 1; burst(tx, ty, 8, '#FFE08A'); } const s = back((k - 0.35) / 0.65); setIcon(0, 0, s, s, 0, 1); }
                else setIcon(0, 0, 0, 0, 0, 0);
            }
        }
        drawSparks(dt);
        if (t >= scene.dur) { stop(); return; }
        raf = requestAnimationFrame(frame);
    }
    function stop() {
        scene = null; resetIcon(); sparks = [];
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        nextAt = performance.now() + 11000 + Math.random() * 5000;
        schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
    // проверяем реже, пока ничего не играет
    setInterval(() => { if (!scene && !raf) schedule(); }, 1000);
    schedule();
    window.logoAnimPlay = (i) => { which = i || 0; nextAt = 0; schedule(); };
})();
