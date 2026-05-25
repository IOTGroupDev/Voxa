import { create } from 'zustand';

interface CaptureState {
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
}));

