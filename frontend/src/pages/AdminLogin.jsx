// frontend/src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api.js";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function prettyError(e) {
    if (!e) return "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
    if (typeof e === "object" && e.message) {
      try {
        const j = JSON.parse(e.message);
        return j?.message || e.message || "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
      } catch {
        return e.message || "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
      }
    }
    if (typeof e === "string") {
      try {
        const j = JSON.parse(e);
        return j?.message || e || "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
      } catch {
        return e || "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
      }
    }
    return "บัญชีเข้าสู่ระบบไม่ถูกต้อง";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.username.trim() || !form.password.trim()) {
      return setErr("กรุณากรอกข้อมูลให้ครบ");
    }

    try {
      setLoading(true);
      const res = await apiPost("/admin/login", {
        username: form.username.trim(),
        password: form.password,
      });

      if (res?.status === "ok") {
        // บันทึก token ถ้ามี (optional)
        if (res.token) localStorage.setItem("admin_token", res.token);
        navigate("/admin", { replace: true });
      } else {
        setErr("เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (e) {
      setErr(prettyError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrap">
      <div className="authBg" aria-hidden />
      <div className="authCard">
        <div className="authBrand">
          <div className="logo"><span>SG</span></div>
          <div className="brandText">
            <strong>Suree Garden</strong>
            <small>RESORT — Admin</small>
          </div>
        </div>

        <h1 className="authTitle">เข้าสู่ระบบผู้ดูแล</h1>
        <p className="authSub">
          ใส่ <b>username</b> และ <b>password</b> สำหรับผู้ดูแลระบบ
        </p>

        {err && <div className="alert error">{err}</div>}

        <form onSubmit={onSubmit} className="authForm">
          <label className="field">
            <span className="label">Username</span>
            <div className="inputWrap">
              <span className="ic" aria-hidden><UserIcon /></span>
              <input
                name="username"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={onChange}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className="field">
            <span className="label">Password</span>
            <div className="inputWrap">
              <span className="ic" aria-hidden><LockIcon /></span>
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="eyeBtn"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                disabled={loading}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button className="authBtn" type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="authFoot">
          ระบบสำหรับเจ้าหน้าที่เท่านั้น หากลืมรหัสผ่านให้ติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}

/* ===== inline icons ===== */
function UserIcon() { return (<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z" /></svg>); }
function LockIcon() { return (<svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 8v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-2 0ZM9 8V6a3 3 0 0 1 6 0v2Z" /></svg>); }
function EyeIcon() { return (<svg viewBox="0 0 24 24"><path d="M12 5c5.52 0 9.7 3.84 11 7-1.3 3.16-5.48 7-11 7S2.3 15.16 1 12c1.3-3.16 5.48-7 11-7Zm0 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" /></svg>); }
function EyeOffIcon() { return (<svg viewBox="0 0 24 24"><path d="m2 4 2-2 18 18-2 2-3.02-3.02A12.4 12.4 0 0 1 12 19C6.48 19 2.3 15.16 1 12a13.9 13.9 0 0 1 6.48-6.28L2 4Zm8.3 4.3L9 7a5 5 0 0 0 7 7l-1.3-1.3A3 3 0 0 1 10.3 8.3Z" /></svg>);
}