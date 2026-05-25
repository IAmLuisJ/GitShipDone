import { useEffect, useMemo, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import type { Project } from "@/types/project";

type SharingPanelProps = {
  project: Project;
};

type ShareEnableResponse = {
  shareToken: string;
  shareUrl: string;
};

function getShareUrl(project: Project) {
  if (!project.isPublic || !project.shareToken) {
    return "";
  }

  return `${window.location.origin}/share/${project.shareToken}`;
}

export function SharingPanel({ project }: SharingPanelProps) {
  const queryClient = useQueryClient();
  const initialShareUrl = useMemo(() => getShareUrl(project), [project]);
  const [isPublic, setIsPublic] = useState(Boolean(project.isPublic));
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [isBusy, setIsBusy] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);

  useEffect(() => {
    setIsPublic(Boolean(project.isPublic));
    setShareUrl(getShareUrl(project));
  }, [project]);

  /** Enables public sharing and stores the generated share URL locally. */
  async function handleEnableSharing() {
    setIsBusy(true);

    try {
      const response = await api.post<ShareEnableResponse>(
        `/projects/${project.id}/share/enable`,
      );
      setIsPublic(true);
      setShareUrl(response.data.shareUrl);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("Sharing enabled");
    } finally {
      setIsBusy(false);
    }
  }

  /** Revokes the current public share link after confirmation. */
  async function handleRevokeSharing() {
    setIsBusy(true);

    try {
      await api.post(`/projects/${project.id}/share/revoke`);
      setIsPublic(false);
      setShareUrl("");
      setIsRevokeOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("Share link revoked");
    } finally {
      setIsBusy(false);
    }
  }

  /** Copies the active public share URL to the clipboard. */
  async function handleCopyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Copied!");
  }

  function handleSharingToggle(checked: boolean) {
    if (checked) {
      void handleEnableSharing();
      return;
    }

    setIsRevokeOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 font-heading text-base leading-snug font-medium">
          <Link2 className="size-4" />
          Sharing
        </h2>
        <CardDescription>
          Publish a read-only progress page for this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="grid gap-1">
            <Label htmlFor="public-sharing">Public sharing</Label>
            <p className="text-sm text-muted-foreground">
              Anyone with the link can view the public project page.
            </p>
          </div>
          <Switch
            id="public-sharing"
            checked={isPublic}
            disabled={isBusy}
            onCheckedChange={handleSharingToggle}
          />
        </div>

        {isPublic && shareUrl ? (
          <div className="grid gap-2">
            <Label htmlFor="share-url">Share URL</Label>
            <div className="flex gap-2">
              <Input id="share-url" value={shareUrl} readOnly />
              <Button
                type="button"
                variant="outline"
                aria-label="Copy share URL"
                onClick={handleCopyShareUrl}
              >
                <Copy />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
      {isPublic ? (
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => setIsRevokeOpen(true)}
          >
            Revoke link
          </Button>
        </CardFooter>
      ) : null}

      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke public link</DialogTitle>
            <DialogDescription>
              The current public URL will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={handleRevokeSharing}
            >
              {isBusy ? "Revoking..." : "Revoke public link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
