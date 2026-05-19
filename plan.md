# FreshGuard - Rencana Perubahan Sistem

Dokumen ini berisi rencana awal perubahan sistem sesuai kebutuhan terbaru. Fokus saat ini adalah pemisahan data per akun, penyederhanaan halaman, dan alur prediksi end-to-end.

## 1) Tujuan Perubahan

1. Menambahkan tabel user agar setiap akun memiliki data history prediksi masing-masing.
2. Mengubah struktur halaman aplikasi menjadi 3 halaman aktif:
	- Predict
	- Dashboard
	- History
3. Memastikan hasil prediksi tersimpan, ditampilkan di dashboard, dan muncul di history akun terkait.

## 2) Scope Utama

### 2.1 Database

1. Tambah tabel `users`.
2. Sesuaikan tabel history prediksi (atau tabel hasil prediksi yang sudah ada) agar punya relasi ke user.
3. Pastikan query history selalu terfilter berdasarkan user yang sedang login.
4. Karena login memakai Google, data password tidak perlu disimpan ke database.

### 2.2 Backend API

1. Endpoint prediksi menerima konteks user yang login.
2. Hasil prediksi disimpan ke tabel history milik user tersebut.
3. Endpoint history hanya mengembalikan data milik user terkait.
4. Endpoint ringkasan/dashboard mengambil data prediksi terbaru untuk user terkait.

### 2.3 Frontend

1. Buat/aktifkan halaman `Predict`.
2. Rework halaman `Dashboard` untuk menampilkan hasil prediksi terbaru.
3. Buat/aktifkan halaman `History` untuk daftar prediksi yang pernah dilakukan user.
4. Nonaktifkan/arsipkan menu lama yang masih dummy (sensors, device logs, settings) dari navigasi utama.

## 3) Desain Data (Draft)

### 3.1 Tabel `users`

Kolom minimal (draft):

1. `id` (PK)
2. `email` (unik)
3. `created_at`
4. `updated_at`

### 3.2 Tabel history prediksi

Jika sudah ada tabel history, tambahkan:

1. `user_id` (FK -> users.id)
2. Index pada `user_id` dan `created_at`

Data yang disimpan per prediksi (minimal):

1. Input sensor/data mentah
2. Hasil prediksi (label/score)
3. Timestamp

## 4) Flow Aplikasi Baru

1. User login.
2. User masuk ke halaman Predict.
3. User menekan tombol Predict.
4. Frontend kirim request prediksi + token/session user.
5. Backend proses model, simpan hasil ke history dengan `user_id`.
6. User diarahkan/lihat halaman Dashboard untuk hasil terbaru.
7. User buka History untuk melihat seluruh riwayat prediksi miliknya.
8. User tetap bisa navigasi bebas ke Dashboard atau History tanpa harus menekan tombol Predict terlebih dahulu.

## 5) Rencana Halaman

### 5.1 Predict Page

Isi utama:

1. Header prediksi
2. Penjelasan singkat fungsi prediksi.
3. Tombol `Predict` sebagai aksi utama.
4. State loading/success/error yang jelas.

### 5.2 Dashboard Page

Isi utama:

1. Ringkasan hasil prediksi terbaru.
2. Detail data input yang digunakan.
3. Hasil klasifikasi/prediksi dan indikator status.

### 5.3 History Page

Isi utama:

1. Daftar riwayat prediksi user (terurut terbaru).
2. Informasi waktu prediksi.
3. Nilai input penting + output prediksi.
4. Empty state jika belum ada data.

## 6) Tahapan Implementasi

1. Finalisasi skema tabel user + relasi history.
2. Migrasi database.
3. Update backend (controller, routes, query by user).
4. Implement/rework halaman Predict, Dashboard, History.
5. Integrasi alur submit predict -> simpan -> tampil dashboard/history.
6. Uji end-to-end per akun.

## 7) Kriteria Selesai (Definition of Done)

1. Data history antar akun terpisah dengan benar.
2. Predict page berfungsi dan bisa trigger prediksi.
3. Dashboard menampilkan hasil prediksi terbaru user.
4. History menampilkan daftar prediksi milik user yang login.
5. Navigasi utama hanya menampilkan Predict, Dashboard, History.

## 8) Risiko & Catatan

1. Perlu sinkronisasi mekanisme auth yang dipakai (Supabase/Auth custom).
2. Jika tabel lama belum punya kolom relasi user, migrasi data lama mungkin diperlukan.
3. Validasi backend wajib agar user tidak bisa membaca history akun lain.

## 9) Next Placeholder

Bagian ini disiapkan untuk tambahan requirement berikutnya (UI detail, filter history, pagination, export, dsb).
