import { useLevelUpStore } from "@/stores/levelUpStore";

type LevelUpResponse = {
  didLevelUp?: boolean;
  level?: string;
  newLevel?: string;
};

export function triggerLevelUpFromResponse(response: LevelUpResponse) {
  if (!response.didLevelUp) {
    return;
  }

  const level = response.newLevel ?? response.level;
  if (level) {
    useLevelUpStore.getState().triggerLevelUp(level);
  }
}
