import { useEffect, useState } from 'react';
import { listBooks } from '../lib/api/books';
import { listGenres } from '../lib/api/genres';
import { listJenisBuku } from '../lib/api/jenisBuku';
import { useAlert } from '../context/AlertContext';
import BookCard from '../components/BookCard';

function Catalog() {
  const { showAlert } = useAlert();

  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [jenisBukuList, setJenisBukuList] = useState([]);
  const [search, setSearch] = useState('');
  const [genreId, setGenreId] = useState('');
  const [jenisBukuId, setJenisBukuId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGenres()
      .then(setGenres)
      .catch((err) => console.error('Gagal ambil daftar genre:', err));
    listJenisBuku()
      .then(setJenisBukuList)
      .catch((err) => console.error('Gagal ambil daftar jenis buku:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      listBooks({ search, genreId, jenisBukuId })
        .then(setBooks)
        .catch((err) => showAlert(err.message || 'Gagal memuat katalog', 'error'))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genreId, jenisBukuId]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-4">Katalog Buku</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          aria-label="Cari judul atau penulis"
          placeholder="Cari judul atau penulis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
        />
        <select
          aria-label="Filter jenis buku"
          value={jenisBukuId}
          onChange={(e) => setJenisBukuId(e.target.value)}
          className="border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
        >
          <option value="">Semua jenis</option>
          {jenisBukuList.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter genre"
          value={genreId}
          onChange={(e) => setGenreId(e.target.value)}
          className="border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
        >
          <option value="">Semua genre</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nama}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-leather-600 text-sm">Memuat katalog...</p>
      ) : books.length === 0 ? (
        <p className="text-leather-600 text-sm">Belum ada buku yang cocok.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Catalog;
