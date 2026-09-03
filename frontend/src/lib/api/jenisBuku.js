import { supabase } from '../supabaseClient';

export async function listJenisBuku() {
  const { data, error } = await supabase.from('jenis_buku').select('*').order('nama');
  if (error) throw error;
  return data;
}

export async function createJenisBuku(nama) {
  const { data, error } = await supabase.from('jenis_buku').insert({ nama }).select().single();
  if (error) throw error;
  return data;
}
