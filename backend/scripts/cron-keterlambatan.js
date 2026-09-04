// Job terjadwal lokal: panggil Edge Function cek-keterlambatan secara berkala.
// Alternatif portable untuk pg_cron (belum tentu tersedia di image Supabase CLI lokal) —
// lihat CLAUDE.md §9. Jalankan manual: `node scripts/cron-keterlambatan.js` (terminal ke-3, opsional).

import "dotenv/config";
import cron from "node-cron";

const { SUPABASE_URL = "http://127.0.0.1:54321", SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_ANON_KEY) {
  console.error("SUPABASE_ANON_KEY belum diisi di backend/.env (ambil dari `supabase status`)");
  process.exit(1);
}

// Jadwal cron: tiap 6 jam. Ubah sesuai kebutuhan development/demo.
const JADWAL = "0 */6 * * *";
const CEK_URL = `${SUPABASE_URL}/functions/v1/cek-keterlambatan`;

async function jalankanCekKeterlambatan() {
  try {
    const res = await fetch(CEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[${new Date().toISOString()}] cek-keterlambatan gagal:`, data);
      return;
    }
    console.log(
      `[${new Date().toISOString()}] cek-keterlambatan selesai, ${data.jumlah_dikirim} alert dikirim`,
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Gagal memanggil cek-keterlambatan:`, err.message);
  }
}

console.log(`Menjadwalkan cek-keterlambatan dengan jadwal cron "${JADWAL}" (Ctrl+C untuk berhenti)`);
cron.schedule(JADWAL, jalankanCekKeterlambatan);

// jalankan sekali langsung saat script dimulai, tidak perlu tunggu interval pertama
jalankanCekKeterlambatan();
