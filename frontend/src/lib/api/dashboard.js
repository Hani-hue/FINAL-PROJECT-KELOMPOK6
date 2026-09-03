import { supabase } from '../supabaseClient';

async function hitungBaris(table, filters = {}) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [kolom, nilai] of Object.entries(filters)) {
    query = query.eq(kolom, nilai);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Ringkasan transaksi buat dashboard admin — query count aggregate per status. */
export async function getDashboardStats() {
  const [
    menungguKonfirmasi,
    dipinjam,
    menungguPengembalian,
    ditolak,
    dikembalikan,
    menungguPerpanjangan,
    totalBuku,
    totalUser,
  ] = await Promise.all([
    hitungBaris('loans', { status: 'menunggu_konfirmasi' }),
    hitungBaris('loans', { status: 'dipinjam' }),
    hitungBaris('loans', { status: 'menunggu_pengembalian' }),
    hitungBaris('loans', { status: 'ditolak' }),
    hitungBaris('loans', { status: 'dikembalikan' }),
    hitungBaris('permintaan_perpanjangan', { status: 'menunggu' }),
    hitungBaris('books'),
    hitungBaris('profiles'),
  ]);

  return {
    menungguKonfirmasi,
    dipinjam,
    menungguPengembalian,
    ditolak,
    dikembalikan,
    menungguPerpanjangan,
    totalBuku,
    totalUser,
  };
}
