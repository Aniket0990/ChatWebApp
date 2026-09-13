import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: `${backendUrl}/api`,
});

/**
 * Attach the bearer token automatically.
 *
 * The token lives in the persisted auth payload in localStorage, so every
 * request (including ones made by React Query's background refetches) is
 * authenticated without repeating headers at each call site. An explicit
 * Authorization header still wins, which keeps existing calls unchanged.
 */
instance.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token && !config.headers?.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore malformed localStorage — the request goes out unauthenticated.
  }
  return config;
});

export default instance;
