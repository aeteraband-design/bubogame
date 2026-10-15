// Слушаем ВСЕ такие события и пробуем включить звук, пока он реально не запустится.
const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'keydown'];
let audioUnlockArmed = false;
function onAudioGesture() {
    AudioFX.resume();
    if (AudioFX.ctx && AudioFX.ctx.state === 'running') {
        AUDIO_UNLOCK_EVENTS.forEach(evt => window.removeEventListener(evt, onAudioGesture, true));
        audioUnlockArmed = false;
    }
}
function armAudioUnlock() {
    if (audioUnlockArmed) return;
    audioUnlockArmed = true;
    AUDIO_UNLOCK_EVENTS.forEach(evt => window.addEventListener(evt, onAudioGesture, true));
}
armAudioUnlock();
// Игру свернули / ушли на другую вкладку: музыка затихает, а полёт ставится на паузу (открывается меню)
function pauseIfHidden() {
    let active = false;
    try { active = gameActive; } catch (e) {}
    if (active) returnToHome();
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseIfHidden(); AudioFX.onHidden(); }
    else AudioFX.onVisible();
});
window.addEventListener('pagehide', pauseIfHidden);
window.addEventListener('pagehide', () => AudioFX.onHidden());
// отложенное сохранение (во время полёта) записываем сразу, если вкладку закрывают или сворачивают
window.addEventListener('pagehide', () => { try { StorageManager.flushPending(); } catch (e) {} });
document.addEventListener('visibilitychange', () => { if (document.hidden) { try { StorageManager.flushPending(); } catch (e) {} } });
window.addEventListener('pageshow', () => { if (!document.hidden) AudioFX.onVisible(); });
// Если вкладку сворачивали и звук остановился — снова ждём касания
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && AudioFX.ctx && AudioFX.ctx.state !== 'running') armAudioUnlock();
});

// ===== Качество графики =====
const _shadowBlurDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
const GFX_LEVELS = ['low', 'medium', 'high'];
const GFX_TEXT = {
    low: { name: 'Низкая', hint: 'Для слабых телефонов и компьютеров: без теней и размытия' },
    medium: { name: 'Средняя', hint: 'Баланс чёткости и скорости' },
    high: { name: 'Высокая', hint: 'Максимальная чёткость и все эффекты' }
};
function applyGfxQuality(soft) {
    if (gfxQuality === 'low') {
        // на низкой графике тени не рисуются вообще (самая тяжёлая часть отрисовки)
        Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get() { return 0; }, set(v) { _shadowBlurDesc.set.call(this, 0); } });
    } else {
        delete ctx.shadowBlur;
    }
    document.documentElement.classList.toggle('gfx-low', gfxQuality === 'low');
    const rs0 = renderScale;
    resize(soft);
    // мягкое понижение (автоматически, во время полёта): готовые заготовки значков и труб остаются прежней чёткости — не пересоздаются
    __tokHoldK = soft ? Math.max(1, __tokHoldK * rs0 / (renderScale || 1)) : 1;
    const slider = document.getElementById('gfxSlider');
    if (slider) slider.value = String(GFX_LEVELS.indexOf(gfxQuality));
    const lbl = document.getElementById('gfxLabel');
    if (lbl) lbl.innerText = GFX_TEXT[gfxQuality].name;
    const hint = document.getElementById('gfxHint');
    if (hint) hint.innerText = GFX_TEXT[gfxQuality].hint;
    document.querySelectorAll('.gfx-tick').forEach(t => t.classList.toggle('on', t.dataset.q === gfxQuality));
}
{
    const slider = document.getElementById('gfxSlider');
    if (slider) {
        slider.addEventListener('input', () => {
            gfxQuality = GFX_LEVELS[parseInt(slider.value, 10)] || 'medium';
            try { localStorage.setItem(GFX_KEY, gfxQuality); } catch (e) {}
            applyGfxQuality();
        });
    }
}
applyGfxQuality();
// Масштаб меню на широких экранах: крупнее логотип, кнопки, статистика и иконки тем
function updateMenuZoom() {
    const cw = container.clientWidth, ch = container.clientHeight;
    let z = 1;
    if (cw >= 820 && ch >= 560) z = Math.max(1, Math.min(1.45, cw / 700, ch / 620));
    else if (cw <= 520 && typeof phoneZoom === 'function') { const pg = (typeof pageZoomFactor === 'function') ? pageZoomFactor() : 1; z = phoneZoom(cw * pg, ch * pg); }   // на телефоне меню в том же масштабе, что и игра
    document.documentElement.style.setProperty('--menu-zoom', z.toFixed(3));
}
updateMenuZoom();
window.addEventListener('resize', updateMenuZoom);

AudioFX.init();
AudioFX.updateMusicUI();

const homeBtn = document.getElementById('homeBtn');
if (homeBtn) homeBtn.addEventListener('click', (e) => { e.stopPropagation(); returnToHome(); });

const musicToggleBtn = document.getElementById('musicToggleBtn');
if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.toggleMusic();
        StorageManager.save();
    });
}

const openRulesBtn = document.getElementById('openRulesBtn');
if (openRulesBtn) openRulesBtn.addEventListener('click', (e) => { e.stopPropagation(); AudioFX.resume(); document.getElementById('rulesModal').classList.remove('hidden'); });

const closeRulesBtn = document.getElementById('closeRulesBtn');
if (closeRulesBtn) closeRulesBtn.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('rulesModal').classList.add('hidden'); });

const understoodRulesBtn = document.getElementById('understoodRulesBtn');
if (understoodRulesBtn) understoodRulesBtn.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('rulesModal').classList.add('hidden'); startOrResumeFlight(); });

const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsModal = document.getElementById('settingsModal');

const settingsMusicToggle = document.getElementById('settingsMusicToggle');
const settingsMusicThumb = document.getElementById('settingsMusicThumb');
const musicVolumeSlider = document.getElementById('musicVolumeSlider');
const musicVolLabel = document.getElementById('musicVolLabel');

const settingsSfxToggle = document.getElementById('settingsSfxToggle');
const settingsSfxThumb = document.getElementById('settingsSfxThumb');
const sfxVolumeSlider = document.getElementById('sfxVolumeSlider');
const sfxVolLabel = document.getElementById('sfxVolLabel');

const settingsVibeToggle = document.getElementById('settingsVibeToggle');
const settingsVibeThumb = document.getElementById('settingsVibeThumb');

let tempMusicState = true;
let tempSfxState = true;
let tempVibeState = true;

function syncSettingsUI() {
    tempMusicState = !AudioFX.isMusicMuted;
    tempSfxState = !AudioFX.isSfxMuted;
    tempVibeState = Haptics.enabled;

    musicVolumeSlider.value = Math.round(AudioFX.musicVolume * 100);
    musicVolLabel.innerText = `${musicVolumeSlider.value}%`;

    sfxVolumeSlider.value = Math.round(AudioFX.sfxVolume * 100);
    sfxVolLabel.innerText = `${sfxVolumeSlider.value}%`;

    updateToggleVisual(settingsMusicToggle, settingsMusicThumb, tempMusicState);
    updateToggleVisual(settingsSfxToggle, settingsSfxThumb, tempSfxState);
    updateToggleVisual(settingsVibeToggle, settingsVibeThumb, tempVibeState);
}

function updateToggleVisual(btn, thumb, isActive) {
    if (isActive) {
        btn.classList.remove('bg-purple-950');
        btn.classList.add('bg-[#782CE9]');
        thumb.classList.remove('translate-x-0');
        thumb.classList.add('translate-x-5');
    } else {
        btn.classList.remove('bg-[#782CE9]');
        btn.classList.add('bg-purple-950');
        thumb.classList.remove('translate-x-5');
        thumb.classList.add('translate-x-0');
    }
}

if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioFX.resume();
        syncSettingsUI();
        settingsModal.classList.remove('hidden');
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('hidden');
    });
}

if (saveSettingsBtn) {
    // «Сохранить»: настройки уже применены, просто закрываем окно и возвращаемся в главное меню
    saveSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('hidden');
        try { updateMenuVisibility(); } catch (er) {}
    });
}

if (settingsMusicToggle) {
    settingsMusicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        tempMusicState = !tempMusicState;
        AudioFX.setMuted(!tempMusicState);
        updateToggleVisual(settingsMusicToggle, settingsMusicThumb, tempMusicState);
        StorageManager.save();
    });
}

if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        musicVolLabel.innerText = `${val}%`;
        AudioFX.setMusicVolume(val / 100);
        if (val > 0 && AudioFX.isMusicMuted) {
            AudioFX.setMuted(false);
            tempMusicState = true;
            updateToggleVisual(settingsMusicToggle, settingsMusicThumb, true);
        }
        StorageManager.save();
    });
}

if (settingsSfxToggle) {
    settingsSfxToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        tempSfxState = !tempSfxState;
        AudioFX.setSfxVolume(tempSfxState ? (parseFloat(sfxVolumeSlider.value) / 100 || 1.0) : 0);
        updateToggleVisual(settingsSfxToggle, settingsSfxThumb, tempSfxState);
        StorageManager.save();
    });
}

if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        sfxVolLabel.innerText = `${val}%`;
        AudioFX.setSfxVolume(val / 100);
        tempSfxState = (val > 0);
        updateToggleVisual(settingsSfxToggle, settingsSfxThumb, tempSfxState);
        StorageManager.save();
    });
}

if (settingsVibeToggle) {
    settingsVibeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        tempVibeState = !tempVibeState;
        Haptics.enabled = tempVibeState;
        updateToggleVisual(settingsVibeToggle, settingsVibeThumb, tempVibeState);
        if (tempVibeState) Haptics.vibrate(30);
        StorageManager.save();
    });
}

const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startOrResumeFlight();
});

const resetProgressBtn = document.getElementById('resetProgressBtn');
if (resetProgressBtn) resetProgressBtn.addEventListener('click', (e) => {
    e.stopPropagation(); openResetConfirm();
});

// Подтверждение «Начать заново»: что именно будет потеряно
function openResetConfirm() {
    const m = document.getElementById('resetConfirmModal'), list = document.getElementById('resetLossList');
    if (!m) return;
    if (list) {
        // показываем только то, что реально накоплено: сила выше стартовых 100%, сердца выше стартовых, собранные темы/вопросы/перья
        const total = getTotalCollectedThemes();
        const rows = [];
        if (maxStamina > 100) rows.push(['fa-feather-pointed', '#67E8F9', `Сила: +${Math.round(maxStamina - 100)}% к стартовым 100%`]);
        if (total > 0) rows.push(['fa-layer-group', '#A855F7', `Собранные темы: ${total} / ${TOTAL_THEMES}`]);
        if (score > 0) rows.push(['fa-circle-question', '#FE7600', `Собранные вопросы: ${score} шт.`]);
        list.innerHTML = rows.map(r => `<li><i class="fa-solid ${r[0]}" style="color:${r[1]}"></i><span>${r[2]}</span></li>`).join('');
        list.classList.toggle('hidden', rows.length === 0);
        const intro = document.getElementById('resetLossIntro');
        if (intro) intro.classList.toggle('hidden', rows.length === 0);
    }
    m.classList.remove('hidden');
}
(function () {
    const m = document.getElementById('resetConfirmModal');
    const yes = document.getElementById('resetYesBtn'), no = document.getElementById('resetNoBtn');
    if (no) no.addEventListener('click', (e) => { e.stopPropagation(); if (m) m.classList.add('hidden'); });
    if (yes) yes.addEventListener('click', (e) => {
        e.stopPropagation(); if (m) m.classList.add('hidden');
        resetEntireGame({ keepAttempts: true });   // попытки не обновляются — сбрасывается только прогресс
        startOrResumeFlight();
    });
})();

const continueAttemptBtn = document.getElementById('continueAttemptBtn');
if (continueAttemptBtn) continueAttemptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startOrResumeFlight();
});

const restartFromGameOverBtn = document.getElementById('restartFromGameOverBtn');
if (restartFromGameOverBtn) restartFromGameOverBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const modal = document.getElementById('gameOverModal');
    if (modal) modal.classList.add('hidden');
    resetEntireGame();
    startOrResumeFlight();
});

const gameOverHomeBtn = document.getElementById('gameOverHomeBtn');
if (gameOverHomeBtn) gameOverHomeBtn.addEventListener('click', (e) => { e.stopPropagation(); returnToHome(); });
const gameOverOkBtn = document.getElementById('gameOverOkBtn');
if (gameOverOkBtn) gameOverOkBtn.addEventListener('click', (e) => { e.stopPropagation(); returnToHome(); });

initRouletteUI();

function setDynamicFaviconLegacy() {
    const favCanvas = document.createElement('canvas');
    favCanvas.width = 64;
    favCanvas.height = 64;
    const fctx = favCanvas.getContext('2d');

    fctx.translate(32, 32);
    fctx.scale(1.6, 1.6);

    const tailGrad = fctx.createLinearGradient(-8.5, 7.0, -16.5, 13.5);
    tailGrad.addColorStop(0, '#782CE9');
    tailGrad.addColorStop(0.55, '#5216BD');
    tailGrad.addColorStop(1, '#2B0762');
    fctx.fillStyle = tailGrad;
    fctx.strokeStyle = '#1D0542';
    fctx.lineWidth = 1.0;
    fctx.beginPath();
    fctx.moveTo(-8.5, 7.0);
    fctx.quadraticCurveTo(-13.0, 8.5, -16.5, 11.8);
    fctx.quadraticCurveTo(-16.0, 13.5, -13.5, 13.5);
    fctx.quadraticCurveTo(-10.0, 13.0, -6.5, 11.8);
    fctx.closePath(); fctx.fill(); fctx.stroke();

    fctx.strokeStyle = 'rgba(233, 213, 255, 0.55)';
    fctx.lineWidth = 0.9;
    fctx.beginPath(); fctx.moveTo(-8.5, 8.0); fctx.quadraticCurveTo(-12.5, 9.5, -15.5, 11.8); fctx.stroke();

    const bodyGrad = fctx.createRadialGradient(2, -4, 4, -2, 4, 22);
    bodyGrad.addColorStop(0, '#8B3CF7');
    bodyGrad.addColorStop(0.55, '#621BCA');
    bodyGrad.addColorStop(1, '#370878');
    fctx.fillStyle = bodyGrad;
    fctx.strokeStyle = '#1D0542';
    fctx.lineWidth = 1.0;
    fctx.beginPath();
    fctx.moveTo(10.0, -3.0);
    fctx.quadraticCurveTo(8.5, -8.5, 3.5, -12.2);
    fctx.quadraticCurveTo(2.0, -14.2, 0.6, -15.2);
    fctx.quadraticCurveTo(-0.6, -15.4, -1.6, -13.6);
    fctx.quadraticCurveTo(-6.0, -12.5, -10.0, -8.5);
    fctx.quadraticCurveTo(-13.0, -3.5, -14.5, 1.5);
    fctx.quadraticCurveTo(-15.5, 5.0, -14.0, 7.5);
    fctx.quadraticCurveTo(-13.0, 11.0, -8.0, 14.2);
    fctx.quadraticCurveTo(0.0, 17.2, 8.5, 13.0);
    fctx.quadraticCurveTo(14.8, 6.0, 10.0, -3.0);
    fctx.closePath(); fctx.fill(); fctx.stroke();

    fctx.strokeStyle = 'rgba(235, 215, 255, 0.85)';
    fctx.lineWidth = 1.0;
    fctx.beginPath(); fctx.moveTo(2.5, -12.5); fctx.quadraticCurveTo(1.5, -14.2, 0.4, -15.0); fctx.stroke();
    fctx.strokeStyle = 'rgba(235, 215, 255, 0.68)';
    fctx.beginPath(); fctx.moveTo(-1.5, -13.5); fctx.quadraticCurveTo(-6.0, -12.2, -9.5, -7.5); fctx.stroke();

    const breastGrad = fctx.createLinearGradient(0, -3, 2, 17);
    breastGrad.addColorStop(0, '#FFFFFF');
    breastGrad.addColorStop(0.65, '#FFFDF8');
    breastGrad.addColorStop(1, '#EDE5F8');
    fctx.fillStyle = breastGrad;
    fctx.strokeStyle = '#1D0542';
    fctx.lineWidth = 1.0;
    fctx.beginPath();
    fctx.moveTo(8.5, -2.0);
    fctx.quadraticCurveTo(14.5, 5.0, 11.0, 12.5);
    fctx.quadraticCurveTo(7.5, 17.0, -0.5, 16.5);
    fctx.quadraticCurveTo(-5.5, 14.5, -5.0, 9.0);
    fctx.quadraticCurveTo(-3.5, 1.0, 3.0, -2.0);
    fctx.closePath(); fctx.fill(); fctx.stroke();

    fctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    fctx.lineWidth = 1.0;
    fctx.beginPath(); fctx.moveTo(3.5, -1.5); fctx.quadraticCurveTo(12.5, 3.0, 9.5, 12.0); fctx.stroke();

    fctx.fillStyle = '#481387';
    [{ x: 7.2, y: 3.4, rx: 0.95, ry: 0.65 }, { x: 9.4, y: 6.2, rx: 1.05, ry: 0.70 }, { x: 5.6, y: 6.6, rx: 0.90, ry: 0.60 }, { x: 8.8, y: 9.6, rx: 1.00, ry: 0.68 }, { x: 5.2, y: 10.0, rx: 0.88, ry: 0.60 }, { x: 7.0, y: 12.6, rx: 0.92, ry: 0.62 }].forEach(dot => {
        fctx.beginPath(); fctx.ellipse(dot.x, dot.y, dot.rx, dot.ry, 0, 0, Math.PI * 2); fctx.fill();
    });

    const footX = 1.0; const footBaseY = 17.6;
    fctx.fillStyle = '#FE7600'; fctx.beginPath(); fctx.arc(footX - 1.6, footBaseY, 1.25, 0, Math.PI * 2); fctx.arc(footX, footBaseY + 0.5, 1.35, 0, Math.PI * 2); fctx.arc(footX + 1.6, footBaseY, 1.25, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#FFB870'; fctx.beginPath(); fctx.arc(footX, footBaseY + 0.2, 0.5, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#7A2C00'; fctx.beginPath(); fctx.arc(footX - 1.6, footBaseY + 1.1, 0.5, 0, Math.PI * 2); fctx.arc(footX, footBaseY + 1.6, 0.55, 0, Math.PI * 2); fctx.arc(footX + 1.6, footBaseY + 1.1, 0.5, 0, Math.PI * 2); fctx.fill();

    fctx.save();
    fctx.translate(-4.0, 1.5);
    const wingGrad = fctx.createLinearGradient(6, -4, -22, 4);
    wingGrad.addColorStop(0, '#7C2CE8'); wingGrad.addColorStop(0.5, '#5216AC'); wingGrad.addColorStop(1, '#2E0868');
    fctx.fillStyle = wingGrad; fctx.strokeStyle = '#20044A'; fctx.lineWidth = 1.35;
    fctx.beginPath(); fctx.moveTo(4.5, -3.8); fctx.quadraticCurveTo(-4.5, -4.2, -15.0, 1.2); fctx.quadraticCurveTo(-15.8, 2.4, -13.8, 3.4); fctx.quadraticCurveTo(-9.5, 4.4, -5.5, 4.8); fctx.quadraticCurveTo(-1.0, 6.0, 4.2, 3.8); fctx.quadraticCurveTo(6.0, 1.2, 5.8, -1.8); fctx.quadraticCurveTo(5.2, -3.2, 4.5, -3.8); fctx.closePath(); fctx.fill(); fctx.stroke();
    
    const innerWingGrad = fctx.createLinearGradient(3, -2, -10, 2);
    innerWingGrad.addColorStop(0, '#9A46FF'); innerWingGrad.addColorStop(0.55, '#6F1CDA'); innerWingGrad.addColorStop(1, '#450F96');
    fctx.fillStyle = innerWingGrad;
    fctx.beginPath(); fctx.moveTo(3.4, -2.4); fctx.quadraticCurveTo(-3.8, -2.2, -10.5, 1.3); fctx.quadraticCurveTo(-6.8, 3.2, -2.0, 3.0); fctx.quadraticCurveTo(3.8, 3.0, 3.8, 0.4); fctx.quadraticCurveTo(3.6, -1.6, 3.4, -2.4); fctx.closePath(); fctx.fill();

    fctx.strokeStyle = 'rgba(235, 215, 255, 0.68)'; fctx.lineWidth = 1.0;
    fctx.beginPath(); fctx.moveTo(4.0, -3.2); fctx.quadraticCurveTo(-4.0, -3.5, -13.2, 1.2); fctx.stroke();
    fctx.strokeStyle = 'rgba(32, 4, 75, 0.7)'; fctx.lineWidth = 1.0;
    fctx.beginPath(); fctx.moveTo(-0.8, 0.5); fctx.lineTo(-9.5, 2.0); fctx.moveTo(0.8, 2.3); fctx.lineTo(-6.8, 3.2); fctx.stroke();
    fctx.restore();

    const beakGrad = fctx.createLinearGradient(11.5, -3.4, 18, 1.8);
    beakGrad.addColorStop(0, '#FE881C'); beakGrad.addColorStop(0.5, '#FE7600'); beakGrad.addColorStop(1, '#D95B00');
    fctx.fillStyle = beakGrad;
    fctx.beginPath(); fctx.moveTo(11.5, -3.4); fctx.quadraticCurveTo(15, -2.8, 18, -0.6); fctx.quadraticCurveTo(14.5, 1.2, 11.5, 1.8); fctx.closePath(); fctx.fill();   // кончик скруглён
    fctx.strokeStyle = '#FFD29D'; fctx.lineWidth = 1.0;
    fctx.beginPath(); fctx.moveTo(12.5, -2.5); fctx.lineTo(17.2, -0.6); fctx.stroke();

    fctx.fillStyle = '#2F065A'; fctx.beginPath(); fctx.arc(5.2, -4.0, 7.8, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#FFF8E1'; fctx.beginPath(); fctx.arc(5.2, -4.0, 6.7, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#150226'; fctx.beginPath(); fctx.arc(6.6, -4.2, 3.7, 0, Math.PI * 2); fctx.fill();
    fctx.fillStyle = '#FFFFFF'; fctx.beginPath(); fctx.arc(5.6, -5.6, 1.3, 0, Math.PI * 2); fctx.fill();
    fctx.beginPath(); fctx.arc(8.0, -3.2, 0.75, 0, Math.PI * 2); fctx.fill();

    const dataUrl = favCanvas.toDataURL('image/png');
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = dataUrl;
}


// Иконка вкладки и закладок рисуется из той же совы, что в игре (owl.draw), — всегда актуальная версия.
// Сова обрезается вплотную, чтобы занимать всю иконку
function setDynamicFavicon() {
    try {
        const N = 600, big = document.createElement('canvas'); big.width = big.height = N;
        const g = big.getContext('2d');
        const mainCtx = ctx, sx = owl.x, sy = owl.y, sr = owl.rotation, sv = owl.visible;
        owl.x = 0; owl.y = 0; owl.rotation = 0; owl.visible = true;
        g.setTransform(N / 80, 0, 0, N / 80, N / 2, N / 2);
        ctx = g;
        try { owl.draw(); } finally { ctx = mainCtx; owl.x = sx; owl.y = sy; owl.rotation = sr; owl.visible = sv; }
        // границы совы по непрозрачным пикселям
        const d = g.getImageData(0, 0, N, N).data;
        let x0 = N, y0 = N, x1 = -1, y1 = -1;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (d[(y * N + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) throw new Error('empty');
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const make = (size, margin, bg) => {
            const c = document.createElement('canvas'); c.width = c.height = size;
            const k = c.getContext('2d');
            if (bg) { k.fillStyle = bg; k.fillRect(0, 0, size, size); }
            const s = size * (1 - 2 * margin) / Math.max(w, h);
            k.imageSmoothingQuality = 'high';
            k.drawImage(big, x0, y0, w, h, (size - w * s) / 2, (size - h * s) / 2, w * s, h * s);
            return c.toDataURL('image/png');
        };
        const setLink = (rel, href, sizes) => {
            let link = document.querySelector(`link[rel='${rel}']`);
            if (!link) { link = document.createElement('link'); link.rel = rel; document.head.appendChild(link); }
            if (sizes) link.sizes = sizes;
            link.href = href;
        };
        setLink('icon', make(128, 0.02), '128x128');                          // вкладка: прозрачный фон, сова во всю иконку
        setLink('apple-touch-icon', make(180, 0.07, '#1D0936'), '180x180');   // избранное / экран «Домой»: тёмный фон игры
    } catch (e) { setDynamicFaviconLegacy(); }
}

setDynamicFavicon();
initMenuScenery();
updateHUDAll();
requestAnimationFrame(gameLoop);
requestAnimationFrame(() => requestAnimationFrame(() => { try { window.__bootDone && window.__bootDone(); } catch (e) {} }));   // игра отрисовала первые кадры — экран загрузки можно убирать
    
// Подгонка подписей тем: общий размер для всех, чтобы самое длинное слово («Мультики») влезало с отступами
function fitThemeLabels() { try { fitThemeLabelsInner(); } catch (e) {} }
function fitThemeLabelsInner() {
    const root = document.documentElement;
    const tb = parseFloat(getComputedStyle(root).getPropertyValue('--tb')) || 1;
    const LABEL_SIDE_GAP = 3;   // отступ от самого длинного слова («Мультики») до края плитки, в пикселях страницы
    // Каждая панель тем (внизу в игре, в меню) подгоняется отдельно: размер как можно крупнее, уменьшается только если слово не влезает
    const groups = new Map();
    document.querySelectorAll('.collection-theme-label').forEach(l => {
        if (l.offsetParent === null || !l.parentElement) return;
        const g = l.parentElement.parentElement || l.parentElement;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(l);
    });
    groups.forEach((labels, g) => {
        if (labels.some(l => l.parentElement.clientWidth < 24)) return;   // панель ещё не разложена — подгоним позже
        const maxSize = 12 * tb, minSize = 7 * tb;
        let size = maxSize;
        while (size > minSize) {
            g.style.setProperty('--label-fs', size + 'px');
            if (labels.every(l => l.offsetWidth <= l.parentElement.clientWidth - 2 * LABEL_SIDE_GAP)) break;
            size -= 0.25;
        }
        if (size <= minSize) g.style.setProperty('--label-fs', minSize + 'px');
    });
}
window.addEventListener('resize', fitThemeLabels);
if (window.ResizeObserver) {
    const labelRO = new ResizeObserver(fitThemeLabels);
    ['startScreen', 'bottomHud'].forEach(id => { const el = document.getElementById(id); if (el) labelRO.observe(el); });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitThemeLabels);
fitThemeLabels();

// Тестовый бонус по ссылке: ?test=10 → 10 вращений рулетки и минимум 10 попыток (один раз, параметр сразу убирается из адреса)
(function () {
    try {
        const q = new URLSearchParams(location.search), n = parseInt(q.get('test'), 10);
        if (!n || n < 1) return;
        const k = Math.min(99, n);
        rouletteSpins = Math.min(99, rouletteSpins + k);
        attempts = Math.max(attempts, k); zeroDay = '';
        StorageManager.save(); updateHUDAll();
        q.delete('test');
        history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    } catch (e) {}
})();
