// --- avxp Engine ---
const AVXP_STORAGE_KEY = 'avxp_session_history';
let sessionHistory = JSON.parse(localStorage.getItem(AVXP_STORAGE_KEY)) || [];

// DOM Elements
const inputField = document.getElementById('multiplier-input');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const historyGrid = document.getElementById('history-grid');
const totalRoundsEl = document.getElementById('total-rounds');
const statAvgEl = document.getElementById('stat-avg');
const statFreqEl = document.getElementById('stat-freq');

// Initialize
function init() {
    renderUI();
    registerServiceWorker();
}

// Add Result Function
function addResult() {
    const val = parseFloat(inputField.value);
    if (!isNaN(val) && val >= 1.00) {
        sessionHistory.push(val);
        localStorage.setItem(AVXP_STORAGE_KEY, JSON.stringify(sessionHistory));
        inputField.value = '';
        inputField.focus(); // Keep focus for rapid entry
        renderUI();
    }
}

// Clear Session Function
function clearSession() {
    if(confirm("Wipe current session data?")) {
        sessionHistory = [];
        localStorage.removeItem(AVXP_STORAGE_KEY);
        renderUI();
    }
}

// Export Data to CSV
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

// Calculate and Render
function renderUI() {
    // 1. Render History Grid
    historyGrid.innerHTML = '';
    totalRoundsEl.textContent = sessionHistory.length;
    
    // Display latest first
    const reversedHistory = [...sessionHistory].reverse();
    reversedHistory.forEach(mult => {
        const div = document.createElement('div');
        div.className = `history-item ${mult >= 2.00 ? 'high' : 'low'}`;
        div.textContent = mult.toFixed(2) + 'x';
        historyGrid.appendChild(div);
    });

    // 2. Calculate Indicators
    if (sessionHistory.length > 0) {
        // 10-Round Average
        const recent = sessionHistory.slice(-10);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        statAvgEl.textContent = avg.toFixed(2) + 'x';

        // 2.0x Frequency
        const wins = sessionHistory.filter(m => m >= 2.00).length;
        const freq = (wins / sessionHistory.length) * 100;
        statFreqEl.textContent = freq.toFixed(1) + '%';
    } else {
        statAvgEl.textContent = '--';
        statFreqEl.textContent = '--';
    }
}

// Event Listeners
addBtn.addEventListener('click', addResult);
resetBtn.addEventListener('click', clearSession);
exportBtn.addEventListener('click', exportData);
inputField.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addResult();
});

// PWA Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('avxp Service Worker Registered'))
                .catch(err => console.log('Service Worker Failed:', err));
        });
    }
}

init();
