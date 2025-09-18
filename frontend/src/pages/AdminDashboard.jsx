import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  function logout() {
    localStorage.removeItem("admin_token");
    navigate("/", { replace: true });
  }
  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      <h2>แดชบอร์ดผู้ดูแล</h2>
      <p>ใส่เนื้อหา/เมนูบริหารจัดการต่าง ๆ ของคุณที่นี่</p>
      <button onClick={logout} className="heroBtn" style={{ marginTop: 16 }}>
        ออกจากระบบ
      </button>
    </div>
  );
}
