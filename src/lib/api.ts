import axios from "axios";
import { refreshAuthSession } from "@/lib/authSession";
import { useAuthStore } from "@/stores/authStore";

type RefreshableRequestConfig = {
  url?: string;
  _retry?: boolean;
  headers: Record<string, string>;
};

type RefreshableError = {
  response?: {
    status?: number;
  };
  config?: RefreshableRequestConfig;
};

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

function isAuthEndpoint(url: string | undefined) {
  return /(^|\/)auth\//.test(url ?? "");
}

export function shouldAttemptTokenRefresh(error: RefreshableError) {
  const originalRequest = error.config;

  return (
    error.response?.status === 401 &&
    Boolean(originalRequest) &&
    !originalRequest?._retry &&
    !isAuthEndpoint(originalRequest?.url)
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!shouldAttemptTokenRefresh(error)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { accessToken } = await refreshAuthSession();
      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
