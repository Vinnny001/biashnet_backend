import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
ORDER COMPLETION — LOGISTICS VERIFY (proxy to mpesa-api)
=========================================================

Base path: /api/marketplace/order-completion — only the
logistics/admin verify step is proxied here (called from
the Logistics employee page). The buyer-facing "get my
completion code" endpoint stays a direct call from
order.service.js straight to mpesa-api, since that's a
buyer/checkout flow, not an employee page.
=========================================================
*/

const router = Router();

router.post("/:orderId/verify", requireAuth, proxyToPaymentApi((req) => `/marketplace/order-completion/${req.params.orderId}/verify`, { method: "POST" }));

export default router;
