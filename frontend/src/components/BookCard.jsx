import { Link } from 'react-router-dom';

function BookCard({ book }) {
  return (
    <article className="flex flex-col bg-leather-50 border border-leather-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/buku/${book.id}`} className="flex flex-col h-full">
        <div className="aspect-[3/4] bg-leather-100">
          {book.gambar_sampul ? (
            <img src={book.gambar_sampul} alt={book.judul} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-leather-300 text-4xl">
              📖
            </div>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col gap-1">
          <h3 className="font-semibold text-sm text-leather-900 line-clamp-2">{book.judul}</h3>
          <p className="text-xs text-leather-600">{book.penulis}</p>
          {book.jenis_buku?.nama && (
            <span className="self-start px-2 py-0.5 rounded-full bg-leather-100 text-leather-700 text-[11px] font-medium">
              {book.jenis_buku.nama}
            </span>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-leather-500 truncate">{book.genre?.nama || '-'}</span>
            <span
              className={
                book.stok_tersedia > 0
                  ? 'shrink-0 text-green-600 font-medium'
                  : 'shrink-0 text-red-500 font-medium'
              }
            >
              {book.stok_tersedia > 0 ? `Tersedia (${book.stok_tersedia})` : 'Stok habis'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default BookCard;
