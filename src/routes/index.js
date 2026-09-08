import { Router } from "express";

import advertsRoutes from "./adverts.routes.js";
import approvalsRoutes from "./approvals.routes.js";
import authRoutes from "./auth.routes.js";
import cartRoutes from "./cart.routes.js";
import chatRoutes from "./chat.routes.js";
import companyInfoRoutes from "./company-info.routes.js";
import employeesRoutes from "./employees.routes.js";
import expensesRoutes from "./expenses.routes.js";
import financeWithdrawalsRoutes from "./finance-withdrawals.routes.js";
import investorsRoutes from "./investors.routes.js";
import { loanRouter, lenderRouter } from "./loans.routes.js";
import logisticsRoutes from "./logistics.routes.js";
import orderCompletionRoutes from "./order-completion.routes.js";
import ordersRoutes from "./orders.routes.js";
import paymentsRoutes from "./payments.routes.js";
import payrollRoutes from "./payroll.routes.js";
import positionsRoutes from "./positions.routes.js";
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


/*
=========================================================
EMPLOYEES / HR
=========================================================

/api/employees

GET /api/employees/me drives the "Employee" login option
on the frontend.
=========================================================
*/

router.use(
  "/employees",
  employeesRoutes
);


/*
=========================================================
POSITIONS
=========================================================

/api/positions
=========================================================
*/

router.use(
  "/positions",
  positionsRoutes
);


/*
=========================================================
COMPANY INFO
=========================================================

/api/company-info
=========================================================
*/

router.use(
  "/company-info",
  companyInfoRoutes
);


/*
=========================================================
APPROVALS (ROLE_CHANGE only — native)
=========================================================

/api/approvals
=========================================================
*/

router.use(
  "/approvals",
  approvalsRoutes
);


/*
=========================================================
FINANCE PROXIES (money/escrow — mpesa-api owns the logic)
=========================================================

/api/expenses, /api/payroll, /api/loans, /api/lenders,
/api/investors, /api/finance-withdrawals, /api/logistics,
/api/marketplace/order-completion

Thin server-to-server forwards to
payment/biashnet-mpesa-api — see
src/services/paymentApiClient.js.
=========================================================
*/

router.use(
  "/expenses",
  expensesRoutes
);

router.use(
  "/payroll",
  payrollRoutes
);

router.use(
  "/loans",
  loanRouter
);

router.use(
  "/lenders",
  lenderRouter
);

router.use(
  "/investors",
  investorsRoutes
);

router.use(
  "/finance-withdrawals",
  financeWithdrawalsRoutes
);

router.use(
  "/logistics",
  logisticsRoutes
);

router.use(
  "/marketplace/order-completion",
  orderCompletionRoutes
);


export default router;