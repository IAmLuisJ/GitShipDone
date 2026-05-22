import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Clipboard, Loader2, RefreshCw, Route } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import api from "@/lib/api";

type AiPathwayPanelProps = {
  existingPathway?: string | null;
  generationRequest?: number;
  itemId: string;
  onPathwayChange?: (pathway: string) => void | Promise<void>;
  projectId: string;
};

export function AiPathwayPanel({
  existingPathway,
  generationRequest = 0,
  itemId,
  onPathwayChange,
  projectId,
}: AiPathwayPanelProps) {
  const [pathway, setPathway] = useState(existingPathway ?? "");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const lastGenerationRequest = useRef(0);

  const generatePathway = useCallback(async () => {
    setError("");
    setIsGenerating(true);
    try {
      const response = await api.post<{ pathway: string }>(
        `/projects/${projectId}/parking-lot/${itemId}/ai-pathway`,
      );
      setPathway(response.data.pathway);
      await onPathwayChange?.(response.data.pathway);
    } catch {
      setError("Could not generate pathway. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [itemId, onPathwayChange, projectId]);

  useEffect(() => {
    setPathway(existingPathway ?? "");
  }, [existingPathway]);

  useEffect(() => {
    if (generationRequest === 0 || generationRequest === lastGenerationRequest.current) {
      return;
    }

    lastGenerationRequest.current = generationRequest;
    void generatePathway();
  }, [generatePathway, generationRequest]);

  async function copyPathway() {
    if (!pathway) {
      return;
    }

    await globalThis.navigator.clipboard.writeText(pathway);
    toast.success("Copied!");
  }

  return (
    <section className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Route className="size-4 text-muted-foreground" />
          AI pathway
        </div>
        <div className="flex flex-wrap gap-2">
          {pathway ? (
            <button
              type="button"
              data-testid="copy-pathway-button"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              onClick={() => {
                void copyPathway();
              }}
            >
              <Clipboard className="size-3.5" aria-hidden="true" />
              Copy pathway
            </button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={generatePathway}
          >
            {isGenerating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : pathway ? (
              <RefreshCw data-icon="inline-start" />
            ) : (
              <Route data-icon="inline-start" />
            )}
            {isGenerating ? "Generating..." : pathway ? "Regenerate" : "Generate Pathway"}
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {pathway ? (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{pathway}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Generate a focused implementation path for this parked idea.
        </p>
      )}
    </section>
  );
}
