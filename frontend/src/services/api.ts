// /services/api.ts
import axios from "axios";

// Points at the Django backend from Phase 1. Update VITE_API_URL in .env
// when the deployment domain is known (Phase 18).
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Endpoints that don't require (and shouldn't send) a JWT — a stale or
// expired access_token in localStorage would otherwise get attached and
// rejected by JWTAuthentication before the view's AllowAny permission
// is ever checked, causing confusing "token expired" errors on public
// flows like registration or accepting an invite.
const PUBLIC_PATHS = [
  "/accounts/login",
  "/accounts/register",
  "/companies/register",
  "/companies/accept-invite",
];

function isPublicPath(url?: string) {
  if (!url) return false;
  return PUBLIC_PATHS.some((path) => url.includes(path));
}

// Attach the JWT access token to every request once auth exists (Phase 3).
api.interceptors.request.use((config) => {
  if (isPublicPath(config.url)) {
    return config;
  }
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If several requests 401 around the same moment (e.g. a page firing off
// multiple fetches right as the access token expires), only the first
// should trigger a refresh call — everyone else waits on that same
// in-flight promise instead of each hitting /login/refresh/ separately.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/accounts/login/refresh/`,
      {
        refresh: refreshToken,
      },
    );
    localStorage.setItem("access_token", data.access);
    return data.access as string;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// On any 401 (expired/invalid access token — SimpleJWT's "Given token
// not valid for any token type" is exactly this), try a silent refresh
// using the stored refresh token and replay the original request once.
// Only redirect to /login if the refresh token is also gone or expired —
// so a short idle period doesn't log someone out, only a genuinely dead
// session does.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (isPublicPath(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export async function healthCheck() {
  const { data } = await api.get("/health/");
  return data;
}
