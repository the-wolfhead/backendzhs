// src/middleware/internalAuth.js
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export const internalAuthMiddleware = (req, res, next) => {
  const requestId = `INT_${Date.now()}`;

  try {
    const providedKey = req.headers['x-internal-key'];

    if (!providedKey) {
      console.warn(`[${requestId}] Missing X-Internal-Key`);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (providedKey !== INTERNAL_API_KEY) {
      console.warn(`[${requestId}] Invalid Internal Key`);
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  } catch (err) {
    console.error("Internal Auth Error:", err);
    res.status(500).json({ success: false, message: "Auth error" });
  }
};
