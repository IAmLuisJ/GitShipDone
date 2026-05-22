import { useState } from "react";
import { Archive, Route, Send } from "lucide-react";

import { AiPathwayPanel } from "@/components/project/AiPathwayPanel";
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
  onPathwayChange: () => Promise<void>;
  onPromote: (item: ParkingLotIdea, targetType: "milestone" | "todo") => Promise<void>;
  projectId: string;
};

export function ParkingLotItem({
  item,
  onArchive,
  onPathwayChange,
  onPromote,
  projectId,
}: ParkingLotItemProps) {
  const [isPathwayOpen, setIsPathwayOpen] = useState(Boolean(item.aiPathway));
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [targetType, setTargetType] = useState<"milestone" | "todo">("milestone");
  const [generationRequest, setGenerationRequest] = useState(0);
  const isArchived = Boolean(item.archivedAt);

  function handlePathway() {
    setIsPathwayOpen((current) => !current);
    if (!item.aiPathway) {
      setGenerationRequest((current) => current + 1);
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
            onClick={handlePathway}
          >
            <Route data-icon="inline-start" />
            {item.aiPathway ? "View Pathway" : "Generate Pathway"}
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

      {isPathwayOpen ? (
        <AiPathwayPanel
          existingPathway={item.aiPathway}
          generationRequest={generationRequest}
          itemId={item.id}
          onPathwayChange={onPathwayChange}
          projectId={projectId}
        />
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
