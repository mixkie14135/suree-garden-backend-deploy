import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ใช้ .env ถ้ามี; ถ้าไม่ตั้ง จะ fallback เป็น "" (กรณีเสิร์ฟโดเมนเดียวกันผ่าน reverse proxy)
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // รองรับทั้ง cookie-mode และ bearer-mode
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "เข้าสู่ระบบไม่สำเร็จ");
      }

      // กรณี backend ส่ง token (เมื่อ AUTH_COOKIE !== 'true')
      if (data?.token) {
        localStorage.setItem("admin_token", data.token);
      } else {
        // cookie-mode
        localStorage.removeItem("admin_token");
      }

      // ยืนยันสิทธิ์ด้วย /me
      const token = localStorage.getItem("admin_token");
      const meRes = await fetch(`${API_BASE}/api/admin/me`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!meRes.ok) {
        localStorage.removeItem("admin_token");
        const meErr = await meRes.json().catch(() => ({}));
        throw new Error(meErr?.message || "ไม่สามารถดึงข้อมูลผู้ดูแลได้");
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, padding: "64px 16px" }}>
      <h2 style={{ marginBottom: 12 }}>เข้าสู่ระบบผู้ดูแล</h2>
      <p style={{ color: "#666", marginBottom: 24 }}>
        ใส่ชื่อผู้ใช้และรหัสผ่านสำหรับผู้ดูแลระบบ
      </p>

      <form onSubmit={onSubmit} className="card">
        <div style={{ marginBottom: 12 }}>
          <label>ชื่อผู้ใช้</label>
          <input
            name="username"
            type="text"
            placeholder="admin"
            value={form.username}
            onChange={onChange}
            className="input"
            required
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>รหัสผ่าน</label>
          <input
            name="password"
            type="password"
            placeholder="••••••"
            value={form.password}
            onChange={onChange}
            className="input"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>
        )}

        <button type="submit" className="heroBtn" style={{ width: "100%" }} disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
