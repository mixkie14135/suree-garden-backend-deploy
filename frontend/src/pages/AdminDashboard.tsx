import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ---------------------------------- Types --------------------------------- */

type Period = "today" | "month";
type TabKey = "rooms" | "banquets";

type RoomTypeAgg = { type_name: string; reservations: number };
type RevenueAgg = { label: string; amount: number };

type KPIRow = {
  totalRooms: number;
  maintenanceRooms: number;
  occupiedOrBooked: number; // confirmed/checked_in + booked window (today)
  pendingHolds: number; // pending & not expired
  checkinToday: number;
  checkoutToday: number;
};

type BanquetKPIRow = {
  totalBanquets: number;
  maintenanceBanquets: number;
  occupiedOrBooked: number;
  pendingHolds: number;
  eventsToday: number; // จำนวนอีเวนต์ที่เริ่มวันนี้
};

/* ------------------------------- Mocked data ------------------------------- */
/** NOTE: ส่วนนี้คือ mock เพื่อให้ดูหน้าตา – ภายหลังผูก API แล้วคำนวณจาก backend */
const MOCK_ROOMS_KPI_TODAY: KPIRow = {
  totalRooms: 48,
  maintenanceRooms: 3,
  occupiedOrBooked: 22,
  pendingHolds: 4,
  checkinToday: 11,
  checkoutToday: 9,
};
const MOCK_ROOMS_KPI_MONTH: KPIRow = {
  totalRooms: 48,
  maintenanceRooms: 2,
  occupiedOrBooked: 28,
  pendingHolds: 3,
  checkinToday: 0,
  checkoutToday: 0,
};

const MOCK_ROOMTYPE_TODAY: RoomTypeAgg[] = [
  { type_name: "ดีลักซ์", reservations: 7 },
  { type_name: "ซูพีเรีย", reservations: 5 },
  { type_name: "สวีท", reservations: 3 },
  { type_name: "แฟมิลี่", reservations: 2 },
  { type_name: "สแตนดาร์ด", reservations: 1 },
  { type_name: "พูลวิว", reservations: 2 },
  { type_name: "การ์เด้นวิว", reservations: 1 },
];

const MOCK_ROOMTYPE_MONTH: RoomTypeAgg[] = [
  { type_name: "ดีลักซ์", reservations: 95 },
  { type_name: "ซูพีเรีย", reservations: 76 },
  { type_name: "สวีท", reservations: 42 },
  { type_name: "แฟมิลี่", reservations: 33 },
  { type_name: "สแตนดาร์ด", reservations: 28 },
  { type_name: "พูลวิว", reservations: 39 },
  { type_name: "การ์เด้นวิว", reservations: 22 },
];

const MOCK_REVENUE_TODAY: RevenueAgg[] = [
  { label: "Rooms", amount: 24500 },
  { label: "Banquets", amount: 18000 },
];
const MOCK_REVENUE_MONTH: RevenueAgg[] = [
  { label: "Rooms", amount: 725000 },
  { label: "Banquets", amount: 384000 },
];

const MOCK_BANQUETS_KPI_TODAY: BanquetKPIRow = {
  totalBanquets: 3,
  maintenanceBanquets: 0,
  occupiedOrBooked: 2, // มีอีเวนต์จองทับวันนี้
  pendingHolds: 1,
  eventsToday: 2,
};
const MOCK_BANQUETS_KPI_MONTH: BanquetKPIRow = {
  totalBanquets: 3,
  maintenanceBanquets: 0,
  occupiedOrBooked: 2,
  pendingHolds: 1,
  eventsToday: 0,
};

/* ------------------------------- UI helpers -------------------------------- */

type CardProps = {
  title?: string;
  className?: string;
  children: React.ReactNode;
};
function Card({ title, className = "", children }: CardProps) {
  return (
    <div
      className={[
        // ✅ พื้นหลังขาว + เงา + กรอบชัด
        "bg-white rounded-2xl shadow-md border border-gray-200",
        "p-5 sm:p-6",
        className,
      ].join(" ")}
    >
      {title && (
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

type StatRowProps = {
  label: string;
  value: string | number;
  emphasize?: boolean;
};
function StatRow({ label, value, emphasize }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span
        className={`font-semibold ${
          emphasize ? "text-gray-900" : "text-gray-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full bg-gray-900"
        style={{ width: `${v}%` }}
        aria-label={`progress-${v}`}
      />
    </div>
  );
}

/* ------------------------------- Main screen ------------------------------- */

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [tab, setTab] = useState<TabKey>("rooms");

  // KPIs (Rooms)
  const roomKpi = useMemo<KPIRow>(() => {
    return period === "today" ? MOCK_ROOMS_KPI_TODAY : MOCK_ROOMS_KPI_MONTH;
  }, [period]);

  // KPIs (Banquets)
  const banquetKpi = useMemo<BanquetKPIRow>(() => {
    return period === "today"
      ? MOCK_BANQUETS_KPI_TODAY
      : MOCK_BANQUETS_KPI_MONTH;
  }, [period]);

  // Utilization (ใช้ห้องที่พร้อมให้บริการเท่านั้น)
  const roomsReady = Math.max(0, roomKpi.totalRooms - roomKpi.maintenanceRooms);
  const roomsUtilPct =
    roomsReady > 0
      ? Math.round(
          ((roomKpi.occupiedOrBooked + roomKpi.pendingHolds) / roomsReady) *
            100
        )
      : 0;

  // Room type bar data
  const roomTypeData = useMemo(
    () => (period === "today" ? MOCK_ROOMTYPE_TODAY : MOCK_ROOMTYPE_MONTH),
    [period]
  );

  // Revenue
  const revenue = useMemo(
    () => (period === "today" ? MOCK_REVENUE_TODAY : MOCK_REVENUE_MONTH),
    [period]
  );
  const revenueTotal = revenue.reduce((sum, r) => sum + r.amount, 0);

  return (
    // ✅ พื้นหลังหน้าทั้งหน้าเป็นเทาอ่อน เพื่อให้การ์ดขาวเด่นชัด
    <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview & quick stats {tab === "rooms" ? "(Rooms)" : "(Banquets)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${
                tab === "rooms" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setTab("rooms")}
            >
              Rooms
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${
                tab === "banquets" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setTab("banquets")}
            >
              Banquets
            </button>
          </div>

          {/* Period */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${
                period === "today" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setPeriod("today")}
            >
              Today
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${
                period === "month" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setPeriod("month")}
            >
              This month
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      {tab === "rooms" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card title="Static Room Status">
            <div className="space-y-2">
              <StatRow label="Total Rooms" value={roomKpi.totalRooms} />
              <StatRow
                label="Available"
                value={Math.max(0, roomKpi.totalRooms - roomKpi.maintenanceRooms)}
              />
              <StatRow label="Maintenance" value={roomKpi.maintenanceRooms} />
            </div>
          </Card>

          <Card
            title={`Utilization (${period === "today" ? "Today" : "Avg / Month"})`}
          >
            <div className="space-y-2">
              <StatRow
                label="Occupied / Booked (incl. pending holds)"
                value={roomKpi.occupiedOrBooked + roomKpi.pendingHolds}
              />
              <Progress value={roomsUtilPct} />
              <div className="text-sm text-gray-500 mt-1">
                {roomsUtilPct}% of ready rooms
              </div>
            </div>
          </Card>

          <Card title="Turnover (Today)">
            <div className="space-y-2">
              <StatRow label="Check-in Today" value={roomKpi.checkinToday} />
              <StatRow label="Check-out Today" value={roomKpi.checkoutToday} />
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card title="Static Banquet Status">
            <div className="space-y-2">
              <StatRow
                label="Total Banquet Rooms"
                value={banquetKpi.totalBanquets}
              />
              <StatRow
                label="Available"
                value={Math.max(
                  0,
                  banquetKpi.totalBanquets - banquetKpi.maintenanceBanquets
                )}
              />
              <StatRow
                label="Maintenance"
                value={banquetKpi.maintenanceBanquets}
              />
            </div>
          </Card>

          <Card
            title={`Utilization (${period === "today" ? "Today" : "Avg / Month"})`}
          >
            <div className="space-y-2">
              <StatRow
                label="Booked (incl. holds)"
                value={banquetKpi.occupiedOrBooked + banquetKpi.pendingHolds}
              />
              <Progress
                value={
                  banquetKpi.totalBanquets > 0
                    ? Math.round(
                        ((banquetKpi.occupiedOrBooked +
                          banquetKpi.pendingHolds) /
                          banquetKpi.totalBanquets) *
                          100
                      )
                    : 0
                }
              />
            </div>
          </Card>

          <Card title="Events Today">
            <div className="space-y-2">
              <StatRow label="Starting Today" value={banquetKpi.eventsToday} />
              <StatRow label="Pending Holds" value={banquetKpi.pendingHolds} />
            </div>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservations by Room Type */}
        <Card
          title={`Reservations by Room Type (${
            period === "today" ? "Today" : "This month"
          })`}
          className="lg:col-span-2 min-h-[20rem]"
        >
          {tab === "rooms" ? (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={roomTypeData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="reservations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              (No banquet type defined — you can add a simple breakdown per room
              instead later.)
            </div>
          )}
        </Card>

        {/* Revenue */}
        <Card title={`Revenue (${period === "today" ? "Today" : "This month"})`}>
          <div className="space-y-3">
            {revenue.map((r) => (
              <StatRow
                key={r.label}
                label={r.label}
                value={Intl.NumberFormat("th-TH").format(r.amount)}
              />
            ))}
            <div className="border-t pt-2 mt-1">
              <StatRow
                label="Total"
                value={Intl.NumberFormat("th-TH").format(revenueTotal)}
                emphasize
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
