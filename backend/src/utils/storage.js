// backend/src/utils/storage.js
const path = require('node:path');
const { supabase } = require('./supabase');

const PUB_BUCKET  = process.env.STORAGE_PUBLIC_BUCKET  || 'resort-public';
const PRIV_BUCKET = process.env.STORAGE_PRIVATE_BUCKET || 'resort-private';

const unique = (ext='') => `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext ? '.'+ext : ''}`;
const extFromMime = (mt='') => mt.includes('jpeg')||mt.includes('jpg') ? 'jpg'
  : mt.includes('png') ? 'png'
  : mt.includes('webp') ? 'webp'
  : mt.includes('heic') ? 'heic'
  : mt.includes('pdf') ? 'pdf'
  : '';

/** อัปโหลดไฟล์ไป public bucket แล้วคืน publicUrl พร้อม path ภายใน bucket */
async function uploadPublic({ buffer, mimetype, folder='uploads', ext='' }) {
  const filename = unique(ext || extFromMime(mimetype));
  const objectPath = path.posix.join(folder, filename);

  const { error } = await supabase
    .storage.from(PUB_BUCKET)
    .upload(objectPath, buffer, { contentType: mimetype, upsert: false });
  if (error) throw error;

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${PUB_BUCKET}/${objectPath}`;
  return { bucket: PUB_BUCKET, objectPath, publicUrl };
}

/** อัปโหลดไฟล์ไป private bucket แล้วคืน path ภายใน bucket (เก็บลง DB) */
async function uploadPrivate({ buffer, mimetype, folder='private', ext='' }) {
  const filename = unique(ext || extFromMime(mimetype));
  const objectPath = path.posix.join(folder, filename);

  const { error } = await supabase
    .storage.from(PRIV_BUCKET)
    .upload(objectPath, buffer, { contentType: mimetype, upsert: false });
  if (error) throw error;

  return { bucket: PRIV_BUCKET, objectPath };
}

/** สร้าง signed URL สำหรับไฟล์ที่อยู่ใน private bucket */
async function signPrivate(objectPath, { expiresIn = 60 * 30 } = {}) {
  const { data, error } = await supabase
    .storage.from(PRIV_BUCKET)
    .createSignedUrl(objectPath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** แปลง public URL ของ Supabase → object path (เพื่อ delete) */
function objectPathFromPublicUrl(url) {
  // รูปแบบ: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path...>
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return m ? m[1] : null;
}

module.exports = {
  uploadPublic, uploadPrivate, signPrivate, objectPathFromPublicUrl,
  PUB_BUCKET, PRIV_BUCKET,
};
