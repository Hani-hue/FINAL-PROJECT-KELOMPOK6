// Edge Function: telegram-webhook
// Menerima Telegram Update (diteruskan oleh script lokal scripts/telegram-poll.js hasil long
// polling getUpdates), lalu memproses tap tombol admin "✅ Setuju" / "❌ Tolak" (inline keyboard,
// lihat telegram-notify) terhadap pengajuan peminjaman/perpanjangan/pengembalian. Konfirmasi admin
// SELALU lewat tap tombol (callback_query) — bukan lagi balas ketik "1"/"2". verify_jwt
// di-nonaktifkan untuk fungsi ini (lihat supabase/config.toml) karena hanya dipanggil oleh script
// lokal tepercaya, bukan browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BOT_ADMIN_CHAT_ID = Deno.env.get("BOT_ADMIN_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function panggilTelegram(method: string, body: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Tutup loading spinner tombol yang barusan di-tap, dengan toast singkat opsional. */
async function jawabCallback(callbackQueryId: string, text?: string) {
  await panggilTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

/** Update teks pesan asli & lepas inline keyboard-nya supaya tidak bisa di-tap dobel. */
async function tandaiPesanSelesai(chatId: number | string, messageId: number, teksBaru: string) {
  await panggilTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: teksBaru,
    parse_mode: "HTML",
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body harus JSON" }), { status: 400 });
  }

  const callbackQuery = update?.callback_query;

  // Bukan tap tombol Setuju/Tolak (mis. chat bebas admin, atau update jenis lain) -> abaikan.
  // Konfirmasi admin sekarang HANYA lewat tombol, bukan balas ketik.
  if (!callbackQuery) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const teks = String(callbackQuery.data ?? "").trim();

  // hanya terima tap dari chat admin yang terdaftar
  if (String(chatId) !== String(BOT_ADMIN_CHAT_ID)) {
    await jawabCallback(callbackQuery.id, "Tidak diizinkan.");
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "chat tidak dikenal" }), {
      status: 200,
    });
  }

  if (teks !== "1" && teks !== "2") {
    await jawabCallback(callbackQuery.id, "Tombol tidak dikenali.");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const setuju = teks === "1";
  const teksAsli = String(callbackQuery.message?.text ?? "");

  try {
    // 1) cek apakah tombol ini untuk pengajuan peminjaman/pengembalian (tabel loans)
    const { data: loan } = await supabaseAdmin
      .from("loans")
      .select("id, status")
      .eq("telegram_message_id", messageId)
      .maybeSingle();

    if (loan) {
      if (loan.status === "menunggu_konfirmasi") {
        const { error } = await supabaseAdmin.rpc(setuju ? "setujui_pinjam" : "tolak_pinjam", {
          p_loan_id: loan.id,
        });
        if (error) throw error;
        const hasil = setuju ? "✅ Peminjaman disetujui." : "❌ Peminjaman ditolak.";
        await jawabCallback(callbackQuery.id, hasil);
        await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n${hasil}`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (loan.status === "menunggu_pengembalian") {
        const { error } = await supabaseAdmin.rpc(
          setuju ? "setujui_pengembalian" : "tolak_pengembalian",
          { p_loan_id: loan.id },
        );
        if (error) throw error;
        const hasil = setuju ? "✅ Pengembalian disetujui." : "❌ Pengembalian ditolak.";
        await jawabCallback(callbackQuery.id, hasil);
        await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n${hasil}`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await jawabCallback(callbackQuery.id, "Sudah diproses sebelumnya.");
      await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n(Sudah diproses sebelumnya.)`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 2) kalau bukan loans, cek permintaan_perpanjangan
    const { data: permintaan } = await supabaseAdmin
      .from("permintaan_perpanjangan")
      .select("id, status")
      .eq("telegram_message_id", messageId)
      .maybeSingle();

    if (permintaan) {
      if (permintaan.status !== "menunggu") {
        await jawabCallback(callbackQuery.id, "Sudah diproses sebelumnya.");
        await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n(Sudah diproses sebelumnya.)`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      const { error } = await supabaseAdmin.rpc(
        setuju ? "setujui_perpanjangan" : "tolak_perpanjangan",
        { p_permintaan_id: permintaan.id },
      );
      if (error) throw error;
      const hasil = setuju ? "✅ Perpanjangan disetujui." : "❌ Perpanjangan ditolak.";
      await jawabCallback(callbackQuery.id, hasil);
      await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n${hasil}`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await jawabCallback(callbackQuery.id, "Pengajuan tidak ditemukan.");
    await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n(Pengajuan tidak ditemukan, mungkin sudah diproses.)`);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("telegram-webhook error:", err);
    const pesanError = err instanceof Error ? err.message : "Terjadi kesalahan";
    await jawabCallback(callbackQuery.id, "Gagal memproses.");
    await tandaiPesanSelesai(chatId, messageId, `${teksAsli}\n\n⚠️ Gagal memproses: ${pesanError}`);
    return new Response(JSON.stringify({ ok: false, error: pesanError }), { status: 200 });
  }
});
