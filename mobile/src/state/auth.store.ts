import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  setError: (error: string | null) => void;
  sendOtp: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  error: null,
  setSession: (session) => set({ session, loading: false, error: null }),
  setError: (error) => set({ error, loading: false }),
  sendOtp: async (email) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      set({ error: error.message });
      return false;
    }

    return true;
  },
  verifyOtp: async (email, token) => {
    set({ error: null });
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

    if (error) {
      set({ error: error.message });
      return;
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, loading: false });
  },
}));
