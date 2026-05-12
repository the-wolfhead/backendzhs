// src/middleware/internalAuth.js
import dotenv from 'dotenv';
dotenv.config();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_API_KEY) {
  console.warn("⚠️ INTERNAL_API_KEY is not set in .env - Internal endpoints are insecure!");
}

/**
 * Internal Auth Middleware
 * Used to secure communication between paymentgatewaybackend and backendzhs
 */
export const internalAuthMiddleware = (req, res, next) => {
  const requestId = `INT_${Date.now()}`;

  try {
    const providedKey = req.headers['x-internal-key'];

    if (!providedKey) {
      console.warn(`[${requestId}] Internal auth failed: No key provided`);
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Internal key required"
      });
    }

    if (providedKey !== INTERNAL_API_KEY) {
      console.warn(`[${requestId}] Internal auth failed: Invalid key`);
      return res.status(403).json({
        success: false,
        message: "Forbidden - Invalid internal key"
      });
    }

    // Optional: You can also check IP whitelist in production
    // const allowedIPs = process.env.ALLOWED_INTERNAL_IPS?.split(',') || [];
    // if (!allowedIPs.includes(req.ip)) { ... }

    console.log(`[${requestId}] Internal auth successful`);
    next();

  } catch (error) {
    console.error("Internal auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
