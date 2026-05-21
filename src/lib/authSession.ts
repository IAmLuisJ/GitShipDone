import axios from "axios";

import { normalizeAuthUser, type AuthResponse } from "@/lib/authResponse";
import { useAuthStore } from "@/stores/authStore";

type RefreshResponse = {
  accessToken: string;
};

export async function refreshAuthSession() {
  const refreshResponse = await axios.post<RefreshResponse>(
    "/api/auth/refresh",
    {},
    { withCredentials: true },
  );
  const accessToken = refreshResponse.data.accessToken;
  const userResponse = await axios.get<AuthResponse["user"]>("/api/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = normalizeAuthUser(userResponse.data);

  useAuthStore.getState().setAuth(user, accessToken);
  return { user, accessToken };
}
