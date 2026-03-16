export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let refreshRequestInFlight = null;

function clearAuthStorage() {
  localStorage.removeItem("user");
  localStorage.removeItem("auth_token");
}

function notifyAuthExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:expired"));
  }
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
}

function isExpiredToken(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Number(payload.exp) <= nowSeconds;
}

function persistAuthPayload(payload) {
  if (payload?.user) {
    localStorage.setItem("user", JSON.stringify(payload.user));
  }
  if (payload?.token) {
    localStorage.setItem("auth_token", payload.token);
  }
}

function toRequestBody(body) {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === "string" || body instanceof FormData || body instanceof Blob) {
    return body;
  }
  return JSON.stringify(body);
}

function shouldSendJsonContentType(body, headers) {
  if (body === undefined || body === null || body instanceof FormData || body instanceof Blob) {
    return false;
  }
  return !headers["Content-Type"] && !headers["content-type"];
}

function shouldTryRefresh(path) {
  return !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/register") && !path.startsWith("/api/auth/refresh");
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };
}

async function refreshAuthSessionInternal() {
  if (refreshRequestInFlight) {
    return refreshRequestInFlight;
  }

  refreshRequestInFlight = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const payload = await parseResponsePayload(response);
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "Failed to refresh session");
    }
    persistAuthPayload(payload);
    return payload.token;
  })();

  try {
    return await refreshRequestInFlight;
  } finally {
    refreshRequestInFlight = null;
  }
}

export async function refreshAuthSession() {
  return refreshAuthSessionInternal();
}

export async function apiFetch(path, options = {}) {
  // Centralized fetch helper: attaches auth token, refreshes sessions, and normalizes API errors.
  const { method = "GET", body, headers = {}, _retried = false } = options;
  const canRefresh = shouldTryRefresh(path);

  let token = localStorage.getItem("auth_token");
  if (canRefresh && token && isExpiredToken(token)) {
    try {
      token = await refreshAuthSessionInternal();
    } catch (_error) {
      clearAuthStorage();
      notifyAuthExpired();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  const requestHeaders = {
    ...headers,
  };
  if (shouldSendJsonContentType(body, requestHeaders)) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (token && !path.startsWith("/api/auth/refresh")) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: toRequestBody(body),
    credentials: "include",
  });

  const payload = await parseResponsePayload(response);
  if (response.status === 401 && canRefresh && !_retried) {
    try {
      await refreshAuthSessionInternal();
      return apiFetch(path, { ...options, _retried: true });
    } catch (_error) {
      clearAuthStorage();
      notifyAuthExpired();
      throw new Error(payload.error || "Session expired. Please sign in again.");
    }
  }

  if (response.status === 401) {
    clearAuthStorage();
    notifyAuthExpired();
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }

  if (
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register") ||
    path.startsWith("/api/auth/refresh")
  ) {
    persistAuthPayload(payload);
  }

  return payload;
}
