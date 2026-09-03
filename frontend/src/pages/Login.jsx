import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

function Login() {
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showAlert('Berhasil login', 'success');
      navigate('/');
    } catch (err) {
      showAlert(err.message || 'Gagal login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-leather-50 border border-leather-200 rounded-xl p-6 max-w-sm w-full shadow-sm"
      >
        <div>
          <h1 className="font-serif text-xl font-bold text-leather-900">Login</h1>
          <p className="text-sm text-leather-600 mt-1">Masuk ke akun Perpustakaan Digital Anda</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-sm font-medium text-leather-800">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="login-password" className="text-sm font-medium text-leather-800">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-sm font-semibold py-2 rounded-lg"
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>

        <p className="text-sm text-leather-600 text-center">
          Belum punya akun?{' '}
          <Link to="/register" className="text-leather-700 hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </section>
  );
}

export default Login;
