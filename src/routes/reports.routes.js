import { Router } from "express";

import {
  reportController
} from "../controllers/reportController.js";

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
REPORT ROUTES
=========================================================

Base path: /api/reports

POST  /                    any active employee — file a
                            report shaped for their role
GET   /mine                any active employee — own reports
GET   /                    HR/CEO/Admin — all submitted reports
PATCH /:reportId/review    HR/CEO/Admin — acknowledge or flag
=========================================================
*/

router.post(
  "/",
  requireAuth,
  employeeAuth,
  reportController.create
);


router.get(
  "/mine",
  requireAuth,
  employeeAuth,
  reportController.listMine
);


router.get(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "ceo", "admin"),
  reportController.listAll
);


router.patch(
  "/:reportId/review",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "ceo", "admin"),
  reportController.review
);


export default router;
