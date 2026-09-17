import rateLimit from "express-rate-limit";

/*
=========================================================
RATE LIMITS
=========================================================

Who a request is counted against matters more than the
numbers. Behind Render's proxy every request arrives from
the same address, so counting by req.ip alone put every
user of Biashnet into ONE bucket — a hundred requests
between everybody, then "Too many requests" for whoever
tapped next. app.js sets `trust proxy` so req.ip is the
real caller, and signed-in callers are counted per
account, which also keeps people sharing a mobile
carrier's address out of each other's way.
=========================================================
*/

/*
 * IPv6 callers are handed a whole range, so counting a single address
 * counts nobody — group them by the /64 they were given.
 */
function ipKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

  if (!ip.includes(":")) return ip;

  return `${ip.split(":").slice(0, 4).join(":")}::/64`;
}

/*
 * The account a request belongs to, read from the bearer token WITHOUT
 * verifying it. This decides which bucket to count against, nothing else
 * — authentication still happens in auth.middleware.js, so a forged
 * token buys a caller their own bucket and no access whatsoever.
 */
function accountKey(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  const payload = header.slice(7).split(".")[1];
  if (!payload) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const uid = claims.user_id || claims.sub || claims.uid;
    return uid ? `user:${uid}` : null;
  } catch {
    return null;
  }
}

export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  /*
   * Browsing the app spends requests quickly — a product page, its
   * reviews, the cart, the unread-notification poll — so this is a guard
   * against runaway clients, not a budget for normal use.
   */
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 600),
  keyGenerator: (req) => accountKey(req) || ipKey(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

/*
 * Sign-in, sign-up, OTP and password reset. Two limits rather than one:
 * a strict one per account, which is what stops someone guessing a
 * password, and a looser one per address, so an office or a mobile
 * network sharing one address can't be locked out by one person's
 * retries.
 */
const authPerAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    `auth:${String(req.body?.email || "").trim().toLowerCase()}`,
  skip: (req) => !req.body?.email,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

const authPerAddressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

export const authLimiter = [authPerAccountLimiter, authPerAddressLimiter];
