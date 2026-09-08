import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
EXPENSES (proxy to mpesa-api)
=========================================================

Base path: /api/expenses — mpesa-api owns all expense
business logic (thresholds, approval routing); backend
just forwards the caller's token and relays the response.
requireAuth only — mpesa-api's own employeeAuth/
requireEmployeeRole enforce the real authorization when
the forwarded request lands there.
=========================================================
*/

const router = Router();

router.post("/", requireAuth, proxyToPaymentApi("/expenses", { method: "POST" }));
router.get("/", requireAuth, proxyToPaymentApi("/expenses", { method: "GET" }));

export default router;
