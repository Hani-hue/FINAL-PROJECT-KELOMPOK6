import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBook } from '../lib/api/books';
import { ajukanPinjam } from '../lib/api/loans';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const { showAlert } = useAlert();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mengajukan, setMengajukan] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBook(id)
      .then(setBook)
      .catch((err) => showAlert(err.message || 'Buku tidak ditemukan', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePinjam = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setMengajukan(true);
    try {
      await ajukanPinjam(book.id, { namaUser: profile?.nama, judulBuku: book.judul });
      showAlert('Pengajuan peminjaman terkirim, menunggu konfirmasi admin.', 'success');
      navigate('/peminjaman-saya');
    } catch (err) {
      showAlert(err.message || 'Gagal mengajukan peminjaman', 'error');
    } finally {
      setMengajukan(false);
    }
  };

  if (loading) return <p className="p-6 text-leather-600 text-sm">Memuat...</p>;
  if (!book) return <p className="p-6 text-leather-600 text-sm">Buku tidak ditemukan.</p>;

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-leather-700 hover:underline">
        &larr; Kembali ke katalog
      </Link>

      <article className="mt-4 flex flex-col md:flex-row gap-6 bg-leather-50 border border-leather-200 rounded-xl p-6 shadow-sm">
        <div className="w-full md:w-56 aspect-[3/4] bg-leather-100 rounded-lg overflow-hidden flex-shrink-0">
          {book.gambar_sampul ? (
            <img src={book.gambar_sampul} alt={book.judul} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-leather-300 text-5xl">
              📖
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-leather-900">{book.judul}</h1>
          <p className="text-leather-600 mt-1">{book.penulis}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {book.jenis_buku?.nama && (
              <span className="px-2 py-0.5 rounded-full bg-leather-100 text-leather-700 text-xs font-medium">
                {book.jenis_buku.nama}
              </span>
            )}
            <span className="text-sm text-leather-500">{book.genre?.nama || '-'}</span>
          </div>

          <p className="text-leather-800 mt-4 text-sm leading-relaxed">
            {book.sinopsis || 'Belum ada sinopsis.'}
          </p>

          <div className="mt-4 text-sm">
            <span
              className={
                book.stok_tersedia > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'
              }
            >
              {book.stok_tersedia > 0 ? `Stok tersedia: ${book.stok_tersedia}` : 'Stok habis'}
            </span>
            <span className="text-leather-500"> / total {book.stok_total}</span>
          </div>

          {!isAdmin && (
            <button
              onClick={handlePinjam}
              disabled={book.stok_tersedia < 1 || mengajukan}
              className="mt-6 bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-sm font-semibold px-5 py-2 rounded-lg"
            >
              {mengajukan ? 'Memproses...' : user ? 'Ajukan Peminjaman' : 'Login untuk Meminjam'}
            </button>
          )}
        </div>
      </article>
    </section>
  );
}

export default BookDetail;
