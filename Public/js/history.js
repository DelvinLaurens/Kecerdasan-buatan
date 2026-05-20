const SEARCH_HISTORY_KEY = 'cryptolio.searchHistory';
const MAX_HISTORY_ITEMS = 8;

export function createSearchHistory({ historyPanel, historyList, coinInput, onSelect }) {
    function getSearchHistory() {
        try {
            const value = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
            return Array.isArray(value) ? value.filter(Boolean) : [];
        } catch (error) {
            return [];
        }
    }

    function saveSearchHistory(coinIds) {
        const normalizedCoinIds = coinIds
            .map((coinId) => String(coinId || '').trim().toLowerCase())
            .filter(Boolean);
        const nextHistory = [...normalizedCoinIds, ...getSearchHistory()]
            .filter((coinId, index, coinIdsList) => coinIdsList.indexOf(coinId) === index)
            .slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
        renderSearchHistory();
    }

    function clearSearchHistory() {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        renderSearchHistory();
    }

    function renderSearchHistory() {
        const history = getSearchHistory();

        historyList.innerHTML = '';
        historyPanel.classList.toggle('hidden', history.length === 0);

        history.forEach((coinId) => {
            const chip = document.createElement('button');
            chip.className = 'history-chip';
            chip.type = 'button';
            chip.innerText = coinId;
            chip.addEventListener('click', () => {
                coinInput.value = coinId;
                onSelect(coinId);
            });

            historyList.appendChild(chip);
        });
    }

    return {
        clearSearchHistory,
        renderSearchHistory,
        saveSearchHistory
    };
}
