import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Archive, Route, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ParkingLotIdea = {
  id: string;
  title: string;
  description: string | null;
  aiPathway: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ParkingLotItemProps = {
  item: ParkingLotIdea;
  onArchive: (item: ParkingLotIdea) => Promise<void>;
  onGeneratePathway: (item: ParkingLotIdea) => Promise<void>;
  onPromote: (item: ParkingLotIdea, targetType: "milestone" | "todo") => Promise<void>;
};

export function ParkingLotItem({
  item,
  onArchive,
  onGeneratePathway,
  onPromote,
}: ParkingLotItemProps) {
  const [isPathwayOpen, setIsPathwayOpen] = useState(Boolean(item.aiPathway));
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [targetType, setTargetType] = useState<"milestone" | "todo">("milestone");
  const [isGenerating, setIsGenerating] = useState(false);
  const isArchived = Boolean(item.archivedAt);

  async function handlePathway() {
    if (item.aiPathway) {
      setIsPathwayOpen((current) => !current);
      return;
    }

    setIsGenerating(true);
    try {
      await onGeneratePathway(item);
      setIsPathwayOpen(true);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePromote() {
    await onPromote(item, targetType);
    setIsPromoteOpen(false);
  }

  async function handleArchive() {
    await onArchive(item);
    setIsArchiveOpen(false);
  }

  return (
    <article
      className="grid gap-3 rounded-lg border bg-background p-3"
      data-testid={`parking-lot-item-${item.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.title}</h3>
            {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={handlePathway}
          >
            <Route data-icon="inline-start" />
            {item.aiPathway ? "View Pathway" : isGenerating ? "Generating..." : "Generate Pathway"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsPromoteOpen(true)}>
            <Send data-icon="inline-start" />
            Promote
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isArchived}
            onClick={() => setIsArchiveOpen(true)}
          >
            <Archive data-icon="inline-start" />
            Archive
          </Button>
        </div>
      </div>

      {isPathwayOpen && item.aiPathway ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <ReactMarkdown>{item.aiPathway}</ReactMarkdown>
        </div>
      ) : null}

      <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote idea</DialogTitle>
            <DialogDescription>
              Turn {item.title} into prioritized project work.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`promote-${item.id}`}
                checked={targetType === "milestone"}
                onChange={() => setTargetType("milestone")}
              />
              Add as Milestone
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`promote-${item.id}`}
                checked={targetType === "todo"}
                onChange={() => setTargetType("todo")}
              />
              Add as Todo
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPromoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePromote}>
              Promote idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive idea?</DialogTitle>
            <DialogDescription>
              This hides {item.title} from the active parking lot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsArchiveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchive}>
              Archive idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
