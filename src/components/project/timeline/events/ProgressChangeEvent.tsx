type ProgressChangeEventProps = {
  payload: {
    from?: unknown;
    isManual?: unknown;
    to?: unknown;
  };
};

export function ProgressChangeEvent({ payload }: ProgressChangeEventProps) {
  const from = Number(payload.from ?? 0);
  const to = Number(payload.to ?? 0);
  const isManual = Boolean(payload.isManual);

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Progress changed</div>
      <div className="text-sm font-medium">
        {from}% -&gt; {to}%
      </div>
      {isManual ? (
        <div className="text-xs text-muted-foreground">Manual override</div>
      ) : null}
    </div>
  );
}
