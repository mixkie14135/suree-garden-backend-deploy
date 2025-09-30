// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import FeaturedGrid from "./components/FeaturedGrid.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminRoomBanquet from "./pages/AdminRoomBanquet.jsx";   // ✅ ใช้อันใหม่
import AdminBookings from "./pages/AdminBookings.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

import HomeFull from "./pages/HomeFull.jsx";
import RoomType from "./pages/RoomType.jsx";

/* ----------------- Temporary placeholder ----------------- */
function AdminPayments() {
  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <h2>อนุมัติสลิป</h2>
      </div>
      <div className="emptyBox">
        <p>หน้านี้จะแสดงสลิปที่สถานะ <strong>pending</strong> ให้กด Approve / Reject</p>
      </div>
    </div>
  );
}

/* -------------------------------- Public home -------------------------------- */
function PublicHome() {
  return (
    <>
      <Navbar />
      <Hero />
      <FeaturedGrid />
      <Contact />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicHome />} />

      <Route
        path="/home"
        element={
          <>
            <Navbar />
            <HomeFull />
            <Footer />
          </>
        }
      />

      {/* ถ้า RoomType มี header/footer ในตัวอยู่แล้ว ไม่ต้องห่อเพิ่ม */}
      <Route path="/rooms/:slug" element={<RoomType />} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Area (protected) */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* Dashboard เป็น index */}
          <Route index element={<AdminDashboard />} />
          {/* ✅ ใช้หน้าที่รวมแท็บ rooms/banquets */}
          <Route path="rooms" element={<AdminRoomBanquet />} /> 
          <Route path="payments" element={<AdminPayments />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
      </Route>

      {/* 404 -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
