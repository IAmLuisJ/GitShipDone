import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { RichTextEditor } from "./RichTextEditor";
import { RichTextViewer } from "./RichTextViewer";

const formattedDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", marks: [{ type: "bold" }], text: "Bold note" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "List item" }] },
          ],
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: null },
      content: [{ type: "text", text: "const answer = 42;" }],
    },
  ],
});

beforeAll(() => {
  window.scrollBy = vi.fn();
  document.elementFromPoint = vi.fn(() => document.querySelector(".ProseMirror"));
  HTMLElement.prototype.getClientRects = vi.fn(
    () =>
      ({
        length: 1,
        item: () => new DOMRect(0, 0, 100, 20),
        [0]: new DOMRect(0, 0, 100, 20),
      }) as DOMRectList,
  );
  Range.prototype.getClientRects = vi.fn(
    () =>
      ({
        length: 1,
        item: () => new DOMRect(0, 0, 100, 20),
        [0]: new DOMRect(0, 0, 100, 20),
      }) as DOMRectList,
  );
});

describe("RichTextEditor", () => {
  it("renders formatting controls and serializes edits as JSON", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor content="" onChange={onChange} ariaLabel="Entry body" />,
    );

    for (const name of [
      "Bold",
      "Italic",
      "Bullet List",
      "Ordered List",
      "Link",
      "Code Block",
      "Horizontal Rule",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(container.querySelector("[data-placeholder]")).toHaveAttribute(
      "data-placeholder",
      "Write an update...",
    );

    await user.click(screen.getByLabelText(/entry body/i));
    await user.keyboard("Hello editor");

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining("Hello editor")),
    );
  });
});

describe("RichTextViewer", () => {
  it("renders stored JSON as read-only HTML", () => {
    const { container } = render(<RichTextViewer content={formattedDoc} />);

    expect(screen.getByText("Bold note")).toBeInTheDocument();
    expect(screen.getByText("List item")).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("Bold note");
    expect(container.querySelector("ul")).toHaveTextContent("List item");
    expect(container.querySelector("pre code")).toHaveTextContent("const answer = 42;");
  });
});
