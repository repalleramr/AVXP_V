// --- avxp Engine ---
const AVXP_STORAGE_KEY = 'avxp_session_history';
let sessionHistory = JSON.parse(localStorage.getItem(AVXP_STORAGE_KEY)) || [];

// Undo/Redo State Limits
let redoStack = []; 
const MAX_UNDO = 10;
let currentUndoDepth = 0; 

// DOM Elements
const inputField = document.getElementById('multiplier-input');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const historyGrid = document.getElementById('history-grid');
const totalRoundsEl = document.getElementById('total-rounds');
const statAvgEl = document.getElementById('stat-avg');
const statProbEl = document.getElementById('stat-prob');

// AI DOM Elements
const aiTargetEl = document.getElementById('ai-target');
const aiConfidenceEl = document.getElementById('ai-confidence');

// Hash Checker DOM Elements
const serverSeedInput = document.getElementById('server-seed');
const clientSeedInput = document.getElementById('client-seed');
const verifyHashBtn = document.getElementById('verify-hash-btn');
const hashResultValue = document.getElementById('hash-result-value');

// Initialize
function init() {
    renderUI();
    registerServiceWorker();
}

// Auto-Submit Logic
inputField.addEventListener('input', function(e) {
    const val = e.target.value;
    // Regex checks if string ends with decimal and exactly two digits
    if (/^\d+\.\d{2}$/.test(val)) {
        addResult(val);
    }
});

function addResult(valueStr) {
    const val = parseFloat(valueStr);
    if (!isNaN(val) && val >= 1.00) {
        sessionHistory.push(val);
        redoStack = []; 
        currentUndoDepth = 0; 
        saveAndRender();
        
        inputField.value = '';
        inputField.focus(); 
    }
}

function undo() {
    if (sessionHistory.length > 0 && currentUndoDepth < MAX_UNDO) {
        const lastEntry = sessionHistory.pop();
        redoStack.push(lastEntry);
        currentUndoDepth++;
        saveAndRender();
    }
}

function redo() {
    if (redoStack.length > 0) {
        const restoredEntry = redoStack.pop();
        sessionHistory.push(restoredEntry);
        currentUndoDepth--;
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem(AVXP_STORAGE_KEY, JSON.stringify(sessionHistory));
    renderUI();
}

function clearSession() {
    if(confirm("Wipe current session data?")) {
        sessionHistory = [];
        redoStack = [];
        currentUndoDepth = 0;
        saveAndRender();
    }
}

function exportData() {
    if(sessionHistory.length === 0) return alert("No data to export.");
    let csvContent = "data:text/csv;charset=utf-8,Round,Multiplier\n";
    sessionHistory.forEach((row, index) => {
        csvContent += `${index + 1},${row}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `avxp_session_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- AI Predictive Engine (Dynamic Volatility Tracker) ---
function runAIEngine() {
    if (sessionHistory.length < 3) {
        aiTargetEl.textContent = "Waiting...";
        aiTargetEl.className = "stat-value";
        aiConfidenceEl.textContent = "Need 3+ Rounds";
        return;
    }

    const recent = sessionHistory.slice(-10);
    const last = recent[recent.length - 1];
    
    // 1. Calculate Current Streak (Highs >= 2.00, Lows < 2.00)
    let isCurrentlyHigh = last >= 2.00;
    let streakCount = 1;
    for (let i = recent.length - 2; i >= 0; i--) {
        if ((recent[i] >= 2.00) === isCurrentlyHigh) {
            streakCount++;
        } else {
            break;
        }
    }

    // 2. Detect 10x+ drop in the last 2 rounds (Algorithm usually pulls back after this)
    const recentHuge = sessionHistory.slice(-2).some(val => val >= 10.00);

    // 3. Calculate 5-round Weighted Momentum
    const last5 = sessionHistory.slice(-5);
    let wmaSum = 0, weightSum = 0;
    for (let i = 0; i < last5.length; i++) {
        wmaSum += last5[i] * (i + 1);
        weightSum += (i + 1);
    }
    const wma = wmaSum / weightSum;

    let aiTarget = 1.00;
    let trend = "";
    let colorClass = "";

    // --- DYNAMIC AI LOGIC TREE ---

    if (recentHuge) {
        // Post-10x defensive play
        aiTarget = 1.15 + (Math.random() * 0.05); 
        trend = "Post-Huge Pullback (High Risk)";
        colorClass = "low";
    } 
    else if (!isCurrentlyHigh && streakCount >= 3) {
        // Deep Cold Streak: Scale the target up as the streak gets longer
        aiTarget = 2.00 + (streakCount * 0.15) - (wma * 0.05);
        trend = `Deep Cold (${streakCount}x) - Aggressive Bounce`;
        colorClass = "high";
    }
    else if (isCurrentlyHigh && streakCount >= 2) {
        // Hot Streak: Drop the target to avoid the sudden crash
        aiTarget = 1.35 - (streakCount * 0.05);
        trend = `Hot Streak (${streakCount}x) - Crash Imminent`;
        colorClass = "low";
    }
    else if (recent.length >= 4 && 
             (recent[recent.length-1] >= 2.0) !== (recent[recent.length-2] >= 2.0) &&
             (recent[recent.length-2] >= 2.0) !== (recent[recent.length-3] >= 2.0)) {
        // Ping-Pong Oscillation
        aiTarget = isCurrentlyHigh ? 1.45 : 2.25; 
        trend = "Ping-Pong Oscillation Tracked";
        colorClass = isCurrentlyHigh ? "low" : "high";
    }
    else {
        // The Core Engine: Dynamic Inverted Momentum
        aiTarget = 3.20 - wma;
        
        if (aiTarget >= 2.00) {
            trend = "Momentum Building (Favorable)";
            colorClass = "high";
        } else if (aiTarget <= 1.50) {
            trend = "Market Cooling (Defensive)";
            colorClass = "low";
        } else {
            trend = "Neutral Volatility";
            colorClass = "neutral";
        }
    }

    // Clamp the final target to realistic boundaries (Min 1.10x, Max 3.50x)
    aiTarget = Math.max(1.10, Math.min(aiTarget, 3.50));

    // Update UI
    aiTargetEl.textContent = aiTarget.toFixed(2) + 'x';
    aiTargetEl.className = `stat-value ${colorClass}`;
    aiConfidenceEl.textContent = trend;
}

// Hash Verifier Engine
async function verifyHash() {
    const server = serverSeedInput.value.trim();
    const client = clientSeedInput.value.trim();
    if (!server) { hashResultValue.textContent = "Missing Seed"; return; }

    const combinedString = client ? `${server}:${client}` : server;

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(combinedString);
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const hexPortion = hashHex.substring(0, 13);
        const decimalValue = parseInt(hexPortion, 16);
        
        const max = Math.pow(2, 52);
        let multiplier = (max / (decimalValue + 1)) * 0.97;
        multiplier = Math.floor(multiplier * 100) / 100;
        
        const finalResult = Math.max(1.00, multiplier);
        hashResultValue.textContent = finalResult.toFixed(2) + 'x';
    } catch (e) {
        hashResultValue.textContent = "Error calculating";
    }
}

// Calculate and Render UI
function renderUI() {
    historyGrid.innerHTML = '';
    totalRoundsEl.textContent = sessionHistory.length;
    
    const reversedHistory = [...sessionHistory].reverse();
    reversedHistory.forEach(mult => {
        const div = document.createElement('div');
        
        // Dynamic Color Logic
        let colorClass = 'low'; 
        if (mult >= 10.00) {
            colorClass = 'huge'; // Red
        } else if (mult >= 2.00) {
            colorClass = 'high'; // Purple
        }

        div.className = `history-item ${colorClass}`;
        div.textContent = mult.toFixed(2) + 'x';
        historyGrid.appendChild(div);
    });

    undoBtn.disabled = sessionHistory.length === 0 || currentUndoDepth >= MAX_UNDO;
    redoBtn.disabled = redoStack.length === 0;

    if (sessionHistory.length > 0) {
        const recent = sessionHistory.slice(-10);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        statAvgEl.textContent = avg.toFixed(2) + 'x';

        const wins = sessionHistory.filter(m => m >= 2.00).length;
        const trendProb = (wins / sessionHistory.length) * 100;
        statProbEl.textContent = trendProb.toFixed(1) + '%';
    } else {
        statAvgEl.textContent = '--';
        statProbEl.textContent = '--';
    }

    runAIEngine();
}

// Event Listeners
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
resetBtn.addEventListener('click', clearSession);
exportBtn.addEventListener('click', exportData);
verifyHashBtn.addEventListener('click', verifyHash);

// Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .catch(err => console.log('Service Worker Failed:', err));
        });
    }
}

init();
