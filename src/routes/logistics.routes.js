import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
LOGISTICS (proxy to mpesa-api)
=========================================================

Base path: /api/logistics — drives the Logistics and
Supply Chain Manager employee page. Sub-order state and
fund release stay owned by mpesa-api; see
expenses.routes.js for the proxy rationale.
=========================================================
*/

const router = Router();

router.get("/pending-dropoffs", requireAuth, proxyToPaymentApi("/logistics/pending-dropoffs", { method: "GET" }));
router.get("/ready-for-delivery", requireAuth, proxyToPaymentApi("/logistics/ready-for-delivery", { method: "GET" }));
router.post("/orders/:orderId/out-for-delivery", requireAuth, proxyToPaymentApi((req) => `/logistics/orders/${req.params.orderId}/out-for-delivery`, { method: "POST" }));
router.get("/sub-orders/:subOrderId", requireAuth, proxyToPaymentApi((req) => `/logistics/sub-orders/${req.params.subOrderId}`, { method: "GET" }));
router.post("/sub-orders/:subOrderId/confirm-dropoff", requireAuth, proxyToPaymentApi((req) => `/logistics/sub-orders/${req.params.subOrderId}/confirm-dropoff`, { method: "POST" }));
router.get("/orders/:orderId/sub-orders", requireAuth, proxyToPaymentApi((req) => `/logistics/orders/${req.params.orderId}/sub-orders`, { method: "GET" }));

export default router;
