import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
NOTIFICATIONS (proxy to mpesa-api)
=========================================================

Base path: /api/notifications — order-lifecycle
notifications for buyers and sellers.

They are written by the order/payment/logistics flows,
which live in mpesa-api, so the notifications collection
stays that service's to own; backend just fronts it for
the app. Same rationale as expenses.routes.js.
=========================================================
*/

const router = Router();

router.get("/", requireAuth, proxyToPaymentApi("/notifications", { method: "GET" }));
router.post("/read-all", requireAuth, proxyToPaymentApi("/notifications/read-all", { method: "POST" }));
router.patch("/:notificationId/read", requireAuth, proxyToPaymentApi((req) => `/notifications/${req.params.notificationId}/read`, { method: "PATCH" }));

export default router;
