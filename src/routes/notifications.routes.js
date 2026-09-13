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
which live in mpesa-api, so the collection stays that
service's to own; backend just fronts it for the app. Same
rationale as expenses.routes.js.
=========================================================
*/

const router = Router();

/*
 * The shared proxy forwards a fixed path, so a query string would be
 * silently dropped. These routes depend on ?audience= (which account's
 * screen is asking), so rebuild the query onto the path explicitly.
 * Scoped to this file on purpose: changing the shared proxy would start
 * forwarding filters on every other proxied route too.
 */
function withQuery(path) {
  return (req) => {
    const query = new URLSearchParams(req.query).toString();
    return query ? `${path}?${query}` : path;
  };
}

router.get("/", requireAuth, proxyToPaymentApi(withQuery("/notifications"), { method: "GET" }));
router.post("/read-all", requireAuth, proxyToPaymentApi(withQuery("/notifications/read-all"), { method: "POST" }));
router.patch("/:notificationId/read", requireAuth, proxyToPaymentApi((req) => `/notifications/${req.params.notificationId}/read`, { method: "PATCH" }));

export default router;
