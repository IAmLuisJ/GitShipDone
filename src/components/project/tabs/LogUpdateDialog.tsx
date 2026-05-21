import type { FormEvent } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type LogUpdateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

export function LogUpdateDialog({
  open,
  onOpenChange,
  projectId,
}: LogUpdateDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.post(`/projects/${projectId}/journal`, {
        title: title.trim(),
        body: body.trim(),
      });
      setTitle("");
      setBody("");
      onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: ["project", projectId, "timeline", 5],
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log update</DialogTitle>
          <DialogDescription>
            Add a concise project update to the journal and recent activity.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="text-sm font-medium" htmlFor="update-title">
            Update title
          </label>
          <Input
            id="update-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="text-sm font-medium" htmlFor="update-body">
            Update body
          </label>
          <Textarea
            id="update-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={isSaving || !title.trim()}>
              Save update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
