import { Router } from "express";

/*
 * Light health check: answers immediately, touches nothing. Mounted at
 * /health and /api/health in app.js, ahead of the rate limiter so frequent
 * pings can never be rate-limited into looking like an outage.
 */
const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, status: "live", message: "Server is live" });
});

export default router;
