# lib/api/

Satu-satunya tempat yang boleh manggil `supabase.from(...)`, `.rpc(...)`,
`.storage...`, atau `.functions.invoke(...)` (lihat CLAUDE.md §7). Halaman &
komponen import fungsi dari sini, bukan manggil `supabase` langsung.

## Isi saat ini

- `auth.js` - signUp/signIn/signOut & ambil profil (dipake `context/AuthContext.jsx`).
- `books.js` - CRUD katalog buku + upload sampul ke Storage bucket `sampul-buku`. Dua kolom
  kategori terpisah: `genre_id` (tema cerita — aksi/drama/romansa/dst, tabel `genre`) dan
  `jenis_buku_id` (format/kategori — komik/novel/buku pengetahuan, tabel `jenis_buku`).
- `genres.js` - daftar & tambah baris di tabel `genre`.
- `jenisBuku.js` - daftar & tambah baris di tabel `jenis_buku`.
- `loans.js` - ajukan/setujui/tolak peminjaman & pengembalian (RPC), plus query
  riwayat (`myLoans`) & semua transaksi buat admin (`allLoans`).
- `extensions.js` - ajukan (insert langsung, dibatasi RLS) & setujui/tolak (RPC)
  permintaan perpanjangan.
- `users.js` - daftar user & toggle `is_active` (dipake admin).
- `chat.js` - kirim pesan ke chatbot (Edge Function `gemini-chat`).
- `dashboard.js` - query count aggregate buat kartu statistik dashboard admin.
- `telegramNotify.js` - helper bersama (dipake `loans.js` & `extensions.js`)
  buat manggil Edge Function `telegram-notify`, best-effort (gak nge-throw
  kalau gagal, supaya alur utama tetap sukses walau Telegram belum di-setup).

## Konvensi

Setiap fungsi: satu operasi, throw error kalau `{ error }` dari Supabase
terisi (biar caller tinggal try/catch + `showAlert()`), return `data` kalau
sukses.
