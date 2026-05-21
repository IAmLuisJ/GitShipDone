import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { normalizeRichTextContent } from "@/components/editor/richText";
import type { JournalEntry, JournalMood } from "@/components/project/JournalEntryCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type JournalEntryDialogProps = {
  entry?: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    body: string;
    mood?: JournalMood;
  }) => Promise<void>;
};

const moodOptions: Array<{ value: JournalMood; label: string }> = [
  { value: "excited", label: "🚀 Excited" },
  { value: "blocked", label: "🚧 Blocked" },
  { value: "steady", label: "⚡ Steady" },
  { value: "win", label: "🏆 Win" },
  { value: "learning", label: "📚 Learning" },
];

export function JournalEntryDialog({
  entry,
  open,
  onOpenChange,
  onSubmit,
}: JournalEntryDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<JournalMood | "">("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setBody(normalizeRichTextContent(entry?.body ?? ""));
    setMood(entry?.mood ?? "");
  }, [entry, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        ...(mood ? { mood } : {}),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit update" : "Log update"}</DialogTitle>
          <DialogDescription>
            Capture what changed, what you learned, or where the project is stuck.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-medium">
            Entry title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Mood
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={mood}
              onChange={(event) => setMood(event.target.value as JournalMood | "")}
            >
              <option value="">No mood</option>
              {moodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1 text-sm font-medium">
            <span>Entry body</span>
            <RichTextEditor
              ariaLabel="Entry body"
              content={body}
              onChange={setBody}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving || !title.trim() || !body.trim()}>
              Save entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
