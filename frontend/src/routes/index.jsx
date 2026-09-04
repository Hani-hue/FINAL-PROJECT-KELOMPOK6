import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Catalog from '../pages/Catalog';
import BookDetail from '../pages/BookDetail';
import MyLoans from '../pages/MyLoans';
import Chatbot from '../pages/Chatbot';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminBooks from '../pages/admin/AdminBooks';
import AdminTransactions from '../pages/admin/AdminTransactions';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';

/**
 * Semua route halaman didaftarin di sini. Nambah halaman baru: import + tambah <Route> di sini,
 * bungkus dengan <ProtectedRoute>/<AdminRoute> kalau butuh login/role tertentu.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/buku/:id" element={<BookDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/peminjaman-saya" element={<MyLoans />} />
        <Route path="/chatbot" element={<Chatbot />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/buku" element={<AdminBooks />} />
        <Route path="/admin/transaksi" element={<AdminTransactions />} />
        <Route path="/admin/user" element={<AdminUsers />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
