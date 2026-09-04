# context/

State yang dipakai lintas banyak komponen/halaman sekaligus, lewat React
Context + custom hook (`useAuth()`, `useAlert()`).

## Isi saat ini

- `AuthContext.jsx` - session Supabase Auth + profil (`nama`, `role`,
  `is_active`) yang sedang login. Expose `login`, `register`, `logout`,
  `user`, `profile`, `isAdmin`, `loading`. Dipakai `Navbar`,
  `ProtectedRoute`, `AdminRoute`, dan halaman yang butuh tau siapa yang
  login.
- `AlertContext.jsx` - toast notifikasi bersama (`showAlert(message, type)`),
  dirender lewat `components/Alert.jsx`. Dipakai semua halaman sebagai
  pengganti `alert()` bawaan browser (lihat CLAUDE.md §7).

## Kapan nambah context baru di sini

Kalau ada state yang beneran perlu dibagi ke banyak bagian aplikasi yang
gak bertetangga langsung di tree komponen. Kalau cuma dipakai 1-2 komponen
yang bertetangga, cukup lewat props atau custom hook di `hooks/`.
