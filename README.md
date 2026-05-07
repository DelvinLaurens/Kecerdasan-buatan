# Cryptolio AI

Cryptolio AI adalah aplikasi web sederhana untuk menganalisis risiko aset kripto. Aplikasi ini mengambil data market dari CoinGecko, menghitung risk score dasar, lalu membuat ringkasan analisis memakai Gemini atau OpenAI. Kalau layanan AI gagal atau API key belum tersedia, aplikasi tetap bisa berjalan memakai fallback analysis dari algoritma lokal.

## Fitur

- Ambil data harga, market cap, volume 24 jam, perubahan harga 24 jam, rank, dan logo coin dari CoinGecko.
- Input bisa memakai CoinGecko ID atau ticker umum, misalnya `bitcoin`, `ethereum`, `xrp`, `arb`, atau `op`.
- Resolver otomatis akan mencoba input sebagai CoinGecko ID lebih dulu, lalu memakai search CoinGecko kalau ID tidak ditemukan.
- Hitung risk score berdasarkan volatilitas, market cap rank, dan likuiditas.
- Generate AI analysis berisi headline, summary, signal, watchlist, dan verdict.
- Fallback analysis tetap aktif kalau Gemini/OpenAI error.
- Frontend statis ada di folder `Public`.

## Struktur Project

```text
cryptolio/
|-- Public/
|   |-- index.html      # Struktur halaman aplikasi
|   |-- script.js       # Logic frontend dan request ke API backend
|   `-- style.css       # Styling dashboard
|-- server.js           # Backend Express, CoinGecko fetcher, AI provider, risk logic
|-- secret.env.example  # Contoh environment variable
|-- package.json        # Script dan dependency Node.js
|-- package-lock.json   # Lockfile dependency
`-- README.md
```

## Prasyarat

- Node.js 20 atau versi LTS yang kompatibel
- NPM
- API key CoinGecko demo agar request lebih stabil
- API key Gemini atau OpenAI untuk AI analysis

Catatan: aplikasi masih bisa berjalan tanpa Gemini/OpenAI, tetapi bagian AI akan memakai fallback analysis.

## Instalasi

1. Clone repo:

```powershell
git clone <url-repo-kamu>
cd cryptolio
```

2. Install dependency:

```powershell
npm install
```

3. Buat file `secret.env` dari contoh:

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

Jangan push file `secret.env` ke GitHub. File itu sudah masuk `.gitignore`.

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

## Cara Pakai

Masukkan ID atau ticker coin pada input dashboard, lalu klik `Analyze`.

Contoh input:

```text
bitcoin
ethereum
xrp
ripple
arb
op
dogecoin
```

Untuk beberapa coin, ticker dan CoinGecko ID bisa berbeda. Contoh XRP punya CoinGecko ID `ripple`, tetapi aplikasi ini sudah mencoba resolve ticker `xrp` otomatis lewat endpoint search CoinGecko.

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
  "coinGeckoHasKey": true
}
```

### POST `/api/analyze`

Menganalisis coin berdasarkan input user.

Request body:

```json
{
  "coinId": "xrp"
}
```

Contoh response ringkas:

```json
{
  "name": "XRP",
  "symbol": "XRP",
  "price": 1.39,
  "rank": 5,
  "riskScore": 10,
  "riskLevel": "Rendah (Aman)",
  "sentiment": "Neutral",
  "analysis": {
    "headline": "XRP Berada Pada Risiko Rendah",
    "summary": "Ringkasan kondisi market coin.",
    "signals": [],
    "watchlist": [],
    "verdict": "Kesimpulan analisis. Bukan financial advice."
  }
}
```

## Alur Kerja Backend

1. User mengirim `coinId` dari frontend ke `POST /api/analyze`.
2. Backend mencoba mengambil market data langsung dari CoinGecko `/coins/markets` memakai input sebagai ID.
3. Kalau kosong, backend mencari coin lewat CoinGecko `/search`.
4. Hasil search diurutkan berdasarkan kecocokan ID, symbol, nama, dan market cap rank.
5. Backend mengambil market data dari ID terbaik.
6. Risk score dihitung dari volatilitas, rank, dan likuiditas.
7. Backend membuat fallback analysis lokal.
8. Jika API key AI tersedia, backend meminta Gemini/OpenAI membuat analysis JSON.
9. Response dikirim ke frontend dan ditampilkan di dashboard.

## Risk Score

Risk score dihitung dari beberapa faktor:

- Volatilitas 24 jam:
  - Perubahan sangat tinggi menambah risiko lebih besar.
  - Perubahan kecil dianggap lebih stabil.
- Market cap rank:
  - Coin rank tinggi cenderung lebih mapan.
  - Coin kecil atau baru diberi risiko lebih tinggi.
- Likuiditas:
  - Rasio volume terhadap market cap rendah akan menaikkan risiko.

Label risiko:

```text
0-35    Rendah (Aman)
36-70   Sedang (Waspada)
71-100  Tinggi (Bahaya)
```

## Troubleshooting

### Error `EADDRINUSE: address already in use :::3000`

Port 3000 sudah dipakai proses lain. Cek proses:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Matikan proses Node yang sedang memakai port itu, atau ubah `PORT` di `secret.env`.

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

Kalau AI gagal, aplikasi tetap menampilkan fallback analysis.

## Catatan Keamanan

- Jangan commit `secret.env`.
- Jangan taruh API key langsung di `server.js` atau file frontend.
- Pakai `secret.env.example` hanya sebagai template.

## Disclaimer

Aplikasi ini hanya untuk pembelajaran dan analisis awal. Output bukan nasihat keuangan. Lakukan riset mandiri sebelum mengambil keputusan investasi.
