import { useEffect, useState } from 'react';
import { myLoans, ajukanPengembalian } from '../lib/api/loans';
import { ajukanPerpanjangan } from '../lib/api/extensions';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { formatTanggal, toDateInputValue } from '../utils/date';
import StatusBadge from '../components/StatusBadge';
import { supabase } from '../lib/supabaseClient';

const BATAS_PINJAM_AKTIF = 3;
const BATAS_PERPANJANGAN_DISETUJUI = 2;
const MAKS_HARI_PERPANJANGAN = 7;

function MyLoans() {
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aksiLoanId, setAksiLoanId] = useState(null);
  const [formPerpanjanganId, setFormPerpanjanganId] = useState(null);
  const [tanggalBaru, setTanggalBaru] = useState('');

  const muatUlang = () => {
    setLoading(true);
    return myLoans()
      .then(setLoans)
      .catch((err) => showAlert(err.message || 'Gagal memuat peminjaman', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    muatUlang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: begitu admin/Telegram menyetujui/menolak, status di sini ikut berubah otomatis
  // tanpa perlu refresh manual (RLS tetap membatasi cuma baris milik user ini yang diterima).
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`my-loans-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loans', filter: `user_id=eq.${user.id}` },
        () => muatUlang(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permintaan_perpanjangan' },
        () => muatUlang(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const jumlahAktif = loans.filter((l) =>
    ['menunggu_konfirmasi', 'dipinjam'].includes(l.status),
  ).length;

  const handlePengembalian = async (loan) => {
    setAksiLoanId(loan.id);
    try {
      await ajukanPengembalian(loan.id, { namaUser: profile?.nama, judulBuku: loan.books?.judul });
      showAlert('Pengajuan pengembalian terkirim, menunggu konfirmasi admin.', 'success');
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal mengajukan pengembalian', 'error');
    } finally {
      setAksiLoanId(null);
    }
  };

  const bukaFormPerpanjangan = (loan) => {
    setFormPerpanjanganId(loan.id);
    setTanggalBaru('');
  };

  const handlePerpanjangan = async (loan) => {
    if (!tanggalBaru) {
      showAlert('Pilih tanggal batas kembali baru dulu', 'error');
      return;
    }
    setAksiLoanId(loan.id);
    try {
      await ajukanPerpanjangan({
        loanId: loan.id,
        batasKembaliBaru: new Date(tanggalBaru).toISOString(),
        namaUser: profile?.nama,
        judulBuku: loan.books?.judul,
      });
      showAlert('Pengajuan perpanjangan terkirim, menunggu konfirmasi admin.', 'success');
      setFormPerpanjanganId(null);
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal mengajukan perpanjangan', 'error');
    } finally {
      setAksiLoanId(null);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-1">Peminjaman Saya</h1>
      <p className="text-sm text-leather-600 mb-6">
        Kuota peminjaman aktif: {jumlahAktif}/{BATAS_PINJAM_AKTIF}
      </p>

      {loading ? (
        <p className="text-leather-600 text-sm">Memuat...</p>
      ) : loans.length === 0 ? (
        <p className="text-leather-600 text-sm">Belum ada riwayat peminjaman.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {loans.map((loan) => {
            const permintaanMenunggu = (loan.permintaan_perpanjangan || []).find(
              (p) => p.status === 'menunggu',
            );
            const jumlahPerpanjanganDisetujui = (loan.permintaan_perpanjangan || []).filter(
              (p) => p.status === 'disetujui',
            ).length;
            const batasPerpanjanganTercapai = jumlahPerpanjanganDisetujui >= BATAS_PERPANJANGAN_DISETUJUI;
            const tanggalMaksimalPerpanjangan = loan.batas_kembali
              ? toDateInputValue(
                  new Date(
                    new Date(loan.batas_kembali).getTime() + MAKS_HARI_PERPANJANGAN * 24 * 60 * 60 * 1000,
                  ),
                )
              : '';
            const tanggalMinimalPerpanjangan = loan.batas_kembali ? toDateInputValue(loan.batas_kembali) : '';

            return (
              <li key={loan.id}>
              <article className="bg-leather-50 border border-leather-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-leather-900">
                      {loan.books?.judul || '(buku telah dihapus)'}
                    </h3>
                    <p className="text-xs text-leather-600">{loan.books?.penulis}</p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>

                <div className="mt-3 text-xs text-leather-600 flex flex-wrap gap-x-6 gap-y-1">
                  <span>Tanggal pinjam: {formatTanggal(loan.tanggal_pinjam)}</span>
                  <span>Batas kembali: {formatTanggal(loan.batas_kembali)}</span>
                  {loan.tanggal_kembali && (
                    <span>Tanggal kembali: {formatTanggal(loan.tanggal_kembali)}</span>
                  )}
                </div>

                {permintaanMenunggu && (
                  <p className="mt-2 text-xs text-purple-600">
                    Menunggu persetujuan perpanjangan ke {formatTanggal(permintaanMenunggu.batas_kembali_baru)}
                  </p>
                )}

                {loan.status === 'dipinjam' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handlePengembalian(loan)}
                      disabled={aksiLoanId === loan.id}
                      className="bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Ajukan Pengembalian
                    </button>

                    {!permintaanMenunggu && !batasPerpanjanganTercapai && (
                      <button
                        onClick={() => bukaFormPerpanjangan(loan)}
                        disabled={aksiLoanId === loan.id}
                        className="bg-leather-100 hover:bg-leather-200 disabled:opacity-50 text-leather-800 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Ajukan Perpanjangan
                      </button>
                    )}

                    {!permintaanMenunggu && batasPerpanjanganTercapai && (
                      <span className="text-xs text-leather-500">
                        Batas perpanjangan ({BATAS_PERPANJANGAN_DISETUJUI}x) sudah tercapai
                      </span>
                    )}
                  </div>
                )}

                {formPerpanjanganId === loan.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 bg-leather-50 border border-leather-200 rounded-lg p-3">
                    <input
                      type="date"
                      aria-label="Tanggal batas kembali baru"
                      value={tanggalBaru}
                      min={tanggalMinimalPerpanjangan}
                      max={tanggalMaksimalPerpanjangan}
                      onChange={(e) => setTanggalBaru(e.target.value)}
                      className="border border-leather-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-leather-500"
                    />
                    <span className="text-xs text-leather-500">
                      (maks. {formatTanggal(tanggalMaksimalPerpanjangan)})
                    </span>
                    <button
                      onClick={() => handlePerpanjangan(loan)}
                      disabled={aksiLoanId === loan.id}
                      className="bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Kirim
                    </button>
                    <button
                      onClick={() => setFormPerpanjanganId(null)}
                      className="text-leather-600 hover:text-leather-800 text-xs"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default MyLoans;
