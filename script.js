/**
 * @file 數數小遊戲的主要邏輯 (v15 - 中文數字轉換)
 */

// --- 組態設定 ---
const config = {
    themes: {
        fruits:  ['🍎', '🍌', '🍇', '🍓', '🍊', '🥝', '🍍', '🍉', '🍑', '🍒', '🥭', '🥥'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
        vehicles:['🚗', '🚕', '🚌', '🚓', '🚑', '🚒', '🚚', '🚜', '🚲', '🚀', '✈️', '🚢']
    },
    totalTurns: 10,
    pointsPerCorrect: 10,
};

const difficultySettings = {
    easy: {
        minItems: 1,
        maxItems: 10,
        optionsCount: 2,
    },
    medium: {
        minItems: 5,
        maxItems: 15,
        optionsCount: 3,
    },
    hard: {
        minItems: 10,
        maxItems: 15,
        optionsCount: 4,
    },
    extreme: {
        minItems: 15,
        maxItems: 20,
        optionsCount: 4,
    }
};

// --- DOM 元素 ---
const domElements = {
    itemArea: document.getElementById('item-area'),
    optionsArea: document.getElementById('options-area'),
    modeSelector: document.getElementById('start-overlay').querySelector('.mode-selector'),
    startOverlay: document.getElementById('start-overlay'),
    difficultySelector: document.getElementById('start-overlay').querySelector('.difficulty-selector'),
    finalScoreOverlay: document.getElementById('final-score-overlay'),
    finalScoreSpan: document.getElementById('final-score'),
    playAgainBtn: document.getElementById('play-again-btn'),
    successSound: document.getElementById('success-sound'),
    correctSound: document.getElementById('correct-sound'),
    errorSound: document.getElementById('error-sound'),
    feedbackMessage: document.getElementById('feedback-message'),
    scoreSpan: document.getElementById('score'),
    turnCounterSpan: document.getElementById('turn-counter'),
};

// --- 遊戲狀態 ---
const gameState = {
    correctAnswer: 0,
    score: 0,
    currentTurn: 0,
    currentMode: 'ai', 
    currentDifficulty: 'medium', 
    currentOptions: [], 
    userCountProgress: 0,
    speechQueue: [],
    isSpeaking: false,
    optionsShown: false,
};

let selectedVoice = null;

// --- 語音佇列系統 ---

function processSpeechQueue() {
    if (gameState.isSpeaking || gameState.speechQueue.length === 0) {
        return; 
    }
    gameState.isSpeaking = true;
    const speechItem = gameState.speechQueue.shift();

    if (!speechItem.text) {
        if (speechItem.onStart) speechItem.onStart();
        if (speechItem.onEnd) speechItem.onEnd();
        gameState.isSpeaking = false;
        processSpeechQueue();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(speechItem.text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = 'zh-TW';
    utterance.rate = 1.2;

    utterance.onstart = () => { if (speechItem.onStart) speechItem.onStart(); };
    utterance.onend = () => {
        if (speechItem.onEnd) speechItem.onEnd();
        gameState.isSpeaking = false;
        setTimeout(processSpeechQueue, 50);
    };
    utterance.onerror = (event) => {
        console.error("SpeechSynthesis Error:", event.error);
        gameState.isSpeaking = false;
        processSpeechQueue();
    };
    
    if (speechItem.onStart) speechItem.onStart();
    window.speechSynthesis.speak(utterance);
}

function requestSpeech(text, callbacks = {}) {
    const { onStart, onEnd } = callbacks;
    if (!('speechSynthesis' in window)) {
        setTimeout(() => {
            if (onStart) onStart();
            if (onEnd) onEnd();
        }, 600);
        return;
    }
    gameState.speechQueue.push({ text, onStart, onEnd });
    processSpeechQueue();
}

// --- 遊戲邏輯 ---

/**
 * 新增：將數字轉換為中文國字的輔助函式
 * @param {number} num - 要轉換的數字 (1-99)
 * @returns {string} 中文數字字串
 */
function convertNumberToChinese(num) {
    const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const chineseUnits = ['', '十', '百']; // 可擴充

    if (num < 10) {
        return chineseNums[num];
    } else if (num === 10) {
        return chineseUnits[1];
    } else if (num > 10 && num < 20) {
        return chineseUnits[1] + chineseNums[num % 10];
    } else { // 20-99
        const tens = Math.floor(num / 10);
        const ones = num % 10;
        if (ones === 0) {
            return chineseNums[tens] + chineseUnits[1];
        } else {
            return chineseNums[tens] + chineseUnits[1] + chineseNums[ones];
        }
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function speakAndCheckItems(total, items) {
    for (let i = 1; i <= total; i++) {
        const currentCount = i;
        requestSpeech(currentCount.toString(), {
            onStart: () => {
                if (items[currentCount - 1]) {
                    items[currentCount - 1].classList.add('checked');
                }
            }
        });
    }
    requestSpeech("", { onEnd: () => showOptions() });
}

function showOptions() {
    if (gameState.optionsShown) return;
    gameState.optionsShown = true;

    requestSpeech('請選擇正確的答案！', {
        onEnd: () => {
            domElements.optionsArea.innerHTML = '';
            const options = gameState.currentOptions;
            options.forEach(option => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option;
                button.dataset.value = option;
                domElements.optionsArea.appendChild(button);
            });
        }
    });
}

function startNewTurn() {
    gameState.currentTurn++;
    gameState.optionsShown = false;
    
    domElements.itemArea.classList.remove('user-counting');
    domElements.turnCounterSpan.textContent = gameState.currentTurn;
    domElements.feedbackMessage.textContent = '';
    domElements.feedbackMessage.className = 'feedback-message';
    domElements.itemArea.innerHTML = '';
    domElements.optionsArea.innerHTML = '';
    
    const currentSettings = difficultySettings[gameState.currentDifficulty];
    gameState.correctAnswer = getRandomInt(currentSettings.minItems, currentSettings.maxItems);
    
    const themeKeys = Object.keys(config.themes);
    const randomThemeKey = themeKeys[getRandomInt(0, themeKeys.length - 1)];
    const currentThemeIcons = config.themes[randomThemeKey];
    const randomIcon = currentThemeIcons[getRandomInt(0, currentThemeIcons.length - 1)];

    const setupItemsAndProceed = () => {
        for (let i = 0; i < gameState.correctAnswer; i++) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.textContent = randomIcon;
            domElements.itemArea.appendChild(itemDiv);
        }

        if (gameState.currentMode === 'ai') {
            const items = domElements.itemArea.querySelectorAll('.item');
            speakAndCheckItems(gameState.correctAnswer, items);
        } else {
            gameState.userCountProgress = 0;
            domElements.itemArea.classList.add('user-counting');
        }
    };

    const options = [gameState.correctAnswer];
    while (options.length < currentSettings.optionsCount) {
        const wrongOption = getRandomInt(currentSettings.minItems, currentSettings.maxItems);
        if (!options.includes(wrongOption)) {
            options.push(wrongOption);
        }
    }
    shuffleArray(options);
    gameState.currentOptions = options;

    requestSpeech("鼠一鼠有幾個？", { onEnd: setupItemsAndProceed });
}

function triggerAnswerConfetti() {
    if (typeof confetti !== 'function') return;
    
    const burstOptions = { particleCount: 120, spread: 90, origin: { y: 0.6 }, zIndex: 1001 };
    confetti(burstOptions);
}

function checkAnswer(event) {
    const clickedButton = event.target.closest('.option-btn');
    if (!clickedButton || clickedButton.disabled) return;
    
    gameState.speechQueue = [];
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    domElements.optionsArea.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    
    const selectedValue = parseInt(clickedButton.dataset.value, 10);
    let feedbackText;
    let soundToPlay;

    if (selectedValue === gameState.correctAnswer) {
        feedbackText = '答對了！你真棒！';
        soundToPlay = domElements.correctSound;
        domElements.feedbackMessage.className = 'feedback-message correct';
        clickedButton.classList.add('correct-answer');
        gameState.score += config.pointsPerCorrect;
        domElements.scoreSpan.textContent = gameState.score;
        triggerAnswerConfetti();
    } else {
        feedbackText = `答錯了，正確答案是 ${gameState.correctAnswer}。`;
        soundToPlay = domElements.errorSound;
        domElements.feedbackMessage.className = 'feedback-message wrong';
        clickedButton.classList.add('wrong-answer');
        const correctButton = domElements.optionsArea.querySelector(`.option-btn[data-value='${gameState.correctAnswer}']`);
        if (correctButton) {
            correctButton.classList.add('correct-answer');
        }
    }
    domElements.feedbackMessage.textContent = feedbackText;
    
    const speakFeedback = () => {
        requestSpeech(feedbackText, {
            onEnd: () => {
                if (gameState.currentTurn >= config.totalTurns) {
                    showFinalScore();
                } else {
                    setTimeout(startNewTurn, 1500);
                }
            }
        });
    };
    
    if (soundToPlay) {
        soundToPlay.addEventListener('ended', speakFeedback, { once: true });
        soundToPlay.play().catch(e => {
            console.error("音效播放失敗:", e);
            soundToPlay.removeEventListener('ended', speakFeedback);
            speakFeedback();
        });
    } else {
        speakFeedback();
    }
}


function startNewRound(difficulty) {
    domElements.startOverlay.classList.add('hidden');
    gameState.currentDifficulty = difficulty;
    gameState.score = 0;
    gameState.currentTurn = 0;
    domElements.scoreSpan.textContent = gameState.score;
    startNewTurn();
}

function handleDifficultyClick(event) {
    const clickedButton = event.target.closest('.difficulty-btn');
    if (clickedButton) {
        gameState.speechQueue = [];
        gameState.isSpeaking = false;
        if ('speechSynthesis' in window) {
             window.speechSynthesis.cancel();
        }
        startNewRound(clickedButton.dataset.difficulty);
    }
}

function handleUserCountClick(event) {
    if (gameState.currentMode !== 'user' || gameState.userCountProgress >= gameState.correctAnswer) return;
    
    const clickedItem = event.target.closest('.item');
    if (!clickedItem || clickedItem.classList.contains('checked')) return;

    gameState.speechQueue = [];
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    gameState.userCountProgress++;
    clickedItem.classList.add('checked'); 
    
    const countToSpeak = gameState.userCountProgress;

    requestSpeech(countToSpeak.toString(), {
        onEnd: () => {
            if (countToSpeak === gameState.correctAnswer) {
                showOptions();
            }
        }
    });
}


function handleModeClick(event) {
    const clickedButton = event.target.closest('.mode-btn');
    if (!clickedButton) return;
    const newMode = clickedButton.dataset.mode;
    gameState.currentMode = newMode;
    domElements.modeSelector.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
}

/**
 * 修正：處理滑鼠懸停或觸控選項時的事件，使用中文數字轉換
 * @param {Event} event 
 */
function handleOptionHover(event) {
    const hoveredButton = event.target.closest('.option-btn');

    if (!hoveredButton || hoveredButton.disabled) return;

    gameState.speechQueue = [];
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    const number = parseInt(hoveredButton.dataset.value, 10);
    const chineseNumberText = convertNumberToChinese(number); // 使用新的輔助函式
    const textToSpeak = `${chineseNumberText}個`; // 組合為 "十八個"
    
    requestSpeech(textToSpeak);
}


function triggerConfetti() {
    if (typeof confetti !== 'function') { return; }
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1001 };
    function randomInRange(min, max) { return Math.random() * (max - min) + min; }
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) { return clearInterval(interval); }
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
}

function showFinalScore() {
    const score = gameState.score;
    const correctCount = score / config.pointsPerCorrect;
    let finalText = '';
    if (score === 100) {
        finalText = `太厲害了，你全部答對了，恭喜你得到100分！`;
    } else if (score >= 80) {
        finalText = `很棒喔，你總共答對了${correctCount}題，恭喜你得到了${score}分。`;
    } else if (score >= 60) {
        finalText = `不錯喔，你總共答對了${correctCount}題，恭喜你得到了${score}分。`;
    } else {
        finalText = `要再加油喔，你總共答對了${correctCount}題，你得到了${score}分。`;
    }
    domElements.finalScoreSpan.textContent = score;
    domElements.finalScoreOverlay.classList.remove('hidden');
    triggerConfetti();
    domElements.successSound.play().catch(e => console.error("音效播放失敗:", e));
    requestSpeech(finalText);
}

function playAgain() {
    domElements.finalScoreOverlay.classList.add('hidden');
    domElements.startOverlay.classList.remove('hidden');
}

function initializeVoice() {
    if (!('speechSynthesis' in window)) {
        console.warn('此瀏覽器不支援語音合成。');
        return;
    }
    const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;
        const twVoices = voices.filter(voice => voice.lang === 'zh-TW');
        if (twVoices.length > 0) {
            const edgeVoice = twVoices.find(voice => voice.name.includes('Microsoft HsiaoChen Online'));
            const chromeVoice = twVoices.find(voice => voice.name.includes('Google 國語'));
            if (edgeVoice) {
                selectedVoice = edgeVoice;
            } else if (chromeVoice) {
                selectedVoice = chromeVoice;
            } else {
                selectedVoice = twVoices[0];
            }
            console.log(`已選擇語音: ${selectedVoice.name}`);
        } else {
            console.warn("找不到任何支援 'zh-TW' 的語音。");
        }
    };
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
}

initializeVoice();

// 事件監聽
domElements.optionsArea.addEventListener('click', checkAnswer);
domElements.itemArea.addEventListener('click', handleUserCountClick);
domElements.modeSelector.addEventListener('click', handleModeClick);
domElements.difficultySelector.addEventListener('click', handleDifficultyClick);
domElements.playAgainBtn.addEventListener('click', playAgain);

domElements.optionsArea.addEventListener('mouseover', handleOptionHover);
domElements.optionsArea.addEventListener('touchstart', handleOptionHover, { passive: true });


window.addEventListener('beforeunload', () => {
    gameState.speechQueue = [];
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
});