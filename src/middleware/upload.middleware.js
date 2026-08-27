// src/middleware/upload.middleware.js
import multer from 'multer';

// Memory storage, not disk storage — Render's filesystem is ephemeral and
// gets wiped on every redeploy/restart, so anything written to local disk
// would silently vanish. The file buffer goes straight to Cloudinary and is
// never persisted locally.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and HEIC images are allowed.`));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});
