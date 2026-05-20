export async function fetchAnalysis(coinId, includeAi) {
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinId, includeAi })
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan sistem');
    }

    return data;
}
