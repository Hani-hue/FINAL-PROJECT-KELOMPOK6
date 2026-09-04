// Edge Function: telegram-notify
// Mengirim pesan ke chat Telegram admin. Dipanggil dari frontend (setelah ajukan_pinjam /
// insert permintaan_perpanjangan / ajukan_pengembalian) ATAU dari dalam SQL lewat pg_net
// (cek_stok_menipis, cek_keterlambatan). BOT_TOKEN tidak pernah keluar dari fungsi ini.
//
// Konfirmasi admin (pinjam/perpanjangan/pengembalian) pakai INLINE KEYBOARD (tombol Setuju/Tolak
// langsung di pesan Telegram), bukan balas ketik "1"/"2" — admin tinggal klik. telegram-webhook
// menangkap tap tombol ini lewat update.callback_query (lihat file itu untuk alurnya).

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BOT_ADMIN_CHAT_ID = Deno.env.get("BOT_ADMIN_CHAT_ID");

type NotifyPayload = {
  type: "pinjam" | "perpanjangan" | "pengembalian" | "stok_menipis" | "keterlambatan";
  nama_user?: string;
  judul_buku?: string;
  nama_peminjam?: string;
  batas_kembali_baru?: string;
  stok_tersedia?: number;
};

const AKSI_PERLU_KONFIRMASI = new Set(["pinjam", "perpanjangan", "pengembalian"]);

function formatPesan(payload: NotifyPayload): string {
  switch (payload.type) {
    case "pinjam":
      return (
        `📚 <b>Pengajuan Peminjaman Baru</b>\n` +
        `User: ${payload.nama_user ?? "-"}\n` +
        `Buku: ${payload.judul_buku ?? "-"}\n\n` +
        `Tap tombol di bawah untuk memproses.`
      );
    case "perpanjangan":
      return (
        `⏳ <b>Pengajuan Perpanjangan</b>\n` +
        `User: ${payload.nama_user ?? "-"}\n` +
        `Buku: ${payload.judul_buku ?? "-"}\n` +
        `Batas baru diajukan: ${payload.batas_kembali_baru ?? "-"}\n\n` +
        `Tap tombol di bawah untuk memproses.`
      );
    case "pengembalian":
      return (
        `↩️ <b>Pengajuan Pengembalian</b>\n` +
        `User: ${payload.nama_user ?? "-"}\n` +
        `Buku: ${payload.judul_buku ?? "-"}\n\n` +
        `Tap tombol di bawah untuk memproses.`
      );
    case "stok_menipis":
      return (
        `⚠️ <b>Stok Menipis</b>\n` +
        `Buku: ${payload.judul_buku ?? "-"}\n` +
        `Sisa stok: ${payload.stok_tersedia ?? "-"}`
      );
    case "keterlambatan":
      return (
        `🚨 <b>Peminjaman Terlambat</b>\n` +
        `Buku: ${payload.judul_buku ?? "-"}\n` +
        `Peminjam: ${payload.nama_peminjam ?? "-"}`
      );
    default:
      return "Notifikasi perpustakaan digital.";
  }
}

/** Inline keyboard Setuju/Tolak — callback_data-nya dibaca telegram-webhook lewat callback_query. */
function buatInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "✅ Setuju", callback_data: "1" },
        { text: "❌ Tolak", callback_data: "2" },
      ],
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!TELEGRAM_BOT_TOKEN || !BOT_ADMIN_CHAT_ID) {
    console.error("TELEGRAM_BOT_TOKEN / BOT_ADMIN_CHAT_ID belum di-set sebagai secret");
    return new Response(JSON.stringify({ error: "Konfigurasi Telegram belum lengkap" }), {
      status: 500,
    });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body harus JSON" }), { status: 400 });
  }

  const text = formatPesan(payload);
  const perluTombol = AKSI_PERLU_KONFIRMASI.has(payload.type);

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: BOT_ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
        ...(perluTombol ? { reply_markup: buatInlineKeyboard() } : {}),
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return new Response(JSON.stringify({ error: "Gagal kirim pesan Telegram", detail: data }), {
        status: 502,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message_id: AKSI_PERLU_KONFIRMASI.has(payload.type) ? data.result.message_id : null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Gagal menghubungi Telegram API:", err);
    return new Response(JSON.stringify({ error: "Gagal menghubungi Telegram API" }), {
      status: 502,
    });
  }
});
