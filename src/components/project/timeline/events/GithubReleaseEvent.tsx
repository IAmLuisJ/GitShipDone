type GithubReleaseEventProps = {
  payload: {
    aiSummary?: unknown;
    name?: unknown;
    summary?: unknown;
    tagName?: unknown;
  };
};

export function GithubReleaseEvent({ payload }: GithubReleaseEventProps) {
  const tagName = String(payload.tagName ?? "release");
  const summary = payload.aiSummary ?? payload.summary;

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Release {tagName}</div>
      <div className="truncate text-sm font-medium">
        {String(payload.name ?? "GitHub release")}
      </div>
      {summary ? (
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {String(summary)}
        </div>
      ) : null}
    </div>
  );
}
