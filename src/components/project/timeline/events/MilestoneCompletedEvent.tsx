type MilestoneCompletedEventProps = {
  payload: {
    milestoneName?: unknown;
    points?: unknown;
  };
};

export function MilestoneCompletedEvent({ payload }: MilestoneCompletedEventProps) {
  const points = Number(payload.points ?? 0);

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">
        Milestone completed
      </div>
      <div className="truncate text-sm font-medium">
        {String(payload.milestoneName ?? "Milestone")}
      </div>
      {points > 0 ? (
        <div className="text-xs font-medium text-yellow-600">+{points} pts</div>
      ) : null}
    </div>
  );
}
