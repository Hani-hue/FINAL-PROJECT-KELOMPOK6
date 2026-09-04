# routes/

Tempat definisi semua route/halaman aplikasi, pake `react-router-dom`.

`App.jsx` cuma manggil `<AppRoutes />` dari `routes/index.jsx` - dia gak perlu
tau ada halaman apa aja, itu tanggung jawab folder ini.

## Cara nambah halaman baru

1. Bikin komponen halamannya di `pages/`
2. Import di `routes/index.jsx`
3. Tambahin `<Route path="..." element={<NamaHalaman />} />`

Contoh:
```jsx
import BookDetail from '../pages/BookDetail';

<Routes>
  <Route path="/" element={<Catalog />} />
  <Route path="/buku/:id" element={<BookDetail />} />  {/* baris baru */}
</Routes>
```

Route yang butuh login dibungkus `<Route element={<ProtectedRoute />}>`,
yang butuh role admin dibungkus `<Route element={<AdminRoute />}>` (lihat
`components/ProtectedRoute.jsx` & `components/AdminRoute.jsx`) - route
anak di dalamnya otomatis ke-redirect kalau syaratnya gak terpenuhi.
