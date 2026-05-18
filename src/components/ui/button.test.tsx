import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders a shadcn button without errors", () => {
    render(<Button>Test</Button>);

    expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
  });
});
