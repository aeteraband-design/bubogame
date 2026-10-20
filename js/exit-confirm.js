// Кнопка / жест «Назад» (Android: свайп от края, системная кнопка; браузер: стрелка «назад»).
// Держим в истории одну «страховочную» запись: нажатие «назад» снимает её, мы ловим popstate и решаем, что делать:
//  • идёт полёт — пауза и выход в главное меню (как кнопка паузы);
//  • открыто окно (настройки, лавка, вопросы, правила, рулетка…) — закрываем его;
//  • главное меню — спрашиваем «Вы точно хотите выйти?».
// После этого запись возвращается на место. Выход — только по «Да» (или повторным «назад» при открытом вопросе о выходе).
(function () {
    const ST = { bubo: 'guard' };
    let exiting = false;
    // каждое обработанное «назад» снимает одну запись — сразу кладём новую (глубина истории не растёт)
    function arm() { if (exiting || window.__booting) return;   // на экране загрузки «назад» не ловим — сразу выход
        try { history.pushState(ST, ''); } catch (e) {} }

    // --- окно подтверждения выхода ---
    let root = null;
    function build() {
        if (root) return root;
        const host = document.getElementById('gameContainer') || document.body;
        root = document.createElement('div');
        root.id = 'exitConfirmModal'; root.className = 'hidden';
        root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
        root.innerHTML = '<div id="exWin">'
            + '<div class="ex-emb"><div class="ex-glow"></div><div class="ex-ring"></div><div class="ex-core"><i class="fa-solid fa-face-sad-tear"></i></div>'
            + '<i class="ex-tw" style="left:2px;top:18px;--s:9px;--d:0s">✦</i><i class="ex-tw" style="right:0;top:32px;--s:7px;--d:.9s">✦</i><i class="ex-tw" style="right:16px;top:0;--s:6px;--d:1.7s">✦</i></div>'
            + '<div class="ex-title">ВЫ ТОЧНО ХОТИТЕ ВЫЙТИ?</div>'
            + '<div class="ex-text">Сова будет скучать. Весь прогресс сохранён — можно вернуться в любой момент.</div>'
            + '<div class="ex-btns"><button type="button" class="ex-btn ex-yes" data-ex="yes"><i class="fa-solid fa-door-open"></i>ДА</button>'
            + '<button type="button" class="ex-btn ex-no" data-ex="no">НЕТ</button></div></div>';
        host.appendChild(root);
        ['click', 'pointerdown', 'touchstart'].forEach((ev) => root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
        root.addEventListener('click', (e) => {
            const b = e.target.closest('[data-ex]');
            if (!b) { if (e.target === root) closeExit(true); return; }
            if (b.dataset.ex === 'no') closeExit(true); else doExit();
        });
        return root;
    }
    const isExitOpen = () => !!(root && !root.classList.contains('hidden'));
    function openExit() {
        build();
        try { if (typeof Haptics !== 'undefined') Haptics.vibrate(15); } catch (e) {}
        root.classList.remove('hidden');
        const ss = document.getElementById('startScreen'); if (ss) ss.classList.add('menu-under-exit');
    }
    function closeExit(rearm) {
        if (root) root.classList.add('hidden');
        const ss = document.getElementById('startScreen'); if (ss) ss.classList.remove('menu-under-exit');
        if (rearm) arm();
    }
    window.openExitConfirm = openExit;
    window.__exitArm = () => arm();   // после заставки — ставим запись сразу
    window.closeExitConfirm = closeExit;

    function toast(text) {
        const host = document.getElementById('gameContainer') || document.body;
        const t = document.createElement('div'); t.className = 'ex-toast'; t.textContent = text;
        host.appendChild(t); setTimeout(() => t.remove(), 2600);
    }

    // «Да»: уходим назад по истории до выхода со страницы / из приложения
    let exitT = 0, exitStuck = null;
    function doExit() {
        closeExit(false);
        exiting = true;
        try { StorageManager.save(); } catch (e) {}
        const stuck = () => {   // назад идти некуда (приложение открыто «с нуля») — пробуем закрыть окно
            exitT = 0;
            try { window.close(); } catch (e) {}
            // если закрыть нельзя — остаёмся в меню; запись не возвращаем, следующий системный «назад» закроет приложение
            // (подсказываем это), а если игрок продолжил играть — при первом касании «Назад» снова работает как обычно
            setTimeout(() => {
                if (document.visibilityState === 'hidden') return;
                exiting = false; toast('Свайп «Назад» ещё раз — игра свернётся');
                // запись возвращаем только по настоящему тапу (click): свайп от края даёт pointerdown, но не click —
                // раньше он успевал вернуть запись, и второй «назад» снова открывал меню вместо выхода
                setTimeout(() => window.addEventListener('click', () => arm(), { once: true, capture: true }), 200);
            }, 150);
        };
        exitStuck = stuck;
        try { history.back(); } catch (e) {}
        clearTimeout(exitT); exitT = setTimeout(stuck, 300);
    }

    // --- открытые окна: [id, как закрыть] — сверху вниз по слоям ---
    const vis = (id) => { const el = document.getElementById(id); return !!(el && !el.classList.contains('hidden') && el.style.display !== 'none' && el.offsetParent !== null); };
    const click = (id) => () => { const b = document.getElementById(id); if (b) b.click(); };
    const call = (fn, fb) => () => { try { if (typeof window[fn] === 'function') { window[fn](); return; } } catch (e) {} if (fb) fb(); };
    const hide = (id) => () => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };
    const WINDOWS = [
        ['resetConfirmModal', click('resetNoBtn')],
        ['admLogin', hide('admLogin')],
        ['adminModal', click('admClose')],
        ['winModal', () => { try { closeVictoryModal(); if (AudioFX.mode === 'victory') AudioFX.setMode('menu'); updateMenuVisibility(); } catch (e) { hide('winModal')(); } }],
        ['rouletteModal', call('closeRoulette', click('closeRouletteBtn'))],
        ['quizModal', call('closeQuiz', hide('quizModal'))],
        ['shopModal', call('closeShop', hide('shopModal'))],
        ['rulesModal', click('closeRulesBtn')],
        ['settingsModal', click('closeSettingsBtn')],
        ['gameOverModal', () => { try { returnToHome(); } catch (e) { hide('gameOverModal')(); } }]
    ];
    const quizTrap = () => { try { return typeof QS !== 'undefined' && (QS.phase === 'read' || QS.phase === 'answer' || QS.phase === 'pick'); } catch (e) { return false; } };

    function onBack() {
        // идёт вопрос — назад не работает (js/quiz.js сам возвращает запись)
        if (quizTrap() && vis('quizModal')) return;
        if (isExitOpen()) { doExit(); return; }   // второй «назад» при открытом вопросе — выходим
        for (const [id, close] of WINDOWS) {
            if (vis(id)) { try { close(); } catch (e) {} arm(); return; }
        }
        const ss = document.getElementById('startScreen');
        const inMenu = ss && !ss.classList.contains('hidden');
        if (!inMenu) {   // полёт (или экран «тапни, чтобы начать») — пауза и в главное меню
            try { returnToHome(); } catch (e) {}
            arm(); return;
        }
        openExit();      // главное меню: запись не возвращаем, пока не ответят «Нет»
    }

    window.addEventListener('popstate', () => {
        if (exiting) {   // идём назад до выхода со страницы
            clearTimeout(exitT);
            try { history.back(); } catch (e) {}
            exitT = setTimeout(() => { if (exitStuck) exitStuck(); }, 300);
            return;
        }
        if (window.__booting) { try { history.back(); } catch (e) {} return; }   // экран загрузки — без вопроса
        onBack();
    });

    // Esc на компьютере — то же, что «назад», только без ухода со страницы
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || e.repeat) return;
        if (isExitOpen()) { closeExit(true); return; }
        for (const [id, close] of WINDOWS) { if (vis(id)) { if (id === 'quizModal' && quizTrap()) return; try { close(); } catch (er) {} return; } }
    });

    // Запись в истории ставим сразу и повторно после первого касания: без действия пользователя
    // Chrome может «перепрыгивать» такие записи при нажатии «назад».
    arm();
    let gest = false;
    // первое касание ПОСЛЕ загрузки (касания во время заставки запись не ставят)
    const onGesture = () => { if (gest || window.__booting) return; gest = true; arm(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, onGesture, { capture: true, passive: true }));
})();
