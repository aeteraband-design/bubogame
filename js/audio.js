// BUBO Quiz Owl Flight — звук, музыка и вибрация (грузится первым)

const Haptics = {
    enabled: true,
    vibrate(pattern) {
        if (!this.enabled) return;
        try {
            // все вибрации на ~8% длиннее — лучше ощущаются (паузы в узоре не трогаем)
            pattern = (Array.isArray(pattern) ? pattern : [pattern]).map((d, i) => i % 2 === 0 ? Math.round(d * 1.08) : d);
            if (navigator.vibrate) { navigator.vibrate(pattern); return; }
            this.iosVibrate(pattern);   // iPhone: у Safari нет navigator.vibrate, используем встроенный отклик переключателя (iOS 17.4+)
        } catch(e) {}
    },
    // На iPhone вибрацию даёт нажатие на скрытый переключатель <input type="checkbox" switch>; работает в Safari iOS 17.4 и новее.
    // Надёжнее всего срабатывает в момент касания экрана (взмах, нажатие кнопок); из игровых событий — по возможности
    // Важно: iOS разрешает отклик только в «настоящем» жесте — когда палец ОТПУСКАЕТ экран (touchend / pointerup / click),
    // а не в момент касания (touchstart). Взмах совы срабатывает на касании, поэтому отклик откладываем до отпускания пальца —
    // это доли секунды. Отложенный отклик старше 0,8 с выбрасываем, чтобы не дрожало невпопад.
    iosVibrate(pattern) {
        const arr = Array.isArray(pattern) ? pattern : [pattern];
        if (this._gesture) { this.iosPlay(arr); return; }
        // игровое событие без касания (поймал тему, удар, бонус): сразу пробуем отдать отклик (iOS разрешает его ещё какое-то время
        // после последнего касания), и на всякий случай повторяем на ближайшем отпускании пальца. Лучше лишний лёгкий отклик, чем никакого
        if (!this._down) this.iosPlay(arr);   // палец сейчас на экране — отдадим при отпускании, без двойного щелчка
        const sum = (a) => a.reduce((x, y) => x + y, 0);
        if (!this._pending || sum(arr) >= sum(this._pending) || performance.now() - this._pendingT > 1200) { this._pending = arr; this._pendingT = performance.now(); }
    },
    // узор → не больше двух щелчков: первый сразу (внутри жеста), второй через 90 мс, пока жест ещё «свежий»
    iosPlay(arr) {
        this.iosTick();
        if (arr.length > 2 && arr[2] > 0) setTimeout(() => this.iosTick(), 90);
    },
    // как в библиотеке ios-haptics: каждый раз новый скрытый переключатель в <head>, нажатие и удаление — так iOS отдаёт отклик надёжнее
    iosTick() {
        try {
            const lb = document.createElement('label');
            lb.ariaHidden = 'true'; lb.style.display = 'none';
            const inp = document.createElement('input');
            inp.type = 'checkbox'; inp.setAttribute('switch', '');
            lb.appendChild(inp);
            ['click', 'change'].forEach(t => lb.addEventListener(t, (e) => e.stopPropagation()));
            document.head.appendChild(lb);
            lb.click();
            document.head.removeChild(lb);
        } catch (e) {}
    },
    flap() { this.vibrate(8); },
    collectTheme() { this.vibrate([35, 25, 45]); },
    powerup() { this.vibrate([45, 30, 60]); },
    hit() { this.vibrate([70, 35, 90]); },
    death() { this.vibrate([120, 50, 160, 50, 240]); }
};

// iPhone: отклик разрешён только в жесте, который iOS считает «активацией» — отпускание пальца (touchend / pointerup), клик, клавиша.
// В этот момент проигрываем отложенный отклик; на время обработки события разрешаем и прямые вызовы.
['touchstart', 'pointerdown'].forEach((ev) => document.addEventListener(ev, () => { Haptics._down = true; }, true));
document.addEventListener('touchcancel', () => { Haptics._down = false; }, true);
['touchend', 'pointerup', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => {
    Haptics._down = false; Haptics._gesture = true; Haptics._lastAct = performance.now();
    if (Haptics._pending) {
        const pd = Haptics._pending; Haptics._pending = null;
        if (performance.now() - (Haptics._pendingT || 0) < 1200) Haptics.iosPlay(pd);
    }
    setTimeout(() => { Haptics._gesture = false; }, 0);
}, true));

const AudioFX = {
    ctx: null,
    musicGain: null,
    sfxGain: null,
    isMusicMuted: false,
    isSfxMuted: false,
    musicVolume: 0.38,
    sfxVolume: 1.0,
    mode: 'menu',
    musicTimer: null,
    step: 0,
    ready: false,
    primed: false,

    victoryMelody: [523.25, 659.25, 783.99, 1046.50, 783.99, 880.00, 1046.50, 1318.51, 1174.66, 1046.50, 880.00, 783.99, 880.00, 1046.50, 1174.66, 1046.50],
    victoryBass: [130.81, 130.81, 174.61, 174.61, 196.00, 196.00, 130.81, 196.00],
    shopMelody:  [523.25, 659.25, 783.99, 659.25, 880.00, 783.99, 659.25, 0, 698.46, 880.00, 1046.50, 880.00, 783.99, 659.25, 587.33, 0],
    shopMelody2: [659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25, 0, 587.33, 698.46, 880.00, 783.99, 698.46, 659.25, 587.33, 523.25],
    shopBass:    [130.81, 196.00, 110.00, 164.81, 174.61, 130.81, 196.00, 146.83],
    quizMelody:  [329.63, 0, 392.00, 0, 440.00, 0, 392.00, 329.63, 349.23, 0, 329.63, 0, 261.63, 0, 293.66, 0],
    quizMelody2: [329.63, 0, 392.00, 0, 523.25, 0, 440.00, 392.00, 329.63, 0, 293.66, 0, 261.63, 0, 246.94, 0],
    quizBass:    [110.00, 87.31, 130.81, 98.00],
    menuMelody: [293.66, 349.23, 440.00, 349.23, 523.25, 440.00, 392.00, 329.63, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 349.23, 329.63],
    gameBass:   [146.83, 146.83, 174.61, 146.83, 196.00, 174.61, 130.81, 164.81],
    gameArp:    [293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 392.00],
    // Варианты мелодии для высоких уровней сложности: всё напряжённее и суровее
    gameArpTense: [293.66, 349.23, 466.16, 587.33, 554.37, 466.16, 349.23, 415.30],
    gameArpHard:  [293.66, 349.23, 415.30, 587.33, 554.37, 415.30, 349.23, 311.13],
    gameBassHard: [146.83, 146.83, 155.56, 146.83, 138.59, 146.83, 130.81, 123.47],
    // Хард: вариант мелодии строго в тональности ре минор (без «фальшивых» хроматических нот Хард+)
    gameArpHardSoft: [293.66, 349.23, 440.00, 587.33, 523.25, 466.16, 440.00, 349.23],
    deathMelody: [440.00, 329.63, 392.00, 293.66, 349.23, 261.63, 329.63, 246.94, 293.66, 220.00, 261.63, 196.00, 220.00, 164.81, 196.00, 146.83],
    deathBass:   [110.00, 87.31, 98.00, 82.41],

    init() {
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this.sfxGain = this.ctx.createGain();
                    this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
                    this.master = this.ctx.createDynamicsCompressor();
                    this.master.threshold.setValueAtTime(-18, this.ctx.currentTime);
                    this.master.knee.setValueAtTime(20, this.ctx.currentTime);
                    this.master.ratio.setValueAtTime(3, this.ctx.currentTime);
                    this.master.attack.setValueAtTime(0.012, this.ctx.currentTime);
                    this.master.release.setValueAtTime(0.3, this.ctx.currentTime);
                    // общий регулятор громкости для плавного затухания при сворачивании
                    this.fadeGain = this.ctx.createGain();
                    this.fadeGain.gain.value = document.hidden ? 0 : 1;
                    // после компрессора: небольшое общее усиление и лимитер, чтобы громкие наложения звуков не хрипели
                    this.makeup = this.ctx.createGain();
                    this.makeup.gain.value = 1.45;
                    this.limiter = this.ctx.createDynamicsCompressor();
                    this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
                    this.limiter.knee.setValueAtTime(0, this.ctx.currentTime);
                    this.limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
                    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
                    this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime);
                    this.master.connect(this.makeup);
                    this.makeup.connect(this.limiter);
                    this.limiter.connect(this.fadeGain);
                    this.fadeGain.connect(this.ctx.destination);
                    // Едва слышный фоновый шум (около −70 дБ) не даёт звуковой карте ноутбука/колонок «засыпать» между звуками,
                    // из-за этого начало звука иногда обрезалось и слышались щелчки
                    try {
                        const kaSrc = this.ctx.createOscillator(); kaSrc.type = 'sine'; kaSrc.frequency.value = 18;   // ниже порога слышимости — без шипения
                        const kaGain = this.ctx.createGain(); kaGain.gain.value = 0.0005;
                        kaSrc.connect(kaGain); kaGain.connect(this.fadeGain); kaSrc.start();
                        setTimeout(() => { try { this._ensureWindBuf(); } catch (e) {} }, 700);   // общий шум для «ветра» готовим заранее, а не в момент подбора
                    } catch (e) {}
                    this.sfxGain.connect(this.master);

                    this.musicGain = this.ctx.createGain();
                    this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVolume, this.ctx.currentTime);
                    this.musicGain.connect(this.master || this.ctx.destination);
                    this.ctx.onstatechange = () => {
                        if (this.ctx && this.ctx.state === 'running') {
                            this.ready = true;
                            if (!document.hidden) this.fadeTo(1, 1.0);
                            if (!this.musicTimer) this.startMusicLoop();
                        }
                    };
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            if (!this.musicTimer) {
                this.startMusicLoop();
            }
        } catch(e) {}
    },

    // Вызывается из любого касания / клика / клавиши: браузер разрешает звук только после действия пользователя
    resume() {
        this.init();
        try {
            if (this.ctx && this.ctx.state !== 'running') {
                const p = this.ctx.resume();
                if (p && p.then) {
                    p.then(() => {
                        this.ready = (this.ctx.state === 'running');
                        if (this.ready && !this.musicTimer) this.startMusicLoop();
                    }).catch(() => {});
                }
            }
            if (this.ctx && !this.primed) {
                this.primed = true;
                const b = this.ctx.createBuffer(1, 1, 22050);
                const s = this.ctx.createBufferSource();
                s.buffer = b; s.connect(this.ctx.destination); s.start(0);
            }
        } catch (e) {}
    },

    updateMusicUI() {
        const icon = document.getElementById('musicToggleIcon');
        const slash = document.getElementById('musicMuteSlash');
        if (!icon) return;
        if (this.isMusicMuted) {
            icon.classList.remove('text-purple-200');
            icon.classList.add('text-red-400');
            if (slash) slash.classList.remove('hidden');
        } else {
            icon.classList.remove('text-red-400');
            icon.classList.add('text-purple-200');
            if (slash) slash.classList.add('hidden');
        }
    },

    setMuted(muted) {
        this.isMusicMuted = muted;
        if (this.musicGain && this.ctx) {
            // плавно и заметно: затихает и набирает громкость за 1,2 с (без резкого обрыва); новые ноты продолжают звучать, пока громкость не упала почти до нуля
            const now = this.ctx.currentTime, g = this.musicGain.gain;
            const target = this.isMusicMuted ? 0 : this.musicVolume;
            g.cancelScheduledValues(now);
            g.setValueAtTime(g.value, now);
            g.linearRampToValueAtTime(target, now + 1.2);
        }
        this.updateMusicUI();
    },

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicGain && this.ctx && !this.isMusicMuted) {
            const now = this.ctx.currentTime;
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.setValueAtTime(this.musicVolume, now);
        }
    },

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        this.isSfxMuted = (this.sfxVolume === 0);
        if (this.sfxGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.sfxGain.gain.cancelScheduledValues(now);
            this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : this.sfxVolume, now);
        }
    },

    toggleMusic() {
        this.resume();
        this.setMuted(!this.isMusicMuted);
    },

    // fade: true — плавная смена музыки (окна в меню): старая затихает ~0,4 с, новая набирает громкость ~0,8 с
    setMode(newMode, opts) {
        const eff = this._pendMode || this.mode;
        if (eff === newMode) {
            if (this._pendMode && this._pendMode === this.mode) { clearTimeout(this._fadeT); this._pendMode = null; this._fadeIn(); }
            return;
        }
        const smooth = !!(opts && opts.fade) && this.ctx && this.musicGain && this.ctx.state === 'running' && !this.isMusicMuted;
        clearTimeout(this._fadeT);
        if (!smooth) {
            const wasFading = !!this._pendMode; this._pendMode = null;
            this.mode = newMode; this.step = 0; this.stopMusic(); this.startMusicLoop();
            if (wasFading) this._fadeIn();
            return;
        }
        this._pendMode = newMode;
        const now = this.ctx.currentTime, g = this.musicGain.gain;
        g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.4);
        this._fadeT = setTimeout(() => {
            const m = this._pendMode; this._pendMode = null; if (!m) return;
            this.mode = m; this.step = 0; this.stopMusic(); this.startMusicLoop(); this._fadeIn();
        }, 420);
    },
    _fadeIn() {
        try {
            const now = this.ctx.currentTime, g = this.musicGain.gain;
            g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(this.isMusicMuted ? 0 : this.musicVolume, now + 0.8);
        } catch (e) {}
    },

    stopMusic() {
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    },

    // Шумовой «свист» с плавным движением частоты — основа звуков ускорения, замедления и сжатия труб (идёт по шине эффектов, музыка ни при чём)
    _whoosh(t, dur, f0, f1, vol) {
        const ctx = this.ctx;
        // белый шум готовим один раз (3 с) и берём из него случайный кусок — раньше шум генерировался заново на каждый подбор
        if (!this._whiteBuf || this._whiteBuf.sampleRate !== ctx.sampleRate) {
            const wb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3), ctx.sampleRate), wd = wb.getChannelData(0);
            for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
            this._whiteBuf = wb;
        }
        const src = ctx.createBufferSource(); src.buffer = this._whiteBuf;
        const wOff = Math.random() * Math.max(0, 3 - dur - 0.05);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
        src.connect(bp); bp.connect(g); g.connect(this.sfxGain || ctx.destination);
        src.start(t, wOff); src.stop(t + dur + 0.02);
    },
    _glide(t, dur, f0, f1, vol, type) {
        const ctx = this.ctx, osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
        osc.connect(g); g.connect(this.sfxGain || ctx.destination);
        osc.start(t); osc.stop(t + dur + 0.02);
    },
    // Мягкий звук перехода скорости: два чуть расстроенных треугольных тона + тихая октава ниже, всё за фильтром низких частот.
    // Плавно нарастает, тон медленно едет вверх или вниз всё время, пока меняется скорость игры, и мягко затихает
    _sweepPad(t, dur, f0, f1, vol, cut) {
        const ctx = this.ctx;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
        lp.frequency.setValueAtTime(cut, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.25));
        g.gain.setValueAtTime(vol, t + dur * 0.55);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        lp.connect(g); g.connect(this.sfxGain || ctx.destination);
        [[1, 'triangle', 1], [1.007, 'triangle', 0.8], [0.5, 'sine', 0.7]].forEach(([m, type, k]) => {
            const osc = ctx.createOscillator(), og = ctx.createGain();
            osc.type = type; og.gain.value = k;
            osc.frequency.setValueAtTime(f0 * m, t);
            osc.frequency.exponentialRampToValueAtTime(f1 * m, t + dur * 0.85);
            osc.connect(og); og.connect(lp);
            osc.start(t); osc.stop(t + dur + 0.05);
        });
    },
    _ensureWindBuf() {
        const ctx = this.ctx;
        if (!ctx) return;
        if (!this._windBuf || this._windBuf.sampleRate !== ctx.sampleRate) {
            const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 4), ctx.sampleRate), dd = nb.getChannelData(0);
            for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
            this._windBuf = nb;
        }
    },
    // Полоса шума с плавным движением частоты — «ветер»: мягкое нарастание, удержание и затухание без щелчков
    _noiseBand(t, dur, f0, f1, q, vol, att) {
        const ctx = this.ctx;
        this._ensureWindBuf();
        const src = ctx.createBufferSource(); src.buffer = this._windBuf; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * att);
        g.gain.setValueAtTime(vol, t + Math.max(dur * att, dur * 0.7)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(this.sfxGain || ctx.destination);
        src.start(t, Math.random() * 3); src.stop(t + dur + 0.04);
    },
    // Тон с одновременным сдвигом высоты и тембра (фильтр открывается/закрывается) — «гул оборотов» или «тормозящая плёнка»
    _toneSweep(t, dur, f0, f1, cut0, cut1, vol, type, att) {
        const ctx = this.ctx, osc = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        osc.type = type || 'sawtooth';
        osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
        lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(cut0, t); lp.frequency.exponentialRampToValueAtTime(cut1, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * att);
        g.gain.setValueAtTime(vol, t + Math.max(dur * att, dur * 0.65)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        osc.connect(lp); lp.connect(g); g.connect(this.sfxGain || ctx.destination);
        osc.start(t); osc.stop(t + dur + 0.05);
    },
    playPipesHeat() {     // «Опасные трубы» включились: глухой «вух» поджига газа, короткая тревожная двухнотная сирена и треск огня
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime + 0.02;
            this._noiseBand(t, 0.45, 180, 1100, 0.8, 0.13, 0.12);               // поджиг: «вух»
            this._toneSweep(t, 0.38, 120, 42, 500, 160, 0.09, 'sine', 0.05);     // низкий удар пламени
            this._toneSweep(t + 0.16, 0.16, 622, 622, 2200, 1600, 0.035, 'triangle', 0.15);   // тревога: «ти-ту»
            this._toneSweep(t + 0.34, 0.24, 466, 440, 2000, 900, 0.035, 'triangle', 0.12);
            this._crackle(t + 0.2, 0.6, 2200, 3600, 0.05, 1.5);                 // потрескивание огня
        } catch (e) {}
    },
    playPipesCool() {     // эффект кончился: короткое «пшш» пара и мягкий светлый звон облегчения
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime + 0.02;
            this._noiseBand(t, 0.55, 3400, 1400, 1.2, 0.06, 0.08);
            this._toneSweep(t + 0.18, 0.3, 523, 523, 2600, 1800, 0.03, 'triangle', 0.1);
            this._toneSweep(t + 0.32, 0.5, 784, 784, 3000, 1800, 0.028, 'triangle', 0.08);
        } catch (e) {}
    },
    playWaterStart() {    // «Водонапор» включился: в трубах зашумела вода — нарастающий плеск и бульканье
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime + 0.02;
            this._noiseBand(t, 1.2, 350, 1300, 0.9, 0.12, 0.5);
            for (let i = 0; i < 6; i++) { const tt = t + 0.15 + i * 0.12 + Math.random() * 0.05, f = 300 + Math.random() * 500; this._toneSweep(tt, 0.09, f, f * 1.9, 1800, 2600, 0.035, 'sine', 0.2); }
        } catch (e) {}
    },
    playWaterEnd() {      // вода стихает: шум уходит вниз, последние капли
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime + 0.02;
            this._noiseBand(t, 1.1, 1300, 300, 0.9, 0.08, 0.1);
            for (let i = 0; i < 3; i++) { const tt = t + 0.5 + i * 0.22, f = 900 + Math.random() * 600; this._toneSweep(tt, 0.07, f, f * 1.6, 2400, 3000, 0.03, 'sine', 0.2); }
        } catch (e) {}
    },
    playLevelShift() {    // смена уровня сложности: короткий мягкий «разгон» (вместе с обычным звуком нового уровня)
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime + 0.05; this._noiseBand(t, 0.95, 300, 750, 0.9, 0.08, 0.4); this._toneSweep(t, 0.95, 70, 95, 280, 450, 0.05, 'sawtooth', 0.4);
        } catch (e) {}
    },
    playSlowMoStart() {   // замедление: звук «останавливающегося» времени — частота плавно падает
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime;
            this._toneSweep(t, 3.6, 180, 38, 1800, 160, 0.15, 'sawtooth', 0.25); this._toneSweep(t, 3.6, 90, 30, 400, 90, 0.14, 'sine', 0.25); this._noiseBand(t, 2.8, 1600, 220, 0.8, 0.07, 0.3);   // «плёнка тормозит», низкий гул, воздух уходит
        } catch (e) {}
    },
    playSlowMoEnd() {     // время снова набирает ход
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime;
            this._toneSweep(t, 3.0, 40, 170, 160, 1500, 0.12, 'sawtooth', 0.5); this._toneSweep(t, 3.0, 32, 90, 90, 400, 0.11, 'sine', 0.5); this._noiseBand(t, 3.0, 250, 1400, 0.8, 0.06, 0.55);   // время снова разгоняется
        } catch (e) {}
    },
    playSpeedUpStart() {  // ускорение: нарастающий свист
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime;
            this._noiseBand(t, 3.6, 260, 1100, 0.9, 0.16, 0.4); this._noiseBand(t, 3.6, 700, 2100, 3.0, 0.03, 0.45); this._toneSweep(t, 3.6, 70, 150, 300, 700, 0.08, 'sawtooth', 0.4);   // ветер усиливается, поток свистит выше, гул набирает обороты
        } catch (e) {}
    },
    playSpeedUpEnd() {    // скорость возвращается к обычной
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime;
            this._noiseBand(t, 3.0, 1000, 260, 0.9, 0.12, 0.25); this._noiseBand(t, 3.0, 1900, 600, 3.0, 0.025, 0.25); this._toneSweep(t, 3.0, 150, 70, 700, 300, 0.06, 'sawtooth', 0.25);   // ветер стихает, обороты падают
        } catch (e) {}
    },
    onSpeedChanged() {
        // звуки смены скорости — отдельные эффекты, не зависят от музыки
        try {
            const st = (typeof speedBoostTime !== 'undefined' && speedBoostTime > 0) ? 'boost' : ((typeof slowMotionTime !== 'undefined' && slowMotionTime > 0) ? 'slow' : 'normal');
            const prev = this._lastSpeedState || 'normal';
            if (st !== prev) {
                this._lastSpeedState = st;
                // отдельные звуки ускорения/замедления убраны: темп и высота музыки сами показывают, что игра ускорилась или замедлилась
            }
        } catch (e) {}
        this.updateSpeedFactor(); // фиксируем начало плавного разгона/торможения
        // Темп и высота подхватятся на следующем шаге сами — музыку не перезапускаем,
        // иначе нота играется дважды подряд и слышны щелчки.
        if (this.mode === 'game' && !this.musicTimer) {
            this.startMusicLoop();
        }
    },

    startMusicLoop() {
        if (window.__musicHold && document.getElementById('bootLoader')) return;   // экран загрузки ещё на месте — музыка не играет, она начнётся только в меню
        this.stopMusic();
        this.nextNoteTime = 0;
        const pump = () => {
            try {
                if (this.ctx && this.ctx.state === 'running') {
                    const t = this.ctx.currentTime;
                    if (!this.nextNoteTime || this.nextNoteTime < t - 0.05) this.nextNoteTime = t + 0.03;
                    // ноты ставятся заранее (на 0.35 с вперёд) точно по времени аудио — подвисания игры музыку не рвут
                    while (this.nextNoteTime < t + 0.35) {
                        this.playMusicStep(this.nextNoteTime);
                        let d = (this.mode === 'game') ? 0.185 : (this.mode === 'death' ? 0.56 : (this.mode === 'victory' ? 0.2 : (this.mode === 'quiz' ? 0.3 : (this.mode === 'shop' ? 0.19 : 0.29))));
                        if (this.mode !== 'death' && this.mode !== 'victory' && this.mode !== 'menu' && this.mode !== 'quiz' && this.mode !== 'shop') {   // в меню темп всегда стандартный — не зависит ни от сложности, ни от ускорения
                            const diff = getDifficultyMultipliers();
                            if (diff.musicTempoMult) d /= diff.musicTempoMult;
                            d /= this.updateSpeedFactor();
                        }
                        this.nextNoteTime += d;
                    }
                }
            } catch (e) {}
            this.musicTimer = setTimeout(pump, 40);
        };
        pump();
    },

    // Плавное изменение темпа/высоты музыки (около 1–1.5 с): ускорение до 1.3, замедление всего до 0.8
    updateSpeedFactor() {
        const now = performance.now();
        const target = (speedBoostTime > 0 || (typeof shazamActive === 'function' && shazamActive())) ? 1.3 : (slowMotionTime > 0 ? 0.88 : 1.0);
        if (this.factorTarget !== target) {
            this.factorFrom = (this.speedFactor === undefined) ? 1 : this.speedFactor;
            this.factorTarget = target;
            this.factorStart = now;
        }
        const t = Math.min(1, (now - this.factorStart) / 900);
        this.speedFactor = this.factorFrom + (target - this.factorFrom) * (t * t * (3 - 2 * t));
        return this.speedFactor;
    },

    // Мгновенно ставит темп музыки в нужное положение (без плавного разгона/торможения) — при старте новой игры и при загрузке прогресса
    snapSpeedFactor() {
        const target = (typeof speedBoostTime !== 'undefined' && speedBoostTime > 0) ? 1.3 : ((typeof slowMotionTime !== 'undefined' && slowMotionTime > 0) ? 0.88 : 1.0);
        this.speedFactor = this.factorFrom = this.factorTarget = target;
        this.factorStart = performance.now() - 2000;
    },

    playMusicStep(when) {
        if (!this.ctx || !this.musicGain) return;
        if (this.isMusicMuted && this.musicGain.gain.value < 0.02) return;   // при выключении ноты звучат, пока громкость падает, и обрываются только в самом конце
        if (this.ctx.state !== 'running') return;
        const now = when || this.ctx.currentTime;
        let pitchMultiplier = 1.0;

        if (this.mode !== 'menu' && this.mode !== 'quiz' && this.mode !== 'shop') {   // музыка меню всегда в стандартном темпе и высоте — сложность и ускорение на неё не влияют
            const diff = getDifficultyMultipliers();
            if (diff.musicTempoMult) {
                pitchMultiplier *= diff.musicTempoMult;
            }

            pitchMultiplier *= this.updateSpeedFactor();
        }

        if (this.mode === 'death') {
            // Музыка экрана поражения: медленная, грустная, спускающаяся мелодия
            const dFreq = this.deathMelody[this.step % this.deathMelody.length];
            const lead = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();
            lead.type = 'triangle';
            lead.frequency.setValueAtTime(dFreq, now);
            lead.frequency.linearRampToValueAtTime(dFreq * 0.985, now + 0.9);
            leadGain.gain.setValueAtTime(0.0001, now);
            leadGain.gain.linearRampToValueAtTime(0.42, now + 0.05);
            leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
            leadGain.gain.linearRampToValueAtTime(0, now + 0.96);
            lead.connect(leadGain); leadGain.connect(this.musicGain);
            lead.start(now); lead.stop(now + 0.97);
            if (this.step % 2 === 0) {
                const bFreq = this.deathBass[(this.step / 2) % this.deathBass.length];
                const bass = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bass.type = 'sine';
                bass.frequency.setValueAtTime(bFreq, now);
                bassGain.gain.setValueAtTime(0.0001, now);
                bassGain.gain.linearRampToValueAtTime(0.5, now + 0.08);
                bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
                bassGain.gain.linearRampToValueAtTime(0, now + 1.92);
                bass.connect(bassGain); bassGain.connect(this.musicGain);
                bass.start(now); bass.stop(now + 1.93);
            }
        } else if (this.mode === 'victory') {
            // Торжественные фанфары: яркая мажорная мелодия, бас и лёгкие барабаны
            const vt = (type, f, vol, dur) => {
                const os = this.ctx.createOscillator(), g = this.ctx.createGain();
                os.type = type; os.frequency.setValueAtTime(f, now);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(vol, now + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, now + dur);
                os.connect(g); g.connect(this.musicGain);
                os.start(now); os.stop(now + dur + 0.02);
            };
            const mf = this.victoryMelody[this.step % this.victoryMelody.length];
            vt('triangle', mf, 0.3, 0.22);
            vt('square', mf, 0.04, 0.18);
            if (this.step % 2 === 0) vt('triangle', this.victoryBass[(this.step / 2) % this.victoryBass.length], 0.32, 0.35);
            if (this.step % 4 === 0) { vt('sine', mf * 2, 0.08, 0.5); vt('sine', 130, 0.4, 0.15); }
            if (this.step % 8 === 4) {
                const ns = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                ns.buffer = this._iceNoise(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(1900, now);
                g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                ns.connect(fl); fl.connect(g); g.connect(this.musicGain); ns.start(now); ns.stop(now + 0.14);
            }
        } else if (this.mode === 'shop') {
            // лавка: весёлая «магазинная» мелодия — щипковые нотки, прыгающий бас и лёгкий шейкер (C – Am – F – G)
            const s = this.step, s16 = s % 16, ph = Math.floor(s / 16) % 2;
            const f = (ph ? this.shopMelody2 : this.shopMelody)[s16];
            const pl = (type, fr, vol, dur) => {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
                o.type = type; o.frequency.setValueAtTime(fr, now); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, now);
                g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(vol, now + 0.008); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
                o.connect(lp); lp.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + dur + 0.02);
            };
            if (f) { pl('triangle', f, 0.3, 0.24); pl('sine', f * 2, 0.06, 0.12); }
            if (s % 2 === 0) pl('triangle', this.shopBass[Math.floor(s / 2) % this.shopBass.length], 0.34, 0.3);
            if (s % 4 === 2) { pl('sine', 523.25 * (ph ? 1.26 : 1.19), 0.05, 0.18); }   // лёгкий аккордный «плинк» на слабую долю
            {   // шейкер
                const ns = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                ns.buffer = this._iceNoise(); fl.type = 'highpass'; fl.frequency.setValueAtTime(7000, now);
                g.gain.setValueAtTime(s % 2 ? 0.05 : 0.025, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                ns.connect(fl); fl.connect(g); g.connect(this.musicGain); ns.start(now); ns.stop(now + 0.06);
            }
        } else if (this.mode === 'quiz') {
            // вопросы: спокойный «лоу-фай» — мягкая мелодия, тёплый бас, приглушённая бочка и тихие хэты (Am – F – C – G)
            const s = this.step, s16 = s % 16, ph = Math.floor(s / 16) % 2;
            const mel = ph ? this.quizMelody2 : this.quizMelody;
            const f = mel[s16];
            const tone = (type, fr, vol, dur, att) => {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
                o.type = type; o.frequency.setValueAtTime(fr, now); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, now);
                g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(vol, now + (att || 0.03)); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
                o.connect(lp); lp.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + dur + 0.02);
            };
            if (f) tone('triangle', f, 0.26, 0.55, 0.04);
            if (s % 4 === 0) tone('sine', this.quizBass[Math.floor(s / 4) % this.quizBass.length], 0.34, 1.0, 0.05);
            if (s % 8 === 0 || s % 8 === 5) {   // мягкая бочка
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = 'sine'; o.frequency.setValueAtTime(110, now); o.frequency.exponentialRampToValueAtTime(42, now + 0.16);
                g.gain.setValueAtTime(0.32, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + 0.22);
            }
            if (s % 2 === 1) {   // тихий хэт
                const ns = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                ns.buffer = this._iceNoise(); fl.type = 'highpass'; fl.frequency.setValueAtTime(6500, now);
                g.gain.setValueAtTime(s % 4 === 3 ? 0.05 : 0.03, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                ns.connect(fl); fl.connect(g); g.connect(this.musicGain); ns.start(now); ns.stop(now + 0.08);
            }
        } else if (this.mode === 'menu') {
            const freq = this.menuMelody[this.step % this.menuMelody.length];
            const osc = this.ctx.createOscillator();
            const noteGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.linearRampToValueAtTime(0.52, now + 0.04);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            noteGain.gain.linearRampToValueAtTime(0, now + 0.39);
            osc.connect(noteGain);
            noteGain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.39);
        } else {
            const len = 1 / Math.max(0.6, this.speedFactor || 1); // ноты растягиваются вместе с темпом
            // Мелодия на всех уровнях — исходная. С каждым уровнем добавляются барабаны и «нотки» сложности
            let lvl = 0;
            try { lvl = getDifficultyIndex(); } catch (e) {}
            const s16 = this.step % 16;
            // Фраза: на Хард — 4 такта, на Хард+ — 8 тактов с заметно разными вариантами мелодии; узнаваемая основа сохраняется.
            const bar = Math.floor(this.step / 8), i8 = this.step % 8;
            let arpArr = this.gameArp, bassArr = this.gameBass, aMul = 1, lead = false;
            if (lvl === 4) {
                // Хард = звучание Медиум+ и часть приёмов Хард+, всё в тональности: плавный переход к Хард+
                const c = bar % 4;
                if (!this._arpRev) this._arpRev = this.gameArp.slice().reverse();
                if (c === 1 && i8 >= 6) aMul = 2;                                           // 2-й такт: окончание на октаву выше (как в Хард+)
                if (c === 2) { arpArr = this._arpRev; lead = true; }                        // 3-й — мелодия «в обратную сторону» с верхним голосом
                if (c === 3) arpArr = this.gameArpHardSoft;                                 // 4-й — напряжённее, но без фальши
                if (c === 3 && i8 >= 6) aMul = 2;                                           // конец фразы взлетает на октаву
            } else if (lvl >= 5) {
                const c = bar % 8;
                if (!this._arpRev) this._arpRev = this.gameArp.slice().reverse();
                if (c === 1 && i8 >= 6) aMul = 2;                                           // 2-й такт: окончание на октаву выше
                if (c === 2 || c === 6) { arpArr = this.gameArpHard; bassArr = this.gameBassHard; }   // 3-й и 7-й — тёмный вариант
                if (c === 3 || c === 7) arpArr = this.gameArpTense;                         // 4-й и 8-й — напряжённый
                if (c === 5) arpArr = this._arpRev;                                         // 6-й — мелодия «в обратную сторону»
                if (c >= 4 && c <= 6) lead = true;                                          // вторая половина фразы — верхний голос
                if (c === 7 && i8 >= 6) aMul = 0.5;                                         // финал фразы проваливается вниз
            }
            const bFreq = bassArr[this.step % bassArr.length] * pitchMultiplier;
            const aFreq = arpArr[i8 % arpArr.length] * pitchMultiplier * aMul;
            const out = this.musicGain;
            const tone = (type, f, vol, dur, f2) => {
                const os = this.ctx.createOscillator(), g = this.ctx.createGain();
                os.type = type;
                os.frequency.setValueAtTime(f, now);
                if (f2) os.frequency.exponentialRampToValueAtTime(f2, now + dur * 0.8);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(vol, now + 0.006);
                g.gain.exponentialRampToValueAtTime(0.001, now + dur);
                g.gain.linearRampToValueAtTime(0, now + dur + 0.01);
                os.connect(g); g.connect(out);
                os.start(now); os.stop(now + dur + 0.02);
            };
            const noise = (fType, freq, vol, dur, q) => {
                if (!this._noiseBuf) {
                    const nb = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.7), this.ctx.sampleRate);
                    const d = nb.getChannelData(0);
                    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                    this._noiseBuf = nb;
                }
                const ns = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                ns.buffer = this._noiseBuf;
                fl.type = fType; fl.frequency.setValueAtTime(freq, now); if (q) fl.Q.setValueAtTime(q, now);
                g.gain.setValueAtTime(vol, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + dur);
                ns.connect(fl); fl.connect(g); g.connect(out);
                ns.start(now); ns.stop(now + dur + 0.02);
            };
            const kick = (vol) => { tone('sine', 130, vol, 0.17, 42); tone('triangle', 190, vol * 0.6, 0.09, 70); noise('lowpass', 2600, vol * 0.25, 0.03); };
            const snare = (vol) => { noise('bandpass', 1900, vol, 0.13, 0.8); tone('triangle', 190, vol * 0.7, 0.08, 140); };
            const hat = (vol, dur) => noise('bandpass', 8500, vol * 0.5, Math.min(dur || 0.03, 0.08), 1.4);   // чистый короткий «цик» без шипения

            // Бас — исходный; на Хард+ становится плотнее и грубее
            const oscB = this.ctx.createOscillator();
            const gainB = this.ctx.createGain();
            oscB.type = lvl >= 5 ? 'sawtooth' : 'triangle';
            oscB.frequency.setValueAtTime(bFreq, now);
            gainB.gain.setValueAtTime(0.0001, now);
            gainB.gain.linearRampToValueAtTime(lvl >= 5 ? 0.22 : 0.3, now + 0.006);
            gainB.gain.exponentialRampToValueAtTime(0.001, now + 0.18 * len);
            gainB.gain.linearRampToValueAtTime(0, now + 0.19 * len);
            if (lvl >= 5) {
                const lp = this.ctx.createBiquadFilter();
                lp.type = 'lowpass'; lp.frequency.setValueAtTime(1000, now);
                oscB.connect(lp); lp.connect(gainB);
            } else {
                oscB.connect(gainB);
            }
            gainB.connect(out);
            oscB.start(now);
            oscB.stop(now + 0.19 * len);
            if (lvl >= 4) tone('sine', bFreq / 2, 0.18, 0.17 * len);          // Хард: низкая подложка
            // Хард: новый элемент — быстрый басовый арпеджио на каждую вторую восьмую (тихо, «пульс» под мелодией)
            if (lvl >= 4 && this.step % 2 === 1) tone('triangle', bFreq * 2, 0.03, 0.06 * len);

            // Мелодия — исходная; с Лайт звучит на каждый шаг (плотнее)
            if (lvl >= 1 || this.step % 2 === 0) tone('sine', aFreq, 0.24, 0.15 * len);
            // Хард: высокая «нотка»-отголосок в начале каждого такта
            if (lvl >= 4 && this.step % 8 === 0) tone('triangle', aFreq * 2, 0.1, 0.3 * len);
            // Хард+: тёмный второй голос под мелодией (тревожная гармония)
            if (lvl >= 5) tone('triangle', aFreq * 0.8409, 0.09, 0.14 * len);
            if (lead && this.step % 2 === 0) tone('square', aFreq * 2, lvl === 4 ? 0.03 : 0.045, 0.12 * len);   // Хард+: верхний голос во второй половине фразы

            // ===== Барабаны: с каждым уровнем больше =====
            if (lvl >= 1 && this.step % 2 === 1) hat(0.1);                              // Лайт: хай-хэт «цик» на слабые доли
            if (lvl >= 2 && this.step % 4 === 0) kick(lvl >= 5 ? 0.62 : 0.55);          // Медиум: бочка
            if (lvl >= 3 && this.step % 8 === 4) noise('bandpass', 1200, 0.12, 0.06, 1.2); // Медиум+: «хлопок» вместе с рабочим
            if (lvl >= 4 && this.step % 4 === 2) tone('square', bFreq * 2, 0.05, 0.08);    // Хард: короткий щипок баса
            if (lvl >= 3 && this.step % 8 === 4) snare(lvl >= 5 ? 0.32 : 0.28);         // Медиум+: малый (рабочий) барабан
            if (lvl === 4 && this.step % 8 === 6) hat(0.05, 0.12);                       // Хард: лёгкий открытый хай-хэт из Хард+
            if (lvl >= 5) {                                                              // Хард+: хай-хэт на каждый шаг
                if (this.step % 2 === 0) hat(0.08);
                if (this.step % 8 === 6) hat(0.07, 0.16);                                // + открытый хай-хэт
                if (this.step % 8 === 6) kick(0.42);                                     // + дополнительная бочка
            }
            if (lvl >= 5) {                                                              // Хард+: полный бит
                if (s16 === 3 || s16 === 11) kick(0.45);
                if (s16 === 12) snare(0.24);
                if (s16 === 14 || s16 === 15) snare(0.2 + (s16 - 14) * 0.08);           // сбивка в конце фразы
                if (this.step % 32 === 0) noise('bandpass', 6500, 0.035, 0.32, 0.9);           // тарелка-«крэш»
                if (this.step % 16 === 0) {                                              // тревожный аккорд
                    [aFreq / 2, aFreq / 2 * 1.4983].forEach(f => tone('square', f, 0.05, 0.35 * len));
                }
            }
        }
        this.step++;
    },

    playFlap() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch(e) {}
    },
    playCollect(isSpecial) {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = isSpecial ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(isSpecial ? 540 : 440, now);
            osc.frequency.exponentialRampToValueAtTime(isSpecial ? 880 : 660, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            gain.gain.linearRampToValueAtTime(0, now + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch(e) {}
    },
    playThemeLose() {     // тема потеряна: тот же перелив, что при сборе темы, но наоборот — вниз, в миноре, с лёгким «сдуванием»
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            [783.99, 622.25, 523.25, 392.0].forEach((freq, index) => {
                const t = now + index * 0.07, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.22);
                gain.gain.setValueAtTime(0.13, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
                osc.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
                osc.start(t); osc.stop(t + 0.28);
            });
        } catch(e) {}
    },
    playThemeCollect() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99].forEach((freq, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.05);
                gain.gain.setValueAtTime(0.15, now + index * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.24);
                gain.gain.linearRampToValueAtTime(0, now + index * 0.05 + 0.25);
                osc.connect(gain);
                gain.connect(this.sfxGain || this.ctx.destination);
                osc.start(now + index * 0.05);
                osc.stop(now + index * 0.05 + 0.25);
            });
        } catch(e) {}
    },
    playStarCollect() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            [783.99, 987.77, 1174.66].forEach((freq, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + index * 0.06);
                gain.gain.setValueAtTime(0.18, now + index * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.19);
                gain.gain.linearRampToValueAtTime(0, now + index * 0.06 + 0.2);
                osc.connect(gain);
                gain.connect(this.sfxGain || this.ctx.destination);
                osc.start(now + index * 0.06);
                osc.stop(now + index * 0.06 + 0.2);
            });
        } catch(e) {}
    },
    playMaxStaminaChime() {   // бывший звук щита — теперь звук увеличения максимума сил
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            [587.33, 783.99, 1046.50, 1567.98].forEach((freq, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + index * 0.05);
                gain.gain.setValueAtTime(0.001, now + index * 0.05);
                gain.gain.linearRampToValueAtTime(0.24, now + index * 0.05 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.21);
                gain.gain.linearRampToValueAtTime(0, now + index * 0.05 + 0.23);
                osc.connect(gain);
                gain.connect(this.sfxGain || this.ctx.destination);
                osc.start(now + index * 0.05);
                osc.stop(now + index * 0.05 + 0.23);
            });
        } catch(e) {}
    },
    playOverEat() {
        // Забавный звук надувающегося шарика / набора веса
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const out = this.sfxGain || this.ctx.destination;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(460, now + 0.8);
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(11, now);
            lfoGain.gain.setValueAtTime(14, now);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gain.gain.setValueAtTime(0.2, now + 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.86);
            osc.connect(gain);
            gain.connect(out);
            osc.start(now); lfo.start(now);
            osc.stop(now + 0.88); lfo.stop(now + 0.88);

            // шипение воздуха
            const len = Math.floor(this.ctx.sampleRate * 0.7);
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(2200, now);
            const ng = this.ctx.createGain();
            ng.gain.setValueAtTime(0.09, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            noise.connect(bp); bp.connect(ng); ng.connect(out);
            noise.start(now);

            // финальный писк «шарика»
            const sq = this.ctx.createOscillator();
            const sg = this.ctx.createGain();
            sq.type = 'sine';
            sq.frequency.setValueAtTime(700, now + 0.78);
            sq.frequency.exponentialRampToValueAtTime(1150, now + 0.95);
            sg.gain.setValueAtTime(0.0001, now + 0.78);
            sg.gain.linearRampToValueAtTime(0.12, now + 0.8);
            sg.gain.exponentialRampToValueAtTime(0.001, now + 0.96);
            sq.connect(sg); sg.connect(out);
            sq.start(now + 0.78); sq.stop(now + 0.97);
        } catch(e) {}
    },
    playDrunk() {
        // Забавная икота + «плывущий» звук
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const out = this.sfxGain || this.ctx.destination;

            const hic = (t, base) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(base, t);
                o.frequency.exponentialRampToValueAtTime(base * 2.0, t + 0.04);
                o.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.16);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.linearRampToValueAtTime(0.13, t + 0.015);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
                o.connect(g); g.connect(out);
                o.start(t); o.stop(t + 0.18);
            };
            hic(now, 210);
            hic(now + 0.3, 185);

            // «плывущее» пьяное вибрато
            const w = this.ctx.createOscillator();
            const wg = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lg = this.ctx.createGain();
            w.type = 'sine';
            w.frequency.setValueAtTime(520, now + 0.55);
            w.frequency.exponentialRampToValueAtTime(240, now + 1.25);
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(7, now + 0.55);
            lg.gain.setValueAtTime(34, now + 0.55);
            lfo.connect(lg); lg.connect(w.frequency);
            wg.gain.setValueAtTime(0.0001, now + 0.55);
            wg.gain.linearRampToValueAtTime(0.16, now + 0.65);
            wg.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
            w.connect(wg); wg.connect(out);
            w.start(now + 0.55); lfo.start(now + 0.55);
            w.stop(now + 1.27); lfo.stop(now + 1.27);
        } catch(e) {}
    },
    _iceNoise() {
        if (!this._sfxNoiseBuf) {
            const nb = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.3), this.ctx.sampleRate);
            const d = nb.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            this._sfxNoiseBuf = nb;
        }
        return this._sfxNoiseBuf;
    },
    _iceCrack(t, freq, vol, dur) {
        const ns = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        ns.buffer = this._iceNoise();
        f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.setValueAtTime(3, t);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        ns.connect(f); f.connect(g); g.connect(this.sfxGain || this.ctx.destination);
        ns.start(t); ns.stop(t + dur + 0.02);
    },
    playFreeze() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            // хруст нарастающего льда
            for (let i = 0; i < 7; i++) this._iceCrack(now + i * 0.045, 2500 + Math.random() * 3500, 0.22, 0.05);
            [2093.0, 1760.0, 1567.98, 1318.51, 1046.5].forEach((f, i) => {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(f, now + i * 0.06);
                g.gain.setValueAtTime(0.0001, now + i * 0.06);
                g.gain.linearRampToValueAtTime(0.16, now + i * 0.06 + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
                o.connect(g); g.connect(this.sfxGain || this.ctx.destination);
                o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.42);
            });
        } catch (e) {}
    },
    playFreezeEnd() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            // лёд трескается и осыпается звонкими осколками
            this._iceCrack(now, 900, 0.4, 0.12);
            for (let i = 0; i < 9; i++) this._iceCrack(now + 0.05 + i * 0.04 + Math.random() * 0.02, 3000 + Math.random() * 4000, 0.18, 0.06);
            [1046.5, 1318.51, 1567.98].forEach((f, i) => {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(f, now + i * 0.05);
                g.gain.setValueAtTime(0.0001, now + i * 0.05);
                g.gain.linearRampToValueAtTime(0.12, now + i * 0.05 + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
                o.connect(g); g.connect(this.sfxGain || this.ctx.destination);
                o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.27);
            });
        } catch (e) {}
    },
    playDrunkEnd() {
        // Короткий «обратный» звук входа в опьянение: плывущий тон вверх
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const out = this.sfxGain || this.ctx.destination;
            const w = this.ctx.createOscillator();
            const wg = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lg = this.ctx.createGain();
            w.type = 'sine';
            w.frequency.setValueAtTime(240, now);
            w.frequency.exponentialRampToValueAtTime(520, now + 0.45);
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(7, now);
            lg.gain.setValueAtTime(30, now);
            lfo.connect(lg); lg.connect(w.frequency);
            wg.gain.setValueAtTime(0.0001, now);
            wg.gain.linearRampToValueAtTime(0.15, now + 0.3);
            wg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            w.connect(wg); wg.connect(out);
            w.start(now); lfo.start(now);
            w.stop(now + 0.52); lfo.stop(now + 0.52);
        } catch(e) {}
    },
    playOverEatEnd() {
        // Сова «сдувается»: обратный звук надувающегося шарика
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const out = this.sfxGain || this.ctx.destination;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.6);
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(13, now);
            lfoGain.gain.setValueAtTime(16, now);
            lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
            osc.connect(gain); gain.connect(out);
            osc.start(now); lfo.start(now);
            osc.stop(now + 0.64); lfo.stop(now + 0.64);

            const len = Math.floor(this.ctx.sampleRate * 0.55);
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(2400, now);
            bp.frequency.exponentialRampToValueAtTime(900, now + 0.55);
            const ng = this.ctx.createGain();
            ng.gain.setValueAtTime(0.1, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            noise.connect(bp); bp.connect(ng); ng.connect(out);
            noise.start(now);
        } catch(e) {}
    },
    playCompressStart() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(380, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.34);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.33);
            gain.gain.linearRampToValueAtTime(0, now + 0.34);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.34);
        } catch(e) {}
    },
    playCompressEnd() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(380, now + 0.34);
            gain.gain.setValueAtTime(0.20, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.33);
            gain.gain.linearRampToValueAtTime(0, now + 0.34);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.34);
        } catch(e) {}
    },
    playHit() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch(e) {}
    },
    // Плавно меняет общую громкость (0 — тишина, 1 — обычная) за sec секунд
    fadeTo(v, sec) {
        if (!this.ctx || !this.fadeGain) return;
        const g = this.fadeGain.gain, t = this.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(v, t + sec);
    },
    // Игру не видно (свернули приложение, ушли на другую вкладку): звук за секунду уходит в ноль
    onHidden() {
        if (!this.ctx) return;
        this.fadeTo(0, 1.0);
        clearTimeout(this._suspT);
        this._suspT = setTimeout(() => {
            if (document.hidden && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
        }, 1150);
    },
    // Игра снова на экране: звук за секунду плавно возвращается
    onVisible() {
        if (!this.ctx || !this.fadeGain) return;
        clearTimeout(this._suspT);
        if (this.ctx.state !== 'running') {
            this.fadeGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.ctx.resume().then(() => this.fadeTo(1, 1.0)).catch(() => {});
        } else {
            this.fadeTo(1, 1.0);
        }
    },
    // ===== Погода: ветер и дождь (постоянный фон, громкость по силе грозы) и далёкий гром =====
    _weatherInit() {
        if (this._wx || !this.ctx) return;
        const ctx = this.ctx;
        this._ensureWindBuf();
        const out = this.sfxGain || ctx.destination;
        // дождь: шум без низов и верхов — ровный шелест
        const rs = ctx.createBufferSource(); rs.buffer = this._windBuf; rs.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
        const rg = ctx.createGain(); rg.gain.value = 0;
        rs.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(out);
        // ветер: низкая полоса шума, частота и громкость медленно «гуляют» — порывы
        const ws = ctx.createBufferSource(); ws.buffer = this._windBuf; ws.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 360; bp.Q.value = 0.9;
        const gust = ctx.createGain(); gust.gain.value = 0.75;
        const wg = ctx.createGain(); wg.gain.value = 0;
        ws.connect(bp); bp.connect(gust); gust.connect(wg); wg.connect(out);
        const l1 = ctx.createOscillator(); l1.frequency.value = 0.11; const l1g = ctx.createGain(); l1g.gain.value = 140; l1.connect(l1g); l1g.connect(bp.frequency);
        const l2 = ctx.createOscillator(); l2.frequency.value = 0.17; const l2g = ctx.createGain(); l2g.gain.value = 0.25; l2.connect(l2g); l2g.connect(gust.gain);
        const t = ctx.currentTime;
        rs.start(t, 0.37); ws.start(t, 2.1); l1.start(t); l2.start(t);
        this._wx = { rg, wg, lp };
    },
    // отдельные капли: короткий звонкий щелчок (полоса шума с быстрым затуханием), высота и громкость случайные
    _rainDrop(t, vol) {
        const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this._windBuf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + Math.random() * 4200; bp.Q.value = 2.5 + Math.random() * 4;
        const g = ctx.createGain(), d = 0.02 + Math.random() * 0.05;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        src.connect(bp); bp.connect(g); g.connect(this.sfxGain || ctx.destination);
        src.start(t, Math.random() * 1.5, d + 0.02);
    },
    _rainDropsLoop() {
        const W = this._wx; if (!W || !this.ctx) return;
        W.rain = W.rain == null ? 0 : W.rain + ((W.rainTarget || 0) - W.rain) * 0.06;   // частота капель меняется плавно (~2 с)
        const r = W.rain;
        if (r < 0.008 && (W.rainTarget || 0) < 0.01) { W.dropTimer = 0; W.rain = 0; return; }
        if (this.ctx.state === 'running') {
            const now = this.ctx.currentTime, span = 0.1, rate = 2.5 + 75 * Math.pow(r, 1.3);   // капель в секунду
            let n = 0; const lam = rate * span; let p = Math.exp(-lam), s = p, u = Math.random(); while (u > s && n < 30) { n++; p *= lam / n; s += p; }
            const vol = 0.035 + 0.03 * Math.min(1, r * 2);
            for (let i = 0; i < n; i++) this._rainDrop(now + 0.02 + Math.random() * span, vol * (0.35 + Math.random() * 0.65));
        }
        W.dropTimer = setTimeout(() => this._rainDropsLoop(), 100);
    },
    weatherSet(rain, wind, fast) {
        if (!this.ctx) return;
        if (!this._wx) { if (rain <= 0 && wind <= 0) return; this._weatherInit(); }
        const t = this.ctx.currentTime;
        this._wx.rg.gain.cancelScheduledValues(t); this._wx.wg.gain.cancelScheduledValues(t);
        // дождь из отдельных капель: сначала редкие «кап… кап», потом всё чаще, и только в сильный дождь их перекрывает сплошной шум ливня
        const W = this._wx; W.rainTarget = rain; if (fast) W.rain = rain;
        if (!W.dropTimer && rain > 0.01) this._rainDropsLoop();
        const wash = rain < 0.2 ? 0 : Math.pow(Math.min(1, (rain - 0.2) / 0.8), 1.5);
        this._wx.rg.gain.setTargetAtTime(0.1 * wash, t, fast ? 0.15 : 1.6);   // игра началась в дождь — шум сразу
        this._wx.lp.frequency.cancelScheduledValues(t); this._wx.lp.frequency.setTargetAtTime(2400 + 4400 * rain, t, 1.2);
        this._wx.wg.gain.setTargetAtTime(wind < 0.015 ? 0 : wind * 0.11, t, fast ? 0.2 : 1.6);
    },
    // далёкий гром: глухой низкий раскат с запаздыванием после вспышки (чем дальше, тем позже и тише)
    playThunder(delay, power) {
        const ctx = this.ctx; if (!ctx) return;
        this._ensureWindBuf();
        const t = ctx.currentTime + delay, v = 0.32 * power, dur = 3.6 + Math.random() * 1.2;
        const src = ctx.createBufferSource(); src.buffer = this._windBuf; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
        lp.frequency.setValueAtTime(260 + 160 * power, t); lp.frequency.exponentialRampToValueAtTime(70, t + dur);
        const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 420;
        const g = ctx.createGain(), G = g.gain;
        G.setValueAtTime(0.0001, t);
        G.linearRampToValueAtTime(v * 0.6, t + 0.18);
        G.linearRampToValueAtTime(v, t + 0.42);
        G.linearRampToValueAtTime(v * 0.5, t + 0.8);
        G.linearRampToValueAtTime(v * 0.85, t + 1.1);
        G.linearRampToValueAtTime(v * 0.38, t + 1.7);
        G.linearRampToValueAtTime(v * 0.5, t + 2.1);
        G.exponentialRampToValueAtTime(0.001, t + dur); G.linearRampToValueAtTime(0, t + dur + 0.02);
        src.connect(lp); lp.connect(lp2); lp2.connect(g); g.connect(this.sfxGain || ctx.destination);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    },
    // ===== ШАЗАМ: электрические звуки =====
    // треск: полоса шума, громкость которой скачет случайными ступеньками (как искрение)
    _crackle(t, dur, f0, f1, vol, q) {
        const ctx = this.ctx;
        this._ensureWindBuf();
        const src = ctx.createBufferSource(); src.buffer = this._windBuf; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q || 1.4;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        let tt = t;
        while (tt < t + dur) {
            const k = (tt - t) / dur, env = Math.sin(Math.PI * Math.min(1, k * 1.15)) ;
            g.gain.setValueAtTime(Math.max(0.0001, vol * env * (Math.random() < 0.35 ? 0.08 : 0.4 + Math.random() * 0.6)), tt);
            tt += 0.012 + Math.random() * 0.03;
        }
        g.gain.setValueAtTime(0.0001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(this.sfxGain || ctx.destination);
        src.start(t, Math.random() * 3); src.stop(t + dur + 0.03);
    },
    // гудящий разряд: пила с быстрым дрожанием высоты
    _buzz(t, dur, f0, f1, vol, cut) {
        const ctx = this.ctx, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        lfo.type = 'square'; lfo.frequency.value = 37; lg.gain.value = f0 * 0.08; lfo.connect(lg); lg.connect(o.frequency);
        lp.type = 'lowpass'; lp.frequency.value = cut || 1800; lp.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        o.connect(lp); lp.connect(g); g.connect(this.sfxGain || ctx.destination);
        o.start(t); lfo.start(t); o.stop(t + dur + 0.03); lfo.stop(t + dur + 0.03);
    },
    playShazamArm() {     // первое нажатие: кнопка «заряжена» — короткий щелчок-искра
        try { if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime; this._crackle(t, 0.16, 2600, 4200, 0.12, 2); this._buzz(t, 0.14, 420, 640, 0.05, 2200); } catch (e) {}
    },
    playShazamCharge() {  // зарядка (1,6 с): треск нарастает, гул поднимается
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime;
            this._crackle(t, 1.6, 900, 5200, 0.16, 1.2); this._buzz(t, 1.6, 70, 260, 0.07, 900); this._toneSweep(t, 1.6, 110, 440, 300, 2400, 0.05, 'square', 0.85);
        } catch (e) {}
    },
    playShazamZap() {     // удар щита о трубу во время зарядки
        try { if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime; this._crackle(t, 0.1, 3000, 1800, 0.14, 2.5); } catch (e) {}
    },
    playShazamLaunch() {  // рывок вперёд: удар разряда и свист
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime;
            this._buzz(t, 0.5, 220, 55, 0.14, 2600); this._crackle(t, 0.45, 5000, 900, 0.2, 1); this._noiseBand(t, 0.9, 500, 2400, 1.2, 0.1, 0.15);
        } catch (e) {}
    },
    playShazamWarn(n) {   // ШАЗАМ скоро кончится: короткий электрический «дзинь», с каждым разом ниже и тише (n = 3, 2, 1)
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime;
            const f = 560 + 90 * n, v = 0.03 + 0.008 * n;   // n = 5…1: каждый следующий ниже
            this._toneSweep(t, 0.16, f, f * 0.92, 3200, 1800, v, 'square', 0.06);
            this._crackle(t, 0.12, 3600, 2400, 0.05, 2);
        } catch (e) {}
    },
    playShazamPowerDown() {   // заряд ШАЗАМа иссяк: гул уходит вниз, как выключающийся мотор
        try {
            if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime;
            this._buzz(t, 0.9, 340, 55, 0.07, 1400); this._toneSweep(t, 0.9, 520, 90, 2200, 300, 0.035, 'sawtooth', 0.05);
        } catch (e) {}
    },
    playShazamEnd() {     // эффект закончился: разряд стихает
        try { if (!this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime; this._crackle(t, 0.6, 3200, 600, 0.1, 1.2); this._buzz(t, 0.6, 260, 60, 0.06, 900); } catch (e) {}
    },
    playShieldBump() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.32, now + 0.008);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(g); g.connect(this.sfxGain || this.ctx.destination);
            osc.start(now); osc.stop(now + 0.2);
        } catch (e) {}
    },
    playMaxUp() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            // восходящий «заряд» и яркий аккорд
            const sw = this.ctx.createOscillator(), sg = this.ctx.createGain();
            sw.type = 'sawtooth';
            sw.frequency.setValueAtTime(220, now);
            sw.frequency.exponentialRampToValueAtTime(880, now + 0.45);
            const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, now);
            sg.gain.setValueAtTime(0.0001, now);
            sg.gain.linearRampToValueAtTime(0.12, now + 0.05);
            sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            sw.connect(lp); lp.connect(sg); sg.connect(this.sfxGain || this.ctx.destination);
            sw.start(now); sw.stop(now + 0.52);
            [523.25, 659.25, 783.99, 1046.50].forEach((f) => {
                const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
                o2.type = 'triangle';
                o2.frequency.setValueAtTime(f, now + 0.42);
                g2.gain.setValueAtTime(0.0001, now + 0.42);
                g2.gain.linearRampToValueAtTime(0.14, now + 0.45);
                g2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                o2.connect(g2); g2.connect(this.sfxGain || this.ctx.destination);
                o2.start(now + 0.42); o2.stop(now + 1.22);
            });
        } catch (e) {}
    },
    playShieldCollect() {
        // возникновение энергетического щита: мягкий низкий «пузырь» надувается, гудит и растворяется (~0.4 с)
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime, out = this.sfxGain || this.ctx.destination;
            // 1) низкий глухой толчок — щит «включился»
            const th = this.ctx.createOscillator(), thg = this.ctx.createGain();
            th.type = 'sine';
            th.frequency.setValueAtTime(150, now);
            th.frequency.exponentialRampToValueAtTime(65, now + 0.16);
            thg.gain.setValueAtTime(0.0001, now);
            thg.gain.linearRampToValueAtTime(0.3, now + 0.015);
            thg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            th.connect(thg); thg.connect(out); th.start(now); th.stop(now + 0.22);
            // 2) мягкий гул поля: два тона с лёгкой расстройкой, тёмный фильтр, нарастание и спад
            const lp = this.ctx.createBiquadFilter();
            lp.type = 'lowpass'; lp.Q.setValueAtTime(2.5, now);
            lp.frequency.setValueAtTime(260, now);
            lp.frequency.exponentialRampToValueAtTime(900, now + 0.22);
            lp.frequency.exponentialRampToValueAtTime(420, now + 0.42);
            const hg = this.ctx.createGain();
            hg.gain.setValueAtTime(0.0001, now);
            hg.gain.linearRampToValueAtTime(0.15, now + 0.1);
            hg.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
            [[130.8, 196], [131.6, 197.5]].forEach(([f0, f1]) => {
                const os = this.ctx.createOscillator();
                os.type = 'triangle';
                os.frequency.setValueAtTime(f0, now);
                os.frequency.exponentialRampToValueAtTime(f1, now + 0.2);
                os.connect(lp); os.start(now); os.stop(now + 0.46);
            });
            lp.connect(hg); hg.connect(out);
            // 3) нежное мерцание поля — низкий звон с медленной дрожью, без резкости
            const sh = this.ctx.createOscillator(), shg = this.ctx.createGain();
            const lfo = this.ctx.createOscillator(), lfoG = this.ctx.createGain();
            sh.type = 'sine';
            sh.frequency.setValueAtTime(520, now + 0.05);
            sh.frequency.exponentialRampToValueAtTime(780, now + 0.25);
            lfo.frequency.setValueAtTime(14, now); lfoG.gain.setValueAtTime(14, now);
            lfo.connect(lfoG); lfoG.connect(sh.frequency);
            shg.gain.setValueAtTime(0.0001, now + 0.05);
            shg.gain.linearRampToValueAtTime(0.06, now + 0.14);
            shg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            sh.connect(shg); shg.connect(out);
            sh.start(now + 0.05); sh.stop(now + 0.44); lfo.start(now + 0.05); lfo.stop(now + 0.44);
        } catch (e) {}
    },
    playAttemptBonus() {
        // приятный золотой «звон»: быстрое восходящее арпеджио колокольчиков и мягкий хвост
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime, out = this.sfxGain || this.ctx.destination;
            [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => {
                const t0 = now + i * 0.07;
                [[f, 0.16], [f * 2, 0.05], [f * 3.01, 0.025]].forEach(([fr, vol]) => {
                    const o1 = this.ctx.createOscillator(), g1 = this.ctx.createGain();
                    o1.type = 'sine'; o1.frequency.setValueAtTime(fr, t0);
                    g1.gain.setValueAtTime(0.0001, t0);
                    g1.gain.linearRampToValueAtTime(vol, t0 + 0.008);
                    g1.gain.exponentialRampToValueAtTime(0.001, t0 + (i === 3 ? 0.9 : 0.4));
                    o1.connect(g1); g1.connect(out); o1.start(t0); o1.stop(t0 + (i === 3 ? 0.92 : 0.42));
                });
            });
        } catch (e) {}
    },
    playRouletteTick() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime, os = this.ctx.createOscillator(), g = this.ctx.createGain();
            os.type = 'square'; os.frequency.setValueAtTime(1500, now); os.frequency.exponentialRampToValueAtTime(700, now + 0.03);
            g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            os.connect(g); g.connect(this.sfxGain || this.ctx.destination); os.start(now); os.stop(now + 0.05);
        } catch (e) {}
    },
    playRouletteWin() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime, out = this.sfxGain || this.ctx.destination;
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
                const t0 = now + i * 0.09;
                const os = this.ctx.createOscillator(), g = this.ctx.createGain();
                os.type = 'triangle'; os.frequency.setValueAtTime(f, t0);
                g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.2, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
                os.connect(g); g.connect(out); os.start(t0); os.stop(t0 + 0.82);
            });
        } catch (e) {}
    },
    playMoonLaugh() {
        // тихий неспешный смех луны: три мягких «хе» с падающим тоном
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime, out = this.sfxGain || this.ctx.destination;
            for (let i = 0; i < 3; i++) {
                const t0 = now + 1.1 + i * 0.6;
                const os = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
                os.type = 'triangle';
                os.frequency.setValueAtTime(170 - i * 18, t0); os.frequency.exponentialRampToValueAtTime(100 - i * 8, t0 + 0.34);
                lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t0); lp.Q.setValueAtTime(2, t0);
                g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
                os.connect(lp); lp.connect(g); g.connect(out); os.start(t0); os.stop(t0 + 0.42);
            }
        } catch (e) {}
    },
    playLevelUp() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            [392.00, 523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.075);
                gain.gain.setValueAtTime(0.001, now + i * 0.075);
                gain.gain.linearRampToValueAtTime(0.22, now + i * 0.075 + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.32);
                gain.gain.linearRampToValueAtTime(0, now + i * 0.075 + 0.34);
                osc.connect(gain);
                gain.connect(this.sfxGain || this.ctx.destination);
                osc.start(now + i * 0.075);
                osc.stop(now + i * 0.075 + 0.34);
            });
        } catch(e) {}
    },
    playLowStaminaAlert() {
        try {
            if (!this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch(e) {}
    }
};

// Выравнивание громкости эффектов относительно друг друга и друг к другу/музыке + 6 мс плавного нарастания в начале каждого звука (убирает щелчки)
(function () {
    const TRIM = {
        playFlap: 1.25, playCollect: 1.2, playThemeCollect: 1.15, playStarCollect: 1.15, playMaxStaminaChime: 0.85,
        playOverEat: 1.0, playDrunk: 1.15, playFreeze: 0.9, playFreezeEnd: 1.15, playDrunkEnd: 1.25, playOverEatEnd: 1.2,
        playCompressStart: 1.2, playCompressEnd: 1.2, playHit: 0.85, playShieldBump: 0.8, playMaxUp: 0.6, playShieldCollect: 0.85,
        playAttemptBonus: 0.85, playRouletteTick: 2.2, playRouletteWin: 0.8, playLevelUp: 1.0, playLowStaminaAlert: 1.6,
        playSlowMoStart: 0.14, playSlowMoEnd: 0.19, playSpeedUpStart: 0.38, playSpeedUpEnd: 0.38, playLevelShift: 0.37
    };
    Object.keys(TRIM).forEach((name) => {
        const f = AudioFX[name];
        if (typeof f !== 'function') return;
        AudioFX[name] = function (...args) {
            const ctx = this.ctx, bus = this.sfxGain;
            if (!ctx || !bus || ctx.state !== 'running') return f.apply(this, args);
            const now = ctx.currentTime;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(TRIM[name], now + 0.006);
            g.connect(bus);
            this.sfxGain = g;
            try { return f.apply(this, args); } finally { this.sfxGain = bus; }
        };
    });
})();
