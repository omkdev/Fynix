const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("fynix_token");
}

export function setToken(token) {
  localStorage.setItem("fynix_token", token);
}

export function clearToken() {
  localStorage.removeItem("fynix_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
