import { useCallback, useEffect, useMemo, useState } from "react";

export const themeStorageKey = "gitshipdone-theme";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const themeOrder: ThemePreference[] = ["system", "light", "dark"];
const systemThemeQuery = "(prefers-color-scheme: dark)";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return isThemePreference(storedTheme) ? storedTheme : "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  if (typeof window.matchMedia !== "function") return "light";

  return window.matchMedia(systemThemeQuery).matches ? "dark" : "light";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(systemThemeQuery);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener?.("change", handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, theme);
    applyTheme(resolvedTheme);
  }, [resolvedTheme, theme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const currentIndex = themeOrder.indexOf(currentTheme);
      return themeOrder[(currentIndex + 1) % themeOrder.length];
    });
  }, []);

  return useMemo(
    () => ({ cycleTheme, resolvedTheme, setTheme, theme }),
    [cycleTheme, resolvedTheme, setTheme, theme],
  );
}
