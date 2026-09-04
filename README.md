# Perpustakaan Digital — Kelompok 6

Aplikasi perpustakaan digital dengan chatbot rekomendasi AI (Gemini) dan konfirmasi admin lewat
Telegram. Final project mata kuliah PAW. Lihat `CLAUDE.md` untuk spesifikasi produk & skema
database lengkap.

## Struktur

```
perpustakaan-digital/
├── backend/     # Project Supabase lokal (migrations, Edge Functions) + script lokal — lihat backend/README.md
└── frontend/    # Vite + React + Tailwind, terhubung ke Supabase lokal — lihat frontend/README.md
```

Tiap folder (termasuk sub-folder di `frontend/src/`) punya README sendiri yang jelasin isi &
fungsinya masing-masing.

## Cara jalanin semuanya

Butuh Docker Desktop (buat Supabase lokal) + Node.js 18+. Minimal 2 terminal terpisah:

**Terminal 1 — Backend (Supabase lokal):**
```bash
cd backend
cp .env.example .env
npm install
npm run supabase:start
npm run supabase:reset
npm run supabase:status   # catat API URL & anon key buat langkah berikutnya
```

**Terminal 2 — Frontend:**
```bash
cd frontend
cp .env.example .env      # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY dari langkah di atas
npm install
npm run dev
```

Buka `http://localhost:5173`. Supabase Studio (lihat/edit data lewat GUI):
`http://127.0.0.1:54323`.

Setup secret Edge Functions (Gemini & Telegram) dan 2 script tambahan (long polling Telegram +
job cek keterlambatan) dijelaskan di `backend/README.md`.

## Kenapa dipisah 2 folder (bukan 1 project)

Backend (Supabase project) dan frontend punya siklus hidup & tooling masing-masing (`supabase
start/reset` vs `npm run dev`) — dipisah dari awal biar jelas batasnya, dan sesuai konvensi
project Supabase CLI yang punya foldernya sendiri.

## Cara pake template ini buat menambah fitur baru

1. Backend: skema baru lewat `supabase migration new <nama>` di `backend/supabase/migrations/`,
   lalu `npm run supabase:reset`. Query/RPC baru dari frontend cukup lewat helper di
   `frontend/src/lib/api/`, jangan generate model/class terpisah.
2. Frontend: tambah halaman baru di `pages/`, daftarin di `routes/index.jsx`, pisahin query ke
   `lib/api/`, potongan UI reusable ke `components/`.
