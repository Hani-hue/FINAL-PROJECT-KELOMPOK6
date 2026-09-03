import { supabase } from '../supabaseClient';

const BUCKET = 'sampul-buku';

export async function listBooks({ search = '', genreId = '', jenisBukuId = '' } = {}) {
  let query = supabase
    .from('books')
    .select('*, genre(id, nama), jenis_buku(id, nama)')
    .order('judul');

  if (search) {
    query = query.or(`judul.ilike.%${search}%,penulis.ilike.%${search}%`);
  }
  if (genreId) {
    query = query.eq('genre_id', genreId);
  }
  if (jenisBukuId) {
    query = query.eq('jenis_buku_id', jenisBukuId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBook(id) {
  const { data, error } = await supabase
    .from('books')
    .select('*, genre(id, nama), jenis_buku(id, nama)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createBook(payload) {
  const { data, error } = await supabase.from('books').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateBook(id, payload) {
  const { data, error } = await supabase.from('books').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Upload file sampul ke Supabase Storage, return public URL-nya buat disimpan
 * di kolom books.gambar_sampul.
 */
export async function uploadCover(file) {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
