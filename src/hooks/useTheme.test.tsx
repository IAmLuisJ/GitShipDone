import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { themeStorageKey, useTheme } from "./useTheme";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      addListener: (listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      dispatchChange: (nextMatches: boolean) =>
        listeners.forEach((listener) =>
          listener({ matches: nextMatches } as MediaQueryListEvent),
        ),
      matches,
      media: query,
      onchange: null,
      removeEventListener: (
        _event: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.delete(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
    })),
  });
}

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    mockMatchMedia(false);
  });

  it("uses system preference by default", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("persists explicit theme changes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("dark"));

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");

    act(() => result.current.setTheme("light"));

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveClass("light");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
  });

  it("cycles from system to light to dark", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("light");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("dark");
  });
});
