import { Router } from "express";

import {
  userController
} from "../controllers/userController.js";

import {
  requireAdmin,
  requireAuth
} from "../middleware/auth.middleware.js";


const router = Router();


/*
=========================================================
CURRENT AUTHENTICATED USER
=========================================================

GET /api/users/me

Used by:

- Website
- Android app
- Seller dashboard
- Profile
- Account pages

Returns the currently authenticated user's
own profile.
=========================================================
*/

router.get(
  "/me",
  requireAuth,
  userController.me
);


/*
=========================================================
UPDATE CURRENT USER
=========================================================
*/

router.patch(
  "/me",
  requireAuth,
  userController.updateMe
);


/*
=========================================================
DEVICE TOKEN (Android push notifications)
=========================================================

POST   /api/users/me/device-token   register (Capacitor
                                     @capacitor/push-notifications
                                     "registration" event)
DELETE /api/users/me/device-token   unregister (e.g. on logout)
=========================================================
*/

router.post(
  "/me/device-token",
  requireAuth,
  userController.registerDeviceToken
);

router.delete(
  "/me/device-token",
  requireAuth,
  userController.removeDeviceToken
);


/*
=========================================================
ADMIN USER MANAGEMENT
=========================================================
*/

router.use(
  requireAuth,
  requireAdmin
);


router.get(
  "/",
  userController.list
);


router.post(
  "/",
  userController.create
);


/*
=========================================================
IMPORTANT

/:id MUST COME AFTER /me
=========================================================
*/

router.get(
  "/:id",
  userController.get
);


router.patch(
  "/:id",
  userController.update
);


router.delete(
  "/:id",
  userController.remove
);


export default router;