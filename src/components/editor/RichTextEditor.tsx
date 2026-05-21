import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Bold, Code2, Italic, LinkIcon, List, ListOrdered, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseRichTextContent, richTextExtensions } from "./richText";

type RichTextEditorProps = {
  ariaLabel?: string;
  content: string;
  onChange?: (json: string) => void;
  readOnly?: boolean;
};

type ToolbarButton = {
  label: string;
  isActive?: () => boolean;
  onClick: () => void;
  icon: React.ComponentType;
};

export function RichTextEditor({
  ariaLabel = "Rich text editor",
  content,
  onChange,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: parseRichTextContent(content),
    editable: !readOnly,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-[200px] px-3 py-2 text-sm outline-none prose prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = parseRichTextContent(content);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const toolbarButtons: ToolbarButton[] = [
    {
      label: "Bold",
      icon: Bold,
      isActive: () => editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      isActive: () => editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Bullet List",
      icon: List,
      isActive: () => editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Ordered List",
      icon: ListOrdered,
      isActive: () => editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Link",
      icon: LinkIcon,
      isActive: () => editor.isActive("link"),
      onClick: () => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Enter a URL", previousUrl ?? "https://");
        if (url === null) return;
        if (!url) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    },
    {
      label: "Code Block",
      icon: Code2,
      isActive: () => editor.isActive("codeBlock"),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Horizontal Rule",
      icon: Minus,
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {!readOnly ? (
        <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-2">
          {toolbarButtons.map(({ label, icon: Icon, isActive, onClick }) => (
            <Button
              key={label}
              type="button"
              variant={isActive?.() ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={label}
              onClick={onClick}
            >
              <Icon />
            </Button>
          ))}
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          "rich-text-content",
          readOnly && "pointer-events-none",
        )}
      />
    </div>
  );
}
