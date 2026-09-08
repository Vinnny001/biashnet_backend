import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
PAYROLL (proxy to mpesa-api)
=========================================================

Base path: /api/payroll — see expenses.routes.js for the
proxy rationale.
=========================================================
*/

const router = Router();

router.post("/run", requireAuth, proxyToPaymentApi("/payroll/run", { method: "POST" }));
router.get("/history/:employeeId", requireAuth, proxyToPaymentApi((req) => `/payroll/history/${req.params.employeeId}`, { method: "GET" }));

export default router;
