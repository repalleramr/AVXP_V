// --- avxp Baccarat Engine ---
const AVXP_SHOE_KEY = 'avxp_baccarat_shoe';
let shoeHistory = JSON.parse(localStorage.getItem(AVXP_SHOE_KEY)) || [];

// Standard 8-Deck Baccarat Shoe Composition
const INITIAL_SHOE = {
    0: 128, // 10, J, Q, K (16 per deck * 8)
    1: 32, 2: 32, 3: 32, 4: 32, 5: 32, 6: 32, 7: 32, 8: 32, 9: 32
};

// DOM Elements
const keys = document.querySelectorAll('.key-btn');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-shoe-btn');
const historyGrid = document.getElementById('history-grid');
const cardsLeftEl = document.getElementById('cards-left');
const netProfitEl = document.getElementById('net-profit');

// Initialize
function init() {
    renderUI();
}

// Handle Keypad Press
keys.forEach(key => {
    key.addEventListener('click', function() {
        const val = parseInt(this.getAttribute('data-val'));
        addCard(val);
    });
});

function addCard(val) {
    // Prevent adding cards if the shoe is empty for that value
    const currentCounts = calculateCurrentShoe();
    if (currentCounts[val] <= 0) {
        alert("Shoe tracking error: No more of this card left in an 8-deck shoe.");
        return;
    }

    shoeHistory.push(val);
    
    // Process "0" strictly as a step/miss for ladder logic
    if (val === 0) {
        console.log("0 processed as ladder step/miss.");
        // Ladder step logic goes here
    }

    // Process Method 01 & Method 02 simultaneously
    runMethod01And02(val);

    saveAndRender();
}

function undo() {
    if (shoeHistory.length > 0) {
        shoeHistory.pop();
        saveAndRender();
    }
}

function resetShoe() {
    if(confirm("Initialize a new 8-deck shoe?")) {
        shoeHistory = [];
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem(AVXP_SHOE_KEY, JSON.stringify(shoeHistory));
    renderUI();
}

// Recalculate remaining cards based on history
function calculateCurrentShoe() {
    let currentShoe = { ...INITIAL_SHOE };
    shoeHistory.forEach(card => {
        currentShoe[card]--;
    });
    return currentShoe;
}

// Tactical Engine Placeholders
function runMethod01And02(latestCard) {
    // Logic for Method 01
    // Logic for Method 02
}

function calculateProfit() {
    // Applies strictly "One Cycle Per Number" rule
    let profit = 0;
    // Profit summation logic goes here
    return profit;
}

// Render UI
function renderUI() {
    // Update Remaining Cards
    const remaining = 416 - shoeHistory.length;
    cardsLeftEl.textContent = remaining;

    // Render History
    historyGrid.innerHTML = '';
    const reversedHistory = [...shoeHistory].reverse();
    reversedHistory.forEach(card => {
        const div = document.createElement('div');
        div.className = 'history-item neutral';
        div.textContent = card;
        historyGrid.appendChild(div);
    });

    // Update Profit
    const currentProfit = calculateProfit();
    netProfitEl.textContent = (currentProfit >= 0 ? '+' : '') + currentProfit + ' U';

    undoBtn.disabled = shoeHistory.length === 0;
}

// Event Listeners
undoBtn.addEventListener('click', undo);
resetBtn.addEventListener('click', resetShoe);

init();
