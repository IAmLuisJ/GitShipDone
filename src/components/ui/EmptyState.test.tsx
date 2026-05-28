import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rocket } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders contextual empty copy and optional action", async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(
      <EmptyState
        icon={Rocket}
        title="No launches yet"
        description="Create a launch to track release work."
        action={{ label: "Create launch", onClick: handleAction }}
      />,
    );

    expect(screen.getByText("No launches yet")).toBeInTheDocument();
    expect(screen.getByText("Create a launch to track release work.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create launch" }));
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it("omits the action button when no action is provided", () => {
    render(
      <EmptyState
        icon={Rocket}
        title="All caught up!"
        description="No unread notifications need attention."
      />,
    );

    expect(screen.getByText("All caught up!")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
