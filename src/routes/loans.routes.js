import { Router } from "express";

import { proxyToPaymentApi } from "../services/paymentApiClient.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/*
=========================================================
LOANS / LENDERS (proxy to mpesa-api)
=========================================================

Base paths: /api/loans, /api/lenders — see
expenses.routes.js for the proxy rationale.
=========================================================
*/

const loanRouter = Router();
const lenderRouter = Router();

loanRouter.post("/", requireAuth, proxyToPaymentApi("/loans", { method: "POST" }));
loanRouter.get("/", requireAuth, proxyToPaymentApi("/loans", { method: "GET" }));
loanRouter.post("/:loanId/repayments", requireAuth, proxyToPaymentApi((req) => `/loans/${req.params.loanId}/repayments`, { method: "POST" }));

lenderRouter.post("/", requireAuth, proxyToPaymentApi("/lenders", { method: "POST" }));
lenderRouter.get("/", requireAuth, proxyToPaymentApi("/lenders", { method: "GET" }));

export { loanRouter, lenderRouter };
