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

// --- AI Predictive Engine (Structural Pattern Recognizer) ---
function runAIEngine() {
    if (sessionHistory.length < 3) {
        aiTargetEl.textContent = "Waiting...";
        aiTargetEl.className = "stat-value";
        aiConfidenceEl.textContent = "Need 3+ Rounds";
        return;
    }

    const recent = sessionHistory.slice(-5);
    const last = recent[recent.length - 1];   
    const prev1 = recent[recent.length - 2];  
    const prev2 = recent[recent.length - 3];  
    
    const isHigh = (val) => val >= 2.00;
    const isLow = (val) => val < 2.00;

    let aiTarget = 1.00;
    let trend = "";
    let colorClass = "";

    // 1. Alternating "Ping-Pong" Patterns
    if (isLow(last) && isHigh(prev1) && isLow(prev2)) {
        aiTarget = 2.00; 
        trend = "Ping-Pong Pattern Found";
        colorClass = "high"; 
    } else if (isHigh(last) && isLow(prev1) && isHigh(prev2)) {
        aiTarget = 1.20; 
        trend = "Ping-Pong Pattern Found";
        colorClass = "low"; 
    }
    // 2. Streak Detection
    else if (isLow(last) && isLow(prev1) && isLow(prev2)) {
        aiTarget = 2.00;
        trend = "Cold Streak (Bounce Expected)";
        colorClass = "high"; 
    } else if (isHigh(last) && isHigh(prev1) && isHigh(prev2)) {
        aiTarget = 1.50;
        trend = "Riding Hot Streak";
        colorClass = "neutral"; 
    }
    // 3. Reversal Traps
    else if (isHigh(last) && isLow(prev1) && isLow(prev2)) {
        aiTarget = 2.00;
        trend = "Upward Reversal Started";
        colorClass = "high"; 
    } else if (isLow(last) && isHigh(prev1) && isHigh(prev2)) {
        aiTarget = 1.20;
        trend = "Downward Reversal Started";
        colorClass = "low"; 
    }
    // 4. Default Fallback (Weighted Momentum)
    else {
        let wmaSum = 0, weightSum = 0;
        for (let i = 0; i < recent.length; i++) {
            wmaSum += recent[i] * (i + 1);
            weightSum += (i + 1);
        }
        const wma = wmaSum / weightSum;

        if (wma >= 2.00) {
            aiTarget = 1.30;
            trend = "General Cooling Phase";
            colorClass = "low";
        } else {
            aiTarget = 1.80;
            trend = "Building Momentum";
            colorClass = "neutral";
        }
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
