// BUBO Quiz Owl Flight — рулетка призов, меню и кнопки, настройки, запуск игры (грузится последним)

// ===================== РУЛЕТКА ПРИЗОВ: окно в стиле остальных меню =====================
const RL_SPIN_T = 15, RL_FAST_T = 2.5;     // вращение ≈15 с: 2,5 с на полной скорости, потом долгое плавное торможение — в конце лента медленно доползает до приза
// w — вес выпадения (на 100 000 условных шансов): командные призы выпадают совсем редко
const RL_PRIZES = {
    a1:      { icon: 'fa-rotate-right', col: '#FE7600', w: 30000, card: '+1', cardSub: 'попытка', attempts: 1,
               title: '+1 ПОПЫТКА', sub: 'Бонус', desc: 'Ещё одна попытка уже добавлена к твоим попыткам.' },
    a2:      { icon: 'fa-rotate-right', col: '#FF9F1C', w: 20000, card: '+2', cardSub: 'попытки', attempts: 2,
               title: '+2 ПОПЫТКИ', sub: 'Бонус', desc: 'Две дополнительные попытки уже добавлены к твоим попыткам.' },
    a3:      { icon: 'fa-rotate-right', col: '#FFD35A', w: 8000, card: '+3', cardSub: 'попытки', attempts: 3,
               title: '+3 ПОПЫТКИ', sub: 'Крупный бонус', desc: 'Три дополнительные попытки уже добавлены к твоим попыткам.' },
    spin:    { icon: 'fa-dice', col: '#C084FC', w: 7000, card: '+1', cardSub: 'вращение<br>рулетки', extraSpin: 1,
               title: '+1 ВРАЩЕНИЕ', sub: 'Бонус', desc: 'Ты получил ещё одно вращение рулетки — можно крутить снова!' },
    spin2:   { icon: 'fa-dice', col: '#A78BFA', w: 2000, card: '+2', cardSub: 'вращения<br>рулетки', extraSpin: 2,
               title: '+2 ВРАЩЕНИЯ', sub: 'Крупный бонус', desc: 'Ты получил сразу два вращения рулетки — можно крутить дальше!' },
    hearts:  { icon: 'fa-heart', col: '#F43F5E', w: 18000, card: 'СЕРДЦА', cardSub: 'старт с 4,<br>максимум 6',
               title: 'БОЛЬШЕ СЕРДЕЦ', sub: 'Бонус', desc: 'Следующий полёт начнётся с 4 сердец, а максимум сердец станет 6. Когда попытки закончатся и игра начнётся заново, всё вернётся как было.' },
    stamina: { icon: 'fa-feather-pointed', col: '#67E8F9', w: 12000, card: 'СИЛЫ', cardSub: 'запас сил<br>+20%',
               title: 'ЗАПАС СИЛ +20%', sub: 'Бонус', desc: 'Максимальный запас сил увеличен на 20%.' },
    bar:     { icon: 'fa-martini-glass-citrus', col: '#E056FD', w: 3000, card: 'БАР', cardSub: 'сертификат<br>на 1000 ₽',
               title: 'СЕРТИФИКАТ В БАР', sub: 'Редкий приз · 1000 ₽', desc: 'Сертификат на 1000 рублей в бар! Скоро здесь появится переход в чат, где ты сможешь его забрать.' },
    disc1:   { icon: 'fa-percent', col: '#2DD4BF', w: 300, card: '−50%', cardSub: 'скидка<br>на проходку',
               title: 'СКИДКА 50%', sub: 'Редкий приз · на проходку для одного человека', desc: 'Скидка 50% на проходку на игру для одного человека. Скоро здесь появится переход в чат, где ты сможешь её забрать.' },
    pass:    { icon: 'fa-ticket', col: '#FFC53D', w: 500, card: 'ПРОХОДКА', cardSub: 'на одного<br>человека',
               title: 'ПРОХОДКА НА ИГРУ', sub: 'Очень редкий приз · на одного человека', desc: 'Бесплатная проходка на игру! Скоро здесь появится переход в чат, где ты сможешь её забрать.' },
    disc4:   { icon: 'fa-percent', col: '#38BDF8', w: 40, card: '−50%', cardSub: 'скидка для<br>команды из 4',
               title: 'СКИДКА 50% НА КОМАНДУ', sub: 'Очень редкий приз · команда из четырёх человек', desc: 'Скидка 50% на проходки для команды из четырёх человек. Скоро здесь появится переход в чат, где ты сможешь её забрать.' },
    pass4:   { icon: 'fa-ticket', col: '#FF4FA3', w: 50, card: 'ПРОХОДКА', cardSub: 'на команду<br>из 4 человек',
               title: 'ПРОХОДКА НА КОМАНДУ', sub: 'Сверхредкий приз · команда из четырёх человек', desc: 'Бесплатные проходки на игру для команды из четырёх человек! Скоро здесь появится переход в чат, где ты сможешь их забрать.' },
    discTeam:{ icon: 'fa-percent', col: '#A78BFA', w: 4, card: '−50%', cardSub: 'скидка для<br>всей команды',
               title: 'СКИДКА 50% ДЛЯ ВСЕЙ КОМАНДЫ', sub: 'Почти легендарный приз', desc: 'Скидка 50% на проходки для всей твоей команды! Скоро здесь появится переход в чат, где ты сможешь её забрать.' },
    passTeam:{ icon: 'fa-ticket', col: '#FFE066', w: 1, card: 'ПРОХОДКА', cardSub: 'на всю<br>команду',
               title: 'ПРОХОДКА НА ВСЮ КОМАНДУ', sub: 'Легендарный приз', desc: 'Бесплатные проходки на игру для всей твоей команды! Это самый редкий приз рулетки. Скоро здесь появится переход в чат, где ты сможешь их забрать.' }
};
const RL_PATTERN = ['a1', 'hearts', 'bar', 'spin', 'a2', 'disc1', 'stamina', 'a1', 'pass', 'a3', 'spin2', 'hearts', 'pass4', 'a1', 'disc4', 'bar', 'spin', 'passTeam', 'a2', 'discTeam', 'stamina'];
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
    const p = RL_PRIZES[key], res = rwEl('rwResult'), card = rwEl('rwResCard');
    if (!res || !card) return;
    card.style.setProperty('--c', p.col);
    rwEl('rwResIco').innerHTML = `<i class="fa-solid ${p.icon}"></i>`;
    rwEl('rwResTitle').innerText = p.title;
    rwEl('rwResSub').innerText = p.sub;
    rwEl('rwResDesc').innerText = p.desc;
    res.classList.remove('hidden');
    Haptics.powerup();
}
function claimRoulettePrize() {
    const key = rw.prize;
    if (!key) return;
    const p = RL_PRIZES[key];
    if (p.attempts) { attempts += p.attempts; updateAttemptsHUD(); }
    if (p.extraSpin) rouletteSpins += p.extraSpin;
    if (key === 'hearts') { startLives = 4.0; maxLives = 6.0; updateLivesHUD(); }
    if (key === 'stamina') { maxStamina += 20; stamina = maxStamina; updateStaminaHUD(); }
    try { localStorage.setItem('bubo_last_prize', key + ':' + Date.now()); } catch (e) {}   // пригодится для будущего перехода в чат
    StorageManager.save();
    rwEl('rwResult').classList.add('hidden');
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
// Победа: даём попытку вращения и открываем рулетку (окно в стиле меню)
function triggerVictory() {
    gameActive = false; waitingFirstTap = false;
    rouletteSpins++;
    StorageManager.save();
    Haptics.powerup();
    returnToHome();
    AudioFX.setMode('victory');
    AudioFX.playLevelUp();
    openRoulette({ victory: true });
}

// Браузеры разрешают звук только после действия пользователя (касание, клик, клавиша).
