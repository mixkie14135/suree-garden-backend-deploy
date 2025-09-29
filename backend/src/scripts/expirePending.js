const prisma = require('../config/prisma');

async function run() {
  const now = new Date();

  const room = await prisma.reservation_room.updateMany({
    where: { status: 'pending', expires_at: { lt: now } },
    data: { status: 'cancelled' }
  });

  const banquet = await prisma.reservation_banquet.updateMany({
    where: { status: 'pending', expires_at: { lt: now } },
    data: { status: 'cancelled' }
  });

  console.log(`[expirePending] ${now.toISOString()} room:${room.count} banquet:${banquet.count}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
