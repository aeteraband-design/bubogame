        (function () {
            // Экран загрузки: по центру крупно проценты, над ними сова, которая по ходу загрузки плавно меняется — пьяная, замёрзшая, объевшаяся.
            // Сову рисует сама игра (те же функции, что в полёте). В конце внизу пульсирует надпись; нажать можно в любом месте —
            // экран исчезает и включается музыка (браузеры разрешают звук только после нажатия)
            var el = document.getElementById('bootLoader'), fill = document.getElementById('blFill'), pct = document.getElementById('blPct'),
                go = document.getElementById('blGo'), logo = document.getElementById('blLogo'), label = document.getElementById('blLabel'),
                oc = document.getElementById('blOwlCv'), octx = oc.getContext('2d');
            document.documentElement.classList.add('booting');   // пока идёт загрузка, меню скрыто: за экраном загрузки виден только фон игры (небо, город, облака)
            window.__booting = true;
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
            var owlBox = el.querySelector('.bl-owlbox'), owlCssW = 0, owlCssH = 0;
            var LS = { stars: [], acc: 0 };   // звёздочки ускорения для финального вида совы на загрузке
            var MV = { x: 0, y: 0, rot: 0, wing: -1, half: 200 };   // движение совы: прилёт слева прыжками и улёт вправо
            function drawOwl(now, d, fz, ov, fin) {   // рисуем сову игры в нужном состоянии (значения игры возвращаем на место сразу после)
                if (!owlOk) return;
                try {
                    if (typeof owl === 'undefined' || typeof ctx === 'undefined' || !owl.draw) return;
                    var dpr = Math.min(2, window.devicePixelRatio || 1);
                    var zz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1;
                    var cssW = Math.max(360, Math.ceil(window.innerWidth / (zz * 0.88)));   // холст на всю ширину экрана (с учётом масштаба): звёздочки улетают до самого края
                    if (cssW !== owlCssW) { owlCssW = cssW; oc.style.width = cssW + 'px'; owlBox.style.width = cssW + 'px'; owlBox.style.marginLeft = (-cssW / 2) + 'px'; }
                    // холст совы — на всю высоту экрана (сова по центру как прежде): осколки льда падают до самого низа и нигде не обрезаются
                    var cssH = Math.max(360, Math.ceil(window.innerHeight / (zz * 0.88)) + 60);
                    if (cssH !== owlCssH) { owlCssH = cssH; oc.style.height = cssH + 'px'; oc.style.marginTop = ((360 - cssH) / 2) + 'px'; }
                    var W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
                    if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }
                    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
                    var k = (170 * dpr) / 68; MV.half = (W / 2) / k; octx.setTransform(k, 0, 0, k, W / 2 + 0.7 * k, H / 2 - 3.4 * k);   // сама сова — прежнего размера   // по визуальному центру совы (центр «массы» рисунка), а не по габаритам с длинным крылом   // сова ровно по центру (центр её силуэта), запас по краям — при объедании лапки не обрезаются
                    var main = ctx, sx = owl.x, sy = owl.y, sr = owl.rotation, sv = owl.visible, sl = owl.lean, sb = owl.boostK, sp = owl.spinAngle, sw = owl.wing,
                        sd = currentDrunkFactor, sf = currentFreezeFactor, so = currentOvereatFactor, sfr = frame;
                    fin = fin || 0;
                    var ha = now * 0.0033, hv = 0.5;   // покачивание на всей загрузке с амплитудой, как в финальной позе (7,5 единиц × 0,5), период около 1,9 с
                    owl.x = MV.x; owl.y = Math.sin(ha) * 7.5 * hv + MV.y; owl.rotation = Math.sin(ha) * 0.05 * hv + MV.rot; owl.visible = true; owl.lean = 0.3 * fin; owl.boostK = fin; owl.spinAngle = 0; owl.wing = MV.wing >= 0 ? MV.wing : Math.max(0, Math.sin(now / 150)) * (1 - fz) * (1 - fin);   // финал: наклон вперёд и устремление, как при ускорении
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
                    var shzK_ = (typeof SHZ !== 'undefined') ? SHZ.k : 0;
                    if (typeof SHZ !== 'undefined') SHZ.k = MV.shz || 0;   // свечение и молнии ШАЗАМа рисует сама сова
                    try {
                        if (MV.charge > 0) {   // зарядка: искры со всех сторон стягиваются к сове
                            octx.save(); octx.globalCompositeOperation = 'lighter';
                            for (var ci = 0; ci < 14; ci++) {
                                var cu = (MV.charge * 2.2 + ci / 14) % 1, ca = ci * 2.39, cr = 70 * (1 - cu) + 8;
                                octx.globalAlpha = Math.sin(cu * Math.PI);
                                octx.fillStyle = ci % 2 ? '#FFD08A' : '#FF7A00';
                                octx.beginPath(); octx.arc(owl.x + Math.cos(ca) * cr, owl.y + Math.sin(ca) * cr * 0.8, 1.6, 0, Math.PI * 2); octx.fill();
                            }
                            octx.restore();
                        }
                        if (MV.exit > 0) {   // улёт как в ШАЗАМе: огненно-фиолетовые полосы и тающие копии совы позади
                            var q = MV.exit;
                            octx.save(); octx.globalCompositeOperation = 'lighter';
                            for (var si = 0; si < 7; si++) {
                                var yy = owl.y - 22 + si * 7.5, ln = (60 + (si % 3) * 40) * Math.min(1, q * 3);
                                var gr = octx.createLinearGradient(owl.x - ln, 0, owl.x, 0);
                                gr.addColorStop(0, 'rgba(255, 122, 0, 0)'); gr.addColorStop(1, si % 2 ? 'rgba(255, 196, 138, 0.8)' : 'rgba(255, 140, 40, 0.75)');
                                octx.fillStyle = gr; octx.fillRect(owl.x - ln - 8, yy, ln, 1.6);
                            }
                            octx.restore();
                            var ox = owl.x;
                            for (var gi = 3; gi >= 1; gi--) { octx.globalAlpha = 0.18 * (4 - gi) / 3; owl.x = ox - gi * 16 * Math.min(1, q * 4); owl.draw(); }
                            owl.x = ox; octx.globalAlpha = 1;
                        }
                        if (fz > 0.01 && typeof drawFrozenOwl === 'function') drawFrozenOwl(); else owl.draw();
                        // оттаивание: лёд разлетается осколками — те же, что в игре
                        if (typeof iceShards !== 'undefined' && typeof spawnIceBurst === 'function') {
                            var is_ = iceShards; iceShards = LS.shards || (LS.shards = []);
                            try {
                                if (MV.thaw) { MV.thaw = false; spawnIceBurst('thaw'); }   // как в игре: лёд отваливается и осыпается вниз
                                updateIceShards(); iceShards.forEach(function (s) { s.size *= 0.985; }); drawIceShards();   // по пути осколки уменьшаются и тают
                            }
                            finally { LS.shards = iceShards; iceShards = is_; }
                        }
                    }
                    finally { if (typeof SHZ !== 'undefined') SHZ.k = shzK_; waitingFirstTap = wft_; dtMult = dtm_; viewScale = svs; renderScale = srs; ctx = main; owl.x = sx; owl.y = sy; owl.rotation = sr; owl.visible = sv; owl.lean = sl; owl.boostK = sb; owl.spinAngle = sp; owl.wing = sw; currentDrunkFactor = sd; currentFreezeFactor = sf; currentOvereatFactor = so; frame = sfr; }
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
                    cloneWrap = document.createElement('div'); cloneWrap.style.cssText = 'position:absolute;left:0;right:0;top:0;display:flex;justify-content:center;pointer-events:none;';   // по центру экрана, как логотип меню: не зависит от того, как браузер (iPhone) считает размеры при zoom
                    clone = m.cloneNode(true); clone.removeAttribute('id');
                    cloneWrap.appendChild(clone); el.appendChild(cloneWrap);
                    logo.style.display = 'none';
                }
                var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1;
                const LZ = 0.95;   // логотип на экране загрузки: на 10% меньше, чем было (крупнее на 17% от обычного)
                clone.style.zoom = z * LZ;
                cloneWrap.style.transform = 'translateY(-50%)'; cloneWrap.style.top = (r.top + r.height / 2) + 'px';   // увеличиваем от центра
            }
            var dismissed = false, exitT0 = 0, entryT0 = 0, revealed = false;
            var ENTRY = 1.1;   // секунд на прилёт совы
            // звуки загрузки — те же, что в игре. Пока по экрану ни разу не нажимали, браузер звук не пускает: тогда они просто молчат
            var SND = {};
            function sfx(key, name) {
                if (SND[key]) return; SND[key] = 1;
                try { if (typeof AudioFX !== 'undefined' && AudioFX[name]) { if (AudioFX.ctx && AudioFX.ctx.state === 'running') AudioFX[name](); } } catch (e) {}
                // вибрация — такая же, как у этих событий в игре (браузер пускает её только после первого касания экрана)
                var HAP = { playFlap: 'flap', playDrunk: 'powerup', playFreeze: 'powerup', playOverEat: 'powerup', playSpeedUpStart: 'powerup', playFreezeEnd: 'hit', playShazamArm: 'powerup', playMaxStaminaChime: 'powerup' };
                try { if (HAP[name] && typeof Haptics !== 'undefined') Haptics[HAP[name]](); } catch (e) {}
            }
            function dismiss() {
                if (dismissed || !ready) return; dismissed = true;
                exitT0 = performance.now();   // сова улетает вправо, как в ШАЗАМе; экран гаснет следом
                try { if (typeof AudioFX !== 'undefined') { AudioFX.resume(); setTimeout(function () { try { AudioFX.playShazamArm(); } catch (e2) {} }, 150); } } catch (e) {}   // зарядка — мягкий звук ШАЗАМа
                try { Haptics.powerup(); } catch (e) {}   // зарядка ШАЗАМа — вибрация, как в игре (тап — жест, поэтому сработает и на iPhone)
                setTimeout(finishDismiss, 1100);
            }
            function finishDismiss() {
                document.documentElement.classList.remove('booting'); window.__booting = false;
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
                if (!entryT0 && typeof owl !== 'undefined' && owl && owl.draw) entryT0 = now;   // прилёт начинается, когда игра готова рисовать сову
                var ep = entryT0 ? Math.min(1, (now - entryT0) / 1000 / ENTRY) : 0;
                var step = (target - shown) * 0.1 * k + 0.35 * k;
                shown += Math.min(step, 0.5 * k);   // не быстрее ~30% в секунду: состояния совы сменяются плавно, но недолго
                if (shown > target) shown = target;
                if (ep < 1 && shown > 16) shown = 16;   // пока сова летит к центру, состояния не начинаются
                // движение: прилетает слева тремя прыжками, как в игре (взмах — подскок — снижение), и садится в центр
                if (ep < 1) {
                    var ex = 1 - Math.pow(1 - ep, 1.6), hp = ep * 3, u = hp % 1, amp = 26 * (1 - ep * 0.55);
                    MV.x = -(MV.half + 50) * (1 - ex); MV.y = -Math.sin(u * Math.PI) * amp; MV.rot = -0.32 * Math.cos(u * Math.PI);
                    MV.wing = u < 0.22 ? 1 - u / 0.22 : 0;
                    sfx('hop' + Math.floor(hp), 'playFlap');   // каждый прыжок — взмах
                } else if (exitT0) {
                    // как ШАЗАМ в игре: 0,6 с сова заряжается (оранжевое свечение, молнии вокруг, искры стягиваются), потом рывок вправо
                    var ct = (now - exitT0) / 600;
                    MV.shz = Math.min(1, ct * 1.4);
                    if (ct < 1) { MV.exit = 0; MV.x = -4 * Math.sin(ct * Math.PI); MV.y = 0; MV.rot = 0; MV.wing = -1; MV.charge = ct; }
                    else {
                        if (!MV.flapped) { MV.flapped = true; try { AudioFX.playMaxStaminaChime(); } catch (e) {} try { Haptics.powerup(); } catch (e) {} }   // рывок — звонкий перелив и вибрация, как у ШАЗАМа
                        var q = Math.min(1, (now - exitT0 - 600) / 450); MV.exit = q; MV.charge = 0;
                        MV.x = (MV.half + 90) * q * q; MV.y = -6 * q; MV.rot = -0.05; MV.wing = 0;
                    }
                } else { MV.x = 0; MV.y = 0; MV.rot = 0; MV.wing = -1; }
                // фон: как только игра начала рисовать свою сцену, тёмная подложка загрузки плавно уходит — видны небо, город и облака
                if (!revealed && window.__sceneDrawn) { revealed = true; el.classList.add('reveal'); }
                fill.style.width = shown.toFixed(1) + '%'; pct.textContent = Math.round(shown) + '%';
                loFrame += k;
                drawStars(k);
                // состояния идут по очереди и плавно перетекают друг в друга: пьяная → замёрзшая → толстая → в конце обычная
                var d = ph(16, 22) * (1 - ph(36, 42)), fz = ph(38, 44) * (1 - ph(58, 64)), ov = ph(60, 66) * (1 - ph(80, 87));
                var fin = ready || exitT0 ? 1 : ph(88, 100);
                if (shown > 58 && !SND.thaw) { SND.thaw = 1; MV.thaw = true; sfx('ft', 'playFreezeEnd'); }   // заморозка кончается — лёд осыпается
                if (shown > 17) sfx('d', 'playDrunk'); if (shown > 39) sfx('f', 'playFreeze'); if (shown > 61) sfx('o', 'playOverEat'); if (shown > 89) sfx('s', 'playSpeedUpStart');   // в конце загрузки сова уже в виде ускорения
                // фон показывает скорость совы: в ускорении небо и дома плывут быстрее, при рывке ШАЗАМа — мчатся
                var bgT = 1 + 2.4 * fin;
                if (exitT0) { var et = (now - exitT0) / 600; bgT = et < 1 ? 3.6 : 9; }
                window.__bgSpeed = (window.__bgSpeed || 1) + (bgT - (window.__bgSpeed || 1)) * Math.min(1, 0.06 * k);
                drawOwl(now, d, fz, ov, fin);
                syncLogo();
                if (!ready) {
                    if (shown >= 99.9 && ep >= 1) { ready = true; go.classList.add('ready'); el.querySelector('.bl-foot').classList.add('done'); }
                }
                requestAnimationFrame(tick);
            })();
        })();
    
