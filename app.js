// --- avxp Baccarat Engine ---
const AVXP_SHOE_KEY = 'avxp_baccarat_shoe';
const AVXP_BOARD_KEY = 'avxp_baccarat_board';

// Persist both the individual cards and the final hand winners
let shoeHistory = JSON.parse(localStorage.getItem(AVXP_SHOE_KEY)) || [];
let boardHistory = JSON.parse(localStorage.getItem(AVXP_BOARD_KEY)) || [];

// Live Hand State Management
let currentHand = { p: [], b: [] };
let dealPhase = 'P1'; // Phases: P1, B1, P2, B2, P3, B3

const INITIAL_SHOE = { 0: 128, 1: 32, 2: 32, 3: 32, 4: 32, 5: 32, 6: 32, 7: 32, 8: 32, 9: 32 };

// DOM Elements
const keys = document.querySelectorAll('.key-btn');
const cancelHandBtn = document.getElementById('cancel-hand-btn');
const resetBtn = document.getElementById('reset-shoe-btn');
const historyGrid = document.getElementById('history-grid');

const promptText = document.getElementById('prompt-text');
const pCardsEl = document.getElementById('player-cards');
const bCardsEl = document.getElementById('banker-cards');
const pScoreEl = document.getElementById('player-score');
const bScoreEl = document.getElementById('banker-score');

const m1TargetEl = document.getElementById('method1-target');
const m2TargetEl = document.getElementById('method2-target');
const confidenceEl = document.getElementById('ai-confidence');

function init() { renderUI(); }

// Keypad Input
keys.forEach(key => {
    key.addEventListener('click', function() {
        const val = parseInt(this.getAttribute('data-val'));
        processCard(val);
    });
});

function processCard(val) {
    shoeHistory.push(val); // Save to master shoe record

    // Ensure 0 is mathematically processed as a step/miss 
    // In baccarat scoring, it holds zero value.
    
    // Route card to correct hand based on phase
    if (dealPhase === 'P1') { currentHand.p.push(val); dealPhase = 'B1'; }
    else if (dealPhase === 'B1') { currentHand.b.push(val); dealPhase = 'P2'; }
    else if (dealPhase === 'P2') { currentHand.p.push(val); dealPhase = 'B2'; }
    else if (dealPhase === 'B2') { currentHand.b.push(val); evaluateBaseHand(); }
    else if (dealPhase === 'P3') { currentHand.p.push(val); evaluateBankerThirdCard(); }
    else if (dealPhase === 'B3') { currentHand.b.push(val); resolveWinner(); }

    saveAndRender();
}

// Calculates baccarat modulo 10 score
function getScore(handArray) {
    return handArray.reduce((a, b) => a + b, 0) % 10;
}

// The Baccarat Tableau Logic
function evaluateBaseHand() {
    const pScore = getScore(currentHand.p);
    const bScore = getScore(currentHand.b);

    // Natural 8 or 9
    if (pScore >= 8 || bScore >= 8) {
        resolveWinner();
        return;
    }

    // Player Drawing Rules
    if (pScore <= 5) {
        dealPhase = 'P3'; // Player must draw
    } else {
        // Player stands (6 or 7). Banker draws if 0-5.
        if (bScore <= 5) dealPhase = 'B3';
        else resolveWinner();
    }
}

function evaluateBankerThirdCard() {
    const bScore = getScore(currentHand.b);
    const p3 = currentHand.p[2]; // The 3rd card player just drew

    let bankerDraws = false;
    if (bScore <= 2) bankerDraws = true;
    else if (bScore === 3 && p3 !== 8) bankerDraws = true;
    else if (bScore === 4 && p3 >= 2 && p3 <= 7) bankerDraws = true;
    else if (bScore === 5 && p3 >= 4 && p3 <= 7) bankerDraws = true;
    else if (bScore === 6 && (p3 === 6 || p3 === 7)) bankerDraws = true;

    if (bankerDraws) dealPhase = 'B3';
    else resolveWinner();
}

function resolveWinner() {
    const pScore = getScore(currentHand.p);
    const bScore = getScore(currentHand.b);
    let winner = 'T'; // Tie

    if (pScore > bScore) winner = 'P';
    else if (bScore > pScore) winner = 'B';

    boardHistory.push(winner);
    
    // Reset for next round
    currentHand = { p: [], b: [] };
    dealPhase = 'P1';
    
    // Process Cycle Rule for Profit/Audit here if needed
}

function cancelHand() {
    // Revert shoe history by the number of cards in current incomplete hand
    const cardsToPop = currentHand.p.length + currentHand.b.length;
    for(let i=0; i < cardsToPop; i++) shoeHistory.pop();
    
    currentHand = { p: [], b: [] };
    dealPhase = 'P1';
    saveAndRender();
}

function resetShoe() {
    if(confirm("Initialize a new 8-deck shoe?")) {
        shoeHistory = [];
        boardHistory = [];
        currentHand = { p: [], b: [] };
        dealPhase = 'P1';
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem(AVXP_SHOE_KEY, JSON.stringify(shoeHistory));
    localStorage.setItem(AVXP_BOARD_KEY, JSON.stringify(boardHistory));
    renderUI();
}

// Dual-Parameter Predictive Engine
function runPredictions() {
    if (boardHistory.length < 3) {
        m1TargetEl.textContent = "Wait"; m1TargetEl.className = "stat-value";
        m2TargetEl.textContent = "Wait"; m2TargetEl.className = "stat-value";
        return;
    }

    // METHOD 01: Shoe Composition Logic
    // High '0' density favors Banker slightly due to drawing rules.
    const remaining = 416 - shoeHistory.length;
    let zeroCount = INITIAL_SHOE[0];
    shoeHistory.forEach(c => { if (c === 0) zeroCount--; });
    const zeroRatio = zeroCount / remaining;
    
    if (zeroRatio > 0.33) {
        m1TargetEl.textContent = "BANKER";
        m1TargetEl.className = "stat-value banker-hand";
    } else {
        m1TargetEl.textContent = "PLAYER";
        m1TargetEl.className = "stat-value player-hand";
    }

    // METHOD 02: Structural Pattern Engine (Big Road logic)
    const recent = boardHistory.slice(-4);
    const last = recent[recent.length-1];
    const prev = recent[recent.length-2];

    // Basic Streak tracking
    if (last === prev && last !== 'T') {
        m2TargetEl.textContent = last === 'B' ? "BANKER" : "PLAYER";
        m2TargetEl.className = `stat-value ${last === 'B' ? 'banker-hand' : 'player-hand'}`;
    } else {
        // Chop/Ping-Pong pattern
        const target = last === 'B' ? 'PLAYER' : 'BANKER';
        m2TargetEl.textContent = target;
        m2TargetEl.className = `stat-value ${target === 'BANKER' ? 'banker-hand' : 'player-hand'}`;
    }
}

function renderUI() {
    // 1. Update Hand Prompter
    promptText.textContent = `Awaiting: ${dealPhase === 'P1' ? 'Player Card 1' : dealPhase === 'B1' ? 'Banker Card 1' : dealPhase === 'P2' ? 'Player Card 2' : dealPhase === 'B2' ? 'Banker Card 2' : dealPhase === 'P3' ? 'Player Card 3 (Rules)' : 'Banker Card 3 (Rules)'}`;
    
    pCardsEl.textContent = currentHand.p.length ? currentHand.p.join(' ') : '-';
    bCardsEl.textContent = currentHand.b.length ? currentHand.b.join(' ') : '-';
    
    pScoreEl.textContent = currentHand.p.length ? getScore(currentHand.p) : '0';
    bScoreEl.textContent = currentHand.b.length ? getScore(currentHand.b) : '0';

    // 2. Render Board History (Winners)
    historyGrid.innerHTML = '';
    const reversedBoard = [...boardHistory].reverse();
    reversedBoard.forEach(winner => {
        const div = document.createElement('div');
        div.className = `history-item ${winner === 'P' ? 'player-win' : winner === 'B' ? 'banker-win' : 'tie-win'}`;
        div.textContent = winner;
        historyGrid.appendChild(div);
    });

    // 3. Update Shoe Count & Predictions
    confidenceEl.textContent = `Cards Left: ${416 - shoeHistory.length}`;
    runPredictions();
}

// Event Listeners
cancelHandBtn.addEventListener('click', cancelHand);
resetBtn.addEventListener('click', resetShoe);

init();
