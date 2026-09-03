import { useEffect, useState } from 'react';
import { listUsers, toggleActive } from '../../lib/api/users';
import { useAlert } from '../../context/AlertContext';
import { formatTanggal } from '../../utils/date';

function StatusAkunBadge({ aktif }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold border ${
        aktif
          ? 'bg-green-100 text-green-700 border-green-300'
          : 'bg-red-100 text-red-700 border-red-300'
      }`}
    >
      {aktif ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

function AdminUsers() {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aksiId, setAksiId] = useState(null);

  const muatUlang = () => {
    setLoading(true);
    return listUsers()
      .then(setUsers)
      .catch((err) => showAlert(err.message || 'Gagal memuat daftar user', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (user) => {
    setAksiId(user.id);
    try {
      await toggleActive(user.id, !user.is_active);
      showAlert(
        `Akun ${user.nama} berhasil ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}`,
        'success',
      );
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal mengubah status akun', 'error');
    } finally {
      setAksiId(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-6">Kelola User</h1>

      {loading ? (
        <p className="text-leather-600 text-sm">Memuat...</p>
      ) : users.length === 0 ? (
        <p className="text-leather-600 text-sm">Belum ada user terdaftar.</p>
      ) : (
        <>
          {/* Mobile & tablet: daftar card, bukan tabel - biar gak perlu scroll horizontal */}
          <ul className="flex flex-col gap-3 md:hidden">
            {users.map((user) => (
              <li key={user.id}>
                <article className="bg-leather-50 border border-leather-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-leather-900 truncate">{user.nama}</p>
                      <p className="text-xs text-leather-600 truncate">{user.email}</p>
                    </div>
                    <StatusAkunBadge aktif={user.is_active} />
                  </div>

                  <div className="text-xs text-leather-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="capitalize">Role: {user.role}</span>
                    <span>Terdaftar: {formatTanggal(user.created_at)}</span>
                  </div>

                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleToggle(user)}
                      disabled={aksiId === user.id}
                      className="self-start text-xs font-semibold text-leather-700 hover:underline disabled:opacity-50"
                    >
                      {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                </article>
              </li>
            ))}
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden md:block bg-leather-50 border border-leather-200 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-leather-50 text-leather-600 text-xs uppercase">
                <tr>
                  <th scope="col" className="text-left px-4 py-3">
                    Nama
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Role
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Terdaftar
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-leather-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-leather-900">{user.nama}</td>
                    <td className="px-4 py-3 text-leather-600">{user.email}</td>
                    <td className="px-4 py-3 text-leather-600 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-leather-600">{formatTanggal(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <StatusAkunBadge aktif={user.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={aksiId === user.id}
                          className="text-xs font-semibold text-leather-700 hover:underline disabled:opacity-50"
                        >
                          {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminUsers;
