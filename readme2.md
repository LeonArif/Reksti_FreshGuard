# 🥩 Fresh Guard — Panduan Lengkap Penggunaan Sistem

> Sistem deteksi kesegaran makanan berbasis ESP32 yang di-trigger dari website frontend. Saat user klik button "Predict", ESP32 membaca sensor (suhu, kelembapan, kualitas udara) dan mengirim ke backend untuk prediksi AI secara real-time.

---

## 📋 Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Daftar Komponen Hardware](#2-daftar-komponen-hardware)
3. [Skema Pengkabelan](#3-skema-pengkabelan)
4. [Persiapan Software & Library](#4-persiapan-software--library)
5. [Konfigurasi Kode ESP32](#5-konfigurasi-kode-esp32)
6. [Upload Firmware ke ESP32](#6-upload-firmware-ke-esp32)
7. [Kalibrasi Sensor MQ-135](#7-kalibrasi-sensor-mq-135)
8. [Persiapan Database Supabase](#8-persiapan-database-supabase)
9. [Menjalankan Backend Node.js](#9-menjalankan-backend-nodejs)
10. [Alur Data: Trigger → Sensor → Prediksi](#10-alur-data-trigger--sensor--prediksi)
10.5 [Protokol Komunikasi IoT & Networking](#105-protokol-komunikasi-iot--networking)
11. [Monitoring & Verifikasi Data](#11-monitoring--verifikasi-data)
12. [Indikator LED & OLED](#12-indikator-led--oled)
13. [Troubleshooting](#13-troubleshooting)
14. [Referensi Endpoint API](#14-referensi-endpoint-api)

---

## 1. Gambaran Umum Sistem

### Arsitektur Trigger-Based (Event-Driven)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   FRESH GUARD — SMART PREDICTION SYSTEM                  │
│                                                                          │
│  LAYER 1: Frontend (Browser)                                             │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  Website: [Button: "Predict"] ──────► User klik untuk trigger   │     │
│  └────────┬───────────────────────────────────────────────────────┘     │
│           │ HTTP POST /api/food/predict                                  │
│           ▼                                                               │
│  LAYER 2: Backend (Node.js) — Orchestrator                               │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  1. SET control flag di Supabase (action: "READ_SENSORS")      │     │
│  │  2. WAIT untuk ESP32 mengirim data sensor                      │     │
│  │  3. INVOKE Python model untuk prediksi                         │     │
│  │  4. SAVE hasil prediksi ke Supabase                            │     │
│  │  5. RETURN hasil ke Frontend                                   │     │
│  └────────┬───────────────────────────────────────────────────────┘     │
│           │                                                               │
│           ├──────────► Supabase Cloud Database                            │
│           │            - Table: control_commands                         │
│           │            - Table: kondisi_makanan                          │
│           │                                                               │
│           └──────────► Python AI Model (predict.py)                      │
│                        Input: sensor readings                            │
│                        Output: TVC, RSL, class                           │
│                                                                          │
│  LAYER 3: IoT (ESP32) — Sensor Collector                                 │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  [BME280]──┐                                                    │     │
│  │  [MQ-135]  ├──► [ESP32-WROOM-32] ◄─── Polling Supabase setiap 5s    │
│  │  [OLED]────┤         │                                          │     │
│  │  [LEDs]◄───┘         │                                          │     │
│  │                      │                                          │     │
│  │  Workflow:           │                                          │     │
│  │  1. Monitor Supabase control_commands table                     │     │
│  │  2. Saat ada trigger, BACA sensor (BME280, MQ-135)            │     │
│  │  3. KIRIM data ke Backend via POST /api/food/sensor-data       │     │
│  │  4. DISPLAY hasil di OLED & LED                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Alur Lengkap (Flow Diagram):

```
User Browser                 Backend                  Supabase              ESP32
   │                           │                         │                   │
   │─── Klik "Predict" ────────►                         │                   │
   │                           │                         │                   │
   │                           │─── SET control_commands ────────────────────►│
   │                           │     (action: READ)       │                   │
   │                           │                         │    [POLLING EVERY 5s]
   │                           │                         │                   │
   │                           │                         │◄── Cek flag       │
   │                           │                         │     (flag=ON)      │
   │                           │                         │                   │
   │                           │                         │                   │
   │                           │◄── ESP32 kirim data ─────────────────────────┤
   │                           │    (temp, hum, MQ135)   │    [Baca sensor]  │
   │                           │                         │                   │
   │                           │─── Python predict() ──┐ │                   │
   │                           │    (TVC, RSL, class) │ │                   │
   │                           │                      └─┤                   │
   │                           │─── UPDATE DB ─────────►│                   │
   │                           │   (save results)       │                   │
   │◄─── Response JSON ────────┤                         │                   │
   │   (hasil prediksi)         │                         │                   │
   │                           │                         │                   │
   │─── DISPLAY hasil ─────────►                         │                   │
   │   (update chart/metric)    │                         │                   │
```

### Keuntungan Arsitektur Baru:
✅ **Event-driven** — ESP32 hanya baca saat ada trigger, hemat power  
✅ **Cloud-ready** — Frontend, Backend, dan IoT bisa di network berbeda  
✅ **Scalable** — Mudah tambah multiple ESP32 / sensor lainnya  
✅ **Real-time** — Prediksi instant setelah sensor data diterima  
✅ **No firewall issues** — ESP32 hanya polling database (outbound only)  
✅ **Deployment fleksibel** — Backend di cloud, ESP32 di lokal / lab  

### Alur kerja singkat:
1. **User buka website frontend** → koneksi ke backend cloud
2. **User klik button "Predict"** → trigger request ke backend
3. **Backend SET flag** di Supabase untuk memberitahu ESP32
4. **ESP32 polling Supabase setiap 5 detik** → deteksi flag
5. **Saat flag ON, ESP32 baca sensor** BME280 + MQ-135
6. **ESP32 kirim data sensor ke backend** via HTTP POST
7. **Backend invoke Python AI model** → hitung TVC, RSL, class
8. **Backend save hasil ke Supabase** dan return ke frontend
9. **Website update chart dengan hasil prediksi** real-time
10. **LED & OLED di ESP32** tampilkan status

---

## 2. Daftar Komponen Hardware

| No | Komponen | Jumlah | Keterangan |
|----|----------|--------|------------|
| 1 | ESP32-WROOM-32 (Dev Board) | 1 | Mikrokontroler utama |
| 2 | BME280 | 1 | Sensor suhu, kelembapan, tekanan udara — I2C |
| 3 | MQ-135 (breakout module) | 1 | Sensor kualitas udara / VOC — Analog + Digital |
| 4 | OLED 128×64 SSD1306 | 1 | Display status — I2C |
| 5 | LED Hijau | 1 | Indikator status AMAN |
| 6 | LED Kuning | 1 | Indikator status PERINGATAN |
| 7 | LED Merah | 1 | Indikator status BAHAYA |
| 8 | Resistor 220Ω | 3 | Untuk ketiga LED |
| 9 | Kabel jumper | secukupnya | Male-to-male / male-to-female |
| 10 | Breadboard | 1 | Untuk prototyping |
| 11 | Kabel USB Micro-B | 1 | Untuk upload firmware & power |

> **MQ-136 (H2S sensor)** tidak digunakan karena alasan biaya. Kolom `mq_136` di database tetap diisi dengan nilai statis `5.0 ppm` agar struktur payload tetap lengkap.

---

## 3. Skema Pengkabelan

### 3.1 Peta Pin Lengkap

```
ESP32-WROOM-32
┌─────────────────────────────────┐
│                                 │
│  GPIO 26 ──── OLED SDA          │
│  GPIO 27 ──── OLED SCL          │
│  GPIO 33 ──── BME280 SDA        │
│  GPIO 25 ──── BME280 SCL        │
│  GPIO 32 ──── MQ-135 AO (Analog)│
│  GPIO 35 ──── MQ-135 DO (Digital│
│  GPIO 14 ──── LED Hijau (+)     │
│  GPIO 12 ──── LED Kuning (+)    │
│  GPIO 13 ──── LED Merah (+)     │
│  3.3V    ──── OLED VCC          │
│  3.3V    ──── BME280 VCC        │
│  5V      ──── MQ-135 VCC        │
│  GND     ──── semua GND         │
└─────────────────────────────────┘
```

### 3.2 Detail Per Komponen

#### 🟦 OLED 128×64 SSD1306 (Bus I2C — Wire)
| Pin OLED | Pin ESP32 | Keterangan |
|----------|-----------|------------|
| VCC | 3.3V | Tegangan 3.3V |
| GND | GND | Ground |
| SCL | GPIO **27** | Clock I2C |
| SDA | GPIO **26** | Data I2C |

> ⚠️ OLED menggunakan **Wire (bus I2C pertama)**. Alamat I2C default: `0x3C`. Jika tidak terdeteksi, coba `0x3D`.

#### 🟩 BME280 (Bus I2C — Wire1)
| Pin BME280 | Pin ESP32 | Keterangan |
|------------|-----------|------------|
| VCC | 3.3V | Tegangan 3.3V |
| GND | GND | Ground |
| SCL | GPIO **25** | Clock I2C |
| SDA | GPIO **33** | Data I2C |

> ⚠️ BME280 menggunakan **Wire1 (bus I2C kedua)** agar tidak konflik dengan OLED.
> Alamat I2C: `0x76` jika pin SDO disambung ke GND (default), atau `0x77` jika SDO ke VCC.

#### 🟨 MQ-135
| Pin MQ-135 | Pin ESP32 | Keterangan |
|------------|-----------|------------|
| VCC | **5V** | Sensor ini butuh 5V! Jangan 3.3V |
| GND | GND | Ground |
| AO | GPIO **32** | Output analog (ADC1_CH4, 12-bit) |
| DO | GPIO **35** | Output digital (threshold alarm; input-only pin) |

> ⚠️ **GPIO 35 adalah input-only** di ESP32 — tidak ada internal pull-up. Pastikan modul breakout MQ-135 kamu sudah memiliki pull-up resistor di jalur DO (hampir semua modul breakout sudah memilikinya).

> ⚠️ Jangan hubungkan AO langsung ke 5V atau GPIO akan rusak. Tegangan output AO dari MQ-135 sudah otomatis di bawah 3.3V karena rangkaian voltage divider di modul breakout.

#### 💡 LED Status
| LED | Pin ESP32 | Resistor | Keterangan |
|-----|-----------|----------|------------|
| Hijau (+) | GPIO **14** | 220Ω ke GND | Status AMAN |
| Kuning (+) | GPIO **12** | 220Ω ke GND | Status PERINGATAN |
| Merah (+) | GPIO **13** | 220Ω ke GND | Status BAHAYA |
| Semua (-) | GND | — | Katoda ke ground |

### 3.3 Diagram Breadboard (ASCII)

```
         ESP32 Dev Board
         ┌────────────┐
    3.3V─┤VCC      GND├─GND (semua komponen)
    ──── ┤EN       D23├
    ──── ┤VP  (36) D22├
    ──── ┤VN  (39) TX0├
    ──── ┤D34      RX0├
    DO───┤D35      D21├
    AO───┤D32      D19├
    ──── ┤D33(SDA) D18├
    SCL2─┤D25(SCL) D5 ├
    SDA1─┤D26(SDA) TX2├
    SCL1─┤D27(SCL) RX2├
    ──── ┤D14      D4 ├───LED Hijau──220Ω──GND
         │   [14]  D2 │
    ──── ┤D12      D15├
         │   [12]     │
    ──── ┤D13         │
         │   [13]     │
         └────────────┘
            │   │   │
         LED Merah Kuning
```

---

## 4. Persiapan Software & Library

### 4.1 Install Arduino IDE

1. Download **Arduino IDE 2.x** dari https://www.arduino.cc/en/software
2. Buka Arduino IDE setelah instalasi selesai

### 4.2 Tambahkan ESP32 Board ke Arduino IDE

1. Buka **File → Preferences**
2. Di kolom **Additional boards manager URLs**, tambahkan:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Klik **OK**
4. Buka **Tools → Board → Boards Manager**
5. Cari `esp32` → pilih paket **esp32 by Espressif Systems** → klik **Install**
6. Tunggu proses instalasi selesai (bisa 5–10 menit)

### 4.3 Install Library yang Dibutuhkan

Buka **Sketch → Include Library → Manage Libraries**, lalu install satu per satu:

| # | Nama Library | Author | Cara Cari |
|---|-------------|--------|-----------|
| 1 | **Adafruit BME280 Library** | Adafruit | Ketik `BME280` |
| 2 | **Adafruit Unified Sensor** | Adafruit | Ketik `Adafruit Unified Sensor` |
| 3 | **ArduinoJson** | Benoit Blanchon | Ketik `ArduinoJson` (pilih v7 atau v6) |
| 4 | **Adafruit SSD1306** | Adafruit | Ketik `SSD1306` |
| 5 | **Adafruit GFX Library** | Adafruit | Ketik `Adafruit GFX` |

> **Catatan:** Library `WiFi`, `HTTPClient`, `WiFiClientSecure`, `Wire` sudah **bawaan** ESP32 Arduino core — tidak perlu install terpisah.

### 4.4 Pilih Board & Port

1. **Tools → Board → esp32 → ESP32 Dev Module**
2. **Tools → Port** → pilih port COM/ttyUSB yang muncul saat ESP32 dihubungkan
   - Windows: `COM3`, `COM4`, dll.
   - Linux/Mac: `/dev/ttyUSB0` atau `/dev/ttyACM0`

> Jika port tidak muncul, install driver **CP210x** (Silicon Labs) dari https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

---

## 5. Konfigurasi Kode ESP32

Buka file `FreshGuard_ESP32.ino` di Arduino IDE, lalu edit **Section 1** di bagian paling atas:

### 5.1 Isi Kredensial Wi-Fi

```cpp
const char* WIFI_SSID     = "NamaWifiKamu";     // ← ganti ini
const char* WIFI_PASSWORD = "PasswordWifiKamu"; // ← ganti ini
```

> ⚠️ Gunakan Wi-Fi 2.4 GHz. ESP32 **tidak mendukung** jaringan 5 GHz.

### 5.2 Verifikasi Konfigurasi Supabase

Konfigurasi Supabase sudah terisi dari file `.env` backend kamu:

```cpp
const char* SUPABASE_URL      = "https://odjegqwlqagjocxvciuk.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGci...";  // sudah terisi
```

Jika kamu mengganti project Supabase, update kedua nilai ini dari dashboard Supabase:
- **Project URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → Project API Keys → `anon public`

### 5.3 Sesuaikan Timing (Opsional)

```cpp
const unsigned long READ_INTERVAL_MS   = 10000UL;  // baca sensor tiap 10 detik
const unsigned long UPLOAD_INTERVAL_MS = 30000UL;  // upload ke Supabase tiap 30 detik
```

> Untuk testing, kamu bisa ubah keduanya ke `5000UL` (5 detik) agar hasilnya lebih cepat terlihat.

### 5.4 Sesuaikan Alamat I2C BME280 (jika perlu)

Di dalam fungsi `setup()`, baris ini otomatis mencoba `0x76` lalu `0x77`:

```cpp
if (!bme.begin(0x76, &Wire1)) {
    bme.begin(0x77, &Wire1);
}
```

Cek alamat modul BME280 kamu:
- SDO pin → GND: alamat `0x76`
- SDO pin → VCC: alamat `0x77`

---

## 6. Upload Firmware ke ESP32

### 6.1 Langkah Upload

1. Hubungkan ESP32 ke komputer via kabel USB
2. Pastikan board dan port sudah dipilih dengan benar (lihat [4.4](#44-pilih-board--port))
3. Klik tombol **→ (Upload)** di Arduino IDE, atau tekan `Ctrl+U`
4. Tunggu proses kompilasi dan upload selesai
5. Jika muncul `Hard resetting via RTS pin...` → upload **berhasil**

### 6.2 Jika Upload Gagal / Stuck di "Connecting..."

Beberapa ESP32 memerlukan tombol **BOOT** ditekan manual saat upload:

1. Tekan dan tahan tombol **BOOT** di board ESP32
2. Klik **Upload** di Arduino IDE
3. Saat muncul `Connecting...`, **lepaskan** tombol BOOT
4. Upload akan mulai berjalan

### 6.3 Buka Serial Monitor

Setelah upload berhasil:

1. **Tools → Serial Monitor** (atau `Ctrl+Shift+M`)
2. Set baud rate ke **115200**
3. Kamu akan melihat log seperti:

```
[FreshGuard] Booting...
[MQ-135] AO=GPIO32  DO=GPIO35
[HTTP] Endpoint: https://odjegqwlqagjocxvciuk.supabase.co/rest/v1/kondisi_makanan
[OLED] OK (SDA=26, SCL=27)
[BME280] OK (SDA=33, SCL=25)
[WiFi] Connecting to "NamaWifiKamu"............
[WiFi] Connected — IP: 192.168.1.105
[FreshGuard] Setup complete

[Sensors] Temp=27.45°C  Hum=68.20%  Pres=1013.2hPa  MQ135=125.40ppm  DO=OK  MQ136*=5.00ppm
[HTTP] POST → https://odjegqwlqagjocxvciuk.supabase.co/rest/v1/kondisi_makanan
[HTTP] Payload: {"mq_135":125.4,"mq_136":5.0,"temperature":27.45,"humidity":68.2,...}
[HTTP] Response: 201
[HTTP] Upload SUCCESS
```

---

## 7. Kalibrasi Sensor MQ-135

Kalibrasi **wajib** dilakukan sebelum membaca nilai ppm yang akurat.

### 7.1 Mengapa Perlu Kalibrasi?

Sensor MQ-135 menggunakan perbandingan resistansi (`Rs/Ro`) untuk menghitung ppm. Nilai `Ro` adalah resistansi sensor di udara bersih yang **berbeda-beda tiap unit sensor**. Default di kode (`76.63 kΩ`) adalah estimasi rata-rata — untuk hasil akurat, kamu perlu mengukur nilai `Ro` sensor kamu sendiri.

### 7.2 Prosedur Kalibrasi

#### Tahap 1: Warm-up Sensor
1. Nyalakan ESP32 yang sudah terpasang MQ-135
2. **Biarkan menyala selama minimal 48 jam** di ruangan dengan udara bersih
3. Sensor butuh waktu untuk mencapai kondisi stabil secara termal

#### Tahap 2: Baca Nilai Rs di Udara Bersih

Tambahkan kode sementara ini di dalam `loop()` untuk melihat nilai Rs:

```cpp
// KODE KALIBRASI SEMENTARA — hapus setelah kalibrasi selesai
int adc = analogRead(PIN_MQ135_AO);
float vout = (adc / 4095.0f) * 3.3f;
float Rs = ((3.3f - vout) / vout) * MQ135_R_LOAD;
Serial.printf("[KALIB] ADC=%d  Vout=%.3fV  Rs=%.2f kOhm\n", adc, vout, Rs);
delay(2000);
```

#### Tahap 3: Hitung Nilai Ro

Setelah 48 jam, baca nilai `Rs` dari Serial Monitor. Nilai Ro dihitung dengan:

```
Ro = Rs / 3.6
```

*(Faktor 3.6 adalah rasio Rs/Ro untuk udara bersih menurut datasheet MQ-135)*

Contoh: Jika `Rs = 98.5 kΩ`, maka `Ro = 98.5 / 3.6 = 27.36 kΩ`

#### Tahap 4: Update Nilai di Kode

```cpp
// Ubah nilai ini di Section 1 sesuai hasil kalibrasi kamu:
const float MQ135_RO_CLEAN = 27.36f;  // ← hasil kalibrasi kamu
```

Upload ulang firmware setelah perubahan ini.

### 7.3 Tabel Konversi Status (Setelah Kalibrasi)

| Rentang ppm | Arti | LED |
|-------------|------|-----|
| 0 – 199 ppm | Udara bersih, makanan **aman** | 🟢 Hijau |
| 200 – 400 ppm | Kualitas udara menurun, makanan **waspadai** | 🟡 Kuning |
| > 400 ppm | Udara buruk, makanan kemungkinan **busuk** | 🔴 Merah |

> Threshold ini bisa disesuaikan di fungsi `updateLEDs()` dalam kode.

---

## 8. Persiapan Database Supabase

### 8.1 Buat Project Supabase (Jika Belum Ada)

1. Buka https://supabase.com dan login / daftar akun
2. Klik **New Project**
3. Isi nama project, database password, dan pilih region terdekat (Singapore untuk Indonesia)
4. Tunggu project selesai dibuat (~2 menit)

### 8.2 Buat Tabel di Database

1. Buka project Supabase kamu
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New Query**
4. Paste dan jalankan SQL berikut:

```sql
-- Tabel utama penyimpanan data sensor
create table if not exists public.kondisi_makanan (
  id uuid primary key default gen_random_uuid(),
  mq_135 numeric not null,
  mq_136 numeric not null,
  temperature numeric not null,
  humidity numeric not null,
  h2s numeric,
  voc numeric,
  amonia numeric,
  tvc numeric not null,
  rsl_minutes numeric not null,
  class smallint not null check (class in (0, 1, 2)),
  created_at timestamptz not null default now()
);

-- Aktifkan Row Level Security
alter table public.kondisi_makanan enable row level security;

-- Policy: izinkan INSERT dari anon key (ESP32)
create policy "Allow ESP32 insert"
  on public.kondisi_makanan
  for insert
  to anon
  with check (true);

-- Policy: izinkan SELECT dari anon key (untuk frontend/backend)
create policy "Allow read all"
  on public.kondisi_makanan
  for select
  to anon
  using (true);
```

5. Klik **Run** (atau tekan `Ctrl+Enter`)
6. Pastikan muncul pesan sukses di bawah

### 8.3 Dapatkan API Key & URL

1. Di sidebar Supabase → klik **Settings → API**
2. Catat dua nilai berikut:
   - **Project URL** → contoh: `https://xyzxyz.supabase.co`
   - **anon public key** → string JWT panjang dimulai dari `eyJ...`
3. Salin keduanya ke kode ESP32 dan file `.env` backend

### 8.4 Verifikasi Tabel Berhasil Dibuat

1. Klik **Table Editor** di sidebar
2. Kamu seharusnya melihat tabel `kondisi_makanan`
3. Tabel masih kosong — akan terisi setelah ESP32 menyala dan terkoneksi

---

## 9. Menjalankan Backend Node.js

Backend diperlukan untuk **menjalankan model AI** (predict.py) yang mengisi kolom `tvc`, `rsl_minutes`, dan `class` berdasarkan data sensor mentah.

### 9.1 Prasyarat

Pastikan sudah terinstall:
- **Node.js** v18 atau lebih baru → https://nodejs.org
- **Python** 3.8 atau lebih baru → https://python.org

Cek versi:
```bash
node --version   # harus v18+
python --version # harus 3.8+
```

### 9.2 Setup Backend

```bash
# 1. Masuk ke folder backend
cd backend

# 2. Install dependensi Node.js
npm install

# 3. Install dependensi Python (untuk model AI)
pip install -r ai/requirements.txt

# 4. Salin file environment
cp .env.example .env
```

### 9.3 Isi File .env

Buka file `.env` dan isi:

```env
SUPABASE_URL=https://odjegqwlqagjocxvciuk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=   # opsional, untuk operasi admin
PYTHON_PATH=python            # atau python3 di Linux/Mac
PORT=3001
```

### 9.4 Jalankan Backend

```bash
# Mode development (auto-restart saat ada perubahan file)
npm run dev

# Mode production
npm start
```

Output yang diharapkan:
```
Backend running on http://localhost:3001
```

### 9.5 Verifikasi Backend Berjalan

Buka browser atau gunakan curl:

```bash
curl http://localhost:3001/health
```

Respons sukses:
```json
{ "ok": true }
```

---

## 10. Alur Data: Trigger → Sensor → Prediksi

### Skenario Trigger-Based (Frontend Control)

Berikut alur lengkap dari user klik tombol di website sampai hasil prediksi ditampilkan:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                  ALUR DATA: FRONTEND TRIGGER → PREDIKSI                    ║
║                                                                            ║
║ STEP 1: User Action (Frontend)                                             ║
║ ┌────────────────────────────────────────────────────────────────────┐    ║
║ │ Website: [Button: Predict] ◄─── User click                        │    ║
║ │ HTTP POST http://localhost:3001/api/food/predict                  │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 2: Backend Orchestration                                              ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ Node.js Backend:                                                   │    ║
║ │  1. SET Supabase control_commands:                                 │    ║
║ │     { id, action: "READ_SENSORS", status: "PENDING", timestamp }   │    ║
║ │  2. WAIT max 15 seconds untuk esp32 send data                      │    ║
║ │  3. CREATE listener untuk POST incoming sensor data                │    ║
║ │     Endpoint: POST /api/food/sensor-data                           │    ║
║ │     Payload: {temp, humidity, mq135, ...}                         │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 3: Database Flag (Supabase)                                           ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ control_commands table:                                            │    ║
║ │                                                                    │    ║
║ │ id  │ action        │ status    │ timestamp           │ data_sent │    ║
║ │ ─── │ ─────────────── │ ───────── │ ──────────────────── │ ───────── │    ║
║ │ 001 │ READ_SENSORS  │ PENDING   │ 2026-05-11T10:30:00 │ false     │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 4: ESP32 Polling                                                      ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ ESP32 Loop (Polling setiap 5 detik):                               │    ║
║ │  1. QUERY Supabase: SELECT * FROM control_commands                 │    ║
║ │                    WHERE status = 'PENDING'                        │    ║
║ │  2. Jika ADA flag → Proceed ke STEP 5                              │    ║
║ │  3. Jika TIDAK ada → continue polling                              │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 5: Read Sensors (ESP32)                                               ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ [BME280]  ──I2C──┐                                                 │    ║
║ │ [MQ-135]  ───────┼──► ESP32 ADC reads ──► Average 10 samples       │    ║
║ │ [OLED] ◄─────────┤                                                  │    ║
║ │ [LEDs] ◄─────────┘                                                  │    ║
║ │                                                                    │    ║
║ │ Hasil pembacaan:                                                   │    ║
║ │ {                                                                  │    ║
║ │   "temperature": 27.45,      ← BME280                              │    ║
║ │   "humidity": 68.20,         ← BME280                              │    ║
║ │   "mq_135": 125.40,          ← MQ-135 analog via ADC               │    ║
║ │   "mq_136": 5.0,             ← STATIS (tidak terpasang)            │    ║
║ │   "timestamp": "2026-05-11T10:30:05Z"                              │    ║
║ │ }                                                                  │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 6: ESP32 Upload Data                                                  ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ ESP32 POST to Backend:                                             │    ║
║ │ POST http://backend.azure.com/api/food/sensor-data                 │    ║
║ │ (atau localhost:3001 jika network sama)                            │    ║
║ │                                                                    │    ║
║ │ Headers:                                                           │    ║
║ │   Content-Type: application/json                                   │    ║
║ │   Authorization: Bearer <jwt_token>                                │    ║
║ │                                                                    │    ║
║ │ Body: {temp: 27.45, hum: 68.2, mq135: 125.4, ...}                 │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 7: AI Prediction (Python Model)                                       ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ Backend receives sensor data                                       │    ║
║ │  → Invoke Python script: python ai/predict.py                      │    ║
║ │                                                                    │    ║
║ │ Input features:                                                    │    ║
║ │   [temperature, humidity, mq135, ...] → features array             │    ║
║ │                                                                    │    ║
║ │ Model calculations:                                                │    ║
║ │   tvc = 3.2 log10 CFU/g (Total Viable Count)                       │    ║
║ │   rsl_minutes = 1440 (24 jam remaining)                            │    ║
║ │   class = 0 (Safe) | 1 (Warning) | 2 (Danger)                      │    ║
║ │                                                                    │    ║
║ │ Output:                                                            │    ║
║ │   {"tvc": 3.2, "rsl_minutes": 1440, "class": 0}                    │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 8: Save Results (Supabase)                                            ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ Backend UPDATE Supabase:                                           │    ║
║ │ INSERT INTO kondisi_makanan:                                       │    ║
║ │ {                                                                  │    ║
║ │   "temperature": 27.45,                                            │    ║
║ │   "humidity": 68.20,                                               │    ║
║ │   "mq_135": 125.40,                                                │    ║
║ │   "tvc": 3.2,            ← AI result                               │    ║
║ │   "rsl_minutes": 1440,   ← AI result                               │    ║
║ │   "class": 0,            ← AI result (Safe)                        │    ║
║ │   "created_at": "2026-05-11T10:30:05Z"                             │    ║
║ │ }                                                                  │    ║
║ │                                                                    │    ║
║ │ + UPDATE control_commands: SET status="COMPLETED"                   │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 9: Return to Frontend                                                 ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ Backend HTTP Response 200 OK:                                      │    ║
║ │ {                                                                  │    ║
║ │   "success": true,                                                 │    ║
║ │   "data": {                                                        │    ║
║ │     "id": "uuid-xxx",                                              │    ║
║ │     "temperature": 27.45,                                          │    ║
║ │     "humidity": 68.20,                                             │    ║
║ │     "mq_135": 125.40,                                              │    ║
║ │     "tvc": 3.2,                                                    │    ║
║ │     "rsl_minutes": 1440,                                           │    ║
║ │     "class": 0,                                                    │    ║
║ │     "class_label": "Safe ✅",                                       │    ║
║ │     "created_at": "2026-05-11T10:30:05Z"                           │    ║
║ │   },                                                               │    ║
║ │   "message": "Prediksi berhasil. Makanan aman untuk dikonsumsi."    │    ║
║ │ }                                                                  │    ║
║ └────────────────────────┬───────────────────────────────────────────┘    ║
║                          │                                                 ║
║ STEP 10: Display Results (Frontend)                                        ║
║ ┌────────────────────────▼───────────────────────────────────────────┐    ║
║ │ Website Real-time Update:                                          │    ║
║ │                                                                    │    ║
║ │ ┌─────────────────────────────────────────────────────┐            │    ║
║ │ │ 🥩 FRESH GUARD PREDICTION DASHBOARD               │            │    ║
║ │ ├─────────────────────────────────────────────────────┤            │    ║
║ │ │ Status: ✅ SAFE                                     │            │    ║
║ │ │ Temperature: 27.45 °C                              │            │    ║
║ │ │ Humidity: 68.20 %RH                                │            │    ║
║ │ │ Air Quality (MQ-135): 125.40 ppm                   │            │    ║
║ │ ├─────────────────────────────────────────────────────┤            │    ║
║ │ │ TVC (Bacteria): 3.2 log₁₀ CFU/g                     │            │    ║
║ │ │ Shelf Life: 1440 minutes (24 hours) ⏱️              │            │    ║
║ │ ├─────────────────────────────────────────────────────┤            │    ║
║ │ │ [📊 Charts] [🔄 Refresh] [📥 Export]               │            │    ║
║ │ └─────────────────────────────────────────────────────┘            │    ║
║ └────────────────────────────────────────────────────────────────────┘    ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### 10.1 Detail Header HTTP yang Dikirim ESP32

```
POST https://odjegqwlqagjocxvciuk.supabase.co/rest/v1/kondisi_makanan
Content-Type:  application/json
apikey:        eyJhbGci...  (SUPABASE_ANON_KEY)
Authorization: Bearer eyJhbGci...  (SUPABASE_ANON_KEY)
Prefer:        return=minimal
```

### 10.2 Respons Sukses dari Supabase

- **HTTP 201 Created** → data berhasil disimpan
- **HTTP 204 No Content** → data berhasil disimpan (dengan `Prefer: return=minimal`)
- **HTTP 4xx** → masalah payload (cek format JSON)
- **HTTP 401** → API key salah atau RLS policy belum dibuat

---

## 10.5 Protokol Komunikasi IoT & Networking (Simplified Direct HTTP)

### Konsep Sederhana: Direct HTTP Calls

```
Frontend (localhost:3000)         Backend (localhost:8000)           ESP32 (192.168.43.120)
       │                                  │                                  │
       │  1. POST /predict                │                                  │
       ├─────────────────────────────────▶│                                  │
       │                                  │  3. GET /read-sensor              │
       │                                  ├─────────────────────────────────▶│
       │                                  │                                  │
       │                                  │  4. Response JSON (sensor data)  │
       │                                  │◀─────────────────────────────────┤
       │                                  │                                  │
       │                                  │  (5. Run ML Model)              │
       │                                  │                                  │
       │  6. Response JSON (prediction)   │                                  │
       │◀─────────────────────────────────┤                                  │
       │                                  │                                  │
       │  7. Display Results              │                                  │
       ├─────────────────────────┐        │                                  │
       │                         │        │                                  │
       v                         v        │                                  │
   [Chart + Metrics]                      │                                  │
```

### Setup Koneksi

**Prasyarat:**
- Laptop (Frontend + Backend) dan ESP32 **terhubung ke Wi-Fi/Hotspot yang sama**
- Bisa Wi-Fi rumah, hotspot mobile, atau router lab
- **PENTING:** Gunakan Wi-Fi 2.4 GHz (ESP32 tidak support 5 GHz)

**Contoh Network Setup:**
```
Wi-Fi Router (192.168.43.0/24) atau Hotspot
    │
    ├─ Laptop      : 192.168.43.100
    │  - Frontend  : http://localhost:3000
    │  - Backend   : http://localhost:8000
    │
    └─ ESP32       : 192.168.43.120
       - Endpoint  : http://192.168.43.120/read-sensor
```

**Langkah Setup:**
1. Hubungkan laptop ke Wi-Fi
2. Hubungkan ESP32 ke Wi-Fi yang SAMA
3. Catat IP address ESP32 (lihat di Serial Monitor atau router config)
4. Update IP di backend code

### 10.5.1 Kode ESP32: Mini Web Server

Modifikasi ESP32 untuk act as a mini HTTP server dengan endpoint `/read-sensor`:

```cpp
// File: FreshGuard_ESP32.ino
// ==========================================
// SECTION: ESP32 sebagai Web Server
// ==========================================

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* WIFI_SSID = "NamaWiFi";           // ← Edit
const char* WIFI_PASSWORD = "PasswordWiFi";   // ← Edit

// Web Server di port 80 (default HTTP)
WebServer server(80);

// ==========================================
// SETUP: Inisialisasi Web Server
// ==========================================
void setupWebServer() {
  // Define endpoint: GET /read-sensor
  server.on("/read-sensor", HTTP_GET, handleReadSensor);
  
  // Define endpoint: GET /status (optional, untuk debug)
  server.on("/status", HTTP_GET, handleStatus);
  
  // Fallback untuk undefined endpoints
  server.onNotFound([]() {
    server.send(404, "application/json", "{\"error\": \"Endpoint not found\"}");
  });

  server.begin();
  Serial.println("[WEB] Server started on http://" + WiFi.localIP().toString() + "/read-sensor");
}

// ==========================================
// HANDLER: GET /read-sensor
// ==========================================
void handleReadSensor() {
  Serial.println("[HTTP] GET /read-sensor request received");

  // Baca sensor BME280
  float temp = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  // Baca MQ-135 (analog)
  int adc = analogRead(PIN_MQ135_AO);
  float vout = (adc / 4095.0f) * 3.3f;
  float Rs = ((3.3f - vout) / vout) * MQ135_R_LOAD;
  float ppm = MQ135_RO_CLEAN * (3.6 / Rs);

  // Baca MQ-135 (digital alarm)
  bool do_alarm = digitalRead(PIN_MQ135_DO) == LOW;

  // Format JSON response
  StaticJsonDocument<512> doc;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;
  doc["mq_135_ppm"] = ppm;
  doc["mq_135_alarm"] = do_alarm;
  doc["mq_136_ppm"] = 5.0;  // Static placeholder
  doc["timestamp"] = millis();

  // Convert to string
  String response;
  serializeJson(doc, response);

  // Send response
  server.send(200, "application/json", response);
  Serial.println("[HTTP] Response sent: " + response);

  // Update OLED to show data was read
  updateOLEDReadingState();
}

// ==========================================
// HANDLER: GET /status (Optional Debug)
// ==========================================
void handleStatus() {
  Serial.println("[HTTP] GET /status request received");

  StaticJsonDocument<256> doc;
  doc["device"] = "ESP32-FreshGuard";
  doc["version"] = "1.0";
  doc["wifi_ssid"] = WiFi.SSID();
  doc["wifi_ip"] = WiFi.localIP().toString();
  doc["wifi_signal_strength"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  doc["bme280_ok"] = bme_initialized;
  doc["mq135_ok"] = true;

  String response;
  serializeJson(doc, response);

  server.send(200, "application/json", response);
}

// ==========================================
// SETUP WIFI
// ==========================================
void setupWiFi() {
  Serial.println("[WiFi] Connecting to: " + String(WIFI_SSID));

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
    Serial.println("[WiFi] IP Address: " + WiFi.localIP().toString());
    Serial.println("[WiFi] Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("[WiFi] Subnet: " + WiFi.subnetMask().toString());
  } else {
    Serial.println("\n[WiFi] Connection FAILED!");
    // Blink LED merah 5x
    for (int i = 0; i < 5; i++) {
      digitalWrite(PIN_LED_RED, HIGH);
      delay(200);
      digitalWrite(PIN_LED_RED, LOW);
      delay(200);
    }
  }
}

// ==========================================
// MAIN LOOP: Handle HTTP Requests
// ==========================================
void loop() {
  // PENTING: Handle incoming HTTP requests
  server.handleClient();

  // Existing sensor reading + LED update code
  // ... (keep original loop code)

  delay(100);
}

// ==========================================
// UPDATE SETUP() FUNCTION
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[FreshGuard] Booting...");

  // Initialize pins
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_MQ135_DO, INPUT);

  // Initialize sensors
  // ... (keep existing init code)

  // NEW: Setup WiFi & Web Server
  setupWiFi();
  setupWebServer();

  Serial.println("[FreshGuard] Setup complete!");
}
```

### 10.5.2 Kode Backend: Direct HTTP Calls ke ESP32

Backend Node.js dengan endpoint `/predict`:

```javascript
// File: backend/src/routes/predictRoutes.js
// atau backend/src/index.js (jika tidak pakai routing terpisah)

const express = require('express');
const axios = require('axios');  // npm install axios
const { spawn } = require('child_process');

const router = express.Router();

// ==========================================
// CONFIGURATION
// ==========================================
const ESP32_IP = process.env.ESP32_IP || '192.168.43.120';  // ← Edit sesuai IP ESP32
const ESP32_ENDPOINT = `http://${ESP32_IP}/read-sensor`;
const ESP32_TIMEOUT_MS = 5000;  // 5 detik timeout

console.log(`[CONFIG] ESP32 endpoint: ${ESP32_ENDPOINT}`);

// ==========================================
// ENDPOINT: POST /predict
// ==========================================
router.post('/predict', async (req, res) => {
  try {
    console.log('[PREDICT] Request received from frontend');

    // STEP 1: Fetch sensor data dari ESP32
    console.log(`[ESP32] Fetching data from: ${ESP32_ENDPOINT}`);
    
    let sensorData;
    try {
      const response = await axios.get(ESP32_ENDPOINT, {
        timeout: ESP32_TIMEOUT_MS
      });
      sensorData = response.data;
      console.log('[ESP32] Data received:', sensorData);
    } catch (error) {
      console.error('[ESP32] Connection error:', error.message);
      return res.status(503).json({
        success: false,
        error: 'ESP32 tidak dapat dihubungi',
        details: error.message
      });
    }

    // STEP 2: Validate sensor data
    if (!sensorData.temperature || sensorData.temperature === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sensor data from ESP32'
      });
    }

    // STEP 3: Invoke Python ML Model
    console.log('[ML] Invoking prediction model...');
    
    const prediction = await invokePythonModel(sensorData);

    console.log('[ML] Prediction result:', prediction);

    // STEP 4: Return hasil ke frontend
    return res.json({
      success: true,
      data: {
        // Sensor readings
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        pressure: sensorData.pressure,
        mq_135: sensorData.mq_135_ppm,
        mq_136: sensorData.mq_136_ppm,
        
        // Prediction results
        tvc: prediction.tvc,
        rsl_minutes: prediction.rsl_minutes,
        class: prediction.class,
        class_label: getClassLabel(prediction.class),
        
        // Metadata
        timestamp: new Date().toISOString(),
        esp32_timestamp: sensorData.timestamp
      },
      message: 'Prediksi berhasil'
    });

  } catch (error) {
    console.error('[PREDICT] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// HELPER: Invoke Python ML Model
// ==========================================
function invokePythonModel(sensorData) {
  return new Promise((resolve, reject) => {
    // Prepare input features
    const features = [
      sensorData.temperature,
      sensorData.humidity,
      sensorData.mq_135_ppm,
      sensorData.pressure || 1013.25
    ];

    // Spawn Python process
    const python = spawn('python', [
      './ai/predict.py',
      ...features.map(f => f.toString())
    ]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse JSON output from Python
          const result = JSON.parse(output);
          
          // Validate output
          if (!result.tvc || result.rsl_minutes === undefined || result.class === undefined) {
            reject(new Error('Invalid model output format'));
            return;
          }

          resolve(result);
        } catch (e) {
          console.error('[ML] Parse error:', e.message);
          console.error('[ML] Python output:', output);
          reject(new Error('Invalid model output: ' + e.message));
        }
      } else {
        console.error('[ML] Python error:', errorOutput);
        reject(new Error('Python model execution failed: ' + errorOutput));
      }
    });

    // Set timeout untuk Python execution
    setTimeout(() => {
      python.kill();
      reject(new Error('Python model timeout (>10s)'));
    }, 10000);
  });
}

// ==========================================
// HELPER: Format class label
// ==========================================
function getClassLabel(classValue) {
  const labels = {
    0: 'Safe ✅',
    1: 'Warning ⚠️',
    2: 'Danger 🔴'
  };
  return labels[classValue] || 'Unknown';
}

module.exports = router;
```

**Setup Backend:**
```bash
cd backend

# Install axios jika belum
npm install axios

# Edit .env untuk set ESP32_IP
echo "ESP32_IP=192.168.43.120" >> .env

# Run backend
npm run dev  # port 8000
```

### 10.5.3 Kode Frontend: Call Backend

Frontend React/Vite button untuk trigger prediction:

```jsx
// File: frontend/src/components/PredictionForm.jsx

import { useState } from 'react';

export default function PredictionForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // POST ke backend (localhost:8000)
      const response = await fetch('http://localhost:8000/api/food/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),  // Bisa kosong atau add params
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        console.log('[RESULT]', data.data);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (err) {
      console.error('[ERROR]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prediction-form">
      <button 
        onClick={handlePredict} 
        disabled={loading}
        className="btn-predict"
      >
        {loading ? 'Predicting...' : 'Predict'}
      </button>

      {loading && <p>Fetching data from ESP32 dan running model...</p>}

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-box">
          <h3>✅ Prediksi Berhasil!</h3>
          
          <section className="sensor-readings">
            <h4>📊 Sensor Data</h4>
            <p>Temperature: <strong>{result.temperature.toFixed(2)}°C</strong></p>
            <p>Humidity: <strong>{result.humidity.toFixed(2)}%</strong></p>
            <p>Air Quality (MQ-135): <strong>{result.mq_135.toFixed(2)} ppm</strong></p>
            <p>Pressure: <strong>{result.pressure.toFixed(2)} hPa</strong></p>
          </section>

          <section className="predictions">
            <h4>🔮 Prediction Results</h4>
            <div className={`status ${result.class === 0 ? 'safe' : result.class === 1 ? 'warning' : 'danger'}`}>
              Status: <strong>{result.class_label}</strong>
            </div>
            <p>TVC: <strong>{result.tvc.toFixed(2)} log₁₀ CFU/g</strong></p>
            <p>Shelf Life: <strong>{result.rsl_minutes} minutes ({(result.rsl_minutes / 60).toFixed(1)} hours)</strong></p>
          </section>

          <p className="timestamp">
            Recorded: {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
```

### 10.5.4 Testing & Debugging

**Test 1: Check ESP32 connectivity**
```bash
# Di terminal/command prompt, test endpoint ESP32
curl http://192.168.43.120/read-sensor

# Expected response:
# {
#   "temperature": 27.45,
#   "humidity": 68.20,
#   "pressure": 1013.25,
#   "mq_135_ppm": 125.40,
#   ...
# }
```

**Test 2: Check Backend connectivity ke ESP32**
```bash
# Run di laptop, test dari backend perspective
node -e "
const axios = require('axios');
axios.get('http://192.168.43.120/read-sensor')
  .then(r => console.log(r.data))
  .catch(e => console.error(e.message))
"
```

**Test 3: Full flow test**
```bash
# 1. Pastikan ESP32 online
curl http://192.168.43.120/status

# 2. Run backend
cd backend && npm run dev

# 3. Buka browser
open http://localhost:3000

# 4. Klik button "Predict"
# Check console untuk error messages
```

**Common Issues:**

| Error | Solusi |
|-------|--------|
| `Cannot reach ESP32` | - Cek IP address (lihat Serial Monitor ESP32)<br>- Pastikan laptop + ESP32 di Wi-Fi sama<br>- Cek firewall |
| `JSON parse error` | - Cek output ESP32 di `/read-sensor`<br>- Pastikan response valid JSON |
| `Python model error` | - Test Python script manual: `python ai/predict.py 27.45 68.2 125.4`<br>- Pastikan model file ada di `ai/models/` |
| `CORS error` | - Backend harus run di port 8000<br>- Frontend harus allow POST ke localhost:8000 |

### 10.5.5 Network Diagram (Simplified)

```
┌──────────────────────────────────────────────┐
│            Wi-Fi Network (2.4 GHz)           │
│         Router / Hotspot                     │
├──────────────────────────────────────────────┤
│                                              │
│  192.168.43.100 (Laptop)                     │
│  ┌────────────────────────────────┐          │
│  │ Frontend (localhost:3000)      │          │
│  │ ├─ React/Vite                  │          │
│  │ └─ Button: "Predict"           │          │
│  └────────────┬────────────────────┘          │
│               │ HTTP POST /predict            │
│               ▼                               │
│  ┌────────────────────────────────┐          │
│  │ Backend (localhost:8000)       │          │
│  │ ├─ Node.js Express             │          │
│  │ ├─ Python ML Model             │          │
│  │ └─ axios (HTTP client)         │          │
│  └────────────┬────────────────────┘          │
│               │ HTTP GET /read-sensor         │
│               ▼                               │
│  192.168.43.120 (ESP32)                      │
│  ┌────────────────────────────────┐          │
│  │ Web Server (port 80)           │          │
│  │ ├─ GET /read-sensor            │          │
│  │ ├─ GET /status                 │          │
│  │ ├─ BME280 sensor (I2C)         │          │
│  │ ├─ MQ-135 sensor (ADC)         │          │
│  │ └─ OLED Display + LEDs         │          │
│  └────────────────────────────────┘          │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 11. Monitoring & Verifikasi Data

### 11.1 Cek Data di Supabase Dashboard

1. Buka https://supabase.com → project kamu
2. Klik **Table Editor → kondisi_makanan**
3. Data baru akan muncul setiap 30 detik setelah ESP32 terkoneksi

Contoh tampilan data:

| id | mq_135 | mq_136 | temperature | humidity | tvc | rsl_minutes | class | created_at |
|----|--------|--------|-------------|----------|-----|-------------|-------|------------|
| uuid | 125.40 | 5.0 | 27.45 | 68.20 | 0.0 | 0.0 | 1 | 2026-05-09T... |

### 11.2 Query Data via SQL Editor

```sql
-- Lihat 10 data terbaru
select * from kondisi_makanan
order by created_at desc
limit 10;

-- Lihat data dengan kondisi Warning atau Danger
select * from kondisi_makanan
where class >= 1
order by created_at desc;

-- Rata-rata suhu dan kelembapan hari ini
select
  avg(temperature) as avg_temp,
  avg(humidity) as avg_hum,
  count(*) as total_readings
from kondisi_makanan
where created_at >= now() - interval '24 hours';
```

### 11.3 Cek via API Backend

Jika backend Node.js sedang berjalan:

```bash
# Lihat semua data makanan (50 terbaru)
curl http://localhost:3001/api/food

# Lihat 10 data saja
curl http://localhost:3001/api/food?limit=10

# Cek kesehatan server
curl http://localhost:3001/health
```

### 11.4 Trigger Prediksi AI Manual

Untuk mengisi kolom `tvc`, `rsl_minutes`, dan `class` dengan hasil model AI:

```bash
curl -X POST http://localhost:3001/api/food/manual \
  -H "Content-Type: application/json" \
  -d '{
    "mq135": 125.40,
    "mq136": 5.0,
    "temperature": 27.45,
    "humidity": 68.20
  }'
```

Respons sukses:
```json
{
  "data": {
    "id": "uuid-xxx",
    "mq_135": 125.40,
    "mq_136": 5.0,
    "temperature": 27.45,
    "humidity": 68.20,
    "tvc": 4.12,
    "rsl_minutes": 1860,
    "class": 2,
    "class_name": "Warning",
    "class_probabilities": {
      "Safe": 0.12,
      "Warning": 0.71,
      "Danger": 0.17
    }
  }
}
```

### 11.5 Monitor Serial ESP32 (Real-time)

Di Arduino IDE → Tools → Serial Monitor (baud rate 115200):

```
[Sensors] Temp=27.45°C  Hum=68.20%  Pres=1013.2hPa  MQ135=125.40ppm  DO=OK  MQ136*=5.00ppm
[HTTP] POST → https://odjegqwlqagjocxvciuk.supabase.co/rest/v1/kondisi_makanan
[HTTP] Payload: {"mq_135":125.4,"mq_136":5.0,"temperature":27.45,"humidity":68.2,"h2s":null,"voc":null,"amonia":null,"tvc":0.0,"rsl_minutes":0.0,"class":1}
[HTTP] Response: 201
[HTTP] Upload SUCCESS
```

---

## 12. Indikator LED & OLED

### 12.1 Indikator LED

| Kondisi | LED | Arti |
|---------|-----|------|
| MQ-135 < 200 ppm & DO normal | 🟢 **Hijau** | Makanan AMAN |
| MQ-135 200–400 ppm ATAU DO alarm | 🟡 **Kuning** | Makanan PERINGATAN |
| MQ-135 > 400 ppm | 🔴 **Merah** | Makanan BAHAYA / BUSUK |
| Semua berkedip cepat saat boot | 🔴 Merah berkedip | BME280 tidak terdeteksi — cek kabel |

### 12.2 Tampilan OLED

```
┌────────────────┐
│ == FRESH GUARD == │
│ Temp :  27.45 C  │
│ Hum  :  68.20 %  │
│ MQ135: 125.40 ppm│
│ DO   : OK         │
│ MQ136:  5.0 ppm* │
│ UP: OK  [201]     │
└────────────────┘
```

| Baris | Keterangan |
|-------|------------|
| Temp | Suhu dari BME280 (°C) |
| Hum | Kelembapan dari BME280 (%RH) |
| MQ135 | Nilai ppm dari sensor MQ-135 |
| DO | Status digital output MQ-135 (OK / ! ALARM !) |
| MQ136 | Nilai placeholder statis 5.0 ppm (bertanda `*`) |
| UP | Status upload terakhir ke Supabase + HTTP code |

---

## 13. Troubleshooting

### 🔴 BME280 tidak terdeteksi — ESP32 stuck berkedip merah

**Penyebab:**
- Kabel SDA/SCL terbalik atau tidak terpasang
- Tegangan salah (harus 3.3V)
- Alamat I2C salah

**Solusi:**
1. Cek ulang koneksi: SDA → GPIO 33, SCL → GPIO 25
2. Buka Serial Monitor, cari baris `[BME280]`
3. Coba tukar alamat I2C di kode: ganti `0x76` jadi `0x77`
4. Gunakan I2C Scanner untuk mendeteksi alamat:

```cpp
// Paste ke sketch sementara untuk scan alamat I2C
#include <Wire.h>
void setup() {
  Serial.begin(115200);
  Wire1.begin(33, 25); // SDA, SCL untuk BME280
  for (byte addr = 1; addr < 127; addr++) {
    Wire1.beginTransmission(addr);
    if (Wire1.endTransmission() == 0) {
      Serial.printf("Ditemukan I2C di alamat: 0x%02X\n", addr);
    }
  }
}
void loop() {}
```

---

### 🟡 OLED tidak menampilkan apapun

**Penyebab:**
- Alamat I2C OLED salah (0x3C vs 0x3D)
- Koneksi SDA/SCL ke Wire (bukan Wire1)

**Solusi:**
1. Cek Serial Monitor untuk pesan `[OLED]`
2. Coba alamat 0x3D (edit di kode, baris `oled.begin(...)`)
3. Pastikan SDA → GPIO 26, SCL → GPIO 27

---

### 🔴 Wi-Fi tidak terkoneksi

**Penyebab:**
- SSID atau password salah
- Router menggunakan 5 GHz
- Jarak terlalu jauh dari router

**Solusi:**
1. Cek SSID dan password di Section 1 kode
2. Pastikan router menggunakan **2.4 GHz**
3. Pindahkan ESP32 lebih dekat ke router
4. Cek Serial Monitor: `[WiFi] Connection FAILED`

---

### 🔴 Upload ke Supabase gagal (HTTP 401)

**Penyebab:**
- SUPABASE_ANON_KEY salah
- Row Level Security (RLS) belum dikonfigurasi

**Solusi:**
1. Cek kembali anon key di Supabase Dashboard → Settings → API
2. Pastikan policy RLS sudah dibuat (lihat [8.2](#82-buat-tabel-di-database))
3. Coba disable RLS sementara untuk testing:
   ```sql
   alter table kondisi_makanan disable row level security;
   ```

---

### 🟡 Upload ke Supabase gagal (HTTP 400)

**Penyebab:**
- Format JSON tidak sesuai schema
- Kolom `tvc`, `rsl_minutes`, atau `class` tidak valid

**Solusi:**
1. Buka Serial Monitor, salin baris `[HTTP] Payload:`
2. Paste ke https://jsonlint.com untuk validasi
3. Pastikan tidak ada field yang `null` pada kolom `NOT NULL`

---

### 🟡 Nilai MQ-135 tidak stabil / selalu 0 atau 2000

**Penyebab:**
- Sensor belum warm-up (butuh 24–48 jam)
- `MQ135_RO_CLEAN` belum dikalibrasi
- Koneksi AO ke GPIO 32 longgar

**Solusi:**
1. Biarkan ESP32 menyala selama 24 jam untuk warm-up awal
2. Lakukan kalibrasi penuh sesuai [Section 7](#7-kalibrasi-sensor-mq-135)
3. Cek koneksi kabel AO dari modul MQ-135 ke GPIO 32

---

### 🔴 Port COM tidak muncul di Arduino IDE

**Penyebab:**
- Driver USB-to-Serial belum terinstall

**Solusi:**
1. Download dan install driver **CP2102** dari Silicon Labs:
   https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
2. Restart Arduino IDE setelah install driver
3. Coba cabut dan pasang kembali USB ESP32

---

## 14. Referensi Endpoint API

### Backend Node.js (http://localhost:3001)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Cek koneksi server dan database |
| GET | `/api/food` | Ambil data kondisi makanan (max 50) |
| GET | `/api/food?limit=N` | Ambil N data terbaru |
| POST | `/api/food/manual` | Trigger prediksi AI manual |

### Supabase REST API (PostgREST)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/rest/v1/kondisi_makanan` | Insert data sensor (dipakai ESP32) |
| GET | `/rest/v1/kondisi_makanan` | Baca semua data |
| GET | `/rest/v1/kondisi_makanan?order=created_at.desc&limit=10` | 10 data terbaru |

### Klasifikasi Kesegaran Makanan

| Class | Label | TVC | Arti |
|-------|-------|-----|------|
| `0` | **Safe** | ≤ 4.0 log₁₀ CFU/g | Aman dikonsumsi |
| `1` | **Warning** | 4.0 – 5.0 log₁₀ CFU/g | Mendekati batas spoilage |
| `2` | **Danger** | ≥ 5.0 log₁₀ CFU/g | Sudah busuk / tidak layak |

> **TVC** = Total Viable Count (jumlah total bakteri hidup per gram makanan)
> **RSL** = Remaining Shelf Life (sisa waktu layak konsumsi dalam menit)

---

## Checklist Sebelum Operasional

Pastikan semua item berikut sudah selesai sebelum sistem dioperasikan:

- [ ] Semua komponen terhubung sesuai skema pin
- [ ] Arduino IDE terinstall dengan ESP32 board support
- [ ] Semua 5 library sudah terinstall
- [ ] SSID dan password Wi-Fi sudah diisi di kode
- [ ] Firmware berhasil diupload (tidak ada error)
- [ ] Serial Monitor menunjukkan `[FreshGuard] Setup complete`
- [ ] OLED menampilkan data sensor
- [ ] LED menyala sesuai kondisi
- [ ] Tabel `kondisi_makanan` sudah dibuat di Supabase
- [ ] RLS policy sudah dibuat
- [ ] Data muncul di Supabase Table Editor dalam 30 detik
- [ ] Sensor MQ-135 sudah warm-up minimal 24 jam
- [ ] Kalibrasi MQ-135 sudah dilakukan (opsional tapi dianjurkan)

---

*Dibuat untuk sistem Fresh Guard — Kelompok 4, K-03*
*Rekayasa Sistem dan Teknologi Informasi*