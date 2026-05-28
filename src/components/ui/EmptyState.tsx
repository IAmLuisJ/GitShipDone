import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

type EmptyStateProps = {
  action?: EmptyStateAction;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
};

export function EmptyState({
  action,
  className,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-4 rounded-lg border border-dashed p-6 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <div className="grid max-w-sm gap-1">
        <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <Button type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
