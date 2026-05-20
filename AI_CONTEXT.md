# AI Context - Cryptolio AI

Dokumen ini dibuat untuk teman atau AI coding assistant yang baru clone project agar cepat paham konteks, tujuan, dan batasan perubahan.

## Tujuan Aplikasi

Cryptolio AI adalah dashboard edukasi untuk membaca risiko aset kripto. Aplikasi mengambil data CoinGecko, menghitung risk score, lalu menampilkan analisis yang mudah dibaca pemula. AI dipakai untuk membuat ringkasan bahasa natural, bukan untuk memberi instruksi trading.

Hal yang tidak boleh dilakukan aplikasi:

- Memberi instruksi beli, jual, entry, exit, take profit, atau stop loss.
- Mengklaim prediksi harga pasti.
- Menaruh API key di frontend.
- Menganggap output sebagai nasihat keuangan.

## Persona Produk

Target user adalah mahasiswa atau pemula crypto yang ingin belajar membaca risiko. UI sebaiknya ringkas, informatif, dan langsung usable. Hindari membuat landing page marketing. Layar pertama harus tetap berupa dashboard kerja.

Tone teks aplikasi:

- Bahasa Indonesia yang jelas.
- Natural dan edukatif.
- Tidak terlalu promosi.
- Tidak memberi saran investasi langsung.

## Arsitektur Saat Ini

Backend:

- File utama: `server.js`
- Framework: Express
- Static folder: `Public`
- Endpoint utama:
  - `GET /api/health`
  - `POST /api/analyze`
- Market data:
  - CoinGecko `/coins/markets`
  - CoinGecko `/search`
  - CoinGecko `/global`
  - CoinGecko `/coins/{id}/market_chart`
- AI provider:
  - Gemini jika `GEMINI_API_KEY` tersedia.
  - OpenAI jika `OPENAI_API_KEY` tersedia dan Gemini tidak dipakai.
  - Fallback lokal jika AI gagal.
- Cache:
  - In-memory cache TTL 60 detik untuk `/api/analyze`.
  - Cache key dibedakan berdasarkan `coinId` dan mode `includeAi`.

Frontend:

- Entry point: `Public/script.js`
- Module:
  - `Public/js/api.js`: fetch backend.
  - `Public/js/compare.js`: render compare cards.
  - `Public/js/formatters.js`: format harga, ATH, dominance, risk color.
  - `Public/js/history.js`: search history localStorage.
  - `Public/js/notifications.js`: inline notification.
  - `Public/js/singleResult.js`: render single analyze result.

## Alur Analyze

1. User input 1 coin dan klik `Analyze`.
2. Frontend memanggil `POST /api/analyze` dengan `includeAi: true`.
3. Backend cek cache.
4. Backend resolve CoinGecko ID.
5. Backend hitung risk score.
6. Backend membuat fallback analysis.
7. Backend mencoba Gemini/OpenAI.
8. Frontend render dashboard single result.
9. Coin ID disimpan ke search history.

## Alur Compare

1. User input 2-3 coin dipisah koma dan klik `Compare`.
2. Frontend memanggil `POST /api/analyze` paralel untuk setiap coin.
3. Request Compare memakai `includeAi: false`.
4. Backend tetap menghitung risk score dan risk factors, tetapi skip LLM.
5. Frontend render kartu compare side-by-side.
6. Semua coin berhasil disimpan ke search history.

## Risk Score Saat Ini

Risk score menggunakan faktor:

- `volatility`: absolut perubahan harga 24 jam.
- `rank`: market cap rank.
- `liquidity`: total volume / market cap.
- `athDistance`: jarak harga sekarang dari all-time high.
- `dominance`: market cap coin / total crypto market cap.
- `volumeSpikeRatio`: volume sekarang dibanding rata-rata volume historis.

Label:

```text
0-35    Rendah (Aman)
36-70   Sedang (Waspada)
71-100  Tinggi (Bahaya)
```

Jika mengubah bobot risk score, update juga README agar penjelasan tetap benar.

## Prinsip Perubahan Kode

- Jangan mengembalikan frontend menjadi satu file besar.
- Simpan logic baru di module yang sesuai.
- Jangan membuat dependency frontend/build tool kecuali benar-benar perlu.
- Jangan mengubah `secret.env.example` menjadi berisi API key asli.
- Jangan hapus fallback analysis. App harus tetap jalan jika AI gagal.
- Jika menambah endpoint backend, dokumentasikan di README.
- Jika menambah data baru dari CoinGecko, pikirkan cache agar tidak boros kuota.

## Ide Fitur Berikutnya

Fitur yang masuk akal untuk dikembangkan:

- Tombol refresh result yang bypass cache.
- Detail breakdown risk score per faktor.
- Export compare result ke CSV atau image.
- Watchlist lokal favorit user.
- Mode dark/light sederhana.
- Sorting compare berdasarkan risk score, market cap, atau change 24h.
- Validasi input compare agar partial failure tetap menampilkan coin yang berhasil.
- Unit test untuk risk score function.
- Rate limit sederhana di backend.

## Area Rawan

- CoinGecko rate limit: gunakan cache dan hindari request berulang yang tidak perlu.
- LLM kadang mengembalikan JSON tidak bersih: parser backend sudah mencoba toleransi trailing comma dan markdown fence.
- `localStorage` hanya ada di browser: jangan pakai module history di backend.
- ES module harus dibuka lewat `http://localhost:3000`, bukan file lokal.
- Compare memakai beberapa request paralel, jadi error handling perlu hati-hati jika nanti mendukung partial success.

## Prompt Singkat Untuk AI Coding Assistant

Gunakan konteks ini jika meminta AI membantu lanjut fitur:

```text
Kamu sedang mengembangkan Cryptolio AI, aplikasi edukasi risk analyzer crypto berbasis Node/Express dan frontend HTML/CSS/JS ES modules. Backend utama ada di server.js, frontend entry point ada di Public/script.js, dan module frontend ada di Public/js. Jangan menumpuk logic baru ke script.js; buat atau pakai module yang sesuai. Aplikasi memakai CoinGecko untuk market data, Gemini/OpenAI untuk analysis opsional, fallback lokal jika AI gagal, dan cache in-memory 60 detik. Output bukan nasihat keuangan dan tidak boleh memberi instruksi beli/jual. Setelah perubahan, update README jika behavior berubah dan jalankan node --check untuk file JS yang disentuh.
```
