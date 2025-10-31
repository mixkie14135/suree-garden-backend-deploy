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

// ---------- core fetch helpers (รองรับ init.signal + no-store) ----------
function mergeHeaders(base, extra) {
  return extra ? { ...base, ...extra } : base;
}

export async function apiGet(path, params, init = {}) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    method: "GET",
    credentials: "include",
    headers: mergeHeaders(authHeader(), init.headers),
    cache: "no-store",
    signal: init.signal,
  });
  return handle(res);
}

export async function apiPost(path, body, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: mergeHeaders(jsonHeaders(), init.headers),
    body: JSON.stringify(body || {}),
    cache: "no-store",
    signal: init.signal,
  });
  return handle(res);
}

export async function apiPut(path, body, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: mergeHeaders(jsonHeaders(), init.headers),
    body: JSON.stringify(body || {}),
    cache: "no-store",
    signal: init.signal,
  });
  return handle(res);
}

export async function apiDelete(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: mergeHeaders(authHeader(), init.headers),
    cache: "no-store",
    signal: init.signal,
  });
  return handle(res);
}

// ---------- Upload (multipart/form-data) ----------
export async function apiUpload(path, file, fieldName = "file", extraFields = {}, init = {}) {
  const fd = new FormData();
  fd.append(fieldName, file);
  for (const [k, v] of Object.entries(extraFields || {})) fd.append(k, v);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: mergeHeaders({ ...authHeader() }, init.headers), // อย่าตั้ง Content-Type เอง
    body: fd,
    cache: "no-store",
    signal: init.signal,
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

/* ===================== Banquet API ===================== */
export const banquetApi = {
  async list({ include = "images", page, limit, capacityGte } = {}, init) {
    const params = { include };
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (capacityGte != null) params.capacityGte = capacityGte;

    const res = await apiGet("/banquets", params, init);
    if (Array.isArray(res)) {
      return { page: 1, limit: res.length, total: res.length, totalPages: 1, items: res };
    }
    return res;
  },
  async available({ date, start, end, capacityGte, include = "images", page, limit } = {}, init) {
    const params = { date, start, end, include };
    if (capacityGte != null) params.capacityGte = capacityGte;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    return apiGet("/banquets/available", params, init);
  },
  async detail(id, include, init) {
    const params = include ? { include } : undefined;
    return apiGet(`/banquets/${id}`, params, init);
  },
  async create(payload, init) { return apiPost("/banquets", payload, init); },
  async update(id, payload, init) { return apiPut(`/banquets/${id}`, payload, init); },
  async remove(id, init) { return apiDelete(`/banquets/${id}`, init); },
  async listImages(banquetId, init) {
    const res = await apiGet(`/banquets/${banquetId}/images`, undefined, init);
    return toArray(res);
  },
  async uploadImage(banquetId, file, init) {
    return apiUpload(`/banquets/${banquetId}/images`, file, "file", {}, init);
  },
  async deleteImage(banquetId, imageId, init) {
    return apiDelete(`/banquets/${banquetId}/images/${imageId}`, init);
  },
};

/* ===================== Room API (PUBLIC) ===================== */
export const roomApi = {
  /**
   * ดึงลิสต์ห้องแบบมี pagination
   * รองรับ include, page, limit, typeId (กรองตามประเภท)
   * และ normalize ถ้า backend คืน array เปล่า ๆ
   */
  async list(params = {}, init) {
    const q = { include: "images,type", page: 1, limit: 10, ...params };
    const res = await apiGet("/rooms", q, init);
    if (Array.isArray(res)) {
      return { page: q.page, limit: res.length, total: res.length, totalPages: 1, items: res };
    }
    return res;
  },

  typeBySlug(slug, init) { return apiGet(`/room-types/slug/${encodeURIComponent(slug)}`, undefined, init); },
  listTypes(init) { return apiGet("/room-types", undefined, init); },
  detail(id, include = "images,type", init) { return apiGet(`/rooms/${id}`, { include }, init); },
  availability(id, checkin, checkout, init) {
    return apiGet(`/rooms/${id}/availability`, { checkin, checkout }, init);
  },
};

// ---- Payments (Unified SlipOK) ----
export const paymentApi = {
  /**
   * ตรวจและอัปโหลดสลิปผ่าน SlipOK
   * @param {("room"|"banquet")} type
   * @param {{reservation_code:string, amount:number, file:File}} params
   */
  async verifyAndApply({ type, reservation_code, amount, file }, init) {
    const fd = new FormData();
    fd.append("reservation_code", reservation_code);
    fd.append("amount", String(amount));
    fd.append("slip", file, file.name);

    const res = await fetch(`${API_BASE}/payments/${type}/verify-and-apply`, {
      method: "POST",
      credentials: "include",
      headers: mergeHeaders({ ...authHeader() }, init?.headers),
      body: fd,
      cache: "no-store",
      signal: init?.signal,
    });
    return handle(res);
  },
};



// ---- Booking API (Room) ----
export const bookingApi = {
  checkRoomAvailability(roomId, checkin, checkout, init) {
    return apiGet(`/rooms/${roomId}/availability`, { checkin, checkout }, init);
  },
  createRoomReservation(payload, init) {
    return apiPost("/reservations/room", payload, init);
  },
};

// ---- Reservation status (Room) ----
export const reservationApi = {
  getStatusByCode(code, init) {
    return apiGet("/reservations/room/status", { code }, init);
  },
};

// ---- Booking API (Banquet) ----
export const bookingBanquetApi = {
  create(payload, init) {
    return apiPost("/reservations/banquet", payload, init);
  },
};

// ---- Reservation status (Banquet) ----
export const reservationBanquetApi = {
  getStatusByCode(code, init) {
    return apiGet("/reservations/banquet/status", { code }, init);
  },
};

/* ===================== Reservation Resolver ===================== */
export const reservationResolverApi = {
  resolve(code, init) {
    return apiGet("/reservations/resolve", { code }, init);
  },
};

// ===================== Dashboard API ===================== */
export const dashboardApi = {
  roomsStatus(init){ return apiGet("/dashboard/rooms/status", undefined, init); },
  roomsUtilization(period="today", init){ return apiGet("/dashboard/rooms/utilization", { period }, init); },
  roomsTurnover(init){ return apiGet("/dashboard/rooms/turnover", undefined, init); },
  roomsByType(period="today", init){ return apiGet("/dashboard/rooms/by-type", { period }, init); },

  banquetsStatus(init){ return apiGet("/dashboard/banquets/status", undefined, init); },
  banquetsUtilization(period="today", init){ return apiGet("/dashboard/banquets/utilization", { period }, init); },

  revenue(period="today", init){ return apiGet("/dashboard/revenue", { period }, init); },
};
