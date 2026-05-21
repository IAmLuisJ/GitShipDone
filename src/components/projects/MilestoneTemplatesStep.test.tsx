import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MilestoneTemplatesStep } from "./MilestoneTemplatesStep";
import { PREDEFINED_SOFTWARE_MILESTONES } from "./milestoneTemplates";

describe("MilestoneTemplatesStep", () => {
  it("shows seven milestone templates with descriptions", () => {
    render(
      <MilestoneTemplatesStep
        selectedTemplates={PREDEFINED_SOFTWARE_MILESTONES.map(
          (milestone) => milestone.name,
        )}
        onChange={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
    expect(screen.getByText(/repository, automation, and checks/i)).toBeInTheDocument();
    expect(screen.getByText(/first production release/i)).toBeInTheDocument();
  });

  it("lets users uncheck templates and skip the step", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSkip = vi.fn();
    const selectedTemplates = PREDEFINED_SOFTWARE_MILESTONES.map(
      (milestone) => milestone.name,
    );
    render(
      <MilestoneTemplatesStep
        selectedTemplates={selectedTemplates}
        onChange={onChange}
        onSkip={onSkip}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: /configure authentication/i }),
    );
    expect(onChange).toHaveBeenCalledWith(
      selectedTemplates.filter((template) => template !== "Configure authentication"),
    );

    await user.click(screen.getByRole("button", { name: /skip this step/i }));
    expect(onSkip).toHaveBeenCalledWith();
  });
});
