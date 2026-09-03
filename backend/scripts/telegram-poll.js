// Long polling Telegram getUpdates -> forward tiap update ke Edge Function telegram-webhook.
// Alternatif lokal untuk webhook Telegram asli (yang butuh URL publik HTTPS) — lihat
// CLAUDE.md §8. Jalankan manual: `node scripts/telegram-poll.js` (terminal ke-3, opsional).

import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OFFSET_FILE = join(__dirname, ".telegram-offset.json");

const {
  TELEGRAM_BOT_TOKEN,
  SUPABASE_URL = "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY,
} = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN belum diisi di backend/.env");
  process.exit(1);
}
if (!SUPABASE_ANON_KEY) {
  console.error("SUPABASE_ANON_KEY belum diisi di backend/.env (ambil dari `supabase status`)");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-webhook`;

async function bacaOffset() {
  try {
    const isi = await readFile(OFFSET_FILE, "utf-8");
    return JSON.parse(isi).offset ?? 0;
  } catch {
    return 0;
  }
}

async function simpanOffset(offset) {
  await writeFile(OFFSET_FILE, JSON.stringify({ offset }), "utf-8");
}

async function teruskanKeWebhook(update) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      console.error(`telegram-webhook merespons status ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.error("Gagal meneruskan update ke telegram-webhook:", err.message);
  }
}

async function loopPolling() {
  let offset = await bacaOffset();
  console.log("Mulai long polling Telegram getUpdates... (Ctrl+C untuk berhenti)");

  while (true) {
    try {
      const res = await fetch(
        `${TELEGRAM_API}/getUpdates?timeout=30&offset=${offset}`,
        { signal: AbortSignal.timeout(35000) },
      );
      const data = await res.json();

      if (!data.ok) {
        console.error("getUpdates gagal:", data);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      for (const update of data.result) {
        await teruskanKeWebhook(update);
        offset = update.update_id + 1;
        await simpanOffset(offset);
      }
    } catch (err) {
      console.error("Error saat polling:", err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loopPolling();
