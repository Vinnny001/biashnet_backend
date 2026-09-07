import { Router } from "express";

import {
  productController
} from "../controllers/productController.js";

import {
  requireAuth,
  requireSellerOrAdmin
} from "../middleware/auth.middleware.js";


const router = Router();


/*
=========================================================
PUBLIC PRODUCTS
=========================================================
*/


/*
GET /api/products

Anyone can browse products.
*/

router.get(
  "/",
  productController.list
);


/*
=========================================================
SELLER PRODUCTS
=========================================================

GET /api/products/mine

Requires authentication.

Only the authenticated seller's products
are returned.
*/

router.get(
  "/mine",
  requireAuth,
  requireSellerOrAdmin,
  productController.mine
);


/*
=========================================================
PRODUCT REVIEWS
=========================================================
*/

router.get(
  "/:id/reviews",
  productController.reviews
);


/*
=========================================================
PRODUCT VIEW
=========================================================

Optional authentication.

Your current route can remain public because
trackView already handles req.auth?.uid.
*/

router.post(
  "/:id/view",
  productController.trackView
);


/*
=========================================================
SINGLE PRODUCT
=========================================================
*/

router.get(
  "/:id",
  productController.get
);


/*
=========================================================
CREATE PRODUCT
=========================================================
*/

router.post(
  "/",
  requireAuth,
  requireSellerOrAdmin,
  productController.create
);


/*
=========================================================
UPDATE PRODUCT
=========================================================
*/

router.patch(
  "/:id",
  requireAuth,
  requireSellerOrAdmin,
  productController.update
);


/*
=========================================================
DELETE PRODUCT
=========================================================
*/

router.delete(
  "/:id",
  requireAuth,
  requireSellerOrAdmin,
  productController.remove
);


export default router;