# utils/

Fungsi bantu murni (pure functions) yang gak nyangkut React sama sekali -
gak ada `useState`, gak ada JSX, cuma logic biasa yang bisa dipanggil dari
mana aja.

## Isi saat ini

- `date.js` - format tanggal/waktu ke Bahasa Indonesia (`formatTanggal`,
  `formatTanggalWaktu`) & cek apakah suatu tanggal sudah lewat
  (`sudahLewatBatas`).
- `validation.js` - validasi form sederhana (`validasiEmail`,
  `validasiPasswordMinimal`), dipake di `pages/Register.jsx`.

## Bedanya sama lib/api/

`utils/` = fungsi murni, gak nyentuh Supabase/network sama sekali.
`lib/api/` = helper yang manggil `supabase.from()/.rpc()/.functions.invoke()`
- lihat `lib/api/README.md`.
