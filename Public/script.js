import { fetchAnalysis } from './js/api.js';
import { renderCompareResults } from './js/compare.js';
import { createSearchHistory } from './js/history.js';
import { createNotificationController } from './js/notifications.js';
import { displayResult } from './js/singleResult.js';

const btnAnalyze = document.getElementById('btn-analyze');
const btnCompare = document.getElementById('btn-compare');
const btnClearHistory = document.getElementById('btn-clear-history');
const coinInput = document.getElementById('coin-input');
const loader = document.getElementById('loader');
const notification = document.getElementById('notification');
const resultContainer = document.getElementById('result-container');
const compareContainer = document.getElementById('compare-container');
const compareGrid = document.getElementById('compare-grid');
const compareCount = document.getElementById('compare-count');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const coinImage = document.getElementById('res-image');
const analysisSignals = document.getElementById('analysis-signals');
const analysisWatchlist = document.getElementById('analysis-watchlist');

const notifications = createNotificationController(notification);
const searchHistory = createSearchHistory({
    historyPanel,
    historyList,
    coinInput,
    onSelect: analyzeSingleCoin
});

coinInput.focus();
searchHistory.renderSearchHistory();

coinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') btnAnalyze.click();
});

btnAnalyze.addEventListener('click', async () => {
    const coinIds = parseCoinInput();

    if (coinIds.length === 0) {
        notifications.showNotification('Silakan masukkan ID koin. Contoh: bitcoin, ethereum, cardano.');
        coinInput.focus();
        return;
    }

    await analyzeSingleCoin(coinIds[0]);
});

btnCompare.addEventListener('click', async () => {
    const coinIds = parseCoinInput();

    if (coinIds.length < 2) {
        notifications.showNotification('Masukkan 2-3 koin dipisahkan koma. Contoh: bitcoin, ethereum, solana.');
        coinInput.focus();
        return;
    }

    if (coinIds.length > 3) {
        notifications.showNotification('Compare maksimal 3 koin agar hasil tetap mudah dibaca.');
        coinInput.focus();
        return;
    }

    await compareCoins(coinIds);
});

btnClearHistory.addEventListener('click', () => {
    searchHistory.clearSearchHistory();
});

async function analyzeSingleCoin(coinId) {
    resultContainer.classList.add('hidden');
    compareContainer.classList.add('hidden');
    notifications.hideNotification();
    setLoading(true, 'Analyzing...');

    try {
        const data = await fetchAnalysis(coinId, true);

        displayResult(data, {
            resultContainer,
            coinImage,
            analysisSignals,
            analysisWatchlist
        });
        searchHistory.saveSearchHistory([data.id || coinId]);
    } catch (error) {
        notifications.showNotification(error.message);
    } finally {
        setLoading(false);
    }
}

async function compareCoins(coinIds) {
    resultContainer.classList.add('hidden');
    compareContainer.classList.add('hidden');
    notifications.hideNotification();
    setLoading(true, 'Comparing...');

    try {
        const results = await Promise.all(coinIds.map((coinId) => fetchAnalysis(coinId, false)));

        renderCompareResults(results, {
            compareGrid,
            compareCount,
            compareContainer
        });
        searchHistory.saveSearchHistory(results.map((coin) => coin.id).filter(Boolean));
    } catch (error) {
        notifications.showNotification(error.message);
    } finally {
        setLoading(false);
    }
}

function parseCoinInput() {
    return coinInput.value
        .split(/[,;\n]+/)
        .map((coinId) => coinId.trim().toLowerCase())
        .filter(Boolean)
        .filter((coinId, index, coinIds) => coinIds.indexOf(coinId) === index);
}

function setLoading(isLoading, label = 'Analyze') {
    loader.classList.toggle('hidden', !isLoading);
    btnAnalyze.disabled = isLoading;
    btnCompare.disabled = isLoading;
    btnAnalyze.innerText = isLoading ? label : 'Analyze';
    btnCompare.innerText = isLoading ? 'Wait...' : 'Compare';
}
