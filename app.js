// --- avxp Engine ---
const AVXP_STORAGE_KEY = 'avxp_session_history';
let sessionHistory = JSON.parse(localStorage.getItem(AVXP_STORAGE_KEY)) || [];

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
    if (/^\d+\.\d{2}$/.test(val)) {
        addResult(val);
    }
});

// Add Result Function
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

// --- AI Predictive Engine ---
function runAIEngine() {
    if (sessionHistory.length < 3) {
        aiTargetEl.textContent = "Waiting...";
        aiTargetEl.className = "stat-value";
        aiConfidenceEl.textContent = "Need 3+ Rounds";
        return;
    }

    // Look at the last 10 rounds for pattern analysis
    const recent = sessionHistory.slice(-10);
    const n = recent.length;
    
    // Calculate Mean & Variance (Volatility)
    const mean = recent.reduce((a, b) => a + b, 0) / n;
    const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    
    // Calculate Weighted Moving Average (favors most recent rounds)
    let wmaSum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
        const weight = i + 1; // More weight to newer entries
        wmaSum += recent[i] * weight;
        weightSum += weight;
    }
    const wma = wmaSum / weightSum;

    // AI Decision Logic
    let aiTarget = 1.00;
    let trend = "";
    let colorClass = "";

    if (wma < 1.40 && variance < 1.5) {
        // Prolonged cold streak - AI predicts impending algorithm correction
        aiTarget = 2.00; 
        trend = "Bullish Reversal Expected";
        colorClass = "high";
    } else if (wma > 2.50) {
        // High recent payouts - AI advises caution as RTP cools down
        aiTarget = 1.20; 
        trend = "Cooling Phase (High Risk)";
        colorClass = "low";
    } else {
        // Normal volatility
        aiTarget = 1.50; 
        trend = "Neutral Volatility";
        colorClass = "neutral";
    }

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
        div.className = `history-item ${mult >= 2.00 ? 'high' : 'low'}`;
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

    // Run the AI Prediction Engine
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
