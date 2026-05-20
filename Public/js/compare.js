import {
    formatAthDistance,
    formatCompactUsd,
    formatDominance,
    formatUsdPrice,
    getRiskColor
} from './formatters.js';

export function renderCompareResults(results, elements) {
    const { compareGrid, compareCount, compareContainer } = elements;

    compareGrid.innerHTML = '';
    compareCount.innerText = `${results.length} coin`;

    results.forEach((coin) => {
        compareGrid.appendChild(createCompareCard(coin));
    });

    compareContainer.classList.remove('hidden');
}

function createCompareCard(data) {
    const riskFactors = data.riskFactors || {};
    const card = document.createElement('article');
    card.className = 'card compare-card';

    const header = document.createElement('div');
    header.className = 'compare-card-header';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'compare-name';

    const image = document.createElement('img');
    image.className = 'compare-image';
    image.src = data.image || '';
    image.alt = data.name ? `${data.name} logo` : '';
    image.classList.toggle('hidden', !data.image);

    const titleWrap = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'label';
    label.innerText = data.symbol || '-';

    const title = document.createElement('h3');
    title.innerText = data.name || 'Unknown Coin';

    titleWrap.append(label, title);
    nameWrap.append(image, titleWrap);

    const rank = document.createElement('span');
    rank.className = 'rank-pill';
    rank.innerText = data.rank ? `#${data.rank}` : '#-';

    header.append(nameWrap, rank);

    const priceLabel = document.createElement('span');
    priceLabel.className = 'label';
    priceLabel.innerText = 'Harga';

    const price = document.createElement('div');
    price.className = 'compare-price';
    price.innerText = formatUsdPrice(data.price);

    const riskRow = document.createElement('div');
    riskRow.className = 'compare-risk-row';

    const riskScore = document.createElement('div');
    riskScore.className = 'compare-risk-score';
    riskScore.style.borderColor = getRiskColor(data.riskScore);
    riskScore.innerText = data.riskScore;

    const riskLevel = document.createElement('div');
    riskLevel.className = 'compare-risk-level';
    riskLevel.style.backgroundColor = getRiskColor(data.riskScore);
    riskLevel.innerText = data.riskLevel || '-';

    riskRow.append(riskScore, riskLevel);

    const metrics = document.createElement('div');
    metrics.className = 'compare-metrics';
    metrics.append(
        createMetric('24h Change', `${Number(data.change24h || 0).toFixed(2)}%`, Number(data.change24h || 0) >= 0 ? '#10b981' : '#ef4444'),
        createMetric('Market Cap', formatCompactUsd(data.marketCap)),
        createMetric('Volume', formatCompactUsd(data.volume)),
        createMetric('Sentiment', data.sentiment || '-')
    );

    const factors = document.createElement('div');
    factors.className = 'compare-factors';
    factors.append(
        createFactorRow('ATH Distance', formatAthDistance(riskFactors.athDistance)),
        createFactorRow('Dominance', formatDominance(riskFactors.dominance)),
        createFactorRow('Volume Signal', riskFactors.volumeSignal || '-')
    );

    card.append(header, priceLabel, price, riskRow, metrics, factors);

    return card;
}

function createMetric(label, value, color) {
    const metric = document.createElement('div');
    metric.className = 'metric';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.innerText = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'value-sm';
    valueEl.innerText = value;
    if (color) valueEl.style.color = color;

    metric.append(labelEl, valueEl);

    return metric;
}

function createFactorRow(label, value) {
    const row = document.createElement('div');
    row.className = 'factor-row';

    const labelEl = document.createElement('span');
    labelEl.innerText = label;

    const valueEl = document.createElement('strong');
    valueEl.innerText = value;

    row.append(labelEl, valueEl);

    return row;
}
