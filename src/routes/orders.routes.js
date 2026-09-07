import { Router } from "express";

import {
  orderController
} from "../controllers/orderController.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";


const router = Router();


/*
=========================================================
ALL ORDER ROUTES REQUIRE AUTHENTICATION
=========================================================
*/

router.use(
  requireAuth
);


/*
=========================================================
MY ORDERS
=========================================================

IMPORTANT:

This MUST come before:

/:id

Otherwise "mine" could be interpreted as an
order ID.
*/

router.get(
  "/mine",
  orderController.mine
);


/*
=========================================================
GENERAL ORDER LIST
=========================================================

Buyer:
    own orders

Seller:
    orders containing seller products

Admin:
    all orders

The service determines the correct result based
on req.auth.
*/

router.get(
  "/",
  orderController.list
);


/*
=========================================================
CREATE ORDER
=========================================================
*/

router.post(
  "/",
  orderController.create
);


/*
=========================================================
SINGLE ORDER
=========================================================
*/

router.get(
  "/:id",
  orderController.get
);


/*
=========================================================
UPDATE ORDER
=========================================================
*/

router.patch(
  "/:id",
  orderController.update
);


/*
=========================================================
CANCEL ORDER
=========================================================
*/

router.post(
  "/:id/cancel",
  orderController.cancel
);


export default router;