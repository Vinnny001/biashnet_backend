import { Router } from "express";

import advertsRoutes from "./adverts.routes.js";
import authRoutes from "./auth.routes.js";
import cartRoutes from "./cart.routes.js";
import chatRoutes from "./chat.routes.js";
import ordersRoutes from "./orders.routes.js";
import paymentsRoutes from "./payments.routes.js";
import productsRoutes from "./products.routes.js";
import sellerRoutes from "./seller.routes.js";
import uploadRoutes from "./upload.routes.js";
import usersRoutes from "./users.routes.js";


const router = Router();


/*
=========================================================
HEALTH
=========================================================

GET /api/health
=========================================================
*/

router.get(
  "/health",
  (req, res) => {

    res.json({

      success: true,

      status: "ok",

      service:
        "biashnet-api",

      timestamp:
        new Date().toISOString()

    });

  }
);


/*
=========================================================
AUTHENTICATION
=========================================================

/api/auth

Login
Register
Refresh token
Role selection
etc.
=========================================================
*/

router.use(
  "/auth",
  authRoutes
);


/*
=========================================================
USERS
=========================================================

/api/users

Important:

GET   /api/users/me
PATCH /api/users/me

Admin user management remains inside usersRoutes.
=========================================================
*/

router.use(
  "/users",
  usersRoutes
);


/*
=========================================================
SELLERS
=========================================================

/api/sellers

Public seller shop:

GET /api/sellers/:id

Seller dashboard:

GET /api/sellers/me

Seller profile management:

PATCH /api/sellers/me

Seller statistics:

GET /api/sellers/me/stats

Seller products:

GET /api/sellers/me/products

=========================================================
*/

router.use(
  "/sellers",
  sellerRoutes
);


/*
=========================================================
PRODUCTS
=========================================================

/api/products

Public:

GET /api/products
GET /api/products/:id

Authenticated seller:

POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

Seller's own products:

GET /api/products/mine
=========================================================
*/

router.use(
  "/products",
  productsRoutes
);


/*
=========================================================
ORDERS
=========================================================

/api/orders

Buyer:

GET  /api/orders/mine
POST /api/orders

Seller:

GET /api/orders/mine
PATCH /api/orders/:id

Admin:

Full order management
=========================================================
*/

router.use(
  "/orders",
  ordersRoutes
);


/*
=========================================================
CART
=========================================================

/api/cart
=========================================================
*/

router.use(
  "/cart",
  cartRoutes
);


/*
=========================================================
PAYMENTS
=========================================================

/api/payments

Checkout
Payment initiation
Payment status
etc.
=========================================================
*/

router.use(
  "/payments",
  paymentsRoutes
);


/*
=========================================================
UPLOADS
=========================================================

/api/upload

Cloudinary / image upload functionality.
=========================================================
*/

router.use(
  "/upload",
  uploadRoutes
);


/*
=========================================================
CHAT
=========================================================

/api/chat
=========================================================
*/

router.use(
  "/chat",
  chatRoutes
);


/*
=========================================================
ADVERTS
=========================================================

/api/adverts
=========================================================
*/

router.use(
  "/adverts",
  advertsRoutes
);


export default router;