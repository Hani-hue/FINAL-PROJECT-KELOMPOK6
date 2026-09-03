import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../lib/api/dashboard';
import { useAlert } from '../../context/AlertContext';

const KARTU = [
  { key: 'menungguKonfirmasi', label: 'Menunggu Konfirmasi Pinjam', warna: 'bg-yellow-50 text-yellow-700' },
  { key: 'dipinjam', label: 'Sedang Dipinjam', warna: 'bg-blue-50 text-blue-700' },
  { key: 'menungguPengembalian', label: 'Menunggu Pengembalian', warna: 'bg-purple-50 text-purple-700' },
  { key: 'menungguPerpanjangan', label: 'Menunggu Perpanjangan', warna: 'bg-orange-50 text-orange-700' },
  { key: 'ditolak', label: 'Ditolak', warna: 'bg-red-50 text-red-700' },
  { key: 'dikembalikan', label: 'Sudah Dikembalikan', warna: 'bg-green-50 text-green-700' },
  { key: 'totalBuku', label: 'Total Judul Buku', warna: 'bg-leather-50 text-leather-800' },
  { key: 'totalUser', label: 'Total User', warna: 'bg-leather-50 text-leather-800' },
];

function AdminDashboard() {
  const { showAlert } = useAlert();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => showAlert(err.message || 'Gagal memuat statistik', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-1">Dashboard Admin</h1>
      <p className="text-sm text-leather-600 mb-6">Ringkasan transaksi perpustakaan digital</p>

      {!stats ? (
        <p className="text-leather-600 text-sm">Memuat...</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {KARTU.map((k) => (
            <li key={k.key} className={`rounded-xl p-4 ${k.warna}`}>
              <p className="text-2xl font-bold">{stats[k.key]}</p>
              <p className="text-xs font-medium mt-1">{k.label}</p>
            </li>
          ))}
        </ul>
      )}

      <nav className="flex flex-wrap gap-3" aria-label="Navigasi cepat admin">
        <Link
          to="/admin/transaksi"
          className="bg-leather-700 hover:bg-leather-800 text-leather-50 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Kelola Transaksi
        </Link>
        <Link
          to="/admin/buku"
          className="bg-leather-100 hover:bg-leather-200 text-leather-800 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Kelola Buku
        </Link>
        <Link
          to="/admin/user"
          className="bg-leather-100 hover:bg-leather-200 text-leather-800 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Kelola User
        </Link>
      </nav>
    </section>
  );
}

export default AdminDashboard;
