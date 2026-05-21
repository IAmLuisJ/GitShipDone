import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextViewer } from "@/components/editor/RichTextViewer";
import { getRichTextPlainText } from "@/components/editor/richText";

export type JournalMood = "excited" | "blocked" | "steady" | "win" | "learning";

export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  mood: JournalMood | null;
  createdAt: string;
  updatedAt: string;
};

type JournalEntryCardProps = {
  entry: JournalEntry;
  onDelete: (entry: JournalEntry) => void;
  onEdit: (entry: JournalEntry) => void;
};

const moodEmoji: Record<JournalMood, string> = {
  excited: "🚀",
  blocked: "🚧",
  steady: "⚡",
  win: "🏆",
  learning: "📚",
};

export function JournalEntryCard({
  entry,
  onDelete,
  onEdit,
}: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyText = getRichTextPlainText(entry.body);
  const preview =
    bodyText.length > 150 ? `${bodyText.slice(0, 150).trim()}...` : bodyText;

  return (
    <Card data-testid="journal-entry-card">
      <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            {entry.mood ? <span aria-hidden="true">{moodEmoji[entry.mood]}</span> : null}
            <span className="truncate">{entry.title}</span>
          </CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            {format(new Date(entry.createdAt), "MMM d, yyyy")}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${entry.title}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entry)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(entry)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isExpanded ? (
          <RichTextViewer content={entry.body} />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{preview}</p>
        )}
        {bodyText.length > 150 ? (
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? `Collapse ${entry.title}` : `Expand ${entry.title}`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
