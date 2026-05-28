import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  JournalEntryCard,
  type JournalEntry,
} from "@/components/project/JournalEntryCard";
import { JournalEntryDialog } from "@/components/project/JournalEntryDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";

type JournalTabProps = {
  projectId: string;
};

type JournalPage = {
  entries: JournalEntry[];
  total: number;
  page: number;
  limit: number;
};

const journalPageSize = 3;

export function JournalTab({ projectId }: JournalTabProps) {
  const queryClient = useQueryClient();
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const journalQueryKey = ["project", projectId, "journal"];

  const journalQuery = useInfiniteQuery({
    queryKey: journalQueryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await api.get<JournalPage>(
        `/projects/${projectId}/journal?page=${pageParam}&limit=${journalPageSize}`,
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const entries = journalQuery.data?.pages.flatMap((page) => page.entries) ?? [];

  function openCreateDialog() {
    setEditingEntry(null);
    setIsEntryDialogOpen(true);
  }

  function openEditDialog(entry: JournalEntry) {
    setEditingEntry(entry);
    setIsEntryDialogOpen(true);
  }

  async function invalidateJournal() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: journalQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "timeline", 5] }),
    ]);
  }

  async function handleSubmit(data: {
    title: string;
    body: string;
    mood?: JournalEntry["mood"];
  }) {
    if (editingEntry) {
      await api.patch(`/projects/${projectId}/journal/${editingEntry.id}`, data);
    } else {
      await api.post(`/projects/${projectId}/journal`, data);
    }
    await invalidateJournal();
  }

  async function handleDelete() {
    if (!deletingEntry) return;
    await api.delete(`/projects/${projectId}/journal/${deletingEntry.id}`);
    setDeletingEntry(null);
    await invalidateJournal();
  }

  return (
    <Card data-testid="journal-tab">
      <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
        <CardTitle>Journal</CardTitle>
        <Button type="button" onClick={openCreateDialog}>
          <NotebookPen data-icon="inline-start" />
          Log Update
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onDelete={setDeletingEntry}
              onEdit={openEditDialog}
            />
          ))
        ) : (
          <EmptyState
            icon={NotebookPen}
            title="No entries yet"
            description="Log your first update."
            action={{ label: "Log update", onClick: openCreateDialog }}
          />
        )}

        {journalQuery.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => journalQuery.fetchNextPage()}
          >
            Load more
          </Button>
        ) : null}
      </CardContent>

      <JournalEntryDialog
        entry={editingEntry}
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        onSubmit={handleSubmit}
      />

      <Dialog open={deletingEntry !== null} onOpenChange={() => setDeletingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete journal entry?</DialogTitle>
            <DialogDescription>
              This removes {deletingEntry?.title} from the journal list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingEntry(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
