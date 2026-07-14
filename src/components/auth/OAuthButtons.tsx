import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/lib/features";

type OAuthButtonsProps = {
  className?: string;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-icon="inline-start">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.43Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        d="M6.41 13.9A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.51H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.49l3.34-2.59Z"
      />
      <path
        fill="currentColor"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.95 2.98 14.69 2 12 2a9.99 9.99 0 0 0-8.93 5.51l3.34 2.59C7.2 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

export function OAuthButtons({ className }: OAuthButtonsProps) {
  if (!isFeatureEnabled("oauth")) return null;

  return (
    <div className={["grid gap-3", className].filter(Boolean).join(" ")}>
      <Button asChild variant="outline">
        <a href="/api/auth/google">
          <GoogleIcon />
          Continue with Google
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href="/api/auth/github">
          <Github data-icon="inline-start" />
          Continue with GitHub
        </a>
      </Button>
    </div>
  );
}
