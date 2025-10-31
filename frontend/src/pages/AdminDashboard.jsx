import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { dashboardApi } from "../lib/api";

/* ---------- UI Components (เรียบง่าย) ---------- */
function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow border border-gray-200 p-5 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  );
}
function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

/* ---------- Main ---------- */
export default function AdminDashboard() {
  const [period, setPeriod] = useState("today"); // today | month

  const [byType, setByType] = useState([]);          // [{ type_name, reservations }]
  const [status, setStatus] = useState(null);        // { total, available, occupied, maintenance }
  const [util, setUtil] = useState(null);            // { utilizationPct, occupiedOrBooked, pendingHolds, roomsReady }
  const [turnover, setTurnover] = useState(null);    // { checkinToday, checkoutToday }
  const [revenue, setRevenue] = useState(null);      // { rooms, banquets, total }

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // โหลดข้อมูลทั้งหมด (เรียบง่าย) — ชุดเดียวพอ
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError("");

        const [byTypeRes, statusRes, utilRes, turnoverRes, revenueRes] = await Promise.all([
          dashboardApi.roomsByType(period),
          dashboardApi.roomsStatus(),
          dashboardApi.roomsUtilization(period),
          dashboardApi.roomsTurnover(),
          dashboardApi.revenue(period),
        ]);

        setByType(byTypeRes?.items || []);
        setStatus(statusRes || null);
        setUtil(utilRes || null);
        setTurnover(turnoverRes || null);
        setRevenue(revenueRes || null);
      } catch (e) {
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  // โดนัทสถานะห้อง
  const statusPie = useMemo(() => {
    if (!status) return [];
    return [
      { name: "ว่าง", value: status.available ?? 0 },
      { name: "ไม่ว่าง", value: status.occupied ?? 0 },
      { name: "ระหว่างซ่อม", value: status.maintenance ?? 0 },
    ];
  }, [status]);

  const COLORS = ["#10b981", "#ef4444", "#f59e0b"]; // เขียว/แดง/เหลือง (ไม่ต้องกำหนดก็ได้ แต่เอาให้อ่านง่าย)

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500">
            มุมมองรวมของวันนี้/เดือนนี้ (ขึ้นกับตัวเลือกด้านขวา)
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${period === "today" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`}
            onClick={() => setPeriod("today")}
          >
            วันนี้
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${period === "month" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`}
            onClick={() => setPeriod("month")}
          >
            เดือนนี้
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
      {loading && <div className="mb-4 text-gray-500 text-sm">กำลังโหลดข้อมูล...</div>}

      {/* แถวบน: สถานะ + อัตราการใช้ + Turnover + รายได้ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="สถานะห้อง (วันนี้)">
          {status ? (
            <>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusPie.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v, n) => [`${v} ห้อง`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2">
                <StatRow label="จำนวนห้องทั้งหมด" value={status.total ?? 0} />
                <StatRow label="ว่าง" value={status.available ?? 0} />
                <StatRow label="ไม่ว่าง" value={status.occupied ?? 0} />
                <StatRow label="ระหว่างซ่อม" value={status.maintenance ?? 0} />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
          )}
        </Card>

        <Card title={`อัตราการใช้ห้อง (${period === "today" ? "วันนี้" : "เดือนนี้"})`}>
          {util ? (
            <>
              <div className="text-3xl font-bold">
                {util.utilizationPct ?? 0}<span className="text-lg">%</span>
              </div>
              <div className="mt-3 space-y-1">
                <StatRow label="ห้องพร้อมให้บริการ" value={util.roomsReady ?? 0} />
                <StatRow label="จอง/เข้าพักจริง" value={util.occupiedOrBooked ?? 0} />
                <StatRow label="รอชำระ (ยังไม่หมดเวลา)" value={util.pendingHolds ?? 0} />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
          )}
        </Card>

        <Card title="การเข้า-ออก (วันนี้)">
          {turnover ? (
            <div className="space-y-1">
              <StatRow label="เช็กอินวันนี้" value={turnover.checkinToday ?? 0} />
              <StatRow label="เช็กเอาต์วันนี้" value={turnover.checkoutToday ?? 0} />
            </div>
          ) : (
            <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
          )}

          <div className="border-t mt-3 pt-3">
            <h4 className="font-medium mb-2">รายได้ ({period === "today" ? "วันนี้" : "เดือนนี้"})</h4>
            {revenue ? (
              <>
                <StatRow label="จากห้องพัก" value={Intl.NumberFormat("th-TH").format(revenue.rooms ?? 0)} />
                <StatRow label="จากห้องจัดเลี้ยง" value={Intl.NumberFormat("th-TH").format(revenue.banquets ?? 0)} />
                <div className="border-t mt-2 pt-2">
                  <StatRow label="รวมทั้งหมด" value={Intl.NumberFormat("th-TH").format(revenue.total ?? 0)} />
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
            )}
          </div>
        </Card>
      </div>

      {/* แถวล่าง: กราฟจำนวนการจองตามประเภทห้อง */}
      <Card
        title={`จำนวนการจองตามประเภทห้อง (${period === "today" ? "วันนี้" : "เดือนนี้"})`}
        className="min-h-[22rem]"
      >
        {byType && byType.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={byType} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type_name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [`${v} ครั้ง`, "จำนวนการจอง"]}
                labelFormatter={(label) => `ประเภท: ${label}`}
              />
              <Bar dataKey="reservations" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-sm text-gray-500">ยังไม่มีการจองในช่วงที่เลือก</div>
        )}
      </Card>
    </div>
  );
}
