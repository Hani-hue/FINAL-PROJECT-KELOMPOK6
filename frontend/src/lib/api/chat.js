import { supabase } from '../supabaseClient';

/**
 * history: array {role: 'user'|'model', text: string} — riwayat chat sesi berjalan (riwayat
 * sesungguhnya dipersist di tabel chat_messages; ini cuma dipakai buat konteks Gemini).
 * sessionId: dari getOrCreateChatSessionId() (lib/chatSession.js) — dipakai server buat menandai
 * baris chat_messages ini milik sesi login yang mana (lihat migration tabel_chat_messages).
 */
/**
 * Return { reply, loansDiajukan, errorType } — loansDiajukan berisi { id, judul } tiap
 * peminjaman yang berhasil diajukan lewat chat ini (dipakai halaman Chatbot buat memantau status
 * via Realtime). errorType null kalau balasannya normal, atau salah satu
 * 'config_error'/'gemini_unavailable'/'too_many_turns' kalau `reply` sebenarnya pesan fallback.
 */
export async function sendChatMessage(message, history = [], sessionId) {
  const { data, error } = await supabase.functions.invoke('gemini-chat', {
    body: { message, history, sessionId },
  });
  if (error) throw error;
  return { reply: data.reply, loansDiajukan: data.loansDiajukan || [], errorType: data.errorType || null };
}
