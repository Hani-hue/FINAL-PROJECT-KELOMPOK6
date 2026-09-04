import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProfile, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp } from '../lib/api/auth';
import { endChatSession } from '../lib/chatSession';

const AuthContext = createContext(null);

/**
 * Satu-satunya sumber kebenaran soal siapa yang login & apa role-nya. Halaman/komponen lain
 * pakai hook useAuth() di bawah, jangan panggil supabase.auth langsung dari tempat lain.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const muatProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error('Gagal ambil profil:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let aktif = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!aktif) return;
      setSession(data.session);
      await muatProfile(data.session?.user?.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!aktif) return;
      setSession(newSession);
      await muatProfile(newSession?.user?.id);
    });

    return () => {
      aktif = false;
      listener.subscription.unsubscribe();
    };
  }, [muatProfile]);

  const login = useCallback(async (email, password) => {
    const { session: newSession } = await apiSignIn({ email, password });
    const profileData = await getProfile(newSession.user.id);

    if (!profileData.is_active) {
      await apiSignOut();
      throw new Error('Akun Anda telah dinonaktifkan. Hubungi admin untuk info lebih lanjut.');
    }

    setProfile(profileData);
    return profileData;
  }, []);

  const register = useCallback(async (nama, email, password) => {
    await apiSignUp({ nama, email, password });
  }, []);

  const logout = useCallback(async () => {
    await apiSignOut();
    endChatSession();
    setProfile(null);
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
