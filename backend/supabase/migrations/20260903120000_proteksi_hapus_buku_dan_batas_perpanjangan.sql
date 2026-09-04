-- Perbaikan lanjutan:
-- 1) Admin tidak boleh hapus buku yang punya pengajuan/peminjaman AKTIF (menunggu_konfirmasi,
--    dipinjam, menunggu_pengembalian). Begitu semua riwayat peminjaman buku itu selesai
--    (dikembalikan/ditolak), buku tetap boleh dihapus — baris loans lama TIDAK ikut terhapus,
--    cuma book_id-nya jadi null (riwayat transaksi tetap ada untuk laporan, judulnya saja yang
--    sudah tidak diketahui lagi karena bukunya sudah dihapus dari katalog).
-- 2) Batas pengajuan perpanjangan: maksimal 2 kali DISETUJUI per peminjaman, dan tiap pengajuan
--    tidak boleh mundur lebih dari 7 hari dari batas_kembali yang berlaku saat ini.
-- 3) BUG lama yang ketemu sambil kerjain di atas: tabel loans & permintaan_perpanjangan enable
--    RLS tapi TIDAK PUNYA policy UPDATE sama sekali untuk role authenticated. Akibatnya
--    `supabase.from('loans').update({ telegram_message_id: ... })` yang dipanggil user biasa di
--    api/loans.js & api/extensions.js selalu no-op (0 baris ke-update, tanpa error) — kolom
--    telegram_message_id TIDAK PERNAH benar-benar tersimpan, jadi tombol Setuju/Tolak Telegram di
--    Bagian 8 tidak akan pernah nemu record yang cocok. Diperbaiki dengan policy UPDATE yang
--    dibatasi ke baris milik sendiri, DIKUNCI lewat column-level grant supaya user cuma bisa
--    mengubah kolom telegram_message_id itu saja (bukan status/stok/dsb — perubahan status tetap
--    HANYA lewat RPC security definer di atas).
-- 4) BUG lama lain yang ketemu: policy INSERT `permintaan_perpanjangan` bawaan migration pertama
--    punya klausa "not exists (select ... from permintaan_perpanjangan ...)" yang mereferensikan
--    TABELNYA SENDIRI di dalam WITH CHECK. Postgres RLS melarang pola ini — begitu user beneran
--    coba insert lewat REST API (bukan psql sebagai superuser), errornya persis "infinite
--    recursion detected in policy for relation permintaan_perpanjangan". Jadi fitur "Ajukan
--    Perpanjangan" kemungkinan besar SELALU GAGAL untuk user biasa sejak awal. Diperbaiki dengan
--    memindahkan pengecekan yang mereferensikan diri sendiri (cegah dobel pending + batas 2 kali)
--    ke trigger BEFORE INSERT (security definer, jalan sebagai pemilik tabel sehingga tidak kena
--    RLS lagi), bukan di WITH CHECK policy.

alter table public.loans alter column book_id drop not null;

alter table public.loans drop constraint loans_book_id_fkey;
alter table public.loans
  add constraint loans_book_id_fkey foreign key (book_id) references public.books (id) on delete set null;

create or replace function public.cegah_hapus_buku_dipinjam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.loans
    where book_id = old.id
      and status in ('menunggu_konfirmasi', 'dipinjam', 'menunggu_pengembalian')
  ) then
    raise exception 'Buku "%" sedang dipinjam/menunggu proses peminjaman, tidak bisa dihapus', old.judul;
  end if;
  return old;
end;
$$;

create trigger books_cegah_hapus_saat_dipinjam
  before delete on public.books
  for each row execute function public.cegah_hapus_buku_dipinjam();

-- ---- Batas perpanjangan ----
drop policy "User ajukan perpanjangan peminjaman sendiri" on public.permintaan_perpanjangan;

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
    and batas_kembali_baru <= (select batas_kembali from public.loans where loans.id = permintaan_perpanjangan.loan_id) + interval '7 days'
  );

-- Cegah dobel pending & tegakkan batas 2 kali disetujui lewat trigger (BUKAN RLS policy) supaya
-- tidak mereferensikan permintaan_perpanjangan dari dalam policy-nya sendiri (lihat catatan bug 4
-- di atas). Trigger security definer berjalan sebagai pemilik tabel, jadi tidak kena RLS.
create or replace function public.cegah_perpanjangan_melebihi_batas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.permintaan_perpanjangan
    where loan_id = new.loan_id and status = 'menunggu'
  ) then
    raise exception 'Masih ada pengajuan perpanjangan lain yang menunggu konfirmasi untuk peminjaman ini';
  end if;

  if (
    select count(*) from public.permintaan_perpanjangan
    where loan_id = new.loan_id and status = 'disetujui'
  ) >= 2 then
    raise exception 'Batas maksimal 2 kali perpanjangan untuk peminjaman ini sudah tercapai';
  end if;

  return new;
end;
$$;

create trigger permintaan_perpanjangan_cegah_dobel_dan_batas
  before insert on public.permintaan_perpanjangan
  for each row execute function public.cegah_perpanjangan_melebihi_batas();

-- ---- Realtime: supaya status di "Peminjaman Saya" berubah otomatis tanpa refresh manual ----
-- begitu admin/Telegram menyetujui/menolak. Realtime tetap menghormati RLS SELECT (user cuma
-- nerima event untuk baris miliknya sendiri atau kalau dia admin).
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.permintaan_perpanjangan;

-- ---- Perbaikan: policy UPDATE untuk telegram_message_id (lihat catatan bug di atas) ----
revoke update on public.loans from authenticated;
grant update (telegram_message_id) on public.loans to authenticated;

create policy "User set telegram_message_id peminjaman sendiri"
  on public.loans for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.permintaan_perpanjangan from authenticated;
grant update (telegram_message_id) on public.permintaan_perpanjangan to authenticated;

create policy "User set telegram_message_id perpanjangan sendiri"
  on public.permintaan_perpanjangan for update
  to authenticated
  using (
    exists (
      select 1 from public.loans
      where loans.id = permintaan_perpanjangan.loan_id and loans.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.loans
      where loans.id = permintaan_perpanjangan.loan_id and loans.user_id = auth.uid()
    )
  );
