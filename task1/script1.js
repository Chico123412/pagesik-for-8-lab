const createInitialSettings = () => ({
    playersCount: 1,
    playerNames: ['Гравець 1', 'Гравець 2'],
    rows: 4,
    cols: 4,
    difficulty: 'easy',
    rounds: 1,
    currentRound: 1
});

const createInitialGameState = (settings) => ({
    board: [],
    flippedCards: [],
    matchedCards: [],
    moves: 0,
    currentPlayer: 0,
    timer: getTimerByDifficulty(settings.difficulty),
    isGameActive: false,
    scores: []
});

const getTimerByDifficulty = (difficulty) => {
    const timers = { easy: 180, normal: 120, hard: 60 };
    return timers[difficulty] || timers.easy; // За замовчуванням easy
};

const generateBoard = (rows, cols) => {
    const numPairs = (rows * cols) / 2;  // Кількість пар карток
    const values = [];

    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];
    const usedEmojis = emojis.slice(0, numPairs); // Береться потрібна кількість емодзі

    // пари карток
    for (let i = 0; i < numPairs; i++) {
        values.push(usedEmojis[i]);
        values.push(usedEmojis[i]);
    }

    // перемішуємо картки і повертаємо
    return shuffleArray(values).map((value, index) => ({
        id: index,
        value,
        flipped: false,
        matched: false
    }));
};

const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
};

const flipCard = (state, cardId) => {
    // перевіряємо, чи можна перевернути картку
    if (!state.isGameActive || state.flippedCards.length === 2 ||
        state.board[cardId].flipped || state.board[cardId].matched) {
        return state;
    }

    // створюємо новий стан з перевернутою карткою
    const newBoard = state.board.map(card =>
        card.id === cardId ? { ...card, flipped: true } : card
    );

    return {
        ...state,
        board: newBoard,
        flippedCards: [...state.flippedCards, cardId] // додаємо до відкритих
    };
};


const checkForMatch = (state) => {
    if (state.flippedCards.length < 2) return state;

    const [firstId, secondId] = state.flippedCards;
    const firstCard = state.board[firstId];
    const secondCard = state.board[secondId];
    const isMatch = firstCard.value === secondCard.value;

    // оновлюємо стан карток
    const newBoard = state.board.map(card => {
        if (card.id === firstId || card.id === secondId) {
            return { ...card, matched: isMatch, flipped: isMatch };
        }
        return card;
    });

    // додаємо знайдені пари або залишаємо як є
    const newMatchedCards = isMatch
        ? [...state.matchedCards, firstId, secondId]
        : state.matchedCards;

    return {
        ...state,
        board: newBoard,
        flippedCards: [], // скидання відкритої картки
        matchedCards: newMatchedCards,
        moves: state.moves + 1,
        // змінюємо гравця, якщо не було збігу
        currentPlayer: isMatch ? state.currentPlayer : (state.currentPlayer + 1) % state.settings.playersCount
    };
};

const isGameWon = (state) => {
    return state.board.every(card => card.matched);
};

const renderBoard = (board, onClick) => {
    const boardContainer = document.getElementById('game-board');
    boardContainer.innerHTML = '';

    // Встановлюємо кількість стовпців відповідно до розміру поля
    const cols = Math.sqrt(board.length);
    boardContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Створюємо картки
    board.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.flipped || card.matched ? 'flipped' : ''}`;
        cardDiv.textContent = (card.flipped || card.matched) ? card.value : '';
        cardDiv.addEventListener('click', () => onClick(card.id));
        boardContainer.appendChild(cardDiv);
    });
};

/**
 * Оновлює інформацію про гру (раунд, гравець, таймер, ходи)
 * @param {Object} state - Стан гри
 */
const renderGameInfo = (state) => {
    document.getElementById('current-round').textContent = state.settings.currentRound;
    document.getElementById('total-rounds').textContent = state.settings.rounds;
    document.getElementById('current-player').textContent = state.settings.playerNames[state.currentPlayer];
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('timer').textContent = formatTime(state.timer);
};

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const renderResults = (state) => {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';

    const resultsTitle = document.createElement('h2');
    resultsTitle.textContent = 'Результати гри';
    resultsContainer.appendChild(resultsTitle);

    if (state.scores.length === 0) return;

    const resultsTable = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ['Раунд', 'Переможець', 'Ходи', 'Час'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    resultsTable.appendChild(thead);

    // заповнюємо таблицю даними
    const tbody = document.createElement('tbody');
    state.scores.forEach((score, index) => {
        const row = document.createElement('tr');

        const roundCell = document.createElement('td');
        roundCell.textContent = index + 1;
        row.appendChild(roundCell);

        const playerCell = document.createElement('td');
        playerCell.textContent = score.player;
        row.appendChild(playerCell);

        const movesCell = document.createElement('td');
        movesCell.textContent = score.moves;
        row.appendChild(movesCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = formatTime(score.time);
        row.appendChild(timeCell);

        tbody.appendChild(row);
    });

    resultsTable.appendChild(tbody);
    resultsContainer.appendChild(resultsTable);
};

/**
 * Визначає переможця гри
 * @param {Array} scores - Масив результатів
 * @returns {Object} Інформація про переможця
 */
const determineWinner = (scores) => {
    const playerStats = {};

    // рахуємо загальні ходи і час для кожного гравця
    scores.forEach(score => {
        if (!playerStats[score.player]) {
            playerStats[score.player] = { moves: 0, time: 0 };
        }
        playerStats[score.player].moves += score.moves;
        playerStats[score.player].time += score.time;
    });

    let winner = { name: '', moves: Infinity, time: Infinity };

    // знаходимо гравця з найменшою кількістю ходів
    for (const [name, stats] of Object.entries(playerStats)) {
        if (stats.moves < winner.moves ||
            (stats.moves === winner.moves && stats.time < winner.time)) {
            winner = { name, moves: stats.moves, time: stats.time };
        }
    }

    return winner;
};

let gameState = null;
let timerInterval = null;

const startGame = () => {
    // отримуємо налаштування з форми
    const settings = {
        playersCount: Number(document.getElementById('players-count').value),
        playerNames: [
            document.getElementById('player1-name').value || 'Гравець 1',
            document.getElementById('player2-name').value || 'Гравець 2'
        ],
        rows: Number(document.getElementById('rows').value),
        cols: Number(document.getElementById('cols').value),
        difficulty: document.getElementById('difficulty').value,
        rounds: Number(document.getElementById('rounds').value),
        currentRound: 1
    };

    if ((settings.rows * settings.cols) % 2 !== 0) {
        alert('Кількість карток має бути парною! Змініть розмір поля.');
        return;
    }

    // ініціалізуємо стан гри
    gameState = {
        settings,
        ...createInitialGameState(settings)
    };

    // генеруємо поле
    gameState.board = generateBoard(settings.rows, settings.cols);
    gameState.isGameActive = true;

    // оновлюємо інтерфейс
    renderBoard(gameState.board, handleCardClick);
    renderGameInfo(gameState);
    document.getElementById('restart-game').style.display = 'inline-block';
    document.getElementById('results').style.display = 'none';

    startTimer();
};

const startTimer = () => {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        gameState.timer -= 1;
        renderGameInfo(gameState);

        // перевіряємо, чи не закінчився час
        if (gameState.timer <= 0) {
            endRound(false);
        }
    }, 1000);
};


const handleCardClick = (cardId) => {
    if (!gameState.isGameActive) return;

    gameState = flipCard(gameState, cardId);
    renderBoard(gameState.board, handleCardClick);

    if (gameState.flippedCards.length === 2) {
        gameState.isGameActive = false;

        // затримка для перевірки на збіг
        setTimeout(() => {
            gameState = checkForMatch(gameState);
            renderBoard(gameState.board, handleCardClick);
            renderGameInfo(gameState);

            // перевіряємо, чи завершено гру
            if (isGameWon(gameState)) {
                endRound(true);
            } else {
                gameState.isGameActive = true;
            }
        }, 800);
    }
};


const endRound = (isWon) => {
    clearInterval(timerInterval);
    gameState.isGameActive = false;

    // результати раунду
    const roundTime = getTimerByDifficulty(gameState.settings.difficulty) - gameState.timer;
    gameState.scores.push({
        player: gameState.settings.playerNames[gameState.currentPlayer],
        moves: gameState.moves,
        time: roundTime
    });

    // результат раунду
    setTimeout(() => {
        if (isWon) {
            alert(`Раунд ${gameState.settings.currentRound} завершено! Ходи: ${gameState.moves}, Час: ${formatTime(roundTime)}`);
        } else {
            alert(`Час вичерпано! Раунд ${gameState.settings.currentRound} завершено.`);
        }

        // чи був останній раунд
        if (gameState.settings.currentRound >= gameState.settings.rounds) {
            endGame();
        } else {
            // наступний раунд
            gameState.settings.currentRound += 1;
            const newGameState = createInitialGameState(gameState.settings);
            gameState = {
                settings: gameState.settings,
                ...newGameState,
                board: generateBoard(gameState.settings.rows, gameState.settings.cols),
                scores: gameState.scores,
                isGameActive: true
            };

            renderBoard(gameState.board, handleCardClick);
            renderGameInfo(gameState);
            startTimer();
        }
    }, 500);
};


// завершує гру і показує результати
const endGame = () => {
    renderResults(gameState);
    document.getElementById('restart-game').style.display = 'inline-block';
};

const resetSettings = () => {
    const defaultSettings = createInitialSettings();

    document.getElementById('players-count').value = defaultSettings.playersCount;
    document.getElementById('player1-name').value = defaultSettings.playerNames[0];
    document.getElementById('player2-name').value = defaultSettings.playerNames[1];
    document.getElementById('rows').value = defaultSettings.rows;
    document.getElementById('cols').value = defaultSettings.cols;
    document.getElementById('difficulty').value = 'easy';
    document.getElementById('rounds').value = defaultSettings.rounds;

    document.getElementById('player2-name').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('restart-game').addEventListener('click', startGame);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // показуємо/ховаємо поле для другого гравця
    document.getElementById('players-count').addEventListener('change', (e) => {
        document.getElementById('player2-name').style.display =
            e.target.value === '2' ? 'inline-block' : 'none';
    });
});