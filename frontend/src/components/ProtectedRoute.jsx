import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Wajib login. Dipasang di route yang butuh user (apapun role-nya). */
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center text-leather-600">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
