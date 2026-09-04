// Edge Function: cek-keterlambatan
// Wrapper tipis yang memanggil RPC cek_keterlambatan() pakai service role (bypass RLS).
// Dipanggil berkala oleh scripts/cron-keterlambatan.js. verify_jwt dimatikan (lihat
// supabase/config.toml) karena hanya dipanggil script lokal tepercaya, bukan browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { data, error } = await supabaseAdmin.rpc("cek_keterlambatan");

  if (error) {
    console.error("cek_keterlambatan gagal:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, jumlah_dikirim: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
