import { Router } from "express";

import {
  approvalController
} from "../controllers/approvalController.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

import {
  employeeAuth
} from "../middleware/employeeAuth.middleware.js";

import {
  requireEmployeeRole
} from "../middleware/requireEmployeeRole.js";


const router = Router();


/*
=========================================================
APPROVAL ROUTES (native — ROLE_CHANGE only)
=========================================================

Base path: /api/approvals

GET  /                    Admin/CEO — list pending ROLE_CHANGE approvals
POST /:requestId/approve  Admin/CEO — approve (level checked in controller)
POST /:requestId/reject   Admin/CEO — reject

Every other approval request type (EXPENSE, PAYROLL_RUN,
LOAN_ENTRY, INVESTOR_PAYOUT) lives on mpesa-api's own
/api/approvals — proxied separately, not through here.
=========================================================
*/

router.get(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("admin", "ceo"),
  approvalController.list
);


router.post(
  "/:requestId/approve",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("admin", "ceo"),
  approvalController.approve
);


router.post(
  "/:requestId/reject",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("admin", "ceo"),
  approvalController.reject
);


export default router;
