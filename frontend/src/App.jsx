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
import AdminRoomBanquet from "./pages/AdminRoomBanquet.jsx";
import AdminBookings from "./pages/AdminBookings.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

import HomeFull from "./pages/HomeFull.jsx";
import Rooms from "./pages/Rooms.jsx";
import RoomType from "./pages/RoomType.jsx";
import Banquet from "./pages/Banquet.jsx";
import BookingRoom from "./pages/bookings/bookingroom.jsx"; // ✅ เตรียมสร้างหน้านี้
import BookingRoomConfirm from "./pages/bookings/BookingRoomConfirm.jsx";
import BookingPayment from "./pages/bookings/BookingPayment.jsx";

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

      {/* หน้า “ดูทั้งหมด”: รายการห้องทั้งหมด */}
      <Route
        path="/discover"
        element={
          <>
            <Navbar />
            <HomeFull />
            <Contact />
            <Footer />
          </>
        }
      />

      <Route
        path="/rooms"
        element={
          <>
            <Navbar />
            <Rooms />
            <Contact />
            <Footer />
          </>
        }
      />

      {/* ห้องจัดเลี้ยง (placeholder) */}
      <Route
        path="/banquet"
        element={
          <>
            <Navbar />
            <Banquet />
            <Contact />
            <Footer />
          </>
        }
      />

      {/* รายละเอียดห้องเดี่ยว */}
      <Route path="/rooms/:slug" element={<RoomType />} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Area (protected) */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="rooms" element={<AdminRoomBanquet />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
      </Route>

      {/* กันลิงก์เก่าที่อาจยังชี้ /home อยู่ */}
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* ✅ หน้าจองห้องพัก */}
      <Route
        path="/bookings/bookingroom/:id"
        element={<BookingRoom />}
      />

      <Route 
        path="/bookings/bookingroom/:id/confirm" 
        element={<BookingRoomConfirm />} 
      />

      // ✅ ตรงกับ navigate(`/bookings/payment?code=...`)
      <Route path="/bookings/payment" 
      element={<BookingPayment />} 
      />


      {/* 404 -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
