import { useEffect } from "react";
import { Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fireConfetti } from "@/hooks/useConfetti";
import { useLevelUpStore } from "@/stores/levelUpStore";

const levelDescriptions: Record<string, string> = {
  Seed: "A fresh idea is taking root.",
  Sprout: "Momentum is showing above the surface.",
  Growing: "The project is gaining real traction.",
  Shipping: "You are turning progress into release energy.",
  Launched: "This project has crossed into shipped territory.",
};

export function LevelUpCelebration() {
  const celebration = useLevelUpStore((state) => state.celebration);
  const dismissLevelUp = useLevelUpStore((state) => state.dismissLevelUp);

  useEffect(() => {
    if (!celebration) {
      return;
    }

    fireConfetti();
    const timeoutId = window.setTimeout(dismissLevelUp, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [celebration, dismissLevelUp]);

  const level = celebration?.level ?? "";

  return (
    <Dialog open={Boolean(celebration)} onOpenChange={(open) => !open && dismissLevelUp()}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-500" />
        <DialogHeader className="items-center text-center">
          <div className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200">
            <Sparkles className="size-7" />
          </div>
          <DialogTitle className="text-2xl">🎉 Level Up!</DialogTitle>
          <DialogDescription>
            You reached a new project level.
          </DialogDescription>
        </DialogHeader>

        <div className="grid justify-items-center gap-2 rounded-lg border bg-muted/30 p-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-sm font-medium ring-1 ring-border">
            <Star className="size-4 text-amber-500" />
            {level}
          </div>
          <p className="text-sm text-muted-foreground">
            {levelDescriptions[level] ?? "Keep stacking wins and shipping progress."}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={dismissLevelUp}>
            Keep building
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
