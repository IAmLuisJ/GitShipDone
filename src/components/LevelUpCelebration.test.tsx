import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLevelUpStore } from "@/stores/levelUpStore";
import { LevelUpCelebration } from "./LevelUpCelebration";

const { fireConfettiMock } = vi.hoisted(() => ({
  fireConfettiMock: vi.fn(),
}));

vi.mock("@/hooks/useConfetti", () => ({
  fireConfetti: fireConfettiMock,
}));

describe("LevelUpCelebration", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useLevelUpStore.setState({ celebration: null });
  });

  it("shows the new level, fires confetti, and can be dismissed", async () => {
    const user = userEvent.setup();
    render(<LevelUpCelebration />);

    act(() => useLevelUpStore.getState().triggerLevelUp("Growing"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("🎉 Level Up!")).toBeInTheDocument();
    expect(screen.getByText("Growing")).toBeInTheDocument();
    expect(screen.getByText(/gaining real traction/i)).toBeInTheDocument();
    expect(fireConfettiMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /keep building/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("auto-dismisses after five seconds", async () => {
    vi.useFakeTimers();
    render(<LevelUpCelebration />);

    act(() => useLevelUpStore.getState().triggerLevelUp("Shipping"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5000));

    expect(useLevelUpStore.getState().celebration).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
