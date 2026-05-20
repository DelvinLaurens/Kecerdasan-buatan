# Cryptolio AI

Cryptolio AI adalah aplikasi web edukasi untuk membaca risiko aset kripto secara cepat. Aplikasi ini mengambil data market dari CoinGecko, menghitung risk score, lalu membuat ringkasan analisis memakai Gemini atau OpenAI. Jika layanan AI gagal atau API key belum tersedia, aplikasi tetap berjalan memakai fallback analysis dari algoritma lokal.

Tujuan project ini bukan memberi sinyal beli atau jual. Output aplikasi dipakai untuk belajar membaca risiko: volatilitas, ukuran market, likuiditas, jarak dari all-time high, volume anomaly, dan dominance.

## Fitur Utama

- Analyze 1 koin berdasarkan CoinGecko ID atau ticker umum, misalnya `bitcoin`, `ethereum`, `xrp`, `arb`, atau `op`.
- Compare 2-3 koin side-by-side dengan harga, risk score, market cap, volume, sentiment, ATH distance, dominance, dan volume signal.
- Search history tersimpan di browser memakai `localStorage`, sehingga koin yang pernah dicari bisa diklik ulang.
- Risk score memakai beberapa faktor: volatilitas 24 jam, market cap rank, likuiditas, ATH distance, volume spike ratio, dan dominance index.
- AI analysis menghasilkan headline, summary, signal, watchlist, dan verdict.
- Fallback analysis lokal tetap aktif jika Gemini/OpenAI error.
- Backend punya in-memory cache TTL 60 detik untuk menghemat request CoinGecko dan LLM.
- Frontend sudah modular dengan ES module agar lebih mudah dirawat.
- Error UI memakai notification inline, bukan `alert()` browser.

## Tech Stack

- Backend: Node.js, Express, Axios, Dotenv
- Frontend: HTML, CSS, JavaScript ES Modules
- Market data: CoinGecko API
- AI provider: Gemini lebih diprioritaskan, OpenAI opsional

## Struktur Project

```text
cryptolio/
|-- Public/
|   |-- index.html             # Struktur halaman aplikasi
|   |-- style.css              # Styling dashboard, compare card, toast, history
|   |-- script.js              # Entry point frontend dan event controller
|   `-- js/
|       |-- api.js             # Request ke backend /api/analyze
|       |-- compare.js         # Render hasil Compare
|       |-- formatters.js      # Formatter harga, ATH distance, dominance, warna risk
|       |-- history.js         # Search history via localStorage
|       |-- notifications.js   # Inline notification/toast
|       `-- singleResult.js    # Render hasil Analyze 1 koin
|-- server.js                  # Backend Express, API fetcher, AI provider, cache, risk logic
|-- AI_CONTEXT.md              # Konteks untuk teman/AI yang ingin lanjut fitur
|-- secret.env.example         # Template environment variable
|-- package.json               # Script dan dependency Node.js
|-- package-lock.json          # Lockfile dependency
`-- README.md
```

## Prasyarat

- Node.js 20 atau versi LTS yang kompatibel
- NPM
- API key CoinGecko demo agar request lebih stabil
- API key Gemini atau OpenAI untuk AI analysis

Catatan: aplikasi masih bisa berjalan tanpa Gemini/OpenAI, tetapi bagian AI akan memakai fallback analysis.

## Instalasi Cepat

1. Clone repo:

```powershell
git clone <url-repo-kamu>
cd cryptolio
```

2. Install dependency:

```powershell
npm install
```

3. Buat file `secret.env` dari template:

```powershell
copy secret.env.example secret.env
```

4. Isi API key di `secret.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-flash-latest
COINGECKO_API_KEY=your_coingecko_demo_api_key_here

# Optional kalau mau pakai OpenAI, bukan Gemini.
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

Jangan push file `secret.env` ke GitHub.

## Menjalankan Aplikasi

Mode biasa:

```powershell
npm start
```

Mode development dengan auto-reload Node:

```powershell
npm run dev
```

Buka browser:

```text
http://localhost:3000
```

Jangan membuka `Public/index.html` langsung dari file explorer, karena frontend memanggil backend `/api/analyze`. Aplikasi harus berjalan lewat server Express.

## Cara Pakai

Analyze 1 koin:

```text
bitcoin
```

Compare 2-3 koin, pisahkan dengan koma:

```text
bitcoin, ethereum, solana
```

Contoh input lain:

```text
xrp
ripple
arb
op
dogecoin
shiba-inu
```

Untuk beberapa koin, ticker dan CoinGecko ID bisa berbeda. Contoh XRP punya CoinGecko ID `ripple`, tetapi backend akan mencoba resolver search CoinGecko jika input langsung tidak ditemukan.

## Endpoint API

### GET `/api/health`

Mengecek status konfigurasi backend.

Contoh response:

```json
{
  "status": "ok",
  "llmProvider": "gemini",
  "llmModel": "gemini-2.5-flash-lite",
  "llmHasKey": true,
  "llmModels": ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"],
  "coinGeckoHasKey": true,
  "analyzeCacheSize": 1
}
```

### POST `/api/analyze`

Menganalisis coin berdasarkan input user.

Request body untuk Analyze:

```json
{
  "coinId": "bitcoin",
  "includeAi": true
}
```

Request body untuk Compare cepat tanpa AI:

```json
{
  "coinId": "ethereum",
  "includeAi": false
}
```

Contoh response ringkas:

```json
{
  "id": "bitcoin",
  "name": "Bitcoin",
  "symbol": "BTC",
  "price": 76719,
  "rank": 1,
  "riskScore": 18,
  "riskLevel": "Rendah (Aman)",
  "sentiment": "Neutral",
  "riskFactors": {
    "volatility": 0.01,
    "rank": 1,
    "liquidity": 0.0179,
    "athDistance": 39.15,
    "dominance": 58.28,
    "volumeSpikeRatio": 0.77,
    "volumeSignal": "Normal"
  },
  "cache": {
    "hit": false,
    "ttlSeconds": 60
  }
}
```

## Alur Backend

1. User mengirim `coinId` ke `POST /api/analyze`.
2. Backend cek in-memory cache berdasarkan `coinId` dan mode `includeAi`.
3. Jika cache hit, backend langsung mengembalikan hasil lama selama TTL masih aktif.
4. Jika cache miss, backend mencoba mengambil market data langsung dari CoinGecko `/coins/markets`.
5. Jika kosong, backend mencari coin lewat CoinGecko `/search`.
6. Backend mengambil global market cap dari CoinGecko `/global` untuk menghitung dominance.
7. Backend mengambil market chart untuk membaca volume spike ratio.
8. Risk score dihitung dari data market dan faktor risiko.
9. Backend membuat fallback analysis lokal.
10. Jika `includeAi` bernilai `true`, backend meminta Gemini/OpenAI membuat analysis JSON.
11. Response disimpan ke cache 60 detik dan dikirim ke frontend.

## Risk Score

Risk score dihitung dari beberapa faktor:

- Volatilitas 24 jam: perubahan harga besar menaikkan risiko.
- Market cap rank: rank rendah atau tidak tersedia menaikkan risiko.
- Likuiditas: rasio volume terhadap market cap rendah menaikkan risiko.
- ATH distance: semakin jauh dari all-time high, risiko drawdown dianggap lebih besar.
- Dominance index: market cap kecil terhadap total market crypto menaikkan risiko.
- Volume spike ratio: volume sangat tinggi atau sangat rendah dibanding rata-rata dapat menandakan anomaly.

Label risiko:

```text
0-35    Rendah (Aman)
36-70   Sedang (Waspada)
71-100  Tinggi (Bahaya)
```

## Frontend Architecture

Frontend memakai ES module tanpa build tool. `Public/script.js` adalah entry point yang hanya mengatur event tombol, loading state, dan koordinasi antar module.

- `api.js`: komunikasi ke backend.
- `singleResult.js`: render dashboard Analyze.
- `compare.js`: render kartu Compare.
- `history.js`: simpan dan render search history.
- `notifications.js`: tampilkan error/info inline.
- `formatters.js`: semua formatter angka dan helper warna risk.

Jika menambah fitur frontend, usahakan taruh logic di module yang sesuai. Jangan menumpuk semuanya lagi di `script.js`.

## Troubleshooting

### Error `EADDRINUSE: address already in use :::3000`

Port 3000 sudah dipakai proses lain. Cek proses:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Matikan proses Node yang sedang memakai port itu:

```powershell
Stop-Process -Id <PID>
```

Atau ubah `PORT` di `secret.env`.

### Halaman terbuka tapi Analyze tidak jalan

Pastikan halaman dibuka dari:

```text
http://localhost:3000
```

Bukan dari file lokal seperti:

```text
file:///.../Public/index.html
```

### Koin tidak ditemukan

Kemungkinan:

- Coin belum terdaftar di CoinGecko.
- Coin belum punya market data.
- Symbol bentrok dengan banyak coin dan resolver memilih hasil lain.
- API CoinGecko sedang rate limit atau tidak merespons.

Coba masukkan nama lengkap atau CoinGecko ID coin tersebut.

### AI analysis tidak muncul

Kemungkinan:

- `GEMINI_API_KEY` atau `OPENAI_API_KEY` belum diisi.
- API key salah.
- Model sedang error atau rate limit.
- `includeAi` bernilai `false`, seperti pada mode Compare.

Kalau AI gagal, aplikasi tetap menampilkan fallback analysis.

## Catatan Pengembangan

- `secret.env` berisi API key dan tidak boleh di-commit.
- Jangan taruh API key di frontend.
- Cache saat ini hanya in-memory. Cache akan kosong lagi setelah server restart.
- Mode Compare sengaja memakai `includeAi: false` agar lebih cepat dan hemat kuota.
- Baca `AI_CONTEXT.md` sebelum menambah fitur besar, terutama jika bekerja memakai AI coding assistant.

## Disclaimer

Aplikasi ini hanya untuk pembelajaran dan analisis awal. Output bukan nasihat keuangan. Lakukan riset mandiri sebelum mengambil keputusan investasi.
