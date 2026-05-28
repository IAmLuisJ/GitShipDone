import { create } from "zustand";

type LevelUpCelebration = {
  id: number;
  level: string;
};

type LevelUpState = {
  celebration: LevelUpCelebration | null;
  dismissLevelUp: () => void;
  triggerLevelUp: (level: string) => void;
};

export const useLevelUpStore = create<LevelUpState>((set) => ({
  celebration: null,
  dismissLevelUp: () => set({ celebration: null }),
  triggerLevelUp: (level) =>
    set({ celebration: { id: Date.now(), level } }),
}));
