-- Seed SATU akun admin bootstrap — ini BUKAN data dummy/contoh (CLAUDE.md §4 tetap berlaku:
-- katalog buku mulai kosong, diisi admin lewat UI, bukan seed). Tanpa akun ini tidak ada cara
-- login sebagai admin pertama kali (chicken-and-egg: cuma admin yang bisa naikin role user lain
-- jadi admin, tapi awalnya belum ada admin sama sekali).
--
-- Email : admin@perpustakaan.local
-- Password : admin123
-- GANTI PASSWORD INI setelah login pertama kali kalau dipakai di luar development lokal.

do $$
declare
  v_admin_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@perpustakaan.local',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama":"Admin Perpustakaan"}',
    now(), now(), '', '', '', ''
  );

  -- wajib ada baris identities juga, kalau tidak GoTrue menolak login email/password-nya
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@perpustakaan.local'),
    'email',
    now(), now(), now()
  );

  -- trigger on_auth_user_created di atas sudah bikin baris profiles (default role 'user'),
  -- di sini tinggal naikin jadi admin
  update public.profiles set role = 'admin' where id = v_admin_id;
end $$;

-- Jenis buku: kategori/format tetap (bukan tema cerita seperti genre), jadi di-seed langsung
-- sesuai daftar yang disepakati — admin tetap bisa nambah lagi lewat UI kalau perlu.
insert into public.jenis_buku (nama) values
  ('Komik'),
  ('Novel'),
  ('Buku Pengetahuan')
on conflict (nama) do nothing;

-- ================================================================
-- Seed: genre, jenis_buku, dan 50 data dummy tabel buku
-- Jalankan setelah tabel genre, jenis_buku, dan buku dibuat
-- (urutan: genre & jenis_buku dulu, baru buku, karena buku
--  mereferensikan genre_id & jenis_buku_id lewat subquery nama)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Seed genre (tema cerita) — cukup lengkap untuk fiksi & non-fiksi
-- ----------------------------------------------------------------
insert into public.genre (nama) values
('Roman'),
('Drama'),
('Petualangan'),
('Fantasi'),
('Fiksi Ilmiah'),
('Horor'),
('Misteri'),
('Thriller'),
('Komedi'),
('Aksi'),
('Superhero'),
('Slice of Life'),
('Sejarah'),
('Biografi'),
('Motivasi'),
('Keagamaan'),
('Filsafat'),
('Sains Populer'),
('Teknologi'),
('Kesehatan'),
('Psikologi'),
('Ekonomi & Bisnis'),
('Politik & Sosial'),
('Fabel/Anak'),
('Supernatural')
on conflict (nama) do nothing;

-- ----------------------------------------------------------------
-- 2. Seed jenis_buku (format/kategori)
-- ----------------------------------------------------------------
insert into public.jenis_buku (nama) values
('Novel'),
('Komik'),
('Buku Pengetahuan'),
('Religi'),
('Sejarah'),
('Biografi'),
('Puisi'),
('Ensiklopedia'),
('Buku Anak'),
('Majalah')
on conflict (nama) do nothing;

-- ----------------------------------------------------------------
-- 3. Seed 50 data buku
--    genre_id & jenis_buku_id diambil lewat subquery berdasarkan nama
--    (aman dipakai karena kolom nama di genre & jenis_buku UNIQUE)
-- ----------------------------------------------------------------
insert into public.books (judul, penulis, genre_id, jenis_buku_id, sinopsis, gambar_sampul, stok_total, stok_tersedia) values

-- ===== NOVEL (20) =====
('Laskar Pelangi', 'Andrea Hirata',
  (select id from public.genre where nama = 'Drama'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah sekelompok anak di Belitung yang berjuang menempuh pendidikan di tengah keterbatasan.', null, 5, 5),

('Sang Pemimpi', 'Andrea Hirata',
  (select id from public.genre where nama = 'Drama'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Lanjutan kisah Ikal dan Arai mengejar mimpi bersekolah hingga ke luar negeri.', null, 4, 3),

('Bumi Manusia', 'Pramoedya Ananta Toer',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah Minke, pemuda pribumi, menghadapi ketimpangan sosial pada masa kolonial Hindia Belanda.', null, 6, 4),

('Ayat-Ayat Cinta', 'Habiburrahman El Shirazy',
  (select id from public.genre where nama = 'Roman'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah cinta dan perjuangan seorang mahasiswa Indonesia di Kairo, Mesir.', null, 5, 2),

('Negeri 5 Menara', 'Ahmad Fuadi',
  (select id from public.genre where nama = 'Drama'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Enam santri di sebuah pesantren mengejar mimpi hingga ke berbagai penjuru dunia.', null, 4, 4),

('Perahu Kertas', 'Dee Lestari',
  (select id from public.genre where nama = 'Roman'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah Kugy dan Keenan yang menempuh jalan panjang menemukan cinta dan jati diri.', null, 5, 5),

('Supernova: Ksatria, Puteri, dan Bintang Jatuh', 'Dee Lestari',
  (select id from public.genre where nama = 'Fiksi Ilmiah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah cinta yang dibingkai dalam narasi fiksi ilmiah tentang ksatria dan puteri.', null, 4, 2),

('Ronggeng Dukuh Paruk', 'Ahmad Tohari',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah seorang ronggeng di sebuah dukuh yang terseret gejolak politik tahun 1965.', null, 3, 0),

('Cantik Itu Luka', 'Eka Kurniawan',
  (select id from public.genre where nama = 'Supernatural'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah keluarga yang dibalut unsur magis di sebuah kota pesisir Jawa.', null, 3, 2),

('Pulang', 'Leila S. Chudori',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah eksil politik Indonesia di Paris yang merindukan tanah air.', null, 4, 3),

('Laut Bercerita', 'Leila S. Chudori',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah aktivis mahasiswa yang hilang pada masa pergolakan politik akhir 1990-an.', null, 5, 5),

('Gadis Kretek', 'Ratih Kumala',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah tiga bersaudara menelusuri jejak sejarah keluarga di industri kretek.', null, 3, 1),

('5cm', 'Donny Dhirgantoro',
  (select id from public.genre where nama = 'Petualangan'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Lima sahabat menempuh perjalanan mendaki Gunung Semeru untuk menemukan makna persahabatan.', null, 6, 4),

('Dilan 1990', 'Pidi Baiq',
  (select id from public.genre where nama = 'Roman'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah cinta remaja di Bandung pada akhir tahun 1980-an.', null, 5, 5),

('Hujan', 'Tere Liye',
  (select id from public.genre where nama = 'Fiksi Ilmiah'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah persahabatan dan cinta yang diuji oleh bencana besar di masa depan.', null, 5, 5),

('Bumi', 'Tere Liye',
  (select id from public.genre where nama = 'Fantasi'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Awal petualangan Raib menemukan kekuatan dan dunia tersembunyi di baliknya.', null, 5, 4),

('Bulan', 'Tere Liye',
  (select id from public.genre where nama = 'Fantasi'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Petualangan Raib dan kawan-kawan menjelajahi dunia paralel penuh keajaiban.', null, 4, 3),

('Critical Eleven', 'Ika Natassa',
  (select id from public.genre where nama = 'Roman'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah pasangan yang menghadapi titik kritis dalam pernikahan mereka.', null, 4, 2),

('Keajaiban Toko Kelontong Namiya', 'Keigo Higashino',
  (select id from public.genre where nama = 'Supernatural'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Sebuah toko kelontong tua menjadi penghubung ajaib antar generasi lewat surat-surat yang dikirim.', null, 4, 4),

('Norwegian Wood', 'Haruki Murakami',
  (select id from public.genre where nama = 'Roman'),
  (select id from public.jenis_buku where nama = 'Novel'),
  'Kisah cinta dan kehilangan seorang mahasiswa di Tokyo pada akhir tahun 1960-an.', null, 3, 1),

-- ===== KOMIK (10) =====
('One Piece Vol. 1', 'Eiichiro Oda',
  (select id from public.genre where nama = 'Petualangan'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Awal perjalanan Monkey D. Luffy mencari harta karun legendaris One Piece.', null, 6, 6),

('Naruto Vol. 1', 'Masashi Kishimoto',
  (select id from public.genre where nama = 'Aksi'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Kisah ninja muda yang bermimpi menjadi pemimpin desanya.', null, 6, 5),

('Doraemon Vol. 1', 'Fujiko F. Fujio',
  (select id from public.genre where nama = 'Fabel/Anak'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Robot kucing dari masa depan membantu Nobita dengan berbagai alat ajaib.', null, 8, 8),

('Detective Conan Vol. 1', 'Gosho Aoyama',
  (select id from public.genre where nama = 'Misteri'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Detektif SMA yang tubuhnya menyusut menjadi anak kecil terus memecahkan kasus pelik.', null, 5, 3),

('Dragon Ball Vol. 1', 'Akira Toriyama',
  (select id from public.genre where nama = 'Aksi'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Petualangan Goku mencari tujuh bola naga bersama teman-temannya.', null, 5, 4),

('Si Juki: Kumpulan Komik Strip', 'Faza Meonk',
  (select id from public.genre where nama = 'Komedi'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Komik strip humor keseharian karakter Si Juki dan teman-temannya.', null, 4, 4),

('Garudayana Vol. 1', 'Is Yuniarto',
  (select id from public.genre where nama = 'Fantasi'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Petualangan fantasi bernuansa mitologi Nusantara.', null, 3, 3),

('Attack on Titan Vol. 1', 'Hajime Isayama',
  (select id from public.genre where nama = 'Horor'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Umat manusia berjuang melawan raksasa pemakan manusia di balik tembok pelindung.', null, 5, 2),

('Death Note Vol. 1', 'Tsugumi Ohba',
  (select id from public.genre where nama = 'Thriller'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Seorang pelajar menemukan buku catatan misterius yang bisa membunuh siapa pun namanya ditulis di sana.', null, 4, 4),

('Slam Dunk Vol. 1', 'Takehiko Inoue',
  (select id from public.genre where nama = 'Drama'),
  (select id from public.jenis_buku where nama = 'Komik'),
  'Kisah seorang siswa nakal yang jatuh cinta pada olahraga basket.', null, 4, 3),

-- ===== BUKU PENGETAHUAN (8) =====
('Sapiens: Riwayat Singkat Umat Manusia', 'Yuval Noah Harari',
  (select id from public.genre where nama = 'Sains Populer'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Menelusuri perjalanan evolusi dan sejarah umat manusia dari masa purba hingga era modern.', null, 4, 3),

('A Brief History of Time', 'Stephen Hawking',
  (select id from public.genre where nama = 'Sains Populer'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Penjelasan populer tentang asal-usul alam semesta, ruang, dan waktu.', null, 3, 3),

('Cosmos', 'Carl Sagan',
  (select id from public.genre where nama = 'Sains Populer'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Perjalanan menjelajahi alam semesta dan sejarah perkembangan sains astronomi.', null, 3, 2),

('The Selfish Gene', 'Richard Dawkins',
  (select id from public.genre where nama = 'Sains Populer'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Menjelaskan teori evolusi dari sudut pandang gen sebagai unit seleksi alam.', null, 3, 1),

('Atomic Habits', 'James Clear',
  (select id from public.genre where nama = 'Motivasi'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Panduan membangun kebiasaan kecil yang berdampak besar dalam jangka panjang.', null, 6, 5),

('Belajar Pemrograman Python Dasar', 'Budi Raharjo',
  (select id from public.genre where nama = 'Teknologi'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Pengantar dasar-dasar pemrograman menggunakan bahasa Python untuk pemula.', null, 5, 5),

('Pengantar Kecerdasan Buatan', 'Tim Penulis',
  (select id from public.genre where nama = 'Teknologi'),
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Konsep dasar kecerdasan buatan, machine learning, dan penerapannya sehari-hari.', null, 4, 4),

('Ensiklopedia Sains Populer untuk Pelajar', 'Tim Penulis',
  null,
  (select id from public.jenis_buku where nama = 'Buku Pengetahuan'),
  'Kumpulan pengetahuan sains dasar yang disusun ringkas untuk pelajar.', null, 3, 3),

-- ===== RELIGI (6) =====
('Tafsir Al-Misbah (Ringkasan)', 'M. Quraish Shihab',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Ringkasan tafsir Al-Qur''an dengan pendekatan bahasa yang mudah dipahami.', null, 3, 2),

('La Tahzan: Jangan Bersedih', 'Aidh al-Qarni',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Kumpulan nasihat dan motivasi hidup berdasarkan ajaran Islam.', null, 5, 5),

('Tasawuf Modern', 'Buya Hamka',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Pemikiran tasawuf yang relevan diterapkan dalam kehidupan modern.', null, 3, 3),

('Ihya Ulumuddin (Ringkasan)', 'Imam Al-Ghazali',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Ringkasan karya klasik tentang menghidupkan kembali ilmu-ilmu agama.', null, 2, 1),

('Fiqih Sunnah', 'Sayyid Sabiq',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Panduan fiqih Islam berdasarkan Al-Qur''an dan hadis sahih.', null, 4, 4),

('Renungan Harian Kristiani', 'Tim Penulis',
  (select id from public.genre where nama = 'Keagamaan'),
  (select id from public.jenis_buku where nama = 'Religi'),
  'Kumpulan renungan harian untuk memperkuat kehidupan rohani.', null, 3, 3),

-- ===== SEJARAH (6) =====
('Sejarah Indonesia Modern 1200-2008', 'M.C. Ricklefs',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Kajian menyeluruh perjalanan sejarah Indonesia dari masa kerajaan hingga era modern.', null, 3, 2),

('Api Sejarah Jilid 1', 'Ahmad Mansur Suryanegara',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Perspektif sejarah perjuangan kemerdekaan Indonesia dari sudut pandang lain.', null, 3, 3),

('Gajah Mada: Biografi Politik', 'Langit Kresna Hariadi',
  (select id from public.genre where nama = 'Biografi'),
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Kisah perjalanan politik dan kekuasaan Mahapatih Gajah Mada di era Majapahit.', null, 4, 3),

('Sejarah Kerajaan Majapahit', 'Tim Penulis',
  null,
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Gambaran umum kejayaan dan keruntuhan Kerajaan Majapahit.', null, 3, 1),

('Runtuhnya Kerajaan Hindu-Jawa dan Timbulnya Negara Islam di Nusantara', 'H.J. de Graaf',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Kajian transisi kekuasaan dari kerajaan Hindu-Jawa menuju kesultanan Islam di Nusantara.', null, 2, 2),

('Indonesia dalam Arus Sejarah', 'Tim Penulis',
  (select id from public.genre where nama = 'Sejarah'),
  (select id from public.jenis_buku where nama = 'Sejarah'),
  'Rangkuman peristiwa penting yang membentuk perjalanan bangsa Indonesia.', null, 4, 4);