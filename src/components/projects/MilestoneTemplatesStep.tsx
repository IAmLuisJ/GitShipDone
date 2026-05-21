import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PREDEFINED_SOFTWARE_MILESTONES } from "./milestoneTemplates";

type MilestoneTemplatesStepProps = {
  selectedTemplates: string[];
  onChange: (templates: string[]) => void;
  onSkip: () => void;
};

export function MilestoneTemplatesStep({
  selectedTemplates,
  onChange,
  onSkip,
}: MilestoneTemplatesStepProps) {
  function toggleTemplate(template: string) {
    onChange(
      selectedTemplates.includes(template)
        ? selectedTemplates.filter((item) => item !== template)
        : [...selectedTemplates, template],
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">Milestone templates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with a proven software project path and remove anything you do
            not need.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => onSkip()}>
          Skip this step
        </Button>
      </div>
      <div className="grid gap-2">
        {PREDEFINED_SOFTWARE_MILESTONES.map((template) => {
          const isSelected = selectedTemplates.includes(template.name);

          return (
            <button
              key={template.name}
              aria-checked={isSelected}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                isSelected && "border-primary bg-primary/10",
              )}
              onClick={() => toggleTemplate(template.name)}
              role="checkbox"
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-4 place-items-center rounded border border-input",
                  isSelected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {isSelected ? <Check className="size-3" /> : null}
              </span>
              <span className="grid gap-1">
                <span className="font-medium">{template.name}</span>
                <span className="text-muted-foreground">
                  {template.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
