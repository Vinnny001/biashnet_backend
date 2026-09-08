import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
INVESTORS (proxy to mpesa-api)
=========================================================

Base path: /api/investors — see expenses.routes.js for
the proxy rationale.
=========================================================
*/

const router = Router();

router.get("/:investorId/ledger", requireAuth, proxyToPaymentApi((req) => `/investors/${req.params.investorId}/ledger`, { method: "GET" }));
router.post("/:investorId/payouts", requireAuth, proxyToPaymentApi((req) => `/investors/${req.params.investorId}/payouts`, { method: "POST" }));

export default router;
