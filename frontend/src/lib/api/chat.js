import { supabase } from '../supabaseClient';

/**
 * history: array {role: 'user'|'model', text: string} — riwayat chat sesi berjalan
 * (disimpan di state React, bukan di database).
 */
/**
 * Return { reply, loansDiajukan } — loansDiajukan berisi { id, judul } tiap peminjaman yang
 * berhasil diajukan lewat chat ini (dipakai halaman Chatbot buat memantau status via Realtime).
 */
export async function sendChatMessage(message, history = []) {
  const { data, error } = await supabase.functions.invoke('gemini-chat', {
    body: { message, history },
  });
  if (error) throw error;
  return { reply: data.reply, loansDiajukan: data.loansDiajukan || [] };
}
