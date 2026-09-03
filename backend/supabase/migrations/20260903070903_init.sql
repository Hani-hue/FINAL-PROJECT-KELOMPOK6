-- Perpustakaan Digital — skema awal
-- Tabel, RLS, dan seluruh RPC transaksional sesuai CLAUDE.md §4.
-- Catatan: proyek ini local-only (satu instance Supabase per laptop), jadi URL Edge Function
-- di-hardcode pada fungsi yang memanggil net.http_post. Dipanggil dari DALAM container Postgres,
-- jadi harus lewat hostname Docker internal ke container Kong (API gateway), BUKAN 127.0.0.1:54321
-- (itu cuma port yang di-expose ke host, ga bisa diakses dari container lain lewat localhost).
-- Nama container ini "supabase_kong_<project_id>" — project_id di config.toml project ini "backend".

create extension if not exists pgcrypto;
create extension if not exists pg_net;

-- =========================================================================
-- TABEL
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  penulis text not null,
  genre text,
  sinopsis text,
  gambar_sampul text,
  stok_total integer not null default 0 check (stok_total >= 0),
  stok_tersedia integer not null default 0 check (stok_tersedia >= 0),
  created_at timestamptz not null default now(),
  constraint stok_tersedia_tidak_melebihi_total check (stok_tersedia <= stok_total)
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  book_id uuid not null references public.books (id),
  tanggal_pinjam timestamptz not null default now(),
  batas_kembali timestamptz,
  tanggal_kembali timestamptz,
  status text not null default 'menunggu_konfirmasi'
    check (status in ('menunggu_konfirmasi', 'dipinjam', 'ditolak', 'menunggu_pengembalian', 'dikembalikan')),
  telegram_message_id bigint,
  terakhir_diingatkan timestamptz,
  created_at timestamptz not null default now()
);

create index loans_user_id_idx on public.loans (user_id);
create index loans_book_id_idx on public.loans (book_id);
create index loans_status_idx on public.loans (status);

create table public.permintaan_perpanjangan (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id),
  batas_kembali_baru timestamptz not null,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create index permintaan_perpanjangan_loan_id_idx on public.permintaan_perpanjangan (loan_id);

-- =========================================================================
-- FUNGSI HELPER
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- RPC: PEMINJAMAN
-- =========================================================================

create or replace function public.ajukan_pinjam(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_jumlah_aktif integer;
  v_loan public.loans;
begin
  if v_uid is null then
    raise exception 'Harus login untuk mengajukan peminjaman';
  end if;

  if not exists (select 1 from public.books where id = p_book_id) then
    raise exception 'Buku tidak ditemukan';
  end if;

  select count(*) into v_jumlah_aktif
  from public.loans
  where user_id = v_uid and status in ('menunggu_konfirmasi', 'dipinjam');

  if v_jumlah_aktif >= 3 then
    raise exception 'Batas peminjaman aktif tercapai (maksimal 3 buku)';
  end if;

  insert into public.loans (user_id, book_id, status)
  values (v_uid, p_book_id, 'menunggu_konfirmasi')
  returning * into v_loan;

  return v_loan;
end;
$$;

create or replace function public.setujui_pinjam(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_masa_pinjam interval := interval '7 days';
  v_loan public.loans;
  v_book public.books;
  v_jumlah_aktif integer;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menyetujui peminjaman';
  end if;

  select * into v_loan from public.loans where id = p_loan_id for update;
  if v_loan is null then
    raise exception 'Pengajuan peminjaman tidak ditemukan';
  end if;
  if v_loan.status <> 'menunggu_konfirmasi' then
    raise exception 'Pengajuan sudah diproses sebelumnya';
  end if;

  -- cek ulang batas 3 buku aktif secara atomik (cegah race condition)
  select count(*) into v_jumlah_aktif
  from public.loans
  where user_id = v_loan.user_id and status in ('menunggu_konfirmasi', 'dipinjam');

  if v_jumlah_aktif > 3 then
    raise exception 'User sudah melebihi batas peminjaman aktif (maksimal 3 buku)';
  end if;

  select * into v_book from public.books where id = v_loan.book_id for update;
  if v_book.stok_tersedia < 1 then
    raise exception 'Stok buku habis';
  end if;

  -- stok_tersedia berubah lewat UPDATE biasa di sini; alert stok menipis ditangani
  -- seragam oleh trigger books_stok_berubah (lihat bawah), bukan dipanggil manual di sini,
  -- supaya jalur RPC maupun edit stok manual admin (lewat CRUD katalog) sama-sama tercakup.
  update public.books
  set stok_tersedia = stok_tersedia - 1
  where id = v_book.id;

  update public.loans
  set status = 'dipinjam',
      tanggal_pinjam = now(),
      batas_kembali = now() + v_masa_pinjam
  where id = p_loan_id
  returning * into v_loan;

  return v_loan;
end;
$$;

create or replace function public.tolak_pinjam(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menolak peminjaman';
  end if;

  update public.loans
  set status = 'ditolak'
  where id = p_loan_id and status = 'menunggu_konfirmasi'
  returning * into v_loan;

  if v_loan is null then
    raise exception 'Pengajuan tidak ditemukan atau sudah diproses';
  end if;

  return v_loan;
end;
$$;

-- =========================================================================
-- RPC: PENGEMBALIAN
-- =========================================================================

create or replace function public.ajukan_pengembalian(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
begin
  select * into v_loan from public.loans where id = p_loan_id;
  if v_loan is null or v_loan.user_id <> auth.uid() then
    raise exception 'Peminjaman tidak ditemukan';
  end if;
  if v_loan.status <> 'dipinjam' then
    raise exception 'Peminjaman ini tidak sedang berjalan';
  end if;

  update public.loans
  set status = 'menunggu_pengembalian'
  where id = p_loan_id
  returning * into v_loan;

  return v_loan;
end;
$$;

create or replace function public.setujui_pengembalian(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_book public.books;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menyetujui pengembalian';
  end if;

  select * into v_loan from public.loans where id = p_loan_id for update;
  if v_loan is null then
    raise exception 'Peminjaman tidak ditemukan';
  end if;
  if v_loan.status <> 'menunggu_pengembalian' then
    raise exception 'Peminjaman ini tidak sedang menunggu pengembalian';
  end if;

  select * into v_book from public.books where id = v_loan.book_id for update;

  update public.books
  set stok_tersedia = stok_tersedia + 1
  where id = v_book.id;

  update public.loans
  set status = 'dikembalikan',
      tanggal_kembali = now()
  where id = p_loan_id
  returning * into v_loan;

  return v_loan;
end;
$$;

create or replace function public.tolak_pengembalian(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menolak pengembalian';
  end if;

  update public.loans
  set status = 'dipinjam'
  where id = p_loan_id and status = 'menunggu_pengembalian'
  returning * into v_loan;

  if v_loan is null then
    raise exception 'Pengajuan pengembalian tidak ditemukan atau sudah diproses';
  end if;

  return v_loan;
end;
$$;

-- =========================================================================
-- RPC: PERPANJANGAN
-- =========================================================================

create or replace function public.setujui_perpanjangan(p_permintaan_id uuid)
returns public.permintaan_perpanjangan
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permintaan public.permintaan_perpanjangan;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menyetujui perpanjangan';
  end if;

  select * into v_permintaan from public.permintaan_perpanjangan where id = p_permintaan_id for update;
  if v_permintaan is null then
    raise exception 'Permintaan perpanjangan tidak ditemukan';
  end if;
  if v_permintaan.status <> 'menunggu' then
    raise exception 'Permintaan sudah diproses sebelumnya';
  end if;

  update public.loans
  set batas_kembali = v_permintaan.batas_kembali_baru
  where id = v_permintaan.loan_id;

  update public.permintaan_perpanjangan
  set status = 'disetujui'
  where id = p_permintaan_id
  returning * into v_permintaan;

  return v_permintaan;
end;
$$;

create or replace function public.tolak_perpanjangan(p_permintaan_id uuid)
returns public.permintaan_perpanjangan
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permintaan public.permintaan_perpanjangan;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menolak perpanjangan';
  end if;

  update public.permintaan_perpanjangan
  set status = 'ditolak'
  where id = p_permintaan_id and status = 'menunggu'
  returning * into v_permintaan;

  if v_permintaan is null then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses';
  end if;

  return v_permintaan;
end;
$$;

-- =========================================================================
-- RPC: ALERT OTOMATIS (dipanggil dari RPC lain / job terjadwal, memicu Edge Function via pg_net)
-- =========================================================================

create or replace function public.cek_stok_menipis(p_book_id uuid, p_stok_sebelum integer, p_stok_sesudah integer)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_judul text;
begin
  -- hanya kirim alert pada TRANSISI dari >2 ke <=2, bukan tiap kali dipanggil (cegah spam)
  if p_stok_sebelum > 2 and p_stok_sesudah <= 2 then
    select judul into v_judul from public.books where id = p_book_id;

    perform net.http_post(
      url := 'http://supabase_kong_backend:8000/functions/v1/telegram-notify',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'type', 'stok_menipis',
        'judul_buku', v_judul,
        'stok_tersedia', p_stok_sesudah
      )
    );
  end if;
end;
$$;

-- Trigger seragam: setiap kali stok_tersedia berubah — baik lewat RPC (setujui_pinjam,
-- setujui_pengembalian) MAUPUN lewat edit manual admin di CRUD katalog (update langsung ke
-- tabel books) — cek_stok_menipis otomatis dipanggil dengan nilai sebelum/sesudah yang benar.
create or replace function public.trigger_cek_stok_menipis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stok_tersedia is distinct from old.stok_tersedia then
    perform public.cek_stok_menipis(new.id, old.stok_tersedia, new.stok_tersedia);
  end if;
  return new;
end;
$$;

create trigger books_stok_berubah
  after update on public.books
  for each row execute function public.trigger_cek_stok_menipis();

create or replace function public.cek_keterlambatan()
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_row record;
  v_jumlah integer := 0;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Hanya admin yang boleh menjalankan pengecekan keterlambatan';
  end if;

  for v_row in
    select l.id as loan_id, b.judul as judul_buku, p.nama as nama_peminjam
    from public.loans l
    join public.books b on b.id = l.book_id
    join public.profiles p on p.id = l.user_id
    where l.status = 'dipinjam'
      and l.batas_kembali < now()
      and (l.terakhir_diingatkan is null or l.terakhir_diingatkan < now() - interval '24 hours')
  loop
    perform net.http_post(
      url := 'http://supabase_kong_backend:8000/functions/v1/telegram-notify',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'type', 'keterlambatan',
        'judul_buku', v_row.judul_buku,
        'nama_peminjam', v_row.nama_peminjam
      )
    );

    update public.loans set terakhir_diingatkan = now() where id = v_row.loan_id;
    v_jumlah := v_jumlah + 1;
  end loop;

  return v_jumlah;
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.loans enable row level security;
alter table public.permintaan_perpanjangan enable row level security;

-- profiles: lihat data sendiri atau admin lihat semua; hanya admin yang boleh update
-- (dipakai admin untuk toggle is_active/role dari dashboard kelola user)
create policy "Lihat profil sendiri atau admin lihat semua"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Admin update profil user"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- books: katalog bisa dilihat siapa saja (termasuk sebelum login); CRUD khusus admin
create policy "Katalog buku bisa dilihat siapa saja"
  on public.books for select
  using (true);

create policy "Admin kelola buku"
  on public.books for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- loans: hanya lihat milik sendiri atau admin. Semua perubahan status lewat RPC
-- security definer di atas (bukan lewat policy insert/update langsung).
create policy "Lihat peminjaman sendiri atau admin"
  on public.loans for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- permintaan_perpanjangan: user insert permintaan untuk peminjaman miliknya sendiri yang
-- sedang berjalan; approve/reject lewat RPC security definer (bukan lewat policy update).
create policy "Lihat perpanjangan sendiri atau admin"
  on public.permintaan_perpanjangan for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.loans
      where loans.id = permintaan_perpanjangan.loan_id and loans.user_id = auth.uid()
    )
  );

create policy "User ajukan perpanjangan peminjaman sendiri"
  on public.permintaan_perpanjangan for insert
  to authenticated
  with check (
    status = 'menunggu'
    and exists (
      select 1 from public.loans
      where loans.id = permintaan_perpanjangan.loan_id
        and loans.user_id = auth.uid()
        and loans.status = 'dipinjam'
    )
    and batas_kembali_baru > (select batas_kembali from public.loans where loans.id = permintaan_perpanjangan.loan_id)
    -- cegah ajukan perpanjangan dobel selagi masih ada permintaan lain yang menunggu
    and not exists (
      select 1 from public.permintaan_perpanjangan pp
      where pp.loan_id = permintaan_perpanjangan.loan_id and pp.status = 'menunggu'
    )
  );

-- =========================================================================
-- STORAGE: bucket sampul-buku (read public, write/delete admin-only)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('sampul-buku', 'sampul-buku', true)
on conflict (id) do nothing;

create policy "Sampul buku bisa dilihat siapa saja"
  on storage.objects for select
  using (bucket_id = 'sampul-buku');

create policy "Admin upload sampul buku"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sampul-buku' and public.is_admin());

create policy "Admin update sampul buku"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'sampul-buku' and public.is_admin())
  with check (bucket_id = 'sampul-buku' and public.is_admin());

create policy "Admin hapus sampul buku"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'sampul-buku' and public.is_admin());
