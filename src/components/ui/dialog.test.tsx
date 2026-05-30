import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

describe("DialogContent", () => {
  it("constrains modal height on mobile viewports", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Mobile dialog</DialogTitle>
          <DialogDescription>Fits in a narrow viewport.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toHaveClass(
      "max-h-[calc(100svh-2rem)]",
      "overflow-y-auto",
    );
  });
});
