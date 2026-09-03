-- Normalisasi genre buku: dari kolom teks bebas (books.genre) jadi tabel referensi tersendiri
-- (public.genre), supaya admin pilih dari daftar yang konsisten alih-alih ketik bebas (cegah
-- duplikat kayak "Fiksi" vs "fiksi" vs "Fiction"). Kolom di books diganti nama jadi jenis_buku
-- (foreign key ke genre.id).

create table public.genre (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);

alter table public.books
  drop column genre,
  add column jenis_buku uuid references public.genre (id) on delete set null;

create index books_jenis_buku_idx on public.books (jenis_buku);

alter table public.genre enable row level security;

-- sama seperti books: daftar genre bisa dilihat siapa saja, CRUD khusus admin
create policy "Daftar genre bisa dilihat siapa saja"
  on public.genre for select
  using (true);

create policy "Admin kelola genre"
  on public.genre for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
