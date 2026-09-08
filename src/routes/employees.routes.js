import { Router } from "express";

import {
  employeeController
} from "../controllers/employeeController.js";

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
CURRENT EMPLOYEE
=========================================================

GET /api/employees/me

Drives the "Employee" login option — returns null-safe
403 (via employeeAuth) if the caller isn't an active
employee, which the frontend treats as "no employee option".
=========================================================
*/

router.get(
  "/me",
  requireAuth,
  employeeAuth,
  employeeController.me
);


/*
=========================================================
HR MANAGEMENT
=========================================================
*/

router.post(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  employeeController.create
);


router.get(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin", "ceo"),
  employeeController.list
);


router.patch(
  "/:employeeId/status",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  employeeController.updateStatus
);


router.patch(
  "/:employeeId/position",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  employeeController.updatePosition
);


router.patch(
  "/:employeeId/roles",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  employeeController.changeRoles
);


export default router;
