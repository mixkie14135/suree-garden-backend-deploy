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
import AdminRooms from "./pages/AdminRooms.jsx";
import AdminBookings from "./pages/AdminBookings.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx"; // <-- เพิ่ม

import HomeFull from "./pages/HomeFull.jsx";
import RoomType from "./pages/RoomType.jsx";

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

      {/* ถ้า RoomType ของคุณมี header/footer ในตัวอยู่แล้ว ไม่ต้องห่อเพิ่ม */}
      <Route path="/rooms/:slug" element={<RoomType />} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Area */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* ให้ Dashboard เป็น index */}
          <Route index element={<AdminDashboard />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
      </Route>

      {/* 404 -> home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
