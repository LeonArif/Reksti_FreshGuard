# Fresh Guard — Cara Kerja Sistem

Sistem deteksi kesegaran makanan berbasis ESP32 yang menggunakan sensor suhu, kelembapan, dan kualitas udara untuk memprediksi kelas kesegaran makanan menggunakan model AI Python.

---

## Arsitektur Komponen

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React/Vite)                                  │
│  Vercel / localhost:5173                                │
│  - Tombol "Predict" → trigger prediksi                  │
│  - Form manual → simulasi tanpa ESP32                   │
│  - Dashboard → tampilkan hasil sensor + prediksi        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (fetch)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Node.js / Express)                            │
│  Railway / localhost:3001                               │
│  - POST /api/food/predict  ← long-polling (15 s)        │
│  - GET  /api/food/command  ← dipolling ESP32 setiap 5 s │
│  - POST /api/food/ingest   ← menerima data dari ESP32   │
│  - POST /api/food/manual   ← prediksi manual            │
│  - GET  /api/food          ← ambil riwayat data         │
└────────────────────────┬────────────────────────────────┘
                         │ Supabase JS SDK
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL Cloud)                            │
│  Tabel: kondisi_makanan                                 │
│  Kolom: mq_135, mq_136, temperature, humidity,          │
│         h2s, voc, amonia, tvc, rsl_minutes, class       │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ HTTPS POST (WiFiClientSecure)
┌─────────────────────────────────────────────────────────┐
│  ESP32-WROOM-32 (Arduino / FreeRTOS)                    │
│  - Polling GET /api/food/command setiap 5 detik         │
│  - Baca sensor BME280 (suhu, lembap, tekanan)           │
│  - Baca sensor MQ-135 (kualitas udara / ppm)            │
│  - POST /api/food/ingest saat ada trigger               │
│  - Tampilkan hasil di OLED 128×64 + LED RGB             │
└─────────────────────────────────────────────────────────┘
```

---

## Alur Lengkap: Tombol "Predict"

```
User           Frontend          Backend           ESP32          Supabase
 │                │                 │                 │               │
 │─── klik ───────►                 │                 │               │
 │            "Predicting..."       │                 │               │
 │                │                 │                 │               │
 │                │─ POST /predict ─►                 │               │
 │                │                 │ upload_now=true │               │
 │                │                 │◄── GET /command ┤               │
 │                │                 │                 │ [baca sensor] │
 │                │                 │                 │               │
 │                │                 │◄─ POST /ingest ─┤               │
 │                │                 │  {temp, hum,    │               │
 │                │                 │   mq_135, ...}  │               │
 │                │                 │                 │               │
 │                │                 │── python predict.py ──►         │
 │                │                 │  {tvc, rsl, class}              │
 │                │                 │                 │               │
 │                │                 │─ INSERT ───────────────────────►│
 │                │                 │  kondisi_makanan│               │
 │                │                 │                 │               │
 │                │◄─ 200 {data} ───┤                 │               │
 │                │                 │                 │               │
 │◄─── update ────┤                 │                 │               │
 │   dashboard    │                 │                 │               │
```

**Timeline**: Setelah klik "Predict", hasil muncul dalam ~5–10 detik (5 s polling ESP32 + waktu baca sensor + AI inference).

---

## Detail Setiap Lapisan

### ESP32 (`freshguard.ino`)

| Periodik | Interval | Aksi |
|----------|----------|------|
| Command check | 5 detik | `GET /api/food/command` — cek apakah ada flag `upload_now` |
| Sensor read | 10 detik (atau segera jika trigger) | Baca BME280 + MQ-135 (rata-rata 10 sampel ADC) |
| Upload | segera setelah baca sensor (jika trigger) | `POST /api/food/ingest` ke backend |
| OLED refresh | 1 detik | Update display |

**Trigger mechanism**: Saat `upload_now: true` diterima, ESP32 mereset `g_last_read_ms = 0` dan `g_last_upload_ms = 0` sehingga sensor dibaca dan data dikirim pada iterasi loop berikutnya (~50 ms kemudian), tanpa menunggu interval normal.

**LED status**:
- Hijau: MQ-135 < 200 ppm dan tidak ada alarm DO
- Kuning: MQ-135 200–400 ppm atau alarm DO aktif
- Merah: MQ-135 > 400 ppm

### Backend (`/api/food/predict`) — Long-Polling

```
POST /api/food/predict
```

1. Menandai `uploadRequestedAt = new Date()` (in-memory flag)
2. Membuat `Promise` yang di-resolve ketika ESP32 mengirim data lewat `/ingest`
3. Timeout 15 detik — jika ESP32 tidak merespons, kembalikan HTTP 504
4. Ketika `/ingest` berhasil menerima + menyimpan data, resolve the promise
5. Kembalikan record lengkap (termasuk hasil AI) ke frontend

Ini berarti **satu HTTP call dari frontend** menghasilkan satu hasil prediksi lengkap — tidak perlu polling di frontend.

### Backend (`/api/food/ingest`) — Data dari ESP32

```
POST /api/food/ingest
Body: { mq_135, mq_136, temperature, humidity }
```

1. Validasi payload dengan Zod
2. Insert record ke Supabase dengan `tvc=0, rsl_minutes=0, class=1` (placeholder)
3. Jalankan `python ai/predict.py` secara sinkron (stdin/stdout JSON)
4. Update record di Supabase dengan hasil AI (`tvc`, `rsl_minutes`, `class`)
5. Resolve pending `/predict` promise jika ada
6. Kembalikan record final (HTTP 201)

### Model AI (`ai/predict.py`)

Input (JSON via stdin):
```json
{ "mq135": 125.4, "mq136": 5.0, "temperature": 27.45, "humidity": 68.2 }
```

Output (JSON via stdout):
```json
{ "ok": true, "data": { "tvc": 3.2, "rsl_minutes": 1440, "class": 0, "class_name": "Safe", "class_probabilities": {...} } }
```

| Class (DB) | Class (App) | Label | TVC |
|------------|-------------|-------|-----|
| 1 | 0 | Safe | ≤ 4.0 log₁₀ CFU/g |
| 2 | 1 | Warning | 4.0–5.0 log₁₀ CFU/g |
| 3 | 2 | Danger | ≥ 5.0 log₁₀ CFU/g |

> **Catatan class offset**: DB menyimpan 1/2/3, model output 0/1/2. `normalizeFoodRecord` di backend mengurangi 1 sebelum mengirim ke frontend.

---

## Endpoint API Lengkap

### Backend (Railway / localhost:3001)

| Method | Path | Caller | Fungsi |
|--------|------|--------|--------|
| GET | `/health` | — | Cek koneksi server + Supabase |
| GET | `/api/food` | Frontend | Riwayat data (max 50, sortir terbaru) |
| POST | `/api/food/predict` | Frontend | **Trigger prediksi + tunggu hasil (15 s)** |
| POST | `/api/food/ingest` | ESP32 | Terima data sensor, jalankan AI, simpan ke DB |
| GET | `/api/food/command` | ESP32 | Cek apakah ada trigger dari frontend |
| POST | `/api/food/request-upload` | — | Set flag upload (alternatif tanpa long-polling) |
| POST | `/api/food/manual` | Frontend | Prediksi manual dari form input |

---

## Konfigurasi Environment

### Backend (`.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
PYTHON_PATH=python
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE=https://rekstifreshguard-production.up.railway.app
```

### ESP32 (`freshguard.ino` — Section 1)
```cpp
const char* WIFI_SSID     = "NamaWifi";
const char* WIFI_PASSWORD = "Password";
const char* BACKEND_URL   = "https://rekstifreshguard-production.up.railway.app";
```

---

## Cara Menjalankan

### Backend
```bash
cd backend
npm install
cp .env.example .env   # isi nilai Supabase
pip install -r ai/requirements.txt
npm run dev            # dev mode dengan auto-restart
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # localhost:5173
```

### ESP32
1. Buka `freshguard.ino` di Arduino IDE
2. Edit `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL` di Section 1
3. Upload ke ESP32-WROOM-32
4. Buka Serial Monitor (115200 baud) untuk melihat log

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Tombol "Predict" timeout 15 s | ESP32 tidak terhubung Wi-Fi atau belum boot | Cek Serial Monitor ESP32 |
| ESP32 terhubung tapi tidak kirim data | Backend URL salah di `BACKEND_URL` | Verifikasi URL di `freshguard.ino` |
| Prediksi berhasil tapi nilai `-` di dashboard | Class offset tidak cocok | Pastikan DB menyimpan 1/2/3, bukan 0/1/2 |
| HTTP 401 dari Supabase | Anon key salah atau RLS belum aktif | Cek `SUPABASE_ANON_KEY` dan policy RLS |
| Python model error | Dependensi belum diinstall | `pip install -r ai/requirements.txt` |
| CORS error di frontend | `FRONTEND_URL` di backend tidak sesuai | Update env var `FRONTEND_URL` di backend |

---

*Fresh Guard — Kelompok 4, K-03 — Rekayasa Sistem dan Teknologi Informasi*
