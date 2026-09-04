import { supabase } from '../supabaseClient';
import { notifyTelegram } from './telegramNotify';

export async function ajukanPinjam(bookId, { namaUser, judulBuku }) {
  const { data: loan, error } = await supabase.rpc('ajukan_pinjam', { p_book_id: bookId });
  if (error) throw error;

  const notify = await notifyTelegram({ type: 'pinjam', nama_user: namaUser, judul_buku: judulBuku });
  if (notify?.message_id) {
    await supabase.from('loans').update({ telegram_message_id: notify.message_id }).eq('id', loan.id);
  }

  return loan;
}

export async function ajukanPengembalian(loanId, { namaUser, judulBuku }) {
  const { data: loan, error } = await supabase.rpc('ajukan_pengembalian', { p_loan_id: loanId });
  if (error) throw error;

  const notify = await notifyTelegram({ type: 'pengembalian', nama_user: namaUser, judul_buku: judulBuku });
  if (notify?.message_id) {
    await supabase.from('loans').update({ telegram_message_id: notify.message_id }).eq('id', loanId);
  }

  return loan;
}

/** Riwayat & status peminjaman milik user yang sedang login (RLS batasi ke user_id = auth.uid()). */
export async function myLoans() {
  const { data, error } = await supabase
    .from('loans')
    .select('*, books(judul, penulis, gambar_sampul), permintaan_perpanjangan(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Dipakai dashboard admin: semua transaksi peminjaman, bisa difilter status & rentang tanggal. */
export async function allLoans({ status = '', dari = '', sampai = '' } = {}) {
  let query = supabase
    .from('loans')
    .select('*, books(judul, penulis), profiles(nama, email)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (dari) query = query.gte('created_at', dari);
  if (sampai) query = query.lte('created_at', sampai);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function setujuiPinjam(loanId) {
  const { data, error } = await supabase.rpc('setujui_pinjam', { p_loan_id: loanId });
  if (error) throw error;
  return data;
}

export async function tolakPinjam(loanId) {
  const { data, error } = await supabase.rpc('tolak_pinjam', { p_loan_id: loanId });
  if (error) throw error;
  return data;
}

export async function setujuiPengembalian(loanId) {
  const { data, error } = await supabase.rpc('setujui_pengembalian', { p_loan_id: loanId });
  if (error) throw error;
  return data;
}

export async function tolakPengembalian(loanId) {
  const { data, error } = await supabase.rpc('tolak_pengembalian', { p_loan_id: loanId });
  if (error) throw error;
  return data;
}
