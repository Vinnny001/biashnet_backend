import { db } from "../config/firebase.js";
import { FINANCE_COLLECTIONS, EMPLOYMENT_STATUS } from "../config/financeCollections.js";
import { forbidden, unauthorized } from "../utils/errors.js";

/*
=========================================================
EMPLOYEE AUTH MIDDLEWARE
=========================================================

Mirrors payment/biashnet-mpesa-api's middleware/employeeAuth.js
exactly (same employees/{uid} doc, same employmentStatus
check) — must run AFTER requireAuth so req.auth.uid exists.
=========================================================
*/

export async function employeeAuth(req, res, next) {
  try {
    const userId = req.auth?.uid;
    if (!userId) throw unauthorized("Authentication is required.");

    const snap = await db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(userId).get();
    if (!snap.exists) throw forbidden("Employee account required.");

    const employee = snap.data();
    if (employee.employmentStatus !== EMPLOYMENT_STATUS.ACTIVE) {
      throw forbidden("Your employee account is not active.");
    }

    req.employee = { id: userId, uid: userId, ...employee };
    next();
  } catch (error) {
    next(error.statusCode ? error : forbidden(error.message));
  }
}
