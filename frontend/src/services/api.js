// Service: api.js
// Axios instance with JWT interceptors for automatic token refresh.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request Interceptor ──────────────────────────
// Attaches the stored access token to every outgoing request.
api.interceptors.request.use(
  (config) => {
    // Read token fresh from storage (handles tab syncing)
    const stored = JSON.parse(localStorage.getItem("lms_auth") || "{}");
    const token  = stored?.state?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────
// On 401, attempts a token refresh then retries the original request.
// On second 401, redirects to /login.
let isRefreshing       = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        // Queue the request until the refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = JSON.parse(localStorage.getItem("lms_auth") || "{}");
        const refreshToken = stored?.state?.refreshToken;

        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await api.post("/auth/refresh", { refreshToken });
        const newAccessToken = data.data.accessToken;

        // Update the stored token
        const authState = JSON.parse(localStorage.getItem("lms_auth") || "{}");
        authState.state.accessToken  = newAccessToken;
        authState.state.refreshToken = data.data.refreshToken;
        localStorage.setItem("lms_auth", JSON.stringify(authState));

        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        onTokenRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear session and redirect to login
        localStorage.removeItem("lms_auth");
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
