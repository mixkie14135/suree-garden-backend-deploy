import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

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

  const logout = () => {
    const ok = window.confirm("ยืนยันออกจากระบบ?");
    if (!ok) return;
    localStorage.removeItem("admin_token");
    nav("/", { replace: true });
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
            จัดการห้องพัก
          </MenuItem>

          {/* Banquets (ใหม่) */}
          <MenuItem to="/admin/banquets" icon={<HallIcon />}>
            จัดการห้องจัดเลี้ยง
          </MenuItem>

          {/* Payments / Slip approvals (ใหม่) */}
          <MenuItem to="/admin/payments" icon={<SlipIcon />}>
            อนุมัติสลิป
          </MenuItem>

          {/* Bookings */}
          <MenuItem to="/admin/bookings" icon={<CalIcon />}>
            จัดการการจอง
          </MenuItem>

          {/* (ถ้าจะมีภายหลัง) บัญชีรับเงิน 
          <MenuItem to="/admin/bank-accounts" icon={<BankIcon />}>
            บัญชีรับเงิน
          </MenuItem>
          */}

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
function DashboardIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z"/></svg>;
}
function BedIcon() {
  return <svg viewBox="0 0 24 24"><path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/></svg>;
}
function HallIcon() {
  // ไอคอนห้องจัดเลี้ยงแบบง่าย (เวที/คนดู)
  return <svg viewBox="0 0 24 24"><path d="M3 20h18v-2H3v2Zm2-4h14V8H5v8Zm2-6h10v4H7v-4Zm4-6h2v2h-2V4Z"/></svg>;
}
function SlipIcon() {
  // ไอคอนเอกสาร/สลิป
  return <svg viewBox="0 0 24 24"><path d="M7 2h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2Zm7 2H7v16h10V8h-3V4Zm-7 6h10v2H7v-2Zm0 4h10v2H7v-2Z"/></svg>;
}
function CalIcon() {
  return <svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 6H4v12h16V8Z"/></svg>;
}
function BankIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6v2H3v-2Zm2 4h2v6H5v-6Zm4 0h2v6H9v-6Zm4 0h2v6h-2v-6Zm4 0h2v6h-2v-6Z"/></svg>;
}
function LogoutIcon() {
  return <svg viewBox="0 0 24 24"><path d="M10 17v-2h4V9h-4V7h6v10h-6ZM4 21V3h8v2H6v14h6v2H4Z"/></svg>;
}
