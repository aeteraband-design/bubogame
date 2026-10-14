        (function () {
            // Экран загрузки: по центру крупно проценты, над ними сова, которая по ходу загрузки плавно меняется — пьяная, замёрзшая, объевшаяся.
            // Сову рисует сама игра (те же функции, что в полёте). В конце внизу пульсирует надпись; нажать можно в любом месте —
            // экран исчезает и включается музыка (браузеры разрешают звук только после нажатия)
            var el = document.getElementById('bootLoader'), fill = document.getElementById('blFill'), pct = document.getElementById('blPct'),
                go = document.getElementById('blGo'), logo = document.getElementById('blLogo'), label = document.getElementById('blLabel'),
                oc = document.getElementById('blOwlCv'), octx = oc.getContext('2d');
            var shown = 0, target = 12, t0 = performance.now(), ready = false, lastT = t0, loFrame = 0;
            function set(t) { if (t > target) target = t; }
            document.addEventListener('DOMContentLoaded', function () { set(45); });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { set(75); });
            window.addEventListener('load', function () { set(92); });
            window.__bootDone = function () { set(100); };
            setTimeout(function () { set(100); }, 7000);   // страховка
            function ph(a, b) { var t = Math.max(0, Math.min(1, (shown - a) / (b - a))); return t * t * (3 - 2 * t); }
            var owlOk = true;
            // звёзды на фоне — такие же, как в игре: белые точки разного размера, мерцают, у крупных мягкое свечение
            var sc = document.getElementById('blStars'), sctx = sc.getContext('2d'), bgStars = [], starGlow = null, sdpr = 1;
            function initStars() {
                sdpr = Math.min(2, window.devicePixelRatio || 1);
                var w = sc.clientWidth || window.innerWidth, h = sc.clientHeight || window.innerHeight;   // звёзды — по размеру колонки
                sc.width = Math.round(w * sdpr); sc.height = Math.round(h * sdpr);
                bgStars.length = 0;
                for (var i = 0, n = Math.round(75 * Math.max(1, (w * h) / 356000)); i < n; i++) {
                    bgStars.push({ x: Math.random() * w, y: Math.random() * h, size: Math.random() * 1.15 + 0.4, alpha: Math.random() * 0.8 + 0.2 });
                }
            }
            function drawStars(k) {
                if (!starGlow) {
                    starGlow = document.createElement('canvas'); starGlow.width = starGlow.height = 32;
                    var g = starGlow.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
                    rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
                    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
                }
                sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, sc.width, sc.height);
                sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0); sctx.fillStyle = '#FFFFFF';
                for (var i = 0; i < bgStars.length; i++) {
                    var st = bgStars[i];
                    st.alpha += (Math.random() - 0.5) * 0.05 * k; st.alpha = Math.max(0.2, Math.min(0.95, st.alpha));
                    sctx.globalAlpha = st.alpha;
                    if (st.size > 1.2) sctx.drawImage(starGlow, st.x - 6, st.y - 6, 12, 12);
                    sctx.beginPath(); sctx.arc(st.x, st.y, st.size, 0, Math.PI * 2); sctx.fill();
                }
                sctx.globalAlpha = 1;
            }
            initStars(); window.addEventListener('resize', initStars);
            var owlBox = el.querySelector('.bl-owlbox'), owlCssW = 0;
            var LS = { stars: [], acc: 0 };   // звёздочки ускорения для финального вида совы на загрузке
            function drawOwl(now, d, fz, ov, fin) {   // рисуем сову игры в нужном состоянии (значения игры возвращаем на место сразу после)
                if (!owlOk) return;
                try {
                    if (typeof owl === 'undefined' || typeof ctx === 'undefined' || !owl.draw) return;
                    var dpr = Math.min(2, window.devicePixelRatio || 1);
                    var zz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1;
                    var cssW = Math.max(360, Math.ceil(window.innerWidth / (zz * 0.88)));   // холст на всю ширину экрана (с учётом масштаба): звёздочки улетают до самого края
                    if (cssW !== owlCssW) { owlCssW = cssW; oc.style.width = cssW + 'px'; owlBox.style.width = cssW + 'px'; owlBox.style.marginLeft = (-cssW / 2) + 'px'; }
                    var W = Math.round(cssW * dpr), H = Math.round(360 * dpr);
                    if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }
                    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
                    var k = (170 * dpr) / 68; octx.setTransform(k, 0, 0, k, W / 2 + 0.7 * k, H / 2 - 3.4 * k);   // сама сова — прежнего размера   // по визуальному центру совы (центр «массы» рисунка), а не по габаритам с длинным крылом   // сова ровно по центру (центр её силуэта), запас по краям — при объедании лапки не обрезаются
                    var main = ctx, sx = owl.x, sy = owl.y, sr = owl.rotation, sv = owl.visible, sl = owl.lean, sb = owl.boostK, sp = owl.spinAngle, sw = owl.wing,
                        sd = currentDrunkFactor, sf = currentFreezeFactor, so = currentOvereatFactor, sfr = frame;
                    fin = fin || 0;
                    var ha = now * 0.0033, hv = 0.5;   // покачивание на всей загрузке с амплитудой, как в финальной позе (7,5 единиц × 0,5), период около 1,9 с
                    owl.x = 0; owl.y = Math.sin(ha) * 7.5 * hv; owl.rotation = Math.sin(ha) * 0.05 * hv; owl.visible = true; owl.lean = 0.3 * fin; owl.boostK = fin; owl.spinAngle = 0; owl.wing = Math.max(0, Math.sin(now / 150)) * (1 - fz) * (1 - fin);   // финал: наклон вперёд и устремление, как при ускорении
                    currentDrunkFactor = d; currentFreezeFactor = fz; currentOvereatFactor = ov; frame = loFrame;
                    ctx = octx;
                    var svs = viewScale, srs = renderScale;
                    if (fz > 0.01) { viewScale = k; renderScale = 1; }   // ледяной слой рисуется в масштабе холста — чётко
                    if (fin > 0.01 && typeof updateSpeedStars === 'function') {   // звёздочки ускорения вылетают из-за совы (те же функции, что в игре)
                        var ss_ = speedStars, sr_ = speedRamp, sa_ = speedStarAcc, sbt_ = speedBoostTime, sg_ = gameActive;
                        speedStars = LS.stars; speedRamp = fin; speedStarAcc = LS.acc; speedBoostTime = 9999; gameActive = true;
                        try { updateSpeedStars(); drawSpeedStars(); }
                        finally { LS.stars = speedStars; LS.acc = speedStarAcc; speedStars = ss_; speedRamp = sr_; speedStarAcc = sa_; speedBoostTime = sbt_; gameActive = sg_; }
                    }
                    var wft_ = waitingFirstTap, dtm_ = dtMult;
                    waitingFirstTap = false; dtMult = 1;   // поза совы на загрузке не зависит ни от «покачивания ожидания» из игры, ни от длительности кадра — без дрожания
                    try { if (fz > 0.01 && typeof drawFrozenOwl === 'function') drawFrozenOwl(); else owl.draw(); }
                    finally { waitingFirstTap = wft_; dtMult = dtm_; viewScale = svs; renderScale = srs; ctx = main; owl.x = sx; owl.y = sy; owl.rotation = sr; owl.visible = sv; owl.lean = sl; owl.boostK = sb; owl.spinAngle = sp; owl.wing = sw; currentDrunkFactor = sd; currentFreezeFactor = sf; currentOvereatFactor = so; frame = sfr; }
                } catch (e) {}
            }
            var clone = null, cloneWrap = null;
            function syncLogo() {   // показываем точную копию логотипа главного меню ровно на его месте — та же жирность, шрифт и размер
                var ic = document.querySelector('#startScreen .fa-gamepad');
                var m = ic && ic.parentElement && ic.parentElement.parentElement;
                if (!m) return;
                var r = m.getBoundingClientRect();
                if (!r.width || !r.height) return;
                if (!clone) {
                    cloneWrap = document.createElement('div'); cloneWrap.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
                    clone = m.cloneNode(true); clone.removeAttribute('id');
                    cloneWrap.appendChild(clone); el.appendChild(cloneWrap);
                    logo.style.display = 'none';
                }
                var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1;
                const LZ = 1.17;   // логотип на экране загрузки: на 10% меньше, чем было (крупнее на 17% от обычного)
                clone.style.zoom = z * LZ;
                cloneWrap.style.left = (r.left - r.width * (LZ - 1) / 2) + 'px'; cloneWrap.style.top = (r.top - r.height * (LZ - 1) / 2) + 'px';   // увеличиваем от центра
            }
            var dismissed = false;
            function dismiss() {
                if (dismissed || !ready) return; dismissed = true;
                window.__musicHold = false;   // загрузка закончилась и игрок тапнул — теперь можно включать музыку меню
                try { if (typeof AudioFX !== 'undefined') { AudioFX.resume(); setTimeout(function () { try { if (!AudioFX.musicTimer) AudioFX.startMusicLoop(); } catch (e2) {} }, 60); } } catch (e) {}   // нажатие разрешает звук: включаем музыку меню
                el.style.pointerEvents = 'none';
                el.style.transition = 'opacity 0.45s ease';   // без улетания: экран плавно растворяется, открывая главное меню
                el.style.opacity = '0';
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 480);
            }
            el.addEventListener('click', function (e) { e.stopPropagation(); dismiss(); });
            (function tick() {
                if (!el.parentNode) return;
                var now = performance.now(), k = Math.min(3, Math.max(0.3, (now - lastT) / 16.7)); lastT = now;
                var step = (target - shown) * 0.1 * k + 0.35 * k;
                shown += Math.min(step, 0.5 * k);   // не быстрее ~30% в секунду (около 3,5 секунд на всю загрузку): состояния совы сменяются плавно, но недолго
                if (shown > target) shown = target;
                fill.style.width = shown.toFixed(1) + '%'; pct.textContent = Math.round(shown) + '%';
                loFrame += k;
                drawStars(k);
                // состояния идут по очереди и плавно перетекают друг в друга: пьяная → замёрзшая → толстая → в конце обычная
                var d = ph(0, 4) * (1 - ph(22, 30)), fz = ph(24, 32) * (1 - ph(46, 54)), ov = ph(48, 56) * (1 - ph(78, 88));
                var fin = ready ? 1 : ph(88, 100);   // в конце загрузки сова уже в виде ускорения
                drawOwl(now, d, fz, ov, fin);
                syncLogo();
                if (!ready) {
                    if (shown >= 99.9 && now - t0 > 900) { ready = true; go.classList.add('ready'); el.querySelector('.bl-foot').classList.add('done'); }
                }
                requestAnimationFrame(tick);
            })();
        })();
    
