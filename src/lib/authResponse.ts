import type { User } from "@/stores/authStore";

export type AuthResponse = {
  user: Pick<User, "id" | "email" | "name"> &
    Partial<
      Pick<User, "avatarUrl" | "aiProvider" | "createdAt" | "githubConnected">
    >;
  accessToken: string;
};

export function normalizeAuthUser(user: AuthResponse["user"]): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    aiProvider: user.aiProvider ?? null,
    createdAt: user.createdAt ?? new Date().toISOString(),
    githubConnected: user.githubConnected ?? false,
  };
}

export function getAuthApiError(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }

  return fallback;
}
