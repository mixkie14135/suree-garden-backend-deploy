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
import BookingRoom from "./pages/bookings/bookingroom.jsx"; 
import BookingRoomConfirm from "./pages/bookings/BookingRoomConfirm.jsx";
import BookingPayment from "./pages/bookings/BookingPayment.jsx";
import BookingSuccess from "./pages/bookings/BookingSuccess.jsx";
import BookingStatus from "./pages/bookings/BookingStatus.jsx";

import BookingBanquet from "./pages/bookings/BookingBanquett.jsx";
import BookingBanquetConfirm from "./pages/bookings/BookingBanquetConfirm.jsx";
import BookingPaymentBanquet from "./pages/bookings/BookingPaymentBanquet.jsx";
import BookingSuccessBanquet from "./pages/bookings/BookingSuccessBanquet.jsx";



/* หน้าแรก */
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

      {/* ห้องพัก */}
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

      {/* ห้องจัดเลี้ยง */}
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

      {/* หน้าเข้าสู่ระบบผู้ดูแล */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="rooms" element={<AdminRoomBanquet />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
      </Route>

      {/* กันลิงก์เก่าที่อาจยังชี้ /home อยู่ */}
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* หน้าจองห้องพัก */}
      <Route
        path="/bookings/bookingroom/:id"
        element={<BookingRoom />}
      />

      {/* หน้า ยืนยันการจองห้องพัก */}
      <Route 
        path="/bookings/bookingroom/:id/confirm" 
        element={<BookingRoomConfirm />} 
      />

      // ✅ ตรงกับ navigate(`/bookings/payment?code=...`)
      <Route path="/bookings/payment" 
      element={<BookingPayment />} 
      />

      {/* หน้า ชำระเงินสำเร็จ */}
      <Route path="/bookings/success" 
      element={<BookingSuccess />} 
      />

      <Route path="/bookings/status" 
      element={<BookingStatus />} 
      />

      <Route path="/bookings/bookingbanquet/:id" element={<BookingBanquet />} />
      <Route path="/bookings/bookingbanquet/:id/confirm" element={<BookingBanquetConfirm />} />
      <Route path="/bookings/payment-banquet" element={<BookingPaymentBanquet />} />
      <Route path="/bookings/success-banquet" element={<BookingSuccessBanquet />} />
      
    



      {/* 404 -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
