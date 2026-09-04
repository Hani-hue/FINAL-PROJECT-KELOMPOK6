import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../lib/api/chat';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getOrCreateChatSessionId } from '../lib/chatSession';

function Chatbot() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Halo! Saya asisten perpustakaan. Mau cari buku apa hari ini?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  // Sesi chat saat ini (berakhir saat logout, baru lagi tiap login — lihat lib/chatSession.js).
  // Dibaca sekali di sini, bukan tiap render, supaya stabil selama halaman ini terbuka.
  const [sessionId] = useState(getOrCreateChatSessionId);
  // loanId -> judul, buat peminjaman yang diajukan lewat chat ini & masih menunggu konfirmasi
  // admin. Dipakai listener Realtime di bawah buat tau kapan harus lapor hasilnya ke chat.
  const pendingLoansRef = useRef(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Saat halaman dibuka: load riwayat chat SESI INI SAJA dari database (bukan mulai dari
  // kosong, tapi juga bukan seluruh riwayat sepanjang umur akun — sesi berakhir saat logout,
  // lihat lib/chatSession.js), lalu cek apakah ada pengajuan pinjam (dari sesi mana pun,
  // termasuk sesi login sebelumnya) yang statusnya sudah diproses admin tapi belum pernah
  // ditampilkan di chat (kasus user sempat pindah halaman/refresh/logout-login sebelum admin
  // memproses) — notifikasi hasil ini tetap harus sampai meski baru terlihat di sesi baru.
  useEffect(() => {
    if (!user?.id) return;
    let aktif = true;

    (async () => {
      const { data: riwayat, error } = await supabase
        .from('chat_messages')
        .select('id, role, text, kind, loan_id')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Gagal ambil riwayat chat:', error);
        return;
      }
      if (!aktif) return;
      const rows = riwayat || [];

      // Dicek lintas SEMUA sesi (bukan cuma session_id ini) — supaya pengajuan yang dibuat di
      // sesi login sebelumnya tetap diberi tahu hasilnya walau baru terlihat di sesi baru ini.
      const { data: statusRows, error: statusError } = await supabase
        .from('chat_messages')
        .select('kind, loan_id')
        .eq('user_id', user.id)
        .not('kind', 'is', null);

      if (statusError) console.error('Gagal cek status pengajuan pinjam:', statusError);
      const semuaStatus = statusRows || [];
      const idPending = [...new Set(semuaStatus.filter((m) => m.kind === 'pending').map((m) => m.loan_id))];
      const idSudahAdaHasil = new Set(semuaStatus.filter((m) => m.kind === 'result').map((m) => m.loan_id));
      const belumTerlihat = idPending.filter((id) => !idSudahAdaHasil.has(id));

      const pesanHasil = [];
      for (const loanId of belumTerlihat) {
        const { data: loan } = await supabase
          .from('loans')
          .select('id, status, books(judul)')
          .eq('id', loanId)
          .single();
        if (!loan) continue;

        if (loan.status === 'menunggu_konfirmasi') {
          // masih beneran menunggu — biarkan listener Realtime di bawah yang nangani kalau
          // hasilnya keluar selagi user tetap di halaman ini
          pendingLoansRef.current.set(loanId, loan.books?.judul);
          continue;
        }

        const teks =
          loan.status === 'dipinjam'
            ? `✅ Kabar baik! Peminjaman "${loan.books?.judul}" sudah DISETUJUI admin. Selamat membaca!`
            : loan.status === 'ditolak'
              ? `❌ Maaf, peminjaman "${loan.books?.judul}" DITOLAK admin.`
              : null;
        if (!teks) continue;

        // Ditandai dengan session_id SEKARANG (bukan sesi lama tempat pengajuan dibuat) —
        // notifikasinya baru muncul di sesi yang sedang dibuka user ini.
        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert({ user_id: user.id, session_id: sessionId, role: 'model', kind: 'result', loan_id: loanId, text: teks });
        // 23505 = sudah ada baris result buat loan_id ini (race dengan listener Realtime) — abaikan
        if (insertError && insertError.code !== '23505') {
          console.error('Gagal simpan pesan status:', insertError);
        }
        pesanHasil.push({ role: 'model', kind: 'status', text: teks });
      }

      if (!aktif) return;
      setMessages((prev) => [
        ...prev,
        ...rows.map((m) => ({
          role: m.role,
          text: m.text,
          kind: m.kind === 'pending' || m.kind === 'result' ? 'status' : undefined,
        })),
        ...pesanHasil,
      ]);
    })();

    return () => {
      aktif = false;
    };
  }, [user?.id, sessionId]);

  // Begitu admin (dashboard ATAU Telegram) memproses peminjaman yang diajukan lewat chat ini,
  // kirim pesan hasilnya langsung ke jendela chat — user tidak perlu pindah ke "Peminjaman Saya".
  // Ini pelengkap buat kasus real-time (user masih di halaman ini); fallback di atas menangani
  // kasus user sempat pindah halaman sebelum hasilnya keluar.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chatbot-loans-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loans', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const judul = pendingLoansRef.current.get(payload.new.id);
          if (!judul) return;
          if (payload.new.status !== 'dipinjam' && payload.new.status !== 'ditolak') return;

          pendingLoansRef.current.delete(payload.new.id);
          const teks =
            payload.new.status === 'dipinjam'
              ? `✅ Kabar baik! Peminjaman "${judul}" sudah DISETUJUI admin. Selamat membaca!`
              : `❌ Maaf, peminjaman "${judul}" DITOLAK admin.`;

          setMessages((prev) => [...prev, { role: 'model', kind: 'status', text: teks }]);

          const { error: insertError } = await supabase
            .from('chat_messages')
            .insert({ user_id: user.id, session_id: sessionId, role: 'model', kind: 'result', loan_id: payload.new.id, text: teks });
          if (insertError && insertError.code !== '23505') {
            console.error('Gagal simpan pesan status:', insertError);
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
      const { reply, loansDiajukan, errorType } = await sendChatMessage(teks, historySebelum, sessionId);
      if (errorType) console.warn('Chatbot membalas dengan pesan fallback:', errorType);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);

      if (loansDiajukan.length > 0) {
        const pesanPending = loansDiajukan.map((loan) => {
          pendingLoansRef.current.set(loan.id, loan.judul);
          return {
            role: 'model',
            kind: 'status',
            text: `⏳ Pengajuan peminjaman "${loan.judul}" sedang diproses, menunggu konfirmasi admin...`,
          };
        });
        setMessages((prev) => [...prev, ...pesanPending]);
      }
    } catch (err) {
      // Ini beda dari kondisi di atas: sampai sini artinya request-nya sendiri gagal total
      // (server tidak terjangkau sama sekali), bukan server yang membalas dengan pesan fallback.
      console.error('Gagal menghubungi Edge Function chatbot:', err);
      showAlert(err.message || 'Gagal menghubungi chatbot', 'error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Waduh, chatbot-nya benar-benar tidak bisa dihubungi sama sekali sekarang (gagal konek ke server, bukan gangguan dari Gemini). Coba refresh atau coba lagi beberapa saat lagi ya.',
        },
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
