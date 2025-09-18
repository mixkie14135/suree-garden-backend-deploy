import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg"; // ใช้อะไรก็ได้ในโปรเจคคุณ

const MenuItem = ({ to, icon, children, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      "menu-item" + (isActive ? " active" : "")
    }
  >
    <span className="mi-ic" aria-hidden>{icon}</span>
    <span>{children}</span>
  </NavLink>
);

export default function AdminLayout() {
  const nav = useNavigate();
  const logout = () => {
    localStorage.removeItem("admin_token");
    nav("/", { replace: true });
  };

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brandAdmin">
          <img src={logo} alt="Suree Garden" />
          <div className="brandAdminText">
            <strong>Suree</strong>
            <span>Garden</span>
            <small>RESORT</small>
          </div>
        </div>

        <nav className="menu">
          <MenuItem to="/admin" end icon={<DashboardIcon />}>Dashboard</MenuItem>
          <MenuItem to="/admin/rooms" icon={<BedIcon />}>จัดการห้องพัก</MenuItem>
          <MenuItem to="/admin/bookings" icon={<CalIcon />}>จัดการการจอง</MenuItem>

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

/* ====== ไอคอน SVG ====== */
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z"/></svg>
  );
}
function BedIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M2 18v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6h-2v-2H4v2H2Zm2-4h12v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2Z"/></svg>
  );
}
function CalIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 6H4v12h16V8Z"/></svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M10 17v-2h4V9h-4V7h6v10h-6ZM4 21V3h8v2H6v14h6v2H4Z"/></svg>
  );
}
