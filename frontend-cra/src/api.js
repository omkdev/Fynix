const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

export async function refreshAccessToken() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Refresh failed");
  accessToken = data.accessToken;
  return data.accessToken;
}

async function request(path, options = {}, didRetry = false) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const skipRefresh =
    path === "/api/auth/refresh" ||
    path === "/api/auth/login" ||
    path === "/api/auth/register" ||
    path === "/api/auth/google";

  if (res.status === 401 && !didRetry && !skipRefresh) {
    try {
      await refreshAccessToken();
      return request(path, options, true);
    } catch {
      clearAccessToken();
      const err = new Error("Session expired");
      err.code = "AUTH_EXPIRED";
      throw err;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export const api = {
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  get: (path) => request(path, { method: "GET" }),
  delete: (path) => request(path, { method: "DELETE" }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
};
