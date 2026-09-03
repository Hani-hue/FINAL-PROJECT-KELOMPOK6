# Frontend — Perpustakaan Digital

Vite + React (JSX) + Tailwind CSS, terhubung langsung ke Supabase lokal lewat
`@supabase/supabase-js` (tanpa backend Express perantara). Lihat `CLAUDE.md` di
root repo untuk konteks produk & konvensi kode lengkap.

## Struktur

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx           entry point
    ├── App.jsx            bungkus <BrowserRouter>, <AlertProvider>, <AuthProvider>, <Navbar>
    ├── index.css          import tailwind
    ├── lib/
    │   ├── supabaseClient.js   satu-satunya createClient() Supabase
    │   └── api/                helper .from()/.rpc()/.functions.invoke() per entitas (README sendiri)
    ├── context/            AuthContext & AlertContext (README sendiri)
    ├── routes/             definisi semua route (README sendiri)
    ├── pages/               komponen level-halaman (README sendiri)
    ├── components/          komponen UI reusable (README sendiri)
    ├── hooks/               custom hooks non-context (README sendiri)
    └── utils/               fungsi bantu non-React (README sendiri)
```

## Alur render-nya

```
main.jsx
  └── App.jsx (Router + AlertProvider + AuthProvider + Navbar)
        └── routes/index.jsx   (AppRoutes)
              └── pages/*.jsx
                    ├── lib/api/*.js       (query/RPC ke Supabase)
                    ├── context/*.jsx      (useAuth, useAlert)
                    └── components/*.jsx   (tampilan)
```

## Cara install & jalanin

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`. Isi `.env` dengan `VITE_SUPABASE_URL` &
`VITE_SUPABASE_ANON_KEY` dari `npx supabase status` (jalankan
`supabase start` dulu di folder `backend/` — lihat `backend/README.md`).

## Environment variable

Semua env variable buat Vite WAJIB diawali `VITE_`, kalo enggak gak bakal
ke-expose ke kode frontend (fitur keamanan bawaan Vite). `VITE_SUPABASE_ANON_KEY`
aman untuk frontend karena akses data tetap dibatasi Row Level Security di
database — `service_role key` TIDAK PERNAH dipakai di sini.
