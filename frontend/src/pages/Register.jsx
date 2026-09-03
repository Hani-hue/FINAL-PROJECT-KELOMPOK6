import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { validasiEmail, validasiPasswordMinimal } from '../utils/validation';

function Register() {
  const { register } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validasiEmail(email)) {
      showAlert('Format email tidak valid', 'error');
      return;
    }
    if (!validasiPasswordMinimal(password)) {
      showAlert('Password minimal 6 karakter', 'error');
      return;
    }
    if (password !== konfirmasiPassword) {
      showAlert('Konfirmasi password tidak cocok', 'error');
      return;
    }

    setLoading(true);
    try {
      await register(nama, email, password);
      showAlert('Berhasil daftar! Selamat datang.', 'success');
      navigate('/');
    } catch (err) {
      showAlert(err.message || 'Gagal mendaftar', 'error');
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
          <h1 className="font-serif text-xl font-bold text-leather-900">Daftar</h1>
          <p className="text-sm text-leather-600 mt-1">Buat akun baru untuk mulai meminjam buku</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-nama" className="text-sm font-medium text-leather-800">
            Nama
          </label>
          <input
            id="register-nama"
            type="text"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-email" className="text-sm font-medium text-leather-800">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-password" className="text-sm font-medium text-leather-800">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="register-konfirmasi" className="text-sm font-medium text-leather-800">
            Konfirmasi Password
          </label>
          <input
            id="register-konfirmasi"
            type="password"
            required
            value={konfirmasiPassword}
            onChange={(e) => setKonfirmasiPassword(e.target.value)}
            className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-sm font-semibold py-2 rounded-lg"
        >
          {loading ? 'Memproses...' : 'Daftar'}
        </button>

        <p className="text-sm text-leather-600 text-center">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-leather-700 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
