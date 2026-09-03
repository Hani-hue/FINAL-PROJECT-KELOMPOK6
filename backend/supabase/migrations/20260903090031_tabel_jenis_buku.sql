-- Pisahkan "jenis buku" (format/kategori: Komik, Novel, Buku Pengetahuan) dari "genre" (tema
-- cerita: Aksi, Drama, Romansa, Klasik, Religi, Iptek, dst) — dua konsep berbeda, dua tabel
-- referensi terpisah. Kolom books.jenis_buku dari migration sebelumnya sebenarnya nyimpen data
-- genre (tema), jadi di-rename jadi books.genre_id supaya jelas. Kolom baru books.jenis_buku_id
-- nunjuk ke tabel jenis_buku yang baru ini.

alter table public.books rename column jenis_buku to genre_id;
alter index books_jenis_buku_idx rename to books_genre_id_idx;

create table public.jenis_buku (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);

alter table public.books
  add column jenis_buku_id uuid references public.jenis_buku (id) on delete set null;

create index books_jenis_buku_id_idx on public.books (jenis_buku_id);

alter table public.jenis_buku enable row level security;

-- sama seperti genre: daftar jenis buku bisa dilihat siapa saja, CRUD khusus admin
create policy "Daftar jenis buku bisa dilihat siapa saja"
  on public.jenis_buku for select
  using (true);

create policy "Admin kelola jenis buku"
  on public.jenis_buku for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
