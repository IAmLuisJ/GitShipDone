import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const themeLabels: Record<ThemePreference, string> = {
  dark: "Dark theme",
  light: "Light theme",
  system: "System theme",
};

const themeIcons = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

type ThemeToggleProps = {
  className?: string;
  collapsed?: boolean;
};

export function ThemeToggle({ className, collapsed = false }: ThemeToggleProps) {
  const { cycleTheme, theme } = useTheme();
  const Icon = themeIcons[theme];
  const label = themeLabels[theme];

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`Theme: ${theme}`}
      className={cn(
        "w-full justify-start gap-2 px-2",
        collapsed && "justify-center px-0",
        className,
      )}
      onClick={cycleTheme}
    >
      <Icon data-icon="inline-start" />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Button>
  );
}
