type StatusChangeEventProps = {
  payload: {
    from?: unknown;
    to?: unknown;
  };
};

function labelStatus(value: unknown) {
  if (!value) {
    return "None";
  }

  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StatusChangeEvent({ payload }: StatusChangeEventProps) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">Status changed</div>
      <div className="text-sm font-medium">
        {labelStatus(payload.from)} -&gt; {labelStatus(payload.to)}
      </div>
    </div>
  );
}
