import { useEffect, useState } from 'react';
import { listBooks, getBook, createBook, updateBook, deleteBook, uploadCover } from '../../lib/api/books';
import { listGenres, createGenre } from '../../lib/api/genres';
import { listJenisBuku, createJenisBuku } from '../../lib/api/jenisBuku';
import { useAlert } from '../../context/AlertContext';

const FORM_KOSONG = {
  judul: '',
  penulis: '',
  genre_id: '',
  jenis_buku_id: '',
  sinopsis: '',
  stok_total: 1,
  gambar_sampul: '',
};

function AdminBooks() {
  const { showAlert } = useAlert();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [jenisBukuList, setJenisBukuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [genreBaru, setGenreBaru] = useState('');
  const [menyimpanGenre, setMenyimpanGenre] = useState(false);
  const [jenisBukuBaru, setJenisBukuBaru] = useState('');
  const [menyimpanJenisBuku, setMenyimpanJenisBuku] = useState(false);

  const muatUlang = () => {
    setLoading(true);
    return listBooks()
      .then(setBooks)
      .catch((err) => showAlert(err.message || 'Gagal memuat daftar buku', 'error'))
      .finally(() => setLoading(false));
  };

  const muatGenre = () => {
    return listGenres()
      .then(setGenres)
      .catch((err) => showAlert(err.message || 'Gagal memuat daftar genre', 'error'));
  };

  const muatJenisBuku = () => {
    return listJenisBuku()
      .then(setJenisBukuList)
      .catch((err) => showAlert(err.message || 'Gagal memuat daftar jenis buku', 'error'));
  };

  useEffect(() => {
    muatUlang();
    muatGenre();
    muatJenisBuku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTambahGenre = async () => {
    const nama = genreBaru.trim();
    if (!nama) return;
    setMenyimpanGenre(true);
    try {
      const genreBaruDibuat = await createGenre(nama);
      await muatGenre();
      setForm((f) => ({ ...f, genre_id: genreBaruDibuat.id }));
      setGenreBaru('');
      showAlert('Genre baru ditambahkan', 'success');
    } catch (err) {
      showAlert(err.message || 'Gagal menambah genre', 'error');
    } finally {
      setMenyimpanGenre(false);
    }
  };

  const handleTambahJenisBuku = async () => {
    const nama = jenisBukuBaru.trim();
    if (!nama) return;
    setMenyimpanJenisBuku(true);
    try {
      const jenisBaruDibuat = await createJenisBuku(nama);
      await muatJenisBuku();
      setForm((f) => ({ ...f, jenis_buku_id: jenisBaruDibuat.id }));
      setJenisBukuBaru('');
      showAlert('Jenis buku baru ditambahkan', 'success');
    } catch (err) {
      showAlert(err.message || 'Gagal menambah jenis buku', 'error');
    } finally {
      setMenyimpanJenisBuku(false);
    }
  };

  const bukaTambah = () => {
    setEditingId(null);
    setForm({ ...FORM_KOSONG });
    setFile(null);
  };

  const bukaEdit = (book) => {
    setEditingId(book.id);
    setForm({
      judul: book.judul,
      penulis: book.penulis,
      genre_id: book.genre_id || '',
      jenis_buku_id: book.jenis_buku_id || '',
      sinopsis: book.sinopsis || '',
      stok_total: book.stok_total,
      gambar_sampul: book.gambar_sampul || '',
    });
    setFile(null);
  };

  const tutupForm = () => {
    setForm(null);
    setEditingId(null);
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    try {
      let gambarSampul = form.gambar_sampul;
      if (file) {
        gambarSampul = await uploadCover(file);
      }

      const stokTotal = Number(form.stok_total);
      const payloadDasar = {
        judul: form.judul,
        penulis: form.penulis,
        genre_id: form.genre_id || null,
        jenis_buku_id: form.jenis_buku_id || null,
        sinopsis: form.sinopsis || null,
        gambar_sampul: gambarSampul || null,
      };

      if (editingId) {
        // stok_tersedia ikut disesuaikan sebesar selisih perubahan stok_total, dibatasi minimal 0.
        // Ambil data buku terbaru dari server (bukan state list yang mungkin sudah basi kalau ada
        // transaksi pinjam/kembali di antara waktu buka form & submit) sebelum hitung selisihnya.
        // Perubahan ini otomatis memicu alert stok menipis lewat trigger books_stok_berubah kalau relevan.
        const bukuLama = await getBook(editingId);
        const selisih = stokTotal - bukuLama.stok_total;
        await updateBook(editingId, {
          ...payloadDasar,
          stok_total: stokTotal,
          stok_tersedia: Math.max(0, bukuLama.stok_tersedia + selisih),
        });
        showAlert('Buku berhasil diperbarui', 'success');
      } else {
        await createBook({
          ...payloadDasar,
          stok_total: stokTotal,
          stok_tersedia: stokTotal,
        });
        showAlert('Buku berhasil ditambahkan', 'success');
      }

      tutupForm();
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal menyimpan buku', 'error');
    } finally {
      setMenyimpan(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Hapus buku "${book.judul}"?`)) return;
    try {
      await deleteBook(book.id);
      showAlert('Buku berhasil dihapus', 'success');
      await muatUlang();
    } catch (err) {
      showAlert(err.message || 'Gagal menghapus buku', 'error');
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="font-serif text-2xl font-bold text-leather-900">Kelola Buku</h1>
        <button
          onClick={bukaTambah}
          className="self-start sm:self-auto bg-leather-700 hover:bg-leather-800 text-leather-50 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          + Tambah Buku
        </button>
      </div>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="bg-leather-50 border border-leather-200 rounded-xl p-4 mb-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div>
            <label htmlFor="buku-judul" className="block text-xs font-medium text-leather-800 mb-1">
              Judul
            </label>
            <input
              id="buku-judul"
              type="text"
              required
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="buku-penulis" className="block text-xs font-medium text-leather-800 mb-1">
              Penulis
            </label>
            <input
              id="buku-penulis"
              type="text"
              required
              value={form.penulis}
              onChange={(e) => setForm({ ...form, penulis: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="buku-jenis" className="block text-xs font-medium text-leather-800 mb-1">
              Jenis Buku
            </label>
            <select
              id="buku-jenis"
              value={form.jenis_buku_id}
              onChange={(e) => setForm({ ...form, jenis_buku_id: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">- Pilih jenis buku -</option>
              {jenisBukuList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                aria-label="Nama jenis buku baru"
                placeholder="Tambah jenis buku baru..."
                value={jenisBukuBaru}
                onChange={(e) => setJenisBukuBaru(e.target.value)}
                className="flex-1 min-w-0 border border-leather-300 rounded-lg px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleTambahJenisBuku}
                disabled={menyimpanJenisBuku || !jenisBukuBaru.trim()}
                className="shrink-0 bg-leather-100 hover:bg-leather-200 disabled:opacity-50 text-leather-800 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                + Tambah
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="buku-genre" className="block text-xs font-medium text-leather-800 mb-1">
              Genre
            </label>
            <select
              id="buku-genre"
              value={form.genre_id}
              onChange={(e) => setForm({ ...form, genre_id: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">- Pilih genre -</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                aria-label="Nama genre baru"
                placeholder="Tambah genre baru..."
                value={genreBaru}
                onChange={(e) => setGenreBaru(e.target.value)}
                className="flex-1 min-w-0 border border-leather-300 rounded-lg px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleTambahGenre}
                disabled={menyimpanGenre || !genreBaru.trim()}
                className="shrink-0 bg-leather-100 hover:bg-leather-200 disabled:opacity-50 text-leather-800 border-2 border-leather-50 text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                + Tambah
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="buku-stok" className="block text-xs font-medium text-leather-800 mb-1">
              Stok Total
            </label>
            <input
              id="buku-stok"
              type="number"
              min="0"
              required
              value={form.stok_total}
              onChange={(e) => setForm({ ...form, stok_total: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="buku-sinopsis" className="block text-xs font-medium text-leather-800 mb-1">
              Sinopsis
            </label>
            <textarea
              id="buku-sinopsis"
              rows={3}
              value={form.sinopsis}
              onChange={(e) => setForm({ ...form, sinopsis: e.target.value })}
              className="w-full border border-leather-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="buku-sampul" className="block text-xs font-medium text-leather-800 mb-1">
              Sampul Buku
            </label>
            <input
              id="buku-sampul"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {form.gambar_sampul && !file && (
              <img
                src={form.gambar_sampul}
                alt="Sampul saat ini"
                className="mt-2 h-24 rounded-lg object-cover"
              />
            )}
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={menyimpan}
              className="bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={tutupForm}
              className="bg-leather-100 hover:bg-leather-200 text-leather-800 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-leather-600 text-sm">Memuat...</p>
      ) : books.length === 0 ? (
        <p className="text-leather-600 text-sm">Belum ada buku. Tambahkan lewat tombol di atas.</p>
      ) : (
        <>
          {/* Mobile & tablet: daftar card, bukan tabel - biar gak perlu scroll horizontal */}
          <ul className="flex flex-col gap-3 md:hidden">
            {books.map((book) => (
              <li key={book.id}>
                <article className="bg-leather-50 border border-leather-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-leather-900 truncate">{book.judul}</p>
                      <p className="text-xs text-leather-600 truncate">{book.penulis}</p>
                    </div>
                    <span className="shrink-0 text-xs text-leather-600">
                      {book.stok_tersedia}/{book.stok_total}
                    </span>
                  </div>

                  <p className="text-xs text-leather-600">
                    {book.jenis_buku?.nama || '-'} &middot; {book.genre?.nama || '-'}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => bukaEdit(book)}
                      className="text-xs font-semibold text-leather-700 hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(book)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
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
                    Judul
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Penulis
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Jenis
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Genre
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Stok
                  </th>
                  <th scope="col" className="text-left px-4 py-3">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-leather-100">
                {books.map((book) => (
                  <tr key={book.id}>
                    <td className="px-4 py-3 font-medium text-leather-900">{book.judul}</td>
                    <td className="px-4 py-3 text-leather-600">{book.penulis}</td>
                    <td className="px-4 py-3 text-leather-600">{book.jenis_buku?.nama || '-'}</td>
                    <td className="px-4 py-3 text-leather-600">{book.genre?.nama || '-'}</td>
                    <td className="px-4 py-3 text-leather-600">
                      {book.stok_tersedia} / {book.stok_total}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button
                        onClick={() => bukaEdit(book)}
                        className="text-xs font-semibold text-leather-700 hover:underline"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => handleDelete(book)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
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

export default AdminBooks;
