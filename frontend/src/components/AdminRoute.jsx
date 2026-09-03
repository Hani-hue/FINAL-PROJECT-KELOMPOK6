import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Wajib login DAN role admin. Dipasang di semua route /admin/*. */
function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="p-8 text-center text-leather-600">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default AdminRoute;
