import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VoiceFeedbackState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useVoiceFeedbackStore = create<VoiceFeedbackState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'voxa-voice-feedback',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
