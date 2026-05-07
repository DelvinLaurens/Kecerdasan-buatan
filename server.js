const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const ENV_PATH = path.join(__dirname, 'secret.env');
const PUBLIC_DIR = path.join(__dirname, 'Public');

dotenv.config({ path: ENV_PATH });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_FALLBACK_MODELS = process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-flash-latest';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || process.env.CG_API_KEY || '';
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';

function looksLikeGeminiKey(value = '') {
    return value.startsWith('AIza');
}

function looksLikeOpenAiKey(value = '') {
    return value.startsWith('sk-');
}

function getLlmConfig() {
    const openAiKey = process.env.OPENAI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || (looksLikeGeminiKey(openAiKey) ? openAiKey : '');
    const geminiModels = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.split(',')]
        .map((model) => model.trim())
        .filter(Boolean)
        .filter((model, index, models) => models.indexOf(model) === index);

    if (geminiKey) {
        return {
            provider: 'gemini',
            apiKey: geminiKey,
            model: geminiModels[0],
            models: geminiModels
        };
    }

    if (looksLikeOpenAiKey(openAiKey)) {
        return {
            provider: 'openai',
            apiKey: openAiKey,
            model: OPENAI_MODEL
        };
    }

    return {
        provider: 'none',
        apiKey: '',
        model: ''
    };
}

function buildAnalysisPrompt({ coin, riskScore, riskLevel, reasons, change24h, rank, liquidity, sentiment, marketCap, volume }) {
    return [
        'Kamu menulis analisis risiko crypto untuk aplikasi edukasi bernama Cryptolio AI.',
        'Gaya bahasa: natural, tajam, dan spesifik seperti analis pasar yang menjelaskan ke pemula cerdas.',
        'Jangan terdengar seperti template. Hindari pembuka seperti "Berdasarkan data", "Koin ini memiliki risiko", atau "Analisis Cryptolio".',
        'Gunakan hanya data yang diberikan. Jangan mengarang berita, narasi proyek, atau fundamental yang tidak ada di data.',
        'Jangan memberi instruksi beli, jual, entry, exit, take profit, atau stop loss.',
        'Balas hanya JSON valid tanpa markdown, tanpa komentar, dan tanpa teks tambahan.',
        'Schema JSON:',
        '{"headline":"maksimal 9 kata","summary":"2 kalimat yang spesifik ke angka koin ini","signals":[{"label":"Volatilitas","tone":"positive|neutral|warning|danger","text":"1 kalimat pendek"},{"label":"Ukuran pasar","tone":"positive|neutral|warning|danger","text":"1 kalimat pendek"},{"label":"Likuiditas","tone":"positive|neutral|warning|danger","text":"1 kalimat pendek"}],"watchlist":["hal yang perlu dipantau 1","hal yang perlu dipantau 2"],"verdict":"1 kalimat penutup yang diakhiri persis dengan: Bukan financial advice."}',
        '',
        `Koin: ${coin.name} (${coin.symbol.toUpperCase()})`,
        `Harga saat ini: $${coin.current_price}`,
        `Market cap: $${marketCap}`,
        `Volume 24 jam: $${volume}`,
        `Market cap rank: ${rank || 'tidak tersedia'}`,
        `Perubahan 24 jam: ${change24h.toFixed(2)}%`,
        `Likuiditas volume/market cap: ${liquidity.toFixed(4)}`,
        `Skor risiko algoritma: ${riskScore}/100`,
        `Level risiko: ${riskLevel}`,
        `Sentimen pasar: ${sentiment}`,
        `Alasan algoritma: ${reasons.join(', ')}`
    ].join('\n');
}

async function generateWithGemini(prompt, config, model = config.model) {
    const generationConfig = {
        temperature: 0.35,
        maxOutputTokens: 900
    };

    if (model.startsWith('gemini-2.5')) {
        generationConfig.thinkingConfig = {
            thinkingBudget: 0
        };
    }

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': config.apiKey
            },
            timeout: 30000
        }
    );

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();
    const finishReason = response.data?.candidates?.[0]?.finishReason;

    if (!text) {
        throw new Error('Gemini tidak mengembalikan teks.');
    }

    if (finishReason === 'MAX_TOKENS' && !/bukan financial advice/i.test(text)) {
        throw new Error(`Output Gemini dari model ${model} kepotong karena batas token.`);
    }

    return text;
}

async function generateWithOpenAi(prompt, config) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: config.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.35,
            max_tokens: 700
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            timeout: 30000
        }
    );

    const text = response.data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
        throw new Error('OpenAI tidak mengembalikan teks.');
    }

    return text;
}

async function generateExplanation(prompt) {
    const config = getLlmConfig();

    if (config.provider === 'none') {
        throw new Error('LLM API key belum ditemukan. Isi GEMINI_API_KEY atau OPENAI_API_KEY di secret.env.');
    }

    if (config.provider === 'gemini') {
        let lastError;

        for (const model of config.models) {
            try {
                return {
                    text: await generateWithGemini(prompt, config, model),
                    provider: config.provider,
                    model,
                    connected: true
                };
            } catch (error) {
                lastError = error;
                console.log(`Warning: Gemini model ${model} gagal. Detail: ${getAxiosErrorMessage(error)}`);
            }
        }

        throw lastError;
    }

    return {
        text: await generateWithOpenAi(prompt, config),
        provider: config.provider,
        model: config.model,
        connected: true
    };
}

function buildFallbackExplanation({ coin, riskScore, riskLevel, reasons }) {
    return `Analisis Cryptolio: Berdasarkan algoritma kami, ${coin.name} memiliki risiko ${riskLevel}. Alasan utamanya adalah: ${reasons.join(', ')}. Skor risiko Anda adalah ${riskScore}/100. Bukan financial advice.`;
}

function ensureDisclaimer(text) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    const body = stripTrailingDisclaimer(cleanText);

    if (!body) {
        return 'Bukan financial advice.';
    }

    return `${/[.!?]$/.test(body) ? body : `${body}.`} Bukan financial advice.`;
}

function stripTrailingDisclaimer(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\s,.;:-]*bukan financial advice\.?$/i, '')
        .trim();
}

function normalizeExplanation(text) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
        throw new Error('LLM mengembalikan teks kosong.');
    }

    if (cleanText.length < 80) {
        throw new Error('LLM mengembalikan teks terlalu pendek.');
    }

    return ensureDisclaimer(cleanText);
}

function getToneByRiskScore(score) {
    if (score <= 35) return 'positive';
    if (score <= 70) return 'warning';
    return 'danger';
}

function getVolatilityTone(change24h) {
    const volatility = Math.abs(change24h);

    if (volatility <= 7) return 'positive';
    if (volatility <= 15) return 'warning';
    return 'danger';
}

function getRankTone(rank) {
    if (!rank) return 'warning';
    if (rank <= 50) return 'positive';
    if (rank <= 200) return 'neutral';
    return 'danger';
}

function getLiquidityTone(liquidity) {
    if (liquidity >= 0.02) return 'positive';
    if (liquidity >= 0.005) return 'neutral';
    if (liquidity >= 0.001) return 'warning';
    return 'danger';
}

function buildFallbackAnalysis({ coin, riskScore, riskLevel, reasons, change24h, rank, liquidity }) {
    const rankText = rank ? `rank #${rank}` : 'rank pasar belum tersedia';
    const directionText = change24h >= 0 ? 'menguat' : 'melemah';

    return {
        headline: `${coin.name} terlihat ${riskLevel.split(' ')[0].toLowerCase()}`,
        summary: `${coin.name} bergerak ${directionText} ${Math.abs(change24h).toFixed(2)}% dalam 24 jam, dengan ${rankText} dan skor risiko ${riskScore}/100. Faktor yang paling terasa adalah ${reasons.join(', ').toLowerCase()}, jadi pembacaan risikonya masih perlu dibandingkan dengan kondisi pasar terbaru.`,
        signals: [
            {
                label: 'Volatilitas',
                tone: getVolatilityTone(change24h),
                text: `Perubahan 24 jam sebesar ${change24h.toFixed(2)}% membuat pergerakannya ${Math.abs(change24h) > 7 ? 'perlu lebih diawasi' : 'masih relatif tenang'}.`
            },
            {
                label: 'Ukuran pasar',
                tone: getRankTone(rank),
                text: rank ? `Posisi market cap #${rank} membantu membaca seberapa mapan koin ini dibanding pasar luas.` : 'Rank pasar belum tersedia, jadi ukuran pasarnya perlu dicek lagi.'
            },
            {
                label: 'Likuiditas',
                tone: getLiquidityTone(liquidity),
                text: `Rasio volume terhadap market cap berada di ${liquidity.toFixed(4)}, yang memberi gambaran seberapa ramai transaksinya.`
            }
        ],
        watchlist: [
            'Pantau apakah perubahan 24 jam melebar di atas 7%.',
            'Bandingkan volume harian dengan market cap sebelum menyimpulkan kekuatan tren.'
        ],
        verdict: ensureDisclaimer(`Untuk pemula, ${coin.name} lebih cocok dibaca sebagai bahan observasi risiko daripada sinyal keputusan instan.`)
    };
}

function extractJsonObject(text) {
    const cleanText = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    try {
        return JSON.parse(cleanText);
    } catch (error) {
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');

        if (start === -1 || end === -1 || end <= start) {
            throw error;
        }

        return JSON.parse(cleanText.slice(start, end + 1));
    }
}

function cleanShortText(value, fallback, maxLength = 220) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();

    if (!text) return fallback;
    return text.slice(0, maxLength).trim();
}

function normalizeTone(tone, fallbackTone) {
    const cleanTone = String(tone || '').toLowerCase();
    const validTones = ['positive', 'neutral', 'warning', 'danger'];

    return validTones.includes(cleanTone) ? cleanTone : fallbackTone;
}

function normalizeAnalysis(rawAnalysis, fallbackAnalysis) {
    const rawSignals = Array.isArray(rawAnalysis?.signals) ? rawAnalysis.signals : [];
    const fallbackSignals = fallbackAnalysis.signals;
    const signals = fallbackSignals.map((fallbackSignal, index) => {
        const signal = rawSignals[index] || {};

        return {
            label: cleanShortText(signal.label, fallbackSignal.label, 32),
            tone: normalizeTone(signal.tone, fallbackSignal.tone),
            text: cleanShortText(signal.text, fallbackSignal.text, 180)
        };
    });
    const rawWatchlist = Array.isArray(rawAnalysis?.watchlist) ? rawAnalysis.watchlist : [];
    const watchlist = rawWatchlist
        .map((item) => cleanShortText(item, '', 140))
        .filter(Boolean)
        .slice(0, 2);

    while (watchlist.length < 2) {
        watchlist.push(fallbackAnalysis.watchlist[watchlist.length]);
    }

    return {
        headline: cleanShortText(rawAnalysis?.headline, fallbackAnalysis.headline, 80),
        summary: stripTrailingDisclaimer(cleanShortText(rawAnalysis?.summary, fallbackAnalysis.summary, 360)),
        signals,
        watchlist,
        verdict: ensureDisclaimer(cleanShortText(rawAnalysis?.verdict, fallbackAnalysis.verdict, 220))
    };
}

function buildExplanationFromAnalysis(analysis) {
    return stripTrailingDisclaimer(analysis.summary);
}

function getMarketSentiment(change24h, riskScore) {
    if (change24h >= 3 && riskScore <= 70) return 'Bullish';
    if (change24h <= -3 || riskScore > 70) return 'Bearish';
    return 'Neutral';
}

function getCoinGeckoParams(params) {
    if (!COINGECKO_API_KEY) return params;

    return {
        ...params,
        x_cg_demo_api_key: COINGECKO_API_KEY
    };
}

function getCoinGeckoHeaders() {
    return COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {};
}

function normalizeCoinText(value) {
    return String(value || '').trim().toLowerCase();
}

function sortCoinSearchCandidates(coins, query) {
    const normalizedQuery = normalizeCoinText(query);

    return coins
        .filter((coin) => coin?.id)
        .map((coin) => {
            const id = normalizeCoinText(coin.id);
            const symbol = normalizeCoinText(coin.symbol);
            const name = normalizeCoinText(coin.name);
            const rank = Number(coin.market_cap_rank) || Number.MAX_SAFE_INTEGER;
            let score = rank;

            if (id === normalizedQuery) score -= 10000;
            if (symbol === normalizedQuery) score -= 9000;
            if (name === normalizedQuery) score -= 8000;
            if (id.includes(normalizedQuery)) score -= 1000;
            if (symbol.includes(normalizedQuery)) score -= 800;
            if (name.includes(normalizedQuery)) score -= 600;

            return { ...coin, score };
        })
        .sort((a, b) => a.score - b.score);
}

async function fetchCoinMarketsByIds(coinIds) {
    const ids = Array.isArray(coinIds) ? coinIds.filter(Boolean).join(',') : coinIds;

    if (!ids) return [];

    const response = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
        params: getCoinGeckoParams({
            vs_currency: 'usd',
            ids,
            per_page: Array.isArray(coinIds) ? Math.max(coinIds.length, 1) : 1,
            page: 1,
            price_change_percentage: '24h'
        }),
        headers: getCoinGeckoHeaders(),
        timeout: 30000
    });

    return response.data;
}

async function searchCoinIds(query) {
    const response = await axios.get(`${COINGECKO_BASE_URL}/search`, {
        params: getCoinGeckoParams({ query }),
        headers: getCoinGeckoHeaders(),
        timeout: 30000
    });
    const coins = Array.isArray(response.data?.coins) ? response.data.coins : [];

    return sortCoinSearchCandidates(coins, query)
        .slice(0, 8)
        .map((coin) => coin.id);
}

async function fetchCoinMarket(coinId) {
    const directMarketData = await fetchCoinMarketsByIds([coinId]);

    if (directMarketData.length > 0) {
        return directMarketData;
    }

    const searchIds = await searchCoinIds(coinId);

    if (searchIds.length === 0) {
        return [];
    }

    const searchedMarketData = await fetchCoinMarketsByIds(searchIds);
    const marketDataById = new Map(searchedMarketData.map((coin) => [coin.id, coin]));
    const orderedMarketData = searchIds
        .map((id) => marketDataById.get(id))
        .filter(Boolean);

    return orderedMarketData.slice(0, 1);
}

function getAxiosErrorMessage(error) {
    if (error.response?.data) {
        return JSON.stringify(error.response.data);
    }

    if (error.code) {
        return `${error.code}: ${error.message}`;
    }

    return error.message || 'Unknown error';
}

app.get('/api/health', (req, res) => {
    const llm = getLlmConfig();

    res.json({
        status: 'ok',
        llmProvider: llm.provider,
        llmModel: llm.model,
        llmHasKey: Boolean(llm.apiKey),
        llmModels: llm.models || (llm.model ? [llm.model] : []),
        coinGeckoHasKey: Boolean(COINGECKO_API_KEY)
    });
});

app.post('/api/analyze', async (req, res) => {
    const normalizedCoinId = String(req.body?.coinId || '').trim().toLowerCase();

    if (!normalizedCoinId) {
        return res.status(400).json({ error: 'ID koin wajib diisi.' });
    }

    console.log(`\n--- Menjalankan algoritma penilai untuk: ${normalizedCoinId} ---`);

    try {
        const marketData = await fetchCoinMarket(normalizedCoinId);

        if (!marketData || marketData.length === 0) {
            return res.status(404).json({ error: 'Koin tidak ditemukan.' });
        }

        const coin = marketData[0];
        const marketCap = coin.market_cap || 0;
        const volume = coin.total_volume || 0;
        const change24h = coin.price_change_percentage_24h || 0;
        const volatility = Math.abs(change24h);
        const rank = coin.market_cap_rank;
        const liquidity = marketCap > 0 ? volume / marketCap : 0;

        let riskScore = 0;
        const reasons = [];

        if (volatility > 15) {
            riskScore += 40;
            reasons.push('Volatilitas sangat tinggi');
        } else if (volatility > 7) {
            riskScore += 20;
            reasons.push('Volatilitas sedang');
        } else {
            riskScore += 5;
            reasons.push('Harga relatif stabil');
        }

        if (!rank) {
            riskScore += 30;
            reasons.push('Market cap rank belum tersedia');
        } else if (rank > 200) {
            riskScore += 40;
            reasons.push('Koin kecil atau baru');
        } else if (rank > 50) {
            riskScore += 20;
            reasons.push('Koin menengah');
        } else {
            riskScore += 5;
            reasons.push('Koin besar');
        }

        if (liquidity < 0.001) {
            riskScore += 20;
            reasons.push('Likuiditas rendah');
        }

        riskScore = Math.min(riskScore, 100);

        const riskLevel = riskScore > 70 ? 'Tinggi (Bahaya)' : riskScore > 35 ? 'Sedang (Waspada)' : 'Rendah (Aman)';
        const sentiment = getMarketSentiment(change24h, riskScore);

        let llm = {
            connected: false,
            provider: getLlmConfig().provider,
            model: getLlmConfig().model,
            error: ''
        };
        const analysisContext = {
            coin,
            riskScore,
            riskLevel,
            reasons,
            change24h,
            rank,
            liquidity,
            sentiment,
            marketCap,
            volume
        };
        let analysis = buildFallbackAnalysis(analysisContext);
        let explanation = buildExplanationFromAnalysis(analysis);

        try {
            const prompt = buildAnalysisPrompt(analysisContext);
            const aiResult = await generateExplanation(prompt);
            const rawAnalysis = extractJsonObject(aiResult.text);

            llm = aiResult;
            analysis = normalizeAnalysis(rawAnalysis, analysis);
            explanation = buildExplanationFromAnalysis(analysis);
            console.log(`OK: LLM ${aiResult.provider}/${aiResult.model} berhasil generate.`);
        } catch (aiError) {
            llm.error = getAxiosErrorMessage(aiError);
            console.log(`Warning: LLM gagal, fallback algoritma dipakai. Detail: ${llm.error}`);
            analysis = buildFallbackAnalysis(analysisContext);
            explanation = buildExplanationFromAnalysis(analysis);
        }

        res.json({
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            image: coin.image,
            price: coin.current_price,
            marketCap,
            volume,
            change24h,
            rank,
            liquidity,
            riskScore,
            riskLevel,
            sentiment,
            analysis,
            explanation,
            llm
        });
    } catch (error) {
        console.error('Server Error:', getAxiosErrorMessage(error));
        res.status(500).json({ error: 'Data pasar sedang tidak tersedia.' });
    }
});

app.listen(PORT, () => {
    console.log(`Algoritma Cryptolio AI berjalan di http://localhost:${PORT}`);
});
