import { useEffect, useState } from 'react';
import {
  allLoans,
  setujuiPinjam,
  tolakPinjam,
  setujuiPengembalian,
  tolakPengembalian,
} from '../../lib/api/loans';
import { allExtensionRequests, setujuiPerpanjangan, tolakPerpanjangan } from '../../lib/api/extensions';
import { useAlert } from '../../context/AlertContext';
import { formatTanggal, formatTanggalWaktu } from '../../utils/date';
import StatusBadge from '../../components/StatusBadge';

const STATUS_LOANS = [
  { value: '', label: 'Semua status' },
  { value: 'menunggu_konfirmasi', label: 'Menunggu Konfirmasi' },
  { value: 'dipinjam', label: 'Dipinjam' },
  { value: 'menunggu_pengembalian', label: 'Menunggu Pengembalian' },
  { value: 'dikembalikan', label: 'Dikembalikan' },
  { value: 'ditolak', label: 'Ditolak' },
];

const STATUS_PERPANJANGAN = [
  { value: '', label: 'Semua status' },
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];

function AdminTransactions() {
  const { showAlert } = useAlert();
  const [tab, setTab] = useState('pinjam'); // 'pinjam' | 'perpanjangan'

  const [loans, setLoans] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aksiId, setAksiId] = useState(null);

  const [status, setStatus] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');

  const muatUlang = () => {
    setLoading(true);
    const promise =
      tab === 'pinjam'
        ? allLoans({
            status,
            dari: dari ? new Date(dari).toISOString() : '',
            sampai: sampai ? new Date(`${sampai}T23:59:59`).toISOString() : '',
          }).then(setLoans)
        : allExtensionRequests({ status }).then(setExtensions);

    return promise
      .catch((err) => showAlert(err.message || 'Gagal memuat transaksi', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, dari, sampai]);

  const gantiTab = (tabBaru) => {
    setTab(tabBaru);
    setStatus('');
  };

  const jalankanAksi = async (id, fn, pesanSukses) => {
    setAksiId(id);
    try {
      await fn(id);
      showAlert(pesanSukses, 'success');
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal memproses transaksi', 'error');
    } finally {
      setAksiId(null);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-4">Kelola Transaksi</h1>

      <div role="tablist" aria-label="Jenis transaksi" className="flex flex-wrap gap-2 mb-4">
        <button
          role="tab"
          aria-selected={tab === 'pinjam'}
          onClick={() => gantiTab('pinjam')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 border-leather-50 ${
            tab === 'pinjam' ? 'bg-leather-700 text-leather-50' : 'bg-leather-100 text-leather-700'
          }`}
        >
          Peminjaman & Pengembalian
        </button>
        <button
          role="tab"
          aria-selected={tab === 'perpanjangan'}
          onClick={() => gantiTab('perpanjangan')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 border-leather-50 ${
            tab === 'perpanjangan' ? 'bg-leather-700 text-leather-50' : 'bg-leather-100 text-leather-700'
          }`}
        >
          Perpanjangan
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-leather-300 rounded-lg px-3 py-2 text-sm"
        >
          {(tab === 'pinjam' ? STATUS_LOANS : STATUS_PERPANJANGAN).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {tab === 'pinjam' && (
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              aria-label="Dari tanggal"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              aria-label="Sampai tanggal"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-leather-600 text-sm">Memuat...</p>
      ) : tab === 'pinjam' ? (
        loans.length === 0 ? (
          <p className="text-leather-600 text-sm">Tidak ada transaksi.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {loans.map((loan) => (
              <li key={loan.id}>
              <article className="bg-leather-50 border border-leather-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-leather-900">
                      {loan.books?.judul || '(buku telah dihapus)'}
                    </h3>
                    <p className="text-xs text-leather-600">
                      {loan.profiles?.nama} ({loan.profiles?.email})
                    </p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="mt-2 text-xs text-leather-600 flex flex-wrap gap-x-6 gap-y-1">
                  <span>Diajukan: {formatTanggalWaktu(loan.created_at)}</span>
                  <span>Batas kembali: {formatTanggal(loan.batas_kembali)}</span>
                </div>

                {loan.status === 'menunggu_konfirmasi' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => jalankanAksi(loan.id, setujuiPinjam, 'Peminjaman disetujui')}
                      disabled={aksiId === loan.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => jalankanAksi(loan.id, tolakPinjam, 'Peminjaman ditolak')}
                      disabled={aksiId === loan.id}
                      className="bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Tolak
                    </button>
                  </div>
                )}

                {loan.status === 'menunggu_pengembalian' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        jalankanAksi(loan.id, setujuiPengembalian, 'Pengembalian disetujui')
                      }
                      disabled={aksiId === loan.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Setujui Pengembalian
                    </button>
                    <button
                      onClick={() => jalankanAksi(loan.id, tolakPengembalian, 'Pengembalian ditolak')}
                      disabled={aksiId === loan.id}
                      className="bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </article>
              </li>
            ))}
          </ul>
        )
      ) : extensions.length === 0 ? (
        <p className="text-leather-600 text-sm">Tidak ada permintaan perpanjangan.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {extensions.map((ext) => (
            <li key={ext.id}>
            <article className="bg-leather-50 border border-leather-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-leather-900">
                    {ext.loans?.books?.judul || '(buku telah dihapus)'}
                  </h3>
                  <p className="text-xs text-leather-600">{ext.loans?.profiles?.nama}</p>
                </div>
                <StatusBadge status={ext.status} />
              </div>
              <div className="mt-2 text-xs text-leather-600 flex flex-wrap gap-x-6 gap-y-1">
                <span>Diajukan: {formatTanggalWaktu(ext.created_at)}</span>
                <span>Batas kembali saat ini: {formatTanggal(ext.loans?.batas_kembali)}</span>
                <span>Batas kembali baru: {formatTanggal(ext.batas_kembali_baru)}</span>
              </div>

              {ext.status === 'menunggu' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => jalankanAksi(ext.id, setujuiPerpanjangan, 'Perpanjangan disetujui')}
                    disabled={aksiId === ext.id}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => jalankanAksi(ext.id, tolakPerpanjangan, 'Perpanjangan ditolak')}
                    disabled={aksiId === ext.id}
                    className="bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminTransactions;
