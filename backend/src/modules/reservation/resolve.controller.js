const prisma = require("../../config/prisma"); // <- ปรับ path ให้ตรงโปรเจกต์คุณ

// GET /api/reservations/resolve?code=XXXX
exports.resolveReservationByCode = async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).json({ message: "code is required" });

    // ลองหาในห้องพักก่อน
    const r = await prisma.reservation_room.findUnique({
      where: { reservation_code: code },
      select: { reservation_code: true },
    });
    if (r) return res.json({ type: "room", code });

    // ไม่เจอ → ลองห้องจัดเลี้ยง
    const b = await prisma.reservation_banquet.findUnique({
      where: { reservation_code: code },
      select: { reservation_code: true },
    });
    if (b) return res.json({ type: "banquet", code });

    return res.status(404).json({ message: "Reservation not found" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
