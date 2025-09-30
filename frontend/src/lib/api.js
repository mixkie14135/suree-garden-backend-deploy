// src/lib/api.js
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8800/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

// --- helpers: token & headers ---
function getToken() {
  try { return localStorage.getItem("admin_token") || ""; } catch { return ""; }
}
function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function jsonHeaders() {
  return { "Content-Type": "application/json", ...authHeader() };
}

async function handle(res) {
  if (res.ok) {
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }
  let msg = "";
  try {
    const data = await res.json();
    msg = data?.message || data?.error || JSON.stringify(data);
  } catch {
    msg = res.statusText || "Request failed";
  }
  throw new Error(msg);
}

// ---------- JSON requests ----------
export async function apiGet(path, params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    credentials: "include",
    headers: authHeader(), // << แนบ token
  });
  return handle(res);
}
export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}
export async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}
export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeader(), // << แนบ token
  });
  return handle(res);
}

// ---------- Upload (multipart/form-data) ----------
export async function apiUpload(path, file, fieldName = "file", extraFields = {}) {
  const fd = new FormData();
  fd.append(fieldName, file);
  for (const [k, v] of Object.entries(extraFields || {})) fd.append(k, v);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      // อย่าใส่ Content-Type เอง ให้ browser จัดการ boundary
      ...authHeader(), // << ใส่ Authorization ตรงนี้
    },
    body: fd,
  });
  return handle(res);
}

// ---------- misc helpers ----------
export function toArray(x) {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (x == null) return [];
  return [x];
}
export function fileUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const norm = String(p).replace(/\\/g, "/");
  const rel = norm.startsWith("/") ? norm : "/" + norm;
  return `${API_ORIGIN}${rel}`;
}
