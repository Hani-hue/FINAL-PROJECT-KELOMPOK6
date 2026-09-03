import { supabase } from '../supabaseClient';
import { notifyTelegram } from './telegramNotify';

/** Insert langsung ke permintaan_perpanjangan (dibatasi RLS: loan_id harus milik sendiri & status dipinjam). */
export async function ajukanPerpanjangan({ loanId, batasKembaliBaru, namaUser, judulBuku }) {
  const { data, error } = await supabase
    .from('permintaan_perpanjangan')
    .insert({ loan_id: loanId, batas_kembali_baru: batasKembaliBaru, status: 'menunggu' })
    .select()
    .single();
  if (error) throw error;

  const notify = await notifyTelegram({
    type: 'perpanjangan',
    nama_user: namaUser,
    judul_buku: judulBuku,
    batas_kembali_baru: batasKembaliBaru,
  });
  if (notify?.message_id) {
    await supabase
      .from('permintaan_perpanjangan')
      .update({ telegram_message_id: notify.message_id })
      .eq('id', data.id);
  }

  return data;
}

export async function setujuiPerpanjangan(permintaanId) {
  const { data, error } = await supabase.rpc('setujui_perpanjangan', { p_permintaan_id: permintaanId });
  if (error) throw error;
  return data;
}

export async function tolakPerpanjangan(permintaanId) {
  const { data, error } = await supabase.rpc('tolak_perpanjangan', { p_permintaan_id: permintaanId });
  if (error) throw error;
  return data;
}

/** Dipakai dashboard admin buat lihat semua pengajuan perpanjangan. */
export async function allExtensionRequests({ status = '' } = {}) {
  let query = supabase
    .from('permintaan_perpanjangan')
    .select('*, loans(id, batas_kembali, books(judul), profiles(nama))')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
