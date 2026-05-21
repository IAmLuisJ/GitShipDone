type JournalEventProps = {
  payload: {
    title?: unknown;
    mood?: unknown;
  };
};

const moodLabels: Record<string, string> = {
  blocked: "Blocked",
  excited: "Excited",
  learning: "Learning",
  steady: "Steady",
  win: "Win",
};

export function JournalEvent({ payload }: JournalEventProps) {
  const mood = typeof payload.mood === "string" ? moodLabels[payload.mood] : null;

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Journal update</div>
      <div className="truncate text-sm font-medium">
        {String(payload.title ?? "Project update")}
      </div>
      {mood ? <div className="text-xs text-muted-foreground">{mood}</div> : null}
    </div>
  );
}
