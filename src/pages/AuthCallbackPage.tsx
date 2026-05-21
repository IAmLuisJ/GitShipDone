import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "@/lib/api";
import { normalizeAuthUser, type AuthResponse } from "@/lib/authResponse";
import { useAuthStore } from "@/stores/authStore";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const token = searchParams.get("token");

  useEffect(() => {
    let isMounted = true;

    async function completeOAuth() {
      if (!token) {
        navigate("/login?error=oauth_failed", { replace: true });
        return;
      }

      try {
        const response = await api.get<AuthResponse["user"]>("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) {
          return;
        }

        setAuth(normalizeAuthUser(response.data), token);
        navigate("/dashboard", { replace: true });
      } catch {
        clearAuth();
        navigate("/login?error=oauth_failed", { replace: true });
      }
    }

    void completeOAuth();

    return () => {
      isMounted = false;
    };
  }, [clearAuth, navigate, setAuth, token]);

  return (
    <main
      data-testid="auth-callback-page"
      className="grid min-h-screen place-items-center bg-muted/30 px-5 py-10"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="animate-spin" data-icon="inline-start" />
        Finishing sign in...
      </div>
    </main>
  );
}
