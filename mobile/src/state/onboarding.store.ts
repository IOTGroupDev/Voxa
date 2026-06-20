import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface OnboardingState {
  completedByUserId: Record<string, boolean>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  isCompleted: (userId: string | undefined) => boolean;
  complete: (userId: string) => Promise<void>;
}

const STORAGE_KEY = 'voxa-onboarding-completed';

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  completedByUserId: {},
  hydrated: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (!raw) {
      set({ hydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      set({ completedByUserId: parsed, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  isCompleted: (userId) => Boolean(userId && get().completedByUserId[userId]),
  complete: async (userId) => {
    const next = { ...get().completedByUserId, [userId]: true };
    set({ completedByUserId: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
}));
