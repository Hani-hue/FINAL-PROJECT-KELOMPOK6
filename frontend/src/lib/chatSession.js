const KEY = 'chat_session_id';

/**
 * Id sesi chat AI di browser ini. Dibuat sekali lalu disimpan di localStorage supaya bertahan
 * lewat refresh/pindah halaman (masih sesi yang sama) — tapi dihapus saat logout (endChatSession),
 * jadi login berikutnya otomatis dapat sesi chat yang baru/kosong.
 */
export function getOrCreateChatSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Dipanggil saat logout supaya sesi chat berakhir — login berikutnya mulai sesi baru. */
export function endChatSession() {
  localStorage.removeItem(KEY);
}
