import { Router } from "express";

import {
  positionController
} from "../controllers/positionController.js";

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
POSITION ROUTES
=========================================================

Base path: /api/positions

POST  /             HR or Admin — create a position
GET   /             Any authenticated employee — list positions
PATCH /:positionId  HR or Admin — update a position
=========================================================
*/

router.post(
  "/",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  positionController.create
);


router.get(
  "/",
  requireAuth,
  employeeAuth,
  positionController.list
);


router.patch(
  "/:positionId",
  requireAuth,
  employeeAuth,
  requireEmployeeRole("hr", "admin"),
  positionController.update
);


export default router;
