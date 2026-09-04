# hooks/

Custom React hooks - tempat logic yang butuh React state/lifecycle
(`useState`, `useEffect`, dst) tapi bukan bagian dari tampilan, dan **tidak**
perlu dibagi lintas komponen lewat context.

## Kenapa folder ini kosong sekarang

State yang dipakai di banyak halaman sekaligus (siapa yang login, role-nya
apa, notifikasi toast) ditaruh di `context/` (`AuthContext.jsx`,
`AlertContext.jsx`) lewat `useAuth()` / `useAlert()`, karena butuh dibagi ke
seluruh pohon komponen, bukan cuma dipakai ulang di satu-dua tempat.

Folder ini tetap disediakan buat custom hook yang sifatnya lokal/dipake
ulang tanpa perlu context - misalnya `useDebounce`, `usePagination`, dsb,
kalau nanti dibutuhkan.

## Pola penamaan

Semua custom hook diawali `use` (aturan React, biar React tau ini hook dan
nge-apply rules of hooks ke dia). Satu file = satu hook.
