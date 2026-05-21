import { LoaderCircle } from "lucide-react";

import { useInitAuth } from "@/hooks/useInitAuth";
import AppRoutes from "@/routes";

export default function App() {
  const { isLoading } = useInitAuth();

  if (isLoading) {
    return (
      <main
        data-testid="auth-init-loading"
        className="grid min-h-screen place-items-center bg-muted/30 px-5"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" data-icon="inline-start" />
          Loading your workspace...
        </div>
      </main>
    );
  }

  return <AppRoutes />;
}
