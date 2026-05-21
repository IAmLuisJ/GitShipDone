type GithubCommitEventProps = {
  payload: {
    authorName?: unknown;
    message?: unknown;
    sha?: unknown;
  };
};

export function GithubCommitEvent({ payload }: GithubCommitEventProps) {
  const sha = String(payload.sha ?? "commit");
  const shortSha = sha.slice(0, 7);

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Commit {shortSha}</div>
      <div className="truncate text-sm font-medium" title={String(payload.message ?? "")}>
        {String(payload.message ?? "New commit")}
      </div>
      <div className="text-xs text-muted-foreground">
        {String(payload.authorName ?? "Unknown author")}
      </div>
    </div>
  );
}
