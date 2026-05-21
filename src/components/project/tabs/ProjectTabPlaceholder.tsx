import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectTabPlaceholderProps = {
  title: string;
  description: string;
  testId: string;
  children?: ReactNode;
};

export function ProjectTabPlaceholder({
  title,
  description,
  testId,
  children,
}: ProjectTabPlaceholderProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <p>{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
