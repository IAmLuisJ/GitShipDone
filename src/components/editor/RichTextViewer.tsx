import { EditorContent, useEditor } from "@tiptap/react";

import { parseRichTextContent, richTextExtensions } from "./richText";

type RichTextViewerProps = {
  content: string;
};

export function RichTextViewer({ content }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: parseRichTextContent(content),
    editable: false,
    editorProps: {
      attributes: {
        class: "text-sm outline-none prose prose-sm max-w-none",
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="rich-text-content" />;
}
