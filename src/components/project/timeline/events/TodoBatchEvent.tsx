type TodoBatchEventProps = {
  payload: {
    completed?: unknown;
    summary?: unknown;
    total?: unknown;
  };
};

export function TodoBatchEvent({ payload }: TodoBatchEventProps) {
  const completed = Number(payload.completed ?? 0);
  const total = Number(payload.total ?? completed);

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Todo batch</div>
      <div className="truncate text-sm font-medium">
        {String(payload.summary ?? "Tasks updated")}
      </div>
      <div className="text-xs text-muted-foreground">
        {completed} of {total} completed
      </div>
    </div>
  );
}
