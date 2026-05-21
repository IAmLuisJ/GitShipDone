import type { JSONContent } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

export const emptyRichTextDocument: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const richTextExtensions = [
  StarterKit.configure({ codeBlock: false, link: false }),
  Link.configure({
    autolink: true,
    openOnClick: false,
  }),
  CodeBlockLowlight.configure({ lowlight }),
  Placeholder.configure({
    placeholder: "Write an update...",
  }),
];

function plainTextDocument(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : undefined,
      },
    ],
  };
}

export function parseRichTextContent(content?: string | null): JSONContent {
  if (!content?.trim()) return emptyRichTextDocument;

  try {
    const parsed = JSON.parse(content) as JSONContent;
    return parsed?.type ? parsed : plainTextDocument(content);
  } catch {
    return plainTextDocument(content);
  }
}

export function normalizeRichTextContent(content?: string | null): string {
  return JSON.stringify(parseRichTextContent(content));
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: string; content?: unknown[] };
  const ownText = record.text ?? "";
  const childText = record.content?.map(collectText).join(" ") ?? "";
  return `${ownText} ${childText}`.trim();
}

export function getRichTextPlainText(content: string): string {
  return collectText(parseRichTextContent(content));
}
