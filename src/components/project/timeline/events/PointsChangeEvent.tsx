type PointsChangeEventProps = {
  payload: {
    delta?: unknown;
    newTotal?: unknown;
    reason?: unknown;
  };
};

export function PointsChangeEvent({ payload }: PointsChangeEventProps) {
  const delta = Number(payload.delta ?? 0);
  const sign = delta > 0 ? "+" : "";

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Points changed</div>
      <div className="text-sm font-medium">
        {sign}
        {delta} pts
      </div>
      <div className="truncate text-xs text-muted-foreground">
        {String(payload.reason ?? "Project points updated")}
      </div>
      {payload.newTotal !== undefined ? (
        <div className="text-xs text-muted-foreground">
          Total: {String(payload.newTotal)}
        </div>
      ) : null}
    </div>
  );
}
