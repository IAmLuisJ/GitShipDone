import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  aiProvider: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

const AUTH_STORAGE_KEY = "gitshipdone-auth";

function readStoredAuth(): Pick<AuthState, "user" | "accessToken"> {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null };
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return { user: null, accessToken: null };
  }

  try {
    const parsed = JSON.parse(stored) as Pick<AuthState, "user" | "accessToken">;
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, accessToken: null };
  }
}

function writeStoredAuth(user: User, accessToken: string) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, accessToken }),
  );
}

const initialAuth = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  accessToken: initialAuth.accessToken,
  setAuth: (user, accessToken) => {
    writeStoredAuth(user, accessToken);
    set({ user, accessToken });
  },
  clearAuth: () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, accessToken: null });
  },
}));
