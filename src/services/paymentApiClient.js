import { badRequest } from "../utils/errors.js";

/*
=========================================================
PAYMENT API CLIENT
=========================================================

Thin proxy to payment/biashnet-mpesa-api for anything that
moves money or touches escrow (expenses, payroll, loans,
investors, finance withdrawals, logistics, order
completion, resolve-partial). mpesa-api keeps owning ALL
of that business logic — this just forwards the original
caller's Authorization header (mpesa-api's requireAuth now
accepts this backend's own JWT directly, so no separate
service credential is needed) and relays the response
as-is. No financial logic lives here.
=========================================================
*/

const PAYMENT_API_BASE_URL =
  process.env.PAYMENT_API_BASE_URL || "http://localhost:3008/api";

/*
 * path: e.g. "/expenses", "/payroll/run", "/logistics/pending-dropoffs"
 * req: the original Express request (used for the Authorization header)
 */
export async function forwardToPaymentApi(req, path, { method = "GET", body } = {}) {
  const authorization = req.headers.authorization;
  if (!authorization) throw badRequest("Authentication token is required.");

  let response;

  try {
    response = await fetch(`${PAYMENT_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json"
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkError) {
    const error = badRequest("Unable to reach the payment service. Please try again.");
    error.statusCode = 502;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text();

  return { status: response.status, data };
}

/*
 * Express handler factory — forwards the request as-is and
 * relays mpesa-api's status/body unchanged. `pathFn` receives
 * req so it can interpolate params (e.g. :orderId).
 */
export function proxyToPaymentApi(pathFn, { method = "GET" } = {}) {
  return async (req, res, next) => {
    try {
      const path = typeof pathFn === "function" ? pathFn(req) : pathFn;
      const { status, data } = await forwardToPaymentApi(req, path, {
        method,
        body: ["POST", "PATCH", "PUT"].includes(method) ? req.body : undefined
      });

      res.status(status).json(data);
    } catch (error) {
      next(error);
    }
  };
}
