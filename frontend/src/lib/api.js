const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8800/api").replace(/\/$/, "");

function headers() {
  return { "Content-Type": "application/json" };
}

async function handle(res) {
  if (res.ok) {
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  // เมื่อ error -> พยายามดึง message จาก JSON ก่อน
  let msg = "";
  try {
    const data = await res.json();
    msg = data?.message || data?.error || JSON.stringify(data);
  } catch {
    msg = res.statusText || "Request failed";
  }
  throw new Error(msg);
}

export async function apiGet(path, params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${BASE}${path}${qs}`, {
    credentials: "include",
  });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle(res);
}
