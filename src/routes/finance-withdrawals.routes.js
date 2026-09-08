import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
FINANCE WITHDRAWALS (proxy to mpesa-api)
=========================================================

Base path: /api/finance-withdrawals — see
expenses.routes.js for the proxy rationale. /wallet MUST
stay registered before /:withdrawalId, same ordering
caution mpesa-api's own route file uses.
=========================================================
*/

const router = Router();

router.post("/", requireAuth, proxyToPaymentApi("/finance-withdrawals", { method: "POST" }));
router.get("/", requireAuth, proxyToPaymentApi("/finance-withdrawals", { method: "GET" }));
router.get("/wallet", requireAuth, proxyToPaymentApi("/finance-withdrawals/wallet", { method: "GET" }));
router.get("/:withdrawalId", requireAuth, proxyToPaymentApi((req) => `/finance-withdrawals/${req.params.withdrawalId}`, { method: "GET" }));

export default router;
