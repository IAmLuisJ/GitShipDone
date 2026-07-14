import axios from "axios";

import { normalizeAuthUser, type AuthResponse } from "@/lib/authResponse";
import { apiBase } from "@/lib/basePath";
import { useAuthStore } from "@/stores/authStore";

type RefreshResponse = {
  accessToken: string;
};

export async function refreshAuthSession() {
  const refreshResponse = await axios.post<RefreshResponse>(
    `${apiBase}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const accessToken = refreshResponse.data.accessToken;
  const userResponse = await axios.get<AuthResponse["user"]>(
    `${apiBase}/users/me`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const user = normalizeAuthUser(userResponse.data);

  useAuthStore.getState().setAuth(user, accessToken);
  return { user, accessToken };
}
