import { supabase } from '../supabaseClient';

/**
 * Kirim notifikasi ke Telegram admin lewat Edge Function telegram-notify.
 * Best-effort: kalau gagal (mis. secret Telegram belum di-set), jangan sampai
 * menggagalkan alur utama (ajukan pinjam/perpanjangan/pengembalian) — cukup log.
 */
export async function notifyTelegram(payload) {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-notify', { body: payload });
    if (error) {
      console.error('Gagal kirim notifikasi Telegram:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Gagal kirim notifikasi Telegram:', err);
    return null;
  }
}
