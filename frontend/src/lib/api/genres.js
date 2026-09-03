import { supabase } from '../supabaseClient';

export async function listGenres() {
  const { data, error } = await supabase.from('genre').select('*').order('nama');
  if (error) throw error;
  return data;
}

export async function createGenre(nama) {
  const { data, error } = await supabase.from('genre').insert({ nama }).select().single();
  if (error) throw error;
  return data;
}
