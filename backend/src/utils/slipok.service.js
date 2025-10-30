// src/utils/slipok.service.js
const axios = require('axios');
const FormData = require('form-data');

const BRANCH_ID = process.env.SLIPOK_BRANCH_ID;
const API_KEY   = process.env.SLIPOK_API_KEY;
const API_URL   = process.env.SLIPOK_API_URL || `https://api.slipok.com/api/line/apikey/${BRANCH_ID}`;

if (!BRANCH_ID || !API_KEY) {
  throw new Error('Missing SLIPOK env (SLIPOK_BRANCH_ID, SLIPOK_API_KEY)');
}

async function verifySlipWithSlipOK({ buffer, filename = 'slip.jpg', amount }) {
  const form = new FormData();
  form.append('files', buffer, filename); // field name ต้องเป็น 'files'
  form.append('log', 'true');
  if (amount) form.append('amount', String(amount));

  try {
    const { data } = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'x-authorization': API_KEY, // ตามสเปค SlipOK (API key)
      },
      timeout: 20000,
      maxBodyLength: Infinity,
    });
    return data;
  } catch (err) {
    console.error('SlipOK API error:', err.response?.data || err.message);
    throw err;
  }
}

// ===== Helpers =====
function normalizeAccountNumber(s = '') {
  return String(s).replace(/[^0-9]/g, '');
}
function bankCodeToCanonical(codeOrName = '') {
  const t = String(codeOrName).trim();
  if (t === '014') return 'SCB';
  if (t === '006') return 'KBANK';
  if (t === '002') return 'BBL';
  if (t === '004') return 'KTB';
  const l = t.toLowerCase();
  if (l.includes('scb') || l.includes('ไทยพาณิชย์') || l.includes('siam commercial')) return 'SCB';
  if (l.includes('kbank') || l.includes('กสิกร')) return 'KBANK';
  if (l.includes('krungthai') || l.includes('กรุงไทย')) return 'KTB';
  if (l.includes('bbl') || l.includes('กรุงเทพ')) return 'BBL';
  return t;
}
function normalizeName(s = '') {
  return String(s)
    .replace(/\./g, ' ')
    .replace(/\b(mr|mrs|ms)\b/gi, '')
    .replace(/(นาย|นางสาว|นาง|คุณ)/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}
function last4FromMasked(masked = '') {
  const digits = masked.replace(/[^0-9]/g, '');
  return digits.slice(-4);
}
function parseAliases(envValue = '') {
  return String(envValue).split('|').map(s => s.trim()).filter(Boolean);
}

module.exports = {
  verifySlipWithSlipOK,
  bankCodeToCanonical,
  normalizeName,
  last4FromMasked,
  parseAliases,
};
