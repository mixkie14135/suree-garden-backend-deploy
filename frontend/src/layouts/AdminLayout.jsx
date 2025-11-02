// frontend/src/layouts/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "../assets/logo_v1.png";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/* ---------- Small helper for menu item ---------- */
const MenuItem = ({ to, icon, children, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => "menu-item" + (isActive ? " active" : "")}
  >
    <span className="mi-ic" aria-hidden>{icon}</span>
    <span>{children}</span>
  </NavLink>
);

export default function AdminLayout() {
  const nav = useNavigate();

  const logout = async () => {
    const res = await Swal.fire({
      title: "ยืนยันออกจากระบบ?",
      text: "คุณจะต้องเข้าสู่ระบบอีกครั้งเพื่อใช้งานส่วนผู้ดูแล",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        confirmButton: "swal2-confirm-button",
        cancelButton: "swal2-cancel-button",      
      },
    });

    if (res.isConfirmed) {
      localStorage.removeItem("admin_token");
      await Swal.fire({
        icon: "success",
        title: "ออกจากระบบแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
      nav("/admin/login", { replace: true });
    }
  };

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brandAdmin">
          <img src={logo} alt="Suree Garden" />
        </div>

        <nav className="menu">
          {/* Dashboard */}
          <MenuItem to="/admin" end icon={<DashboardIcon />}>
            Dashboard
          </MenuItem>

          {/* Rooms */}
          <MenuItem to="/admin/rooms" icon={<BedIcon />}>
            จัดการห้อง
          </MenuItem>


          {/* Bookings */}
          <MenuItem to="/admin/bookings" icon={<CalIcon />}>
            จัดการการจอง
          </MenuItem>

          <button className="menu-item logout" onClick={logout}>
            <span className="mi-ic"><LogoutIcon /></span>
            <span>ออกจากระบบ</span>
          </button>
        </nav>
      </aside>

      <main className="adminContent">
        <Outlet />
      </main>
    </div>
  );
}

/* ---------------- Icons (inline SVG) ---------------- */
function DashboardIcon() { return <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z"/></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24"><path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/></svg>; }
function CalIcon() { return <svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 6H4v12h16V8Z"/></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24"><path d="M10 17v-2h4V9h-4V7h6v10h-6ZM4 21V3h8v2H6v14h6v2H4Z"/></svg>; }
