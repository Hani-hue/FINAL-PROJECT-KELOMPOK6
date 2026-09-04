-- Riwayat chat AI + status pengajuan pinjam yang diajukan lewat chatbot, dipersist ke database
-- supaya tidak hilang saat user refresh/pindah halaman (sebelumnya cuma disimpan di React state,
-- lihat frontend/src/pages/Chatbot.jsx).

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Penanda "sesi chat" di sisi browser (dibuat baru tiap kali user login, dihapus saat logout —
  -- lihat frontend/src/lib/chatSession.js). Dipakai supaya percakapan yang ditampilkan/dikirim ke
  -- Gemini sebagai histori selalu mulai bersih tiap sesi login baru, TANPA menghapus baris lama
  -- dari database (riwayat sesi sebelumnya tetap tersimpan, cuma tidak ditampilkan lagi).
  session_id uuid not null,
  role text not null check (role in ('user', 'model')),
  text text not null,
  -- null = pesan chat biasa. 'pending' = status "menunggu konfirmasi admin" saat sebuah
  -- pengajuan pinjam dibuat lewat chat. 'result' = status hasil (disetujui/ditolak) setelah
  -- admin memproses. 'pending'/'result' selalu disertai loan_id — dipakai frontend buat tau
  -- pengajuan mana yang hasilnya belum pernah ditampilkan ke user (fallback kalau user sempat
  -- pindah halaman ATAU logout-login lagi sebelum admin memproses; lihat Chatbot.jsx). Pengecekan
  -- ini SENGAJA tidak dibatasi session_id — supaya hasil pengajuan dari sesi lama tetap sampai
  -- meski baru terlihat di sesi (login) yang baru.
  kind text check (kind in ('pending', 'result')),
  loan_id uuid references public.loans (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chat_messages_kind_butuh_loan_id check (kind is null or loan_id is not null)
);

create index chat_messages_user_id_idx on public.chat_messages (user_id, created_at);
create index chat_messages_session_id_idx on public.chat_messages (user_id, session_id, created_at);
create index chat_messages_loan_id_idx on public.chat_messages (loan_id) where loan_id is not null;

-- pastikan hasil (disetujui/ditolak) untuk satu pengajuan cuma pernah dicatat sekali, meskipun
-- baris "result" bisa datang dari dua jalur berbeda (listener Realtime saat user masih di
-- halaman chat, atau fallback pengecekan saat halaman dibuka lagi) — cegah notifikasi dobel.
create unique index chat_messages_result_per_loan_idx
  on public.chat_messages (loan_id)
  where kind = 'result';

alter table public.chat_messages enable row level security;

-- chat_messages: riwayat chat pribadi, user cuma boleh baca/insert pesan miliknya sendiri.
create policy "Lihat riwayat chat sendiri"
  on public.chat_messages for select
  to authenticated
  using (user_id = auth.uid());

create policy "Insert riwayat chat sendiri"
  on public.chat_messages for insert
  to authenticated
  with check (user_id = auth.uid());
