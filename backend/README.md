# Backend — Perpustakaan Digital

Project **Supabase lokal** (Postgres + Auth + Storage + Edge Functions via Docker), bukan
backend Express custom. Lihat `CLAUDE.md` di root repo untuk konteks produk & skema lengkap.

## Struktur

```
supabase/
  config.toml               konfigurasi project Supabase lokal
  migrations/                satu-satunya sumber kebenaran skema DB (tabel, RLS, RPC)
  functions/
    gemini-chat/              chatbot rekomendasi buku (Gemini API)
    telegram-notify/          kirim pesan/alert ke Telegram admin
    telegram-webhook/         proses balasan 1/2 admin dari Telegram
    cek-keterlambatan/        wrapper RPC cek_keterlambatan(), dipanggil job terjadwal
  seed.sql                    seed SATU akun admin bootstrap (bukan data dummy — lihat di bawah)
scripts/
  telegram-poll.js            long polling Telegram getUpdates -> forward ke telegram-webhook
  cron-keterlambatan.js       jadwal berkala panggil cek-keterlambatan
```

## Prasyarat

- Docker Desktop (jalan & aktif)
- Node.js 18+ (dipakai untuk `npx supabase` dan 2 script lokal)

## Jalanin backend

```bash
cp .env.example .env
npm install

npm run supabase:start   # jalanin Postgres + Auth + Storage + Studio + Edge Functions lokal
npm run supabase:reset   # apply migrations/*.sql dari awal (jalankan tiap ada migration baru)
npm run supabase:status  # lihat lagi API URL & anon key kalau lupa
```

API URL lokal: `http://127.0.0.1:54321`. Studio (GUI lihat/edit data): `http://127.0.0.1:54323`.

Isi `SUPABASE_ANON_KEY` di `.env` dengan nilai dari `npm run supabase:status`, lalu isi
`frontend/.env` juga dengan `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` yang sama (lihat
`frontend/README.md`).

## Akun admin bawaan

`supabase/seed.sql` otomatis bikin **satu** akun admin tiap `supabase db reset`, supaya ada cara
login sebagai admin pertama kali (tanpa ini gak ada yang bisa naikin role user manapun jadi
admin). Katalog buku & data lain TETAP kosong seperti biasa (CLAUDE.md §4) — cuma akun ini yang
di-seed, bukan data dummy/contoh.

```
Email    : admin@perpustakaan.local
Password : admin123
```

Ganti password ini kalau dipakai di luar lingkungan development lokal.

## Setup secret Edge Functions

Edge Functions (`gemini-chat`, `telegram-notify`, `telegram-webhook`) butuh secret — **jangan**
taruh di `.env` frontend/backend. `npx supabase secrets set` **tidak bisa dipakai untuk local
dev** (perintah itu targetnya project cloud yang sudah di-link, butuh `supabase login`). Untuk
lokal, buat file `supabase/functions/.env` (sudah di-gitignore, jangan pernah commit):

```bash
# backend/supabase/functions/.env
GEMINI_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
BOT_ADMIN_CHAT_ID=xxx
```

Lalu restart stack biar ke-load (`supabase stop` lanjut `supabase start`, atau kalau cuma edit
secret tanpa ubah kode function, cukup `docker restart supabase_edge_runtime_backend`).
`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia di dalam Edge Function, tidak
perlu di-set manual.

Tanpa `GEMINI_API_KEY`, chatbot tetap jalan tapi selalu balas fallback message. Tanpa
`TELEGRAM_BOT_TOKEN`/`BOT_ADMIN_CHAT_ID`, alur konfirmasi lewat Telegram tidak akan mengirim
apa-apa — dashboard admin tetap bisa dipakai penuh sebagai kanal utama.

`BOT_ADMIN_CHAT_ID` harus chat ID admin yang **sudah pernah kirim pesan ke bot minimal sekali**
(mis. `/start`) — Telegram menolak bot yang push pesan duluan ke chat yang belum pernah
menghubunginya ("Bad Request: chat not found").

## Jalanin Edge Functions secara lokal

`supabase start` sudah otomatis menjalankan runtime Edge Functions. Kalau perlu hot-reload saat
mengedit fungsi, jalankan di terminal terpisah:

```bash
npm run functions:serve
```

## Script tambahan (opsional, terminal ke-3 & ke-4)

Dua script ini men-simulasikan job/webhook yang di cloud biasanya otomatis (lihat CLAUDE.md §8–9
untuk kenapa perlu ini di setup lokal):

```bash
npm run telegram:poll          # long polling balasan admin di Telegram
npm run cron:keterlambatan     # cek keterlambatan tiap 6 jam (+ langsung sekali saat start)
```

Keduanya best-effort untuk kondisi lokal — kalau tidak dijalankan, dashboard admin tetap jadi
kanal konfirmasi utama yang berfungsi penuh.

## Kalau sudah selesai kerja

```bash
npm run supabase:stop
```
