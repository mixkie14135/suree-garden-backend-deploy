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
    headers: authHeader(),
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
    headers: authHeader(),
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
      ...authHeader(),
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

/* ===================== Banquet API (NEW) ===================== */
export const banquetApi = {
  // list + include=images (backend รองรับ /banquets?include=images หรือจะไม่ใส่ก็ได้)
  async list(params = {}) {
    const include = params.include || "images";
    const res = await apiGet("/banquets", { include });
    return res;
  },
  async get(id, params = {}) {
    return apiGet(`/banquets/${id}`, params);
  },
  async create(payload) {
    return apiPost("/banquets", payload);
  },
  async update(id, payload) {
    return apiPut(`/banquets/${id}`, payload);
  },
  async remove(id) {
    return apiDelete(`/banquets/${id}`);
  },

  // images
  async listImages(banquetId) {
    const res = await apiGet(`/banquets/${banquetId}/images`);
    // controller คืน { status:'ok', data:[...] } => normalize
    return toArray(res);
  },
  async uploadImage(banquetId, file) {
    return apiUpload(`/banquets/${banquetId}/images`, file, "file");
  },
  async deleteImage(banquetId, imageId) {
    return apiDelete(`/banquets/${banquetId}/images/${imageId}`);
  },
};

/* ===================== Room API (PUBLIC) ===================== */
export const roomApi = {
  list(params = {}) {
    return apiGet("/rooms", params);
  },
  // ใช้เส้นทาง /room-types/slug/:slug ให้ตรงกับ backend ที่คุณเรียกใน Postman
  typeBySlug(slug) {
    return apiGet(`/room-types/slug/${encodeURIComponent(slug)}`);
  },
  listTypes() {
    return apiGet("/room-types");
  },
};
