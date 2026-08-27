// src/routes/uploadRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.middleware.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Folders are an allowlist, not a free-form client-supplied path — prevents
// someone from passing an arbitrary/malicious folder string.
const ALLOWED_FOLDERS = {
  'profile-photos': 'zhs/profile-photos',
  'doctor-photos': 'zhs/doctor-photos',
  'medical-documents': 'zhs/medical-documents',
};

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Keeps images from being absurdly large/heavy while still sharp
        // on a phone screen — Cloudinary handles the resize server-side.
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (expected field name "image")' });
    }

    const folderKey = req.body.folder || 'profile-photos';
    const folder = ALLOWED_FOLDERS[folderKey];
    if (!folder) {
      return res.status(400).json({
        error: `Invalid folder. Must be one of: ${Object.keys(ALLOWED_FOLDERS).join(', ')}`,
      });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.error('Cloudinary is not configured — missing CLOUDINARY_CLOUD_NAME');
      return res.status(500).json({ error: 'Image upload is not configured on the server yet' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, folder);

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Multer errors (file too large, wrong type) throw before reaching the route
// handler above — this catches those and turns them into clean JSON 400s
// instead of an unhandled error / default Express HTML error page.
router.use((err, req, res, next) => {
  if (err instanceof Error && (err.message?.includes('File too large') || err.message?.includes('Unsupported file type'))) {
    return res.status(400).json({ error: err.message });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image is too large — max size is 5MB' });
  }
  next(err);
});

export default router;
