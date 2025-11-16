import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        setLoading(true);
        await apiGet("/admin/me"); // backend คืนข้อมูล admin จาก cookie
        setAuthorized(true);
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  if (loading) return <div>กำลังตรวจสอบสิทธิ์...</div>;
  return authorized ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
