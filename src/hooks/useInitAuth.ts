import { useEffect, useState } from "react";

import { refreshAuthSession } from "@/lib/authSession";
import { useAuthStore } from "@/stores/authStore";

let initAuthPromise: Promise<void> | null = null;

function getInitAuthPromise() {
  if (!initAuthPromise) {
    initAuthPromise = refreshAuthSession()
      .then(() => undefined)
      .catch((error) => {
        useAuthStore.getState().clearAuth();
        throw error;
      });
  }

  return initAuthPromise;
}

export function resetInitAuthForTests() {
  initAuthPromise = null;
}

export function useInitAuth() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getInitAuthPromise()
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading };
}
