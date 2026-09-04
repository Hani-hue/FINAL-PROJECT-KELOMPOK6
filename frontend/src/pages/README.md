# pages/

Komponen level-halaman - satu file di sini biasanya mewakili satu route
utuh (yang didaftarin di `routes/index.jsx`).

Bedanya sama `components/`: halaman di sini boleh "tau banyak hal" (panggil
beberapa helper `lib/api/` sekaligus, atur layout keseluruhan halaman),
sedangkan `components/` isinya potongan UI kecil yang reusable.

## Isi saat ini

- `Login.jsx`, `Register.jsx` - autentikasi lewat `useAuth()`.
- `Catalog.jsx` - katalog buku publik (cari & filter genre), route `/`.
- `BookDetail.jsx` - detail 1 buku + tombol ajukan peminjaman.
- `MyLoans.jsx` - "Peminjaman Saya": riwayat, ajukan pengembalian/perpanjangan.
- `Chatbot.jsx` - chat rekomendasi buku (Gemini lewat Edge Function).
- `admin/AdminDashboard.jsx` - ringkasan angka transaksi.
- `admin/AdminUsers.jsx` - kelola user (aktifkan/nonaktifkan akun).
- `admin/AdminBooks.jsx` - CRUD buku + upload sampul ke Supabase Storage.
- `admin/AdminTransactions.jsx` - konfirmasi/tolak pengajuan pinjam,
  pengembalian, & perpanjangan; filter status & tanggal.

## Pola yang disaranin

Halaman = compose dari `lib/api/*` (data), `context/*` (auth & alert), dan
`components/*` (tampilan). Hindari nulis query Supabase langsung di JSX
halaman - taruh di `lib/api/` biar konsisten & gampang dipake ulang.
