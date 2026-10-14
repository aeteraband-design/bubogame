// BUBO Quiz Owl Flight — рулетка призов, меню и кнопки, настройки, запуск игры (грузится последним)

// ===================== РУЛЕТКА ПРИЗОВ: окно в стиле остальных меню =====================
const RL_SPIN_T = 15, RL_FAST_T = 2.5;     // вращение ≈15 с: 2,5 с на полной скорости, потом долгое плавное торможение — в конце лента медленно доползает до приза
// w — вес выпадения (на 100 000 условных шансов): командные призы выпадают совсем редко
const RL_PRIZES = {
    stamina: { icon: 'fa-feather-pointed', col: '#67E8F9', w: 16000, card: '+20%', cardSub: 'к силе',
               title: '+20% К СИЛЕ', sub: 'Бонус', desc: 'Максимальный запас сил увеличен на 20%. Бонус сохраняется до сброса прогресса.' },
    hearts:  { icon: 'fa-heart', col: '#F43F5E', w: 14000, card: '6 ЖИЗНЕЙ', cardSub: 'макс. запас<br>сердец',
               title: '6 ЖИЗНЕЙ', sub: 'Максимальный запас сердец', desc: 'Максимум сердец — 6. Полёт начинается с 4 из 6 сердец, остальные можно добрать в полёте.' },
    life:    { icon: 'fa-heart-circle-plus', col: '#EC4899', w: 22000, card: '+1', cardSub: 'жизнь',
               title: '+1 ЖИЗНЬ', sub: 'Бонус', desc: 'Дополнительное сердце уже добавлено к твоим жизням.' },
    a1:      { icon: 'fa-rotate-right', col: '#FE7600', w: 30000, card: '+1', cardSub: 'попытка', attempts: 1,
               title: '+1 ПОПЫТКА', sub: 'Бонус', desc: 'Ещё одна попытка уже добавлена к твоим попыткам.' },
    bar:     { icon: 'fa-martini-glass-citrus', col: '#E056FD', w: 3000, card: '1 000 ₽', cardSub: 'сертификат<br>в бар',
               title: 'СЕРТИФИКАТ В БАР', sub: 'Редкий приз · 1 000 ₽', desc: 'Сертификат в бар на 1 000 рублей! Скоро здесь появится переход в чат, где ты сможешь его забрать.' },
    pass:    { icon: 'fa-ticket', col: '#FFC53D', w: 500, card: 'ПРОХОДКА', cardSub: 'на 1<br>человека',
               title: 'ПРОХОДКА НА 1 ЧЕЛОВЕКА', sub: 'Очень редкий приз', desc: 'Бесплатная проходка на игру для одного человека! Скоро здесь появится переход в чат, где ты сможешь её забрать.' },
    pass4:   { icon: 'fa-ticket', col: '#38BDF8', w: 50, card: 'ПРОХОДКА', cardSub: 'на 4 человека<br>в команде',
               title: 'ПРОХОДКА НА 4 ЧЕЛОВЕКА', sub: 'Сверхредкий приз · 4 человека в команде', desc: 'Бесплатные проходки на игру для четырёх человек из твоей команды! Скоро здесь появится переход в чат, где ты сможешь их забрать.' },
    passTeam:{ icon: 'fa-ticket', col: '#A3E635', w: 1, card: 'ПРОХОДКА', cardSub: 'на всю<br>команду',
               title: 'ПРОХОДКА НА ВСЮ КОМАНДУ', sub: 'Легендарный приз', desc: 'Бесплатные проходки на игру для всей твоей команды! Это самый редкий приз рулетки. Скоро здесь появится переход в чат, где ты сможешь их забрать.' },
    discTeam:{ icon: 'fa-ticket', col: '#A78BFA', w: 4, card: '−50%', cardSub: 'скидка на<br>всю команду',
               title: 'СКИДКА 50% НА ВСЮ КОМАНДУ', sub: 'Почти легендарный приз', desc: 'Скидка 50% на проходки для всей твоей команды! Скоро здесь появится переход в чат, где ты сможешь её забрать.' }
};
const RL_PATTERN = ['a1', 'hearts', 'bar', 'life', 'pass', 'stamina', 'a1', 'pass4', 'life', 'discTeam', 'hearts', 'a1', 'stamina', 'passTeam', 'life', 'bar'];
const RW_GAP = 14;     // промежуток между карточками
let rouletteSpins = 0;   // попытки вращения рулетки: даются за победу и как приз «ещё одно вращение»
const rw = { spinning: false, prize: null, pos: 0, pitch: 130, cw: 120, pool: [], N: 0, vw: 300, drag: null, vel: 0, resumeAt: 0, idleRAF: 0, lastT: 0 };
const rwEl = (id) => document.getElementById(id);

function rwUpdateUI() {
    const n = rouletteSpins;
    const badge = rwEl('rwMenuBadge'), btn = rwEl('openRouletteBtn');
    if (badge) { badge.innerText = String(n); badge.classList.toggle('hidden', n <= 0); }
    if (btn) btn.classList.toggle('has-spins', n > 0);
    const sp = rwEl('rwSpins'); if (sp) sp.innerText = String(n);
    const pill = rwEl('rwSpinsPill'); if (pill) pill.classList.toggle('has', n > 0);
    const spin = rwEl('rwSpinBtn'), lbl = rwEl('rwSpinLabel'), sub = rwEl('rwSpinSub');
    if (spin && lbl && !rw.spinning) { spin.disabled = n <= 0; spin.classList.toggle('no-spins', n <= 0); lbl.innerText = 'КРУТИТЬ РУЛЕТКУ'; if (sub) sub.innerText = n > 0 ? 'ОСТАЛОСЬ ВРАЩЕНИЙ: ' + n : 'НЕТ ПОПЫТОК ВРАЩЕНИЯ'; }
    const later = rwEl('rwLaterLabel'); if (later) later.innerText = 'В ГЛАВНОЕ МЕНЮ';
}
function rwPickPrize() {
    const keys = Object.keys(RL_PRIZES), total = keys.reduce((a, k) => a + RL_PRIZES[k].w, 0);
    let r = Math.random() * total;
    for (const k of keys) { if (r < RL_PRIZES[k].w) return k; r -= RL_PRIZES[k].w; }
    return keys[0];
}
function rwCardInner(k) { const p = RL_PRIZES[k]; return `<div class="rw-top"><i class="fa-solid ${p.icon} rw-ico"></i></div><div class="rw-bot"><div class="rw-name">${p.card}</div><div class="rw-sub">${p.cardSub}</div></div>`; }
function rwCardStyle(k) { const c = RL_PRIZES[k].col; return `--c:${c};--ct1:${c}D0;--ct2:${c}80;--ct3:${c}4D;--ct4:${c}26;--tt:${c}33;--tb:${c}52;--tt2:${c}4D;--tb2:${c}70;`; }
function rwLayout() {
    const reel = rwEl('rwReel'), win = rwEl('rwWindow'); if (!reel || !win) return;
    const zoom = Math.min(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1, 1.1);
    const total = ((container.clientHeight || window.innerHeight) - 24) / zoom;
    // окно невысокое, по содержимому; лента — компактной высоты; блоки разделены отступами 30px (на очень низких экранах до 22px)
    let others = 0, gapPx = 30;
    for (;;) {
        win.style.setProperty('--rw-gap', gapPx + 'px');
        win.style.height = 'auto'; reel.style.height = '0px';
        others = win.offsetHeight;
        if (total - others - 6 >= 190 || gapPx <= 22) break;
        gapPx -= 2;
    }
    const W = reel.clientWidth || 280; rw.vw = W;
    const pad = RW_GAP * 1.2;   // лента чуть ниже
    let cw = Math.min(W / 1.75, 210), ch = cw * 1.22;   // карточки крупнее — лента выше
    const maxReel = Math.max(120, total - others - 6);
    if (ch + pad * 2 > maxReel) { ch = maxReel - pad * 2; cw = ch / 1.22; }
    cw = Math.max(cw, 76); ch = cw * 1.22;
    const reelH = ch + pad * 2;
    reel.style.height = reelH.toFixed(1) + 'px';
    const cwd = cw * 0.9;
    reel.style.setProperty('--cw', cw.toFixed(1) + 'px'); reel.style.setProperty('--cwd', cwd.toFixed(1) + 'px'); reel.style.setProperty('--ch', ch.toFixed(1) + 'px');
    rw.ch = ch;
    const old = rw.pitch; rw.cw = cwd; rw.pitch = cwd + RW_GAP;
    if (!rw.spinning && old > 0) rw.pos *= rw.pitch / old;
    // окно на всю высоту экрана; блок «заголовок … счётчик попыток» стоит по центру между верхом окна и кнопкой «Крутить» (auto-отступы в стилях)
    win.style.height = total.toFixed(1) + 'px';
    win.style.justifyContent = 'flex-start';
    const headPad = parseFloat(getComputedStyle(win.querySelector('.rwp-head') || win).paddingTop) || 0;
    win.style.setProperty('--rw-btn-gap', (parseFloat(getComputedStyle(win).paddingTop) + headPad).toFixed(1) + 'px');
    rwEnsurePool(); rwRender(rw.pos);
    // фоновые искорки не должны перекрывать ничего в окне (текст, эмблему, ленту, счётчик, кнопки, крестик)
    try {
        const blocks = [...win.querySelectorAll('.rwp-emblem, .rwp-title, .rwp-sub, #rwReel, .rw-hint, #rwSpinsPill, #rwSpinBtn, #rwLaterBtn, #closeRouletteBtn')].map(e => e.getBoundingClientRect());
        win.querySelectorAll('.rwp-spark').forEach(sp => { const r = sp.getBoundingClientRect(); const hit = blocks.some(b => r.left < b.right + 4 && b.left - 4 < r.right && r.top < b.bottom + 4 && b.top - 4 < r.bottom); sp.style.display = hit ? 'none' : ''; });
    } catch (e) {}
}
window.addEventListener('resize', () => { const m = rwEl('rouletteModal'); if (m && !m.classList.contains('hidden') && !rw.spinning) rwLayout(); });
// Всего несколько реальных карточек — они переиспользуются по кругу, поэтому лента лёгкая и не тормозит
function rwEnsurePool() {
    const track = rwEl('rwTrack'); if (!track) return;
    const N = Math.ceil(rw.vw / rw.pitch) + 3;
    if (rw.N === N && rw.pool.length === N) return;
    track.innerHTML = ''; rw.pool = []; rw.N = N;
    for (let s2 = 0; s2 < N; s2++) { const el = document.createElement('div'); el.className = 'rw-card'; el._idx = null; el._key = null; track.appendChild(el); rw.pool.push(el); }
}
// Изредка по карточкам плавно пробегает волна: они чуть приподнимаются, а по каждой скользит едва заметный блик, как по кнопке
function rwRender(pos) {
    const n = RL_PATTERN.length, N = rw.N, pitch = rw.pitch, pool = rw.pool;
    if (!N) return;
    let front = null, sig = 1, env = 1;
    if (rw.wave && !rw.spinning) {
        const t = (performance.now() - rw.wave.t0) / rw.wave.dur;
        // волна шире (соседние карточки подпрыгивают почти вместе) и проходит за край; в начале и в конце плавно затухает — без рывка
        if (t < 1) { sig = rw.vw * 0.3; front = -2 * sig + t * (rw.vw + 4 * sig); const sm = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); env = sm(t / 0.15) * sm((1 - t) / 0.15); }
    }
    const base = Math.floor(pos / pitch), bm = ((base % N) + N) % N;
    for (let s2 = 0; s2 < N; s2++) {
        const idx = base + ((s2 - bm + N) % N), el = pool[s2];
        if (el._idx !== idx) {
            const key = RL_PATTERN[((idx % n) + n) % n];
            if (el._key !== key) { el._key = key; el.innerHTML = rwCardInner(key); el.className = 'rw-card'; el.style.cssText = rwCardStyle(key); el._sh = undefined; }
            else el.classList.remove('rw-focus', 'rw-win');
            el._idx = idx;
        }
        let wv = 0, ph = 0;
        if (front !== null) { const d = (idx * pitch - pos + pitch / 2 - front) / sig; wv = Math.exp(-d * d) * env; ph = Math.max(-1, Math.min(1, -d / 1.8)); }
        el.style.transform = `translate3d(${(idx * pitch - pos + RW_GAP / 2).toFixed(2)}px,${(-wv * (rw.ch || 100) * 0.03).toFixed(2)}px,0)`;
        const sh = wv > 0.03 ? wv : 0;
        if (sh > 0 || el._sh !== 0) {
            el._sh = sh;
            el.style.setProperty('--sh', sh.toFixed(2)); el.style.setProperty('--shp', (50 - ph * 40).toFixed(1) + '%');
        }
    }
    rwUpdateFocus(pos);
    rwSyncWheel(pos);
}
// Колесо в шапке крутится вместе с лентой: под оранжевой стрелкой всегда сектор той же карточки, что под стрелкой ленты
function rwSyncWheel(pos) {
    const rot = rw.rotorEl || (rw.rotorEl = document.querySelector('#rwWindow .rwp-rotor'));
    if (!rot) return;
    const u = (pos + rw.vw / 2 - RW_GAP / 2) / rw.pitch + 0.5 - (rw.cw / rw.pitch) / 2;
    const deg = -(u / RL_PATTERN.length) * 360;
    rot.style.transform = `rotate(${(deg % 360).toFixed(2)}deg)`;
}
function rwUpdateFocus(pos) {
    const el = rwCenterSlot(pos);
    if (el !== rw.focusEl) { if (rw.focusEl) rw.focusEl.classList.remove('rw-focus'); if (el) el.classList.add('rw-focus'); rw.focusEl = el; }
}
function rwCenterSlot(pos) {
    const idx = Math.floor((pos + rw.vw / 2) / rw.pitch), N = rw.N;
    return rw.pool[((idx % N) + N) % N] || null;
}
// Лента сама очень медленно ползёт влево; её можно прокрутить пальцем или курсором
function rwIdleLoop(ts) {
    rw.idleRAF = 0;
    const m = rwEl('rouletteModal');
    if (!m || m.classList.contains('hidden') || rw.spinning) return;
    const dt = rw.lastT ? Math.min(50, ts - rw.lastT) : 16; rw.lastT = ts;
    if (rw.wave && performance.now() - rw.wave.t0 > rw.wave.dur) rw.wave = null;
    if (!rw.wave && !rw.drag && ts > (rw.nextWave || 0)) { rw.wave = { t0: performance.now(), dur: 2600 }; rw.nextWave = ts + 6000 + Math.random() * 5000; }   // волна раз в 6–11 секунд
    if (!rw.drag) {
        if (Math.abs(rw.vel) > 8) { rw.pos += rw.vel * dt / 1000; rw.vel *= Math.pow(0.05, dt / 1000); }
        else { rw.vel = 0; if (ts > rw.resumeAt) rw.pos += 16 * dt / 1000; }
        rwRender(rw.pos);
    }
    rw.idleRAF = requestAnimationFrame(rwIdleLoop);
}
function rwStartIdle() { if (!rw.idleRAF) { rw.lastT = 0; rw.idleRAF = requestAnimationFrame(rwIdleLoop); } }

function openRoulette(opts) {
    const m = rwEl('rouletteModal'); if (!m) return;
    AudioFX.resume();
    const vic = rwEl('rwVictory');
    if (vic) vic.classList.toggle('hidden', !(opts && opts.victory));
    rw.spinning = false; rw.prize = null; rw.drag = null; rw.vel = 0;
    const res = rwEl('rwResult'); if (res) res.classList.add('hidden');
    const reel = rwEl('rwReel'); if (reel) reel.classList.remove('rw-done');
    m.classList.remove('hidden');
    rwUpdateUI();
    rw.wave = null; rw.nextWave = performance.now() + 2500;
    if (!rw.pos) rw.pos = Math.random() * RL_PATTERN.length * rw.pitch;
    requestAnimationFrame(() => { rwLayout(); rwStartIdle(); });
}
function closeRoulette() {
    if (rw.spinning) return;
    const res = rwEl('rwResult'); if (res && !res.classList.contains('hidden')) return;   // приз нужно забрать
    const m = rwEl('rouletteModal'); if (m) m.classList.add('hidden');
    if (AudioFX.mode === 'victory') AudioFX.setMode('menu');
}
function spinRoulette() {
    if (rw.spinning || rw.prize || rouletteSpins <= 0) return;
    const viewport = rwEl('rwReel'); if (!viewport) return;
    AudioFX.resume();
    rouletteSpins--; StorageManager.save();
    rw.spinning = true; rw.drag = null; rw.vel = 0;
    { const w = rwEl('rwWindow'); if (w) w.classList.add('rw-is-spinning'); }
    const spin = rwEl('rwSpinBtn'), lbl = rwEl('rwSpinLabel'), sub2 = rwEl('rwSpinSub');
    if (spin) spin.disabled = true;
    if (lbl) lbl.innerText = 'КРУТИТСЯ...';
    if (sub2) sub2.innerText = 'УДАЧИ!';
    const sp = rwEl('rwSpins'); if (sp) sp.innerText = String(rouletteSpins);
    const pill = rwEl('rwSpinsPill'); if (pill) pill.classList.toggle('has', rouletteSpins > 0);
    const badge = rwEl('rwMenuBadge'); if (badge) { badge.innerText = String(rouletteSpins); badge.classList.toggle('hidden', rouletteSpins <= 0); }
    rwLayout();
    const prizeKey = rwPickPrize();
    const idxs = RL_PATTERN.map((k, i) => k === prizeKey ? i : -1).filter(i => i >= 0);
    const target = idxs[Math.floor(Math.random() * idxs.length)];
    const pitch = rw.pitch, patW = RL_PATTERN.length * pitch, vw = rw.vw;
    const cTarget = target * pitch + pitch / 2 + (Math.random() - 0.5) * pitch * 0.6;   // не всегда ровно в центре карточки
    const pos0 = ((rw.pos % patW) + patW) % patW;
    rw.pos = pos0; rwRender(pos0);
    const d0 = (((cTarget - vw / 2 - pos0) % patW) + patW) % patW;
    const T = RL_SPIN_T, t1 = RL_FAST_T, vTarget = 1700;
    const rot = Math.max(8, Math.round((vTarget * (t1 + (T - t1) / 3) - d0) / patW));
    const D = d0 + rot * patW;
    const v0 = D / (t1 + (T - t1) / 3);
    const startT = performance.now();
    let lastIdx = Math.floor((pos0 + vw / 2) / pitch), lastTick = 0, focusEl = null;
    const setFocus = (posNow) => {
        const el = rwCenterSlot(posNow);
        if (el !== focusEl) { if (focusEl) focusEl.classList.remove('rw-focus'); if (el) el.classList.add('rw-focus'); focusEl = el; }
    };
    const frame = (now) => {
        const t = (now - startT) / 1000;
        let dist;
        if (t <= t1) dist = v0 * t;
        else { const u = Math.min(1, (t - t1) / (T - t1)); dist = v0 * t1 + v0 * (T - t1) / 3 * (1 - Math.pow(1 - u, 3)); }
        const pos = pos0 + dist;
        rw.pos = pos;
        rwRender(pos);
        const idx = Math.floor((pos + vw / 2) / pitch);
        if (idx !== lastIdx) {
            lastIdx = idx;
            if (t > RL_FAST_T + 1.2) setFocus(pos);
            if (now - lastTick > 28) { lastTick = now; AudioFX.playRouletteTick(); }
        }
        if (t < T) { requestAnimationFrame(frame); return; }
        const best = rwCenterSlot(pos);
        if (focusEl) focusEl.classList.remove('rw-focus');
        if (best) best.classList.add('rw-win');
        viewport.classList.add('rw-done');
        rw.spinning = false; rw.prize = prizeKey;
        { const w = rwEl('rwWindow'); if (w) w.classList.remove('rw-is-spinning'); }
        AudioFX.playRouletteWin();
        setTimeout(() => rwShowResult(prizeKey), 1000);
    };
    requestAnimationFrame(frame);
}
function rwShowResult(key) {
    const p = RL_PRIZES[key], res = rwEl('rwResult'), info = rwEl('rwResCard'), stage = rwEl('rwResStage'), win = rwEl('rwWindow');
    if (!res || !info || !stage || !win) return;
    info.style.setProperty('--c', p.col);
    rwEl('rwResTitle').innerText = p.title;
    rwEl('rwResSub').innerText = p.sub;
    rwEl('rwResDesc').innerText = p.desc;
    stage.innerHTML = '';
    res.classList.remove('hidden', 'rw-res-in');
    void res.offsetWidth;
    res.classList.add('rw-res-in');   // фон плавно затемняется, текст и кнопка проявляются после полёта карточки
    // карточка-победитель вылетает из ленты в центр с переворотом
    const src = rw.pool.find(el => el.classList.contains('rw-win')) || rwCenterSlot(rw.pos);
    const wr = win.getBoundingClientRect(), z = wr.width / (win.offsetWidth || wr.width) || 1;
    const reel = rwEl('rwReel'), cs = reel ? getComputedStyle(reel) : null;
    const card = document.createElement('div');
    card.className = 'rw-card rw-win rw-fly';
    card.style.cssText = rwCardStyle(key);
    card.innerHTML = rwCardInner(key);
    if (cs) ['--cw', '--cwd', '--ch'].forEach(v => card.style.setProperty(v, cs.getPropertyValue(v)));
    const cw = rw.cw || 110, ch = rw.ch || 134;
    card.style.width = cw + 'px'; card.style.height = ch + 'px';
    stage.appendChild(card);
    const sr = stage.getBoundingClientRect();
    let fromX = 0, fromY = 0;
    if (src) { const r = src.getBoundingClientRect(); fromX = (r.left + r.width / 2 - (sr.left + sr.width / 2)) / z; fromY = (r.top + r.height / 2 - (sr.top + sr.height / 2)) / z; }
    const big = Math.min(1.75, (win.clientWidth * 0.52) / cw);
    card.animate([
        { transform: `translate(${fromX}px,${fromY}px) rotateY(0deg) scale(1)`, opacity: 1 },
        { transform: `translate(${fromX * 0.4}px,${fromY * 0.4 - 30}px) rotateY(200deg) scale(${(1 + big) / 2})`, opacity: 1, offset: 0.55 },
        { transform: `translate(0,0) rotateY(360deg) scale(${big * 1.08})`, offset: 0.85 },
        { transform: `translate(0,0) rotateY(360deg) scale(${big})` }
    ], { duration: 1100, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    setTimeout(() => {
        // блёстки вокруг карточки
        for (let i = 0; i < 26; i++) {
            const sp = document.createElement('i');
            sp.className = 'rw-res-spark';
            const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 110, sz = 5 + Math.random() * 8;
            sp.style.cssText = `width:${sz}px;height:${sz}px;--c:${Math.random() < 0.5 ? p.col : '#FFD98A'}`;
            stage.appendChild(sp);
            sp.animate([
                { transform: 'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity: 0 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d * 0.6}px), calc(-50% + ${Math.sin(a) * d * 0.6}px)) scale(1.2) rotate(90deg)`, opacity: 1, offset: 0.3 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 20}px)) scale(0.4) rotate(220deg)`, opacity: 0 }
            ], { duration: 1200 + Math.random() * 900, delay: Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
        }
        try { AudioFX.playLevelUp(); } catch (e) {}
    }, 850);
    Haptics.powerup();
}
function claimRoulettePrize() {
    const key = rw.prize;
    if (!key) return;
    const p = RL_PRIZES[key];
    if (p.attempts) { attempts += p.attempts; updateAttemptsHUD(); }
    if (p.extraSpin) rouletteSpins += p.extraSpin;
    if (key === 'hearts') { startLives = Math.max(startLives, 4.0); maxLives = Math.max(maxLives, 6.0); updateLivesHUD(); }
    if (key === 'life') { const base = lives <= 0.5 ? startLives : lives; lives = Math.min(maxLives, base + 1); updateLivesHUD(); }
    if (key === 'stamina') { maxStamina += 20; stamina = maxStamina; updateStaminaHUD(); }
    try { localStorage.setItem('bubo_last_prize', key + ':' + Date.now()); } catch (e) {}   // пригодится для будущего перехода в чат
    StorageManager.save();
    rwEl('rwResult').classList.add('hidden'); rwEl('rwResult').classList.remove('rw-res-in');
    { const st = rwEl('rwResStage'); if (st) st.innerHTML = ''; }
    const reel = rwEl('rwReel'); if (reel) reel.classList.remove('rw-done');
    rw.pool.forEach(el => el.classList.remove('rw-win', 'rw-focus'));
    rw.prize = null; rw.resumeAt = performance.now() + 800;
    rwUpdateUI(); rwStartIdle();
}
function initRouletteUI() {
    try { rwBuildWheel(); } catch (e) {}
    const on = (id, fn) => { const el = rwEl(id); if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); };
    on('openRouletteBtn', () => openRoulette({}));
    on('closeRouletteBtn', closeRoulette);
    on('rwLaterBtn', closeRoulette);
    on('rwSpinBtn', spinRoulette);
    on('rwClaimBtn', claimRoulettePrize);
    const vp = rwEl('rwReel');
    if (vp) {
        const zoom = () => Math.min(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-zoom')) || 1, 1.1);
        vp.addEventListener('pointerdown', (e) => {
            if (rw.spinning || rw.prize) return;
            try { vp.setPointerCapture(e.pointerId); } catch (err) {}
            rw.drag = { x: e.clientX, pos: rw.pos, lastX: e.clientX, lastT: performance.now(), z: zoom() }; rw.vel = 0;
            vp.classList.add('rw-grab'); rwStartIdle();
        });
        vp.addEventListener('pointermove', (e) => {
            const d = rw.drag; if (!d) return;
            const now = performance.now();
            rw.pos = d.pos - (e.clientX - d.x) / d.z;
            const dtm = Math.max(1, now - d.lastT);
            rw.vel = rw.vel * 0.6 + ((d.lastX - e.clientX) / d.z / dtm * 1000) * 0.4;
            d.lastX = e.clientX; d.lastT = now;
            rwRender(rw.pos);
        });
        const endDrag = () => {
            if (!rw.drag) return;
            rw.drag = null; vp.classList.remove('rw-grab');
            rw.vel = Math.max(-1800, Math.min(1800, rw.vel));
            rw.resumeAt = performance.now() + 1800;
        };
        vp.addEventListener('pointerup', endDrag); vp.addEventListener('pointercancel', endDrag); vp.addEventListener('lostpointercapture', endDrag);
    }
    rwUpdateUI();
}


// Колесо в шапке: сектора берутся из тех же карточек и цветов, что и лента
function rwBuildWheel() {
    const rot = document.querySelector('#rwWindow .rwp-rotor'); if (!rot) return;
    const n = RL_PATTERN.length, P = (r, a) => [(50 + r * Math.sin(a)).toFixed(2), (50 - r * Math.cos(a)).toFixed(2)];
    const dark = (h, k) => { const v = parseInt(h.slice(1), 16); return 'rgb(' + [v >> 16, (v >> 8) & 255, v & 255].map(c => Math.round(c * k)).join(',') + ')'; };
    let s = '';
    for (let i = 0; i < n; i++) {
        const col = RL_PRIZES[RL_PATTERN[i]].col, a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        const ring = (ro, ri, fill) => { const o0 = P(ro, a0), o1 = P(ro, a1), i1 = P(ri, a1), i0 = P(ri, a0); return `<path d="M${o0} A${ro} ${ro} 0 0 1 ${o1} L${i1} A${ri} ${ri} 0 0 0 ${i0} Z" fill="${fill}" stroke="#1d0936" stroke-width="0.35"/>`; };
        s += ring(40, 31, dark(col, 0.95)) + ring(31, 21, dark(col, 0.55));
    }
    rot.innerHTML = s;
}
// Победа (100%): попытка не тратится, даём вращение рулетки и показываем окно «Победа» (рулетка — по кнопке)
function triggerVictory() {
    gameActive = false; waitingFirstTap = false;
    rouletteSpins++;
    StorageManager.save();
    Haptics.powerup();
    returnToHome();
    AudioFX.setMode('victory');
    AudioFX.playLevelUp();
    openVictoryModal();
}
function vicSpinsWord(n) { return n + ' ' + ruPlural(n, ['вращение', 'вращения', 'вращений']); }
function vicUpdate() {
    const n = rouletteSpins, btn = rwEl('vicSpinBtn');
    if (rwEl('vicSpinsText')) rwEl('vicSpinsText').innerText = vicSpinsWord(n);
    if (rwEl('vicSpinLabel')) rwEl('vicSpinLabel').innerText = 'ВРАЩАТЬ РУЛЕТКУ (ДОСТУПНО: ' + n + ')';
    if (btn) { btn.disabled = n <= 0; btn.classList.toggle('opacity-50', n <= 0); }
}
function vicConfetti(on) {
    const layer = rwEl('vicConfetti'); if (!layer) return;
    layer.innerHTML = '';
    if (!on) return;
    const cols = ['#FE7600', '#FFD35A', '#A855F7', '#38BDF8', '#F43F5E', '#4ADE80', '#FFFFFF'];
    const N = (typeof gfxQuality !== 'undefined' && gfxQuality === 'low') ? 26 : 54;
    for (let i = 0; i < N; i++) {
        const c = document.createElement('i');
        c.className = 'confetti';
        const w = 5 + Math.random() * 6, h = Math.random() < 0.5 ? w : w * 0.45;
        c.style.cssText = `left:${Math.random() * 100}%;width:${w}px;height:${h}px;background:${cols[i % cols.length]};border-radius:${Math.random() < 0.3 ? '50%' : '2px'};` +
            `--d:${(3.6 + Math.random() * 3.4).toFixed(2)}s;--delay:${(-Math.random() * 6).toFixed(2)}s;--dx:${((Math.random() - 0.5) * 120).toFixed(0)}px;--r:${(360 + Math.random() * 720).toFixed(0)}deg;`;
        layer.appendChild(c);
    }
}
function openVictoryModal() {
    const m = rwEl('winModal'); if (!m) return;
    vicUpdate(); vicConfetti(true);
    m.classList.remove('hidden');
}
function closeVictoryModal() {
    const m = rwEl('winModal'); if (m) m.classList.add('hidden');
    vicConfetti(false);
}
(function initVictoryUI() {
    const on = (id, fn) => { const el = rwEl(id); if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); };
    on('vicSpinBtn', () => { if (rouletteSpins <= 0) return; closeVictoryModal(); openRoulette({}); });
    on('vicNewGameBtn', () => { closeVictoryModal(); startOrResumeFlight(); });
    on('vicHomeBtn', () => { closeVictoryModal(); if (AudioFX.mode === 'victory') AudioFX.setMode('menu'); updateMenuVisibility(); });
})();

// Браузеры разрешают звук только после действия пользователя (касание, клик, клавиша).
