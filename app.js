// --- avxp Tactical Baccarat Engine ---
const AVXP_SHOE_KEY = 'avxp_baccarat_shoe';
const AVXP_BOARD_KEY = 'avxp_baccarat_board';

let shoeHistory = JSON.parse(localStorage.getItem(AVXP_SHOE_KEY)) || [];
let boardHistory = JSON.parse(localStorage.getItem(AVXP_BOARD_KEY)) || [];

// Live Hand State
let currentHand = { p: [], b: [] };
let dealPhase = 'P1';

// Full 8-Deck tracking (32 of each rank)
const INITIAL_SHOE = { 'A':32, '2':32, '3':32, '4':32, '5':32, '6':32, '7':32, '8':32, '9':32, '10':32, 'J':32, 'Q':32, 'K':32 };

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

keys.forEach(key => {
    key.addEventListener('click', function() {
        const val = this.getAttribute('data-val');
        processCard(val);
    });
});

// Converts 'A' to 1, 'K' to 0, etc. for scoring math
function getCardValue(cardStr) {
    if (cardStr === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(cardStr)) return 0;
    return parseInt(cardStr);
}

function processCard(val) {
    shoeHistory.push(val); 

    // Simulation Rule: Face cards and 10 process strictly as ladder step/miss
    if (['10', 'J', 'Q', 'K'].includes(val)) {
        console.log(`${val} processed as step/miss for ladder progression.`);
        // Note: Ladder tracking execution occurs here
    }
    
    // Route card to correct hand based on phase
    if (dealPhase === 'P1') { currentHand.p.push(val); dealPhase = 'B1'; }
    else if (dealPhase === 'B1') { currentHand.b.push(val); dealPhase = 'P2'; }
    else if (dealPhase === 'P2') { currentHand.p.push(val); dealPhase = 'B2'; }
    else if (dealPhase === 'B2') { currentHand.b.push(val); evaluateBaseHand(); }
    else if (dealPhase === 'P3') { currentHand.p.push(val); evaluateBankerThirdCard(); }
    else if (dealPhase === 'B3') { currentHand.b.push(val); resolveWinner(); }

    saveAndRender();
}

function getScore(handArray) {
    return handArray.reduce((a, b) => a + getCardValue(b), 0) % 10;
}

function evaluateBaseHand() {
    const pScore = getScore(currentHand.p);
    const bScore = getScore(currentHand.b);

    if (pScore >= 8 || bScore >= 8) {
        resolveWinner();
        return;
    }

    if (pScore <= 5) {
        dealPhase = 'P3';
    } else {
        if (bScore <= 5) dealPhase = 'B3';
        else resolveWinner();
    }
}

function evaluateBankerThirdCard() {
    const bScore = getScore(currentHand.b);
    const p3Val = getCardValue(currentHand.p[2]); // Math value of player's 3rd card

    let bankerDraws = false;
    if (bScore <= 2) bankerDraws = true;
    else if (bScore === 3 && p3Val !== 8) bankerDraws = true;
    else if (bScore === 4 && p3Val >= 2 && p3Val <= 7) bankerDraws = true;
    else if (bScore === 5 && p3Val >= 4 && p3Val <= 7) bankerDraws = true;
    else if (bScore === 6 && (p3Val === 6 || p3Val === 7)) bankerDraws = true;

    if (bankerDraws) dealPhase = 'B3';
    else resolveWinner();
}

function resolveWinner() {
    const pScore = getScore(currentHand.p);
    const bScore = getScore(currentHand.b);
    let winner = 'T'; 

    if (pScore > bScore) winner = 'P';
    else if (bScore > pScore) winner = 'B';

    boardHistory.push(winner);
    
    // Process "One Cycle Per Number" rule logic here if auditing financial profit

    currentHand = { p: [], b: [] };
    dealPhase = 'P1';
}

function cancelHand() {
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

// Generate the visual HTML for cards
function renderCardBadges(handArray) {
    if (handArray.length === 0) return '-';
    return handArray.map(cardStr => `<span class="card-badge">${cardStr}</span>`).join('');
}

function runPredictions() {
    if (boardHistory.length < 3) {
        m1TargetEl.textContent = "Wait"; m1TargetEl.className = "stat-value";
        m2TargetEl.textContent = "Wait"; m2TargetEl.className = "stat-value";
        return;
    }

    const remaining = 416 - shoeHistory.length;
    let zeroCount = INITIAL_SHOE['10'] + INITIAL_SHOE['J'] + INITIAL_SHOE['Q'] + INITIAL_SHOE['K'];
    shoeHistory.forEach(c => { if (['10', 'J', 'Q', 'K'].includes(c)) zeroCount--; });
    
    // Method 01: Composition
    const zeroRatio = zeroCount / remaining;
    if (zeroRatio > 0.33) {
        m1TargetEl.textContent = "BANKER";
        m1TargetEl.className = "stat-value banker-hand";
    } else {
        m1TargetEl.textContent = "PLAYER";
        m1TargetEl.className = "stat-value player-hand";
    }

    // Method 02: Pattern
    const recent = boardHistory.slice(-4);
    const last = recent[recent.length-1];
    const prev = recent[recent.length-2];

    if (last === prev && last !== 'T') {
        m2TargetEl.textContent = last === 'B' ? "BANKER" : "PLAYER";
        m2TargetEl.className = `stat-value ${last === 'B' ? 'banker-hand' : 'player-hand'}`;
    } else {
        const target = last === 'B' ? 'PLAYER' : 'BANKER';
        m2TargetEl.textContent = target;
        m2TargetEl.className = `stat-value ${target === 'BANKER' ? 'banker-hand' : 'player-hand'}`;
    }
}

function renderUI() {
    // 1. Update Hand Prompter
    promptText.textContent = `Awaiting: ${dealPhase === 'P1' ? 'Player Card 1' : dealPhase === 'B1' ? 'Banker Card 1' : dealPhase === 'P2' ? 'Player Card 2' : dealPhase === 'B2' ? 'Banker Card 2' : dealPhase === 'P3' ? 'Player Card 3 (Rules)' : 'Banker Card 3 (Rules)'}`;
    
    // Render Visual Card Badges
    pCardsEl.innerHTML = renderCardBadges(currentHand.p);
    bCardsEl.innerHTML = renderCardBadges(currentHand.b);
    
    pScoreEl.textContent = currentHand.p.length ? getScore(currentHand.p) : '0';
    bScoreEl.textContent = currentHand.b.length ? getScore(currentHand.b) : '0';

    // 2. Render Board History
    historyGrid.innerHTML = '';
    const reversedBoard = [...boardHistory].reverse();
    reversedBoard.forEach(winner => {
        const div = document.createElement('div');
        div.className = `history-item ${winner === 'P' ? 'player-win' : winner === 'B' ? 'banker-win' : 'tie-win'}`;
        div.textContent = winner;
        historyGrid.appendChild(div);
    });

    // 3. Update Status
    confidenceEl.textContent = `Cards Left: ${416 - shoeHistory.length}`;
    runPredictions();
}

cancelHandBtn.addEventListener('click', cancelHand);
resetBtn.addEventListener('click', resetShoe);

init();
