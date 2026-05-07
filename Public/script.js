const btnAnalyze = document.getElementById('btn-analyze');
const coinInput = document.getElementById('coin-input');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');
const coinImage = document.getElementById('res-image');
const analysisSignals = document.getElementById('analysis-signals');
const analysisWatchlist = document.getElementById('analysis-watchlist');

const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

const compactUsdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
});

coinInput.focus();

coinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') btnAnalyze.click();
});

btnAnalyze.addEventListener('click', async () => {
    const coinId = coinInput.value.toLowerCase().trim();

    if (!coinId) {
        alert('Silakan masukkan ID koin (contoh: bitcoin, ethereum, cardano)');
        return;
    }

    resultContainer.classList.add('hidden');
    loader.classList.remove('hidden');
    btnAnalyze.disabled = true;
    btnAnalyze.innerText = 'Analyzing...';

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coinId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan sistem');
        }

        displayResult(data);
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        loader.classList.add('hidden');
        btnAnalyze.disabled = false;
        btnAnalyze.innerText = 'Analyze';
    }
});

function displayResult(data) {
    setText('res-name', `${data.name} (${data.symbol})`);
    setText('res-price', usdFormatter.format(data.price || 0));
    setText('res-marketcap', compactUsdFormatter.format(data.marketCap || 0));
    setText('res-volume', compactUsdFormatter.format(data.volume || 0));
    setText('res-change', `${Number(data.change24h || 0).toFixed(2)}%`);
    setText('res-risk-score', data.riskScore);
    setText('res-risk-level', data.riskLevel);
    setText('res-sentiment', data.sentiment);
    setText('analysis-headline', data.analysis?.headline || 'Analisis siap dibaca');
    setText('res-explanation', getAnalysisText(data));
    setText('analysis-verdict', data.analysis?.verdict || '');
    setText('res-rank', data.rank ? `#${data.rank}` : '#-');

    if (coinImage) {
        coinImage.src = data.image || '';
        coinImage.alt = data.name ? `${data.name} logo` : '';
        coinImage.classList.toggle('hidden', !data.image);
    }

    renderSignals(data.analysis?.signals || []);
    renderWatchlist(data.analysis?.watchlist || []);

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

    resultContainer.classList.remove('hidden');
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function renderSignals(signals) {
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

function renderWatchlist(items) {
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

function getRiskColor(score) {
    if (score <= 35) return '#10b981';
    if (score <= 70) return '#f59e0b';
    return '#ef4444';
}
