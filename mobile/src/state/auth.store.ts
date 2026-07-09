import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { clearSupabaseAuthStorage, supabase } from '../lib/supabase/client';
import { getErrorMessage, isInvalidRefreshTokenError, isRetryableAuthFetchError } from '../lib/supabase/auth-errors';

export type AuthStatus =
  | 'checking_session'
  | 'signed_out'
  | 'email_entered'
  | 'otp_sending'
  | 'otp_sent'
  | 'otp_verifying'
  | 'authenticated'
  | 'auth_error'
  | 'signed_out_expired';

interface AuthState {
  session: Session | null;
  status: AuthStatus;
  email: string;
  resendAvailableAt: number | null;
  verificationAttempts: number;
  lastAuthError: string | null;
  onboardingCompleted: boolean;
  loading: boolean;
  error: string | null;
  initializeSession: () => Promise<void>;
  handleSessionChange: (session: Session | null, reason?: 'expired' | 'signed_out') => void;
  setEmail: (email: string) => void;
  setError: (error: string | null) => void;
  sendOtp: (email: string) => Promise<boolean>;
  verifyOtp: (token: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: 'checking_session',
  email: '',
  resendAvailableAt: null,
  verificationAttempts: 0,
  lastAuthError: null,
  onboardingCompleted: false,
  loading: true,
  error: null,
  initializeSession: async () => {
    set({ status: 'checking_session', loading: true, error: null, lastAuthError: null });
    let result: Awaited<ReturnType<typeof supabase.auth.getSession>>;
    try {
      result = await supabase.auth.getSession();
    } catch (error) {
      await handleSessionRestoreError(error, set);
      return;
    }

    const { data, error } = result;
    if (error) {
      await handleSessionRestoreError(error, set);
      return;
    }

    set({
      session: data.session ?? null,
      status: data.session ? 'authenticated' : 'signed_out',
      loading: false,
      error: null,
      lastAuthError: null,
    });
  },
  handleSessionChange: (session, reason) => {
    if (session) {
      set({ session, status: 'authenticated', loading: false, error: null, lastAuthError: null });
      return;
    }

    set({
      session: null,
      status: reason === 'expired' ? 'signed_out_expired' : 'signed_out',
      loading: false,
      error: reason === 'expired' ? 'Your session expired. Please sign in again.' : null,
    });
  },
  setEmail: (email) => set({ email, status: email.trim() ? 'email_entered' : 'signed_out', error: null }),
  setError: (error) => set({ error, lastAuthError: error, status: error ? 'auth_error' : 'signed_out', loading: false }),
  sendOtp: async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({
      email: normalizedEmail,
      status: 'otp_sending',
      loading: true,
      error: null,
      lastAuthError: null,
    });
    let result: Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>;
    try {
      result = await supabase.auth.signInWithOtp({ email: normalizedEmail });
    } catch (error) {
      set({
        status: 'auth_error',
        loading: false,
        error: isRetryableAuthFetchError(error)
          ? 'Could not reach Supabase. Please try again shortly.'
          : getErrorMessage(error),
        lastAuthError: getErrorMessage(error),
      });
      return false;
    }

    const { error } = result;

    if (error) {
      set({
        status: 'auth_error',
        loading: false,
        error: error.message,
        lastAuthError: error.message,
      });
      return false;
    }

    set({
      status: 'otp_sent',
      loading: false,
      error: null,
      resendAvailableAt: Date.now() + 30_000,
      verificationAttempts: 0,
    });
    return true;
  },
  verifyOtp: async (token) => {
    const email = useAuthStore.getState().email;
    set((state) => ({
      status: 'otp_verifying',
      loading: true,
      error: null,
      lastAuthError: null,
      verificationAttempts: state.verificationAttempts + 1,
    }));
    let result: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
    try {
      result = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    } catch (error) {
      set({
        status: 'auth_error',
        loading: false,
        error: isRetryableAuthFetchError(error)
          ? 'Could not reach Supabase. Please try again shortly.'
          : getErrorMessage(error),
        lastAuthError: getErrorMessage(error),
      });
      return;
    }

    const { data, error } = result;

    if (error) {
      set({
        status: 'auth_error',
        loading: false,
        error: error.message,
        lastAuthError: error.message,
      });
      return;
    }

    set({
      session: data.session ?? null,
      status: data.session ? 'authenticated' : 'signed_out',
      loading: false,
      error: null,
      lastAuthError: null,
    });
  },
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      await clearSupabaseAuthStorage();
    }
    set({
      session: null,
      status: 'signed_out',
      loading: false,
      error: null,
      lastAuthError: null,
      onboardingCompleted: false,
    });
  },
}));

async function handleSessionRestoreError(
  error: unknown,
  set: Parameters<typeof useAuthStore.setState>[0],
) {
  if (isInvalidRefreshTokenError(error)) {
    await clearSupabaseAuthStorage();
    set({
      session: null,
      status: 'signed_out_expired',
      loading: false,
      error: 'Your session expired. Please sign in again.',
      lastAuthError: getErrorMessage(error),
    });
    return;
  }

  set({
    session: null,
    status: isRetryableAuthFetchError(error) ? 'signed_out' : 'auth_error',
    loading: false,
    error: isRetryableAuthFetchError(error)
      ? 'Could not reach Supabase. Please try again shortly.'
      : 'Could not restore your session. Please sign in again.',
    lastAuthError: getErrorMessage(error),
  });
}
