import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Satu-satunya inisialisasi createClient() Supabase di seluruh frontend.
 * Semua helper di lib/api/ import client ini, jangan bikin instance baru di tempat lain.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
