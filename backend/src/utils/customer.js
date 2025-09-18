function normalizePhoneTH(phone) {
  const d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) return '+66' + d.slice(1);
  if (d.startsWith('66')) return '+' + d;
  if (phone && phone.startsWith('+66')) return phone;
  return phone || null;
}
function isEmailValid(email) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resolveCustomerId(prisma, { customer_id, first_name, last_name, email, phone }) {
  if (customer_id) {
    const ok = await prisma.customer.findUnique({ where: { customer_id: Number(customer_id) }});
    if (!ok) throw new Error('customer_id not found');
    return ok.customer_id;
  }
  if (!first_name || !last_name) throw new Error('first_name and last_name are required');

  const normPhone = normalizePhoneTH(phone);
  const hasEmail = isEmailValid(email);

  if (hasEmail) {
    const byEmail = await prisma.customer.findUnique({ where: { email } });
    if (byEmail) {
      if (normPhone && !byEmail.phone) {
        await prisma.customer.update({ where: { customer_id: byEmail.customer_id }, data: { phone: normPhone } }).catch(()=>{});
      }
      return byEmail.customer_id;
    }
    if (normPhone) {
      const byPhone = await prisma.customer.findUnique({ where: { phone: normPhone } });
      if (byPhone) {
        if (!byPhone.email) {
          await prisma.customer.update({ where: { customer_id: byPhone.customer_id }, data: { email } }).catch(()=>{});
          return byPhone.customer_id;
        }
        if (byPhone.email !== email) {
          const err = new Error('PHONE_IN_USE_WITH_ANOTHER_EMAIL');
          err.code = 'PHONE_CONFLICT';
          throw err; // ให้ controller ตอบ 409
        }
        return byPhone.customer_id;
      }
    }
    const created = await prisma.customer.create({
      data: { first_name, last_name, email, phone: normPhone || null },
      select: { customer_id: true }
    });
    return created.customer_id;
  }

  if (normPhone) {
    const c = await prisma.customer.upsert({
      where: { phone: normPhone },
      update: { first_name, last_name },
      create: { first_name, last_name, phone: normPhone },
      select: { customer_id: true }
    });
    return c.customer_id;
  }

  throw new Error('Either email or phone is required');
}

module.exports = { resolveCustomerId, normalizePhoneTH };
