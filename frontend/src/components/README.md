# components/

Komponen UI kecil yang reusable - bisa dipake di banyak halaman berbeda.

Prinsipnya: komponen di sini **berbasis data** (props masuk, tampilan
keluar), gak nyimpen logic fetch data sendiri. Kalo butuh data dari
Supabase, itu tanggung jawab `lib/api/` + state di halaman (`pages/`),
bukan komponen ini.

## Isi saat ini

- `Navbar.jsx` - navigasi atas, link-nya berubah sesuai status login &
  role (`useAuth()` dari `context/AuthContext.jsx`).
- `ProtectedRoute.jsx` / `AdminRoute.jsx` - route guard (`<Outlet />`
  wrapper), redirect ke `/login` atau `/` kalau belum login / bukan admin.
  Dipasang di `routes/index.jsx`, bukan dipanggil manual di tiap halaman.
- `Alert.jsx` - tampilan murni buat daftar toast; state-nya dikelola di
  `context/AlertContext.jsx` (`useAlert().showAlert(message, type)`).
- `BookCard.jsx` - kartu buku di grid katalog.
- `StatusBadge.jsx` - badge warna-warni buat status peminjaman/perpanjangan
  (`menunggu_konfirmasi`, `dipinjam`, dst).

## Kapan bikin komponen baru di sini

Kalo ada potongan UI yang dipake di lebih dari 1 halaman, atau kalo satu
halaman udah kepanjangan dan bisa dipecah jadi bagian-bagian yang lebih
kecil dan jelas namanya.
