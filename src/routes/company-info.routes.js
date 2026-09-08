import { Router } from "express";

import {
  companyInfoController
} from "../controllers/companyInfoController.js";

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
COMPANY INFO ROUTES
=========================================================

Base path: /api/company-info

GET   /   any authenticated employee
PATCH /   CEO/Admin only
=========================================================
*/

router.get(
  "/",
  requireAuth,
  employeeAuth,
  companyInfoController.get
);


router.patch(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("ceo", "admin"),
  companyInfoController.update
);


export default router;
