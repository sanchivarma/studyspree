import { create } from "zustand";

type SessionState = {
  elapsedSeconds: number;
  remainingSeconds: number | null;
  isFinishing: boolean;
  setTick: (elapsed: number, remaining: number | null) => void;
  setFinishing: (isFinishing: boolean) => void;
};

// Display state only: never persisted or used as a banked duration.
export const useSessionStore = create<SessionState>((set) => ({
  elapsedSeconds: 0, remainingSeconds: null, isFinishing: false,
  setTick: (elapsedSeconds, remainingSeconds) => set(state => state.elapsedSeconds === elapsedSeconds && state.remainingSeconds === remainingSeconds ? state : { elapsedSeconds, remainingSeconds }),
  setFinishing: (isFinishing) => set({ isFinishing }),
}));
