import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../lib/api/chat';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

function Chatbot() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Halo! Saya asisten perpustakaan. Mau cari buku apa hari ini?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  // loanId -> judul, buat peminjaman yang diajukan lewat chat ini & masih menunggu konfirmasi
  // admin. Dipakai listener Realtime di bawah buat tau kapan harus lapor hasilnya ke chat.
  const pendingLoansRef = useRef(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Begitu admin (dashboard ATAU Telegram) memproses peminjaman yang diajukan lewat chat ini,
  // kirim pesan hasilnya langsung ke jendela chat — user tidak perlu pindah ke "Peminjaman Saya".
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chatbot-loans-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loans', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const judul = pendingLoansRef.current.get(payload.new.id);
          if (!judul) return;

          if (payload.new.status === 'dipinjam') {
            pendingLoansRef.current.delete(payload.new.id);
            setMessages((prev) => [
              ...prev,
              { role: 'model', kind: 'status', text: `✅ Kabar baik! Peminjaman "${judul}" sudah DISETUJUI admin. Selamat membaca!` },
            ]);
          } else if (payload.new.status === 'ditolak') {
            pendingLoansRef.current.delete(payload.new.id);
            setMessages((prev) => [
              ...prev,
              { role: 'model', kind: 'status', text: `❌ Maaf, peminjaman "${judul}" DITOLAK admin.` },
            ]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    const teks = input.trim();
    if (!teks || loading) return;

    // pesan status ("sedang diproses"/"disetujui"/dst) bukan bagian dari percakapan sungguhan,
    // jangan ikut dikirim sebagai riwayat ke Gemini
    const historySebelum = messages
      .filter((m) => m.kind !== 'status')
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: teks }]);
    setInput('');
    setLoading(true);

    try {
      const { reply, loansDiajukan } = await sendChatMessage(teks, historySebelum);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);

      if (loansDiajukan.length > 0) {
        for (const loan of loansDiajukan) {
          pendingLoansRef.current.set(loan.id, loan.judul);
        }
        const daftarJudul = loansDiajukan.map((l) => `"${l.judul}"`).join(', ');
        setMessages((prev) => [
          ...prev,
          { role: 'model', kind: 'status', text: `⏳ Pengajuan peminjaman ${daftarJudul} sedang diproses, menunggu konfirmasi admin...` },
        ]);
      }
    } catch (err) {
      showAlert(err.message || 'Gagal menghubungi chatbot', 'error');
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Maaf, terjadi kesalahan. Coba lagi beberapa saat lagi.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[80vh]">
      <h1 className="font-serif text-2xl font-bold text-leather-900 mb-4">Chatbot Rekomendasi Buku</h1>

      <ul
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto bg-leather-50 border border-leather-200 rounded-xl p-4 flex flex-col gap-3"
      >
        {messages.map((m, i) =>
          m.kind === 'status' ? (
            <li
              key={i}
              className="self-center max-w-[90%] px-3 py-1.5 rounded-full text-xs italic text-leather-600 bg-leather-100/70 border border-leather-200"
            >
              {m.text}
            </li>
          ) : (
            <li
              key={i}
              className={`max-w-[85%] sm:max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'self-end bg-leather-700 text-white'
                  : 'self-start bg-leather-100 text-leather-900'
              }`}
            >
              {m.text}
            </li>
          ),
        )}
        {loading && (
          <li className="self-start bg-leather-100 text-leather-600 px-3 py-2 rounded-lg text-sm">
            Mengetik...
          </li>
        )}
        <div ref={bottomRef} />
      </ul>

      <form onSubmit={handleSend} className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          aria-label="Tulis pertanyaan untuk chatbot"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya rekomendasi buku..."
          className="flex-1 border border-leather-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-leather-700 hover:bg-leather-800 disabled:opacity-50 text-leather-50 border-2 border-leather-50 text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Kirim
        </button>
      </form>
    </section>
  );
}

export default Chatbot;
