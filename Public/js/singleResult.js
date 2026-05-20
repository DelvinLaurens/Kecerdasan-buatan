import {
    formatAthDistance,
    formatCompactUsd,
    formatDominance,
    formatUsdPrice,
    getRiskColor
} from './formatters.js';

export function displayResult(data, elements) {
    const { resultContainer, coinImage, analysisSignals, analysisWatchlist } = elements;
    const riskFactors = data.riskFactors || {};

    setText('res-name', `${data.name} (${data.symbol})`);
    setText('res-price', formatUsdPrice(data.price));
    setText('res-marketcap', formatCompactUsd(data.marketCap));
    setText('res-volume', formatCompactUsd(data.volume));
    setText('res-change', `${Number(data.change24h || 0).toFixed(2)}%`);
    setText('res-risk-score', data.riskScore);
    setText('res-risk-level', data.riskLevel);
    setText('res-sentiment', data.sentiment);
    setText('analysis-headline', data.analysis?.headline || 'Analisis siap dibaca');
    setText('res-explanation', getAnalysisText(data));
    setText('analysis-verdict', data.analysis?.verdict || '');
    setText('res-rank', data.rank ? `#${data.rank}` : '#-');
    setText('res-ath-distance', formatAthDistance(riskFactors.athDistance));
    setText('res-dominance', formatDominance(riskFactors.dominance));
    setText('res-volume-signal', riskFactors.volumeSignal || '-');

    if (coinImage) {
        coinImage.src = data.image || '';
        coinImage.alt = data.name ? `${data.name} logo` : '';
        coinImage.classList.toggle('hidden', !data.image);
    }

    renderSignals(analysisSignals, data.analysis?.signals || []);
    renderWatchlist(analysisWatchlist, data.analysis?.watchlist || []);
    updateStatusColors(data);

    resultContainer.classList.remove('hidden');
}

function updateStatusColors(data) {
    const riskBadge = document.getElementById('res-risk-level');
    const riskCircle = document.querySelector('.risk-circle');
    const changeEl = document.getElementById('res-change');
    const sentEl = document.getElementById('res-sentiment');
    const color = getRiskColor(data.riskScore);

    if (riskBadge) riskBadge.style.backgroundColor = color;
    if (riskCircle) riskCircle.style.borderColor = color;
    if (changeEl) changeEl.style.color = Number(data.change24h || 0) >= 0 ? '#10b981' : '#ef4444';

    if (sentEl) {
        if (data.sentiment === 'Bullish') sentEl.style.color = '#10b981';
        else if (data.sentiment === 'Bearish') sentEl.style.color = '#ef4444';
        else sentEl.style.color = '#94a3b8';
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function renderSignals(analysisSignals, signals) {
    if (!analysisSignals) return;

    analysisSignals.innerHTML = '';

    signals.forEach((signal) => {
        const item = document.createElement('div');
        item.className = `signal-item ${signal.tone || 'neutral'}`;

        const label = document.createElement('span');
        label.className = 'signal-label';
        label.innerText = signal.label || 'Signal';

        const text = document.createElement('p');
        text.innerText = signal.text || '';

        item.append(label, text);
        analysisSignals.appendChild(item);
    });
}

function renderWatchlist(analysisWatchlist, items) {
    if (!analysisWatchlist) return;

    analysisWatchlist.innerHTML = '';

    items.forEach((itemText) => {
        const item = document.createElement('li');
        item.innerText = itemText;
        analysisWatchlist.appendChild(item);
    });
}

function getAnalysisText(data) {
    if (data.analysis?.summary) return stripTrailingDisclaimer(data.analysis.summary);

    if (data.explanation) return stripTrailingDisclaimer(data.explanation);

    if (data.analysis) {
        return stripTrailingDisclaimer([data.analysis.summary, data.analysis.verdict].filter(Boolean).join(' '));
    }

    return 'Analisis belum tersedia, tetapi data pasar berhasil dimuat. Bukan financial advice.';
}

function stripTrailingDisclaimer(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\s,.;:-]*bukan financial advice\.?$/i, '')
        .trim();
}
