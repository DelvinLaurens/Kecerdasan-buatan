const compactUsdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
});

export function formatCompactUsd(value) {
    return compactUsdFormatter.format(value || 0);
}

export function formatUsdPrice(value) {
    const price = Number(value);

    if (!Number.isFinite(price)) return '-';
    if (price === 0) return '$0';

    const absPrice = Math.abs(price);
    let maximumFractionDigits = 2;

    if (absPrice < 0.000001) maximumFractionDigits = 12;
    else if (absPrice < 0.0001) maximumFractionDigits = 8;
    else if (absPrice < 0.01) maximumFractionDigits = 6;
    else if (absPrice < 1) maximumFractionDigits = 4;

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: absPrice >= 1 ? 2 : 0,
        maximumFractionDigits
    }).format(price);
}

export function formatAthDistance(value) {
    if (value === null || value === undefined || value === '') return '-';

    const distance = Number(value);

    if (!Number.isFinite(distance)) return '-';
    if (distance <= 0.01) return 'Near ATH';

    return `${distance.toFixed(2)}% below ATH`;
}

export function formatDominance(value) {
    if (value === null || value === undefined || value === '') return '-';

    const dominance = Number(value);

    if (!Number.isFinite(dominance)) return '-';

    return `${dominance.toFixed(dominance >= 1 ? 2 : 4)}%`;
}

export function getRiskColor(score) {
    if (score <= 35) return '#10b981';
    if (score <= 70) return '#f59e0b';
    return '#ef4444';
}
