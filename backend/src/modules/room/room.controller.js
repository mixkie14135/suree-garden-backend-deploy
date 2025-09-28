const prisma = require('../../config/prisma.js');

/**
 * GET /api/rooms
 * Query:
 *  page=1&limit=10
 *  status=available|occupied|maintenance
 *  typeId=1
 *  minPrice=1000&maxPrice=3000
 *  capacityGte=2
 *  search=101 (ค้นหา room_number / description)
 *  include=type,images  (คั่นด้วย comma)
 */
exports.getRooms = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip  = (page - 1) * limit;

    const { status, typeId, minPrice, maxPrice, capacityGte, search, include } = req.query;

    const where = {};

    if (status) where.status = status; // room_status enum (available/occupied/maintenance)
    if (typeId) where.room_type_id = Number(typeId);
    if (capacityGte) where.capacity = { gte: Number(capacityGte) };

    // Prisma Decimal: ใส่เป็น number/string ได้
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = String(minPrice);
      if (maxPrice) where.price.lte = String(maxPrice);
    }

    if (search) {
      where.OR = [
        { room_number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const includeObj = {};
    const inc = (include || '').split(',').map(s => s.trim().toLowerCase());
    if (inc.includes('type'))   includeObj.room_type  = true;
    if (inc.includes('images')) includeObj.room_image = true;

    const [items, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { room_id: 'desc' },
        include: includeObj,
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/rooms/:id
 * ?include=type,images
 */
exports.getRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const includeObj = {};
    const inc = (req.query.include || '').split(',').map(s => s.trim().toLowerCase());
    if (inc.includes('type'))   includeObj.room_type  = true;
    if (inc.includes('images')) includeObj.room_image = true;

    const room = await prisma.room.findUnique({
      where: { room_id: id },
      include: includeObj,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /api/rooms
 * Body: {
 *  room_number (required, unique),
 *  room_type_id (required),
 *  capacity (required),
 *  price (required Decimal),
 *  status (available|occupied|maintenance),
 *  description?
 * }
 */
exports.createRoom = async (req, res) => {
  try {
    const { room_number, room_type_id, capacity, price, status, description } = req.body;

    if (!room_number) return res.status(400).json({ message: 'room_number is required' });
    if (!room_type_id) return res.status(400).json({ message: 'room_type_id is required' });
    if (capacity === undefined) return res.status(400).json({ message: 'capacity is required' });
    if (price === undefined || price === null) return res.status(400).json({ message: 'price is required' });

    const data = {
      room_number,
      room_type_id: Number(room_type_id),
      capacity: Number(capacity),
      price: String(price),
      description,
    };
    if (status) data.status = status; // ถ้าไม่ส่งจะ default(available)

    const created = await prisma.room.create({ data });
    res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Duplicate room_number' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /api/rooms/:id
 * Body: field ไหนส่งมาก็อัปเดตอันนั้น
 */
exports.updateRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { room_number, room_type_id, capacity, price, status, description } = req.body;

    const data = {};
    if (room_number !== undefined) data.room_number = room_number;
    if (room_type_id !== undefined) data.room_type_id = Number(room_type_id);
    if (capacity !== undefined) data.capacity = Number(capacity);
    if (price !== undefined && price !== null) data.price = String(price);
    if (status !== undefined) data.status = status;
    if (description !== undefined) data.description = description;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const updated = await prisma.room.update({
      where: { room_id: id },
      data,
    });
    res.json({ status: 'ok', data: updated });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Duplicate room_number' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * DELETE /api/rooms/:id
 * หมายเหตุ: ในโปรดักชันแนะนำทำ soft-delete แทน (เพิ่ม is_active)
 */
exports.deleteRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.room.delete({ where: { room_id: id } });
    res.json({ status: 'ok', message: `Room ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/room-types
 * list room_type ทั้งหมด
 */
exports.getRoomTypes = async (_req, res) => {
  try {
    const types = await prisma.room_type.findMany({
      orderBy: { room_type_id: 'asc' }
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/rooms/available
 * หา “ห้องว่าง” ตามช่วงวันที่
 * Query:
 *  checkin=2025-08-20
 *  checkout=2025-08-22
 *  capacityGte=2
 *  typeId=1
 *  page=1&limit=10
 *  include=type,images
 *
 * เงื่อนไข “ว่าง” = ไม่มี reservation_room ที่สถานะ (pending|confirmed|checked_in)
 * และมีการ “ซ้อนทับช่วงวัน” กับช่วงที่ลูกค้าต้องการ
 * (สูตร overlap: existing.checkin < wanted.checkout && existing.checkout > wanted.checkin)
 */
exports.getAvailableRooms = async (req, res) => {
  try {
    const { checkin, checkout, capacityGte, typeId, include } = req.query;

    if (!checkin || !checkout) {
      return res.status(400).json({ message: 'checkin and checkout are required (YYYY-MM-DD)' });
    }

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 4, 1), 100);
    const skip  = (page - 1) * limit;

    const wantedCheckin  = new Date(checkin);
    const wantedCheckout = new Date(checkout);
    if (!(wantedCheckin < wantedCheckout)) {
      return res.status(400).json({ message: 'checkin must be before checkout' });
    }

    const includeObj = {};
    const inc = (include || '').split(',').map(s => s.trim().toLowerCase());
    if (inc.includes('type'))   includeObj.room_type  = true;
    if (inc.includes('images')) includeObj.room_image = true;

    const AND = [];
    
    // ฟิลเตอร์ความจุ/ประเภท
    if (capacityGte) AND.push({ capacity: { gte: Number(capacityGte) } });
    if (typeId) AND.push({ room_type_id: Number(typeId) });

    // อาจกรองสถานะห้องให้ไม่เท่ากับ maintenance/occupied (ขึ้นกับบิสิเนสลอจิก)
    AND.push({ status: 'available' });

    // ไม่ให้มี booking ซ้อนทับ
    AND.push({
      NOT: {
        reservation_room: {
          some: {
            status: { in: ['pending', 'confirmed', 'checked_in'] },
            AND: [
              { checkin_date:  { lt: wantedCheckout } }, // existing.checkin < wanted.checkout
              { checkout_date: { gt: wantedCheckin } },  // existing.checkout > wanted.checkin
            ],
          },
        },
      },
    });

    const where = { AND };

    const [items, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { room_id: 'asc' },
        include: includeObj,
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// สร้าง room_type ** วันทีเริ่มทำ 
exports.createRoomType = async (req, res) => {
  try {
    const { type_name, description } = req.body;
    if (!type_name) return res.status(400).json({ message: 'type_name is required' });

    const created = await prisma.room_type.create({
      data: { type_name, description }
    });

    res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getRoomAvailability = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { checkin, checkout } = req.query;

    if (!roomId || !checkin || !checkout) {
      return res.status(400).json({ message: 'roomId, checkin, checkout required' });
    }

    const inDate  = new Date(checkin);
    const outDate = new Date(checkout);
    if (isNaN(inDate) || isNaN(outDate) || outDate <= inDate) {
      return res.status(400).json({ message: 'invalid date range' });
    }

    // ปรับชุดสถานะตามระบบจริงของคุณ: กันห้องช่วง "จองสำเร็จ/ชำระแล้ว/กำลังรอจ่าย (ถ้าต้องการ)"
    const BLOCKING_STATUSES = ['CONFIRMED', 'PAID']; // ใส่ 'PENDING_PAYMENT' ถ้าจะกั้นช่วงรอจ่าย

    // เงื่อนไขทับซ้อนมาตรฐาน: (existing.checkin < requested.checkout) && (existing.checkout > requested.checkin)
    const overlap = await prisma.reservation_room.findFirst({
    where: {
      room_id: roomId,
      checkin_date:  { lt: outDate },
      checkout_date: { gt: inDate }
    },
    select: { reservation_id: true }
    });


    return res.json({
      room_id: roomId,
      checkin,
      checkout,
      available: !overlap
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

