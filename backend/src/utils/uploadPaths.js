const path = require('path');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads'); // <root project>/uploads
const SLIP_DIR    = path.join(UPLOAD_ROOT, 'slips');

module.exports = { UPLOAD_ROOT, SLIP_DIR };
