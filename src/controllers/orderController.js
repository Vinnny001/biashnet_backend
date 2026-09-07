import { orderService } from "../services/orderService.js";
import {
  asyncHandler,
  forbidden,
  notFound
} from "../utils/errors.js";

import { ROLES } from "../config/constants.js";


export const orderController = {

  /*
  =========================================================
  GET ALL ORDERS
  =========================================================

  GET /api/orders

  Admin:
      Can see all orders.

  Buyer:
      Returns buyer orders.

  Seller:
      Returns orders containing their products.

  This endpoint can remain for general order management.
  =========================================================
  */

  list: asyncHandler(async (req, res) => {

    const orders =
      await orderService.list(
        req.query,
        req.auth
      );

    res.json({
      success: true,
      data: orders
    });

  }),


  /*
  =========================================================
  MY ORDERS
  =========================================================

  GET /api/orders/mine

  This is the endpoint your website and Android app
  should use for the logged-in user's orders.

  IMPORTANT:

  No buyerId.
  No sellerId.

  Identity comes from:

      req.auth.uid
      req.auth.role
  =========================================================
  */

  mine: asyncHandler(async (req, res) => {

    const orders =
      await orderService.list(
        {
          ...req.query,
          mine: true
        },
        req.auth
      );

    res.json({
      success: true,
      data: orders
    });

  }),


  /*
  =========================================================
  GET SINGLE ORDER
  =========================================================

  GET /api/orders/:id
  =========================================================
  */

  get: asyncHandler(async (req, res) => {

    const order =
      await orderService.findById(
        req.params.id,
        req.auth
      );

    if (!order) {
      throw notFound(
        "Order not found."
      );
    }

    res.json({
      success: true,
      data: order
    });

  }),


  /*
  =========================================================
  CREATE ORDER
  =========================================================

  POST /api/orders

  Only authenticated buyers should create orders.

  The service should still perform all authoritative
  validation.
  =========================================================
  */

  create: asyncHandler(async (req, res) => {

    if (
      req.auth.role !== ROLES.BUYER &&
      req.auth.role !== ROLES.ADMIN
    ) {
      throw forbidden(
        "Only buyers can create orders."
      );
    }

    const order =
      await orderService.create(
        req.body,
        req.user
      );

    res.status(201).json({
      success: true,
      message:
        "Order created successfully.",
      data: order
    });

  }),


  /*
  =========================================================
  UPDATE ORDER
  =========================================================

  Buyer:
      Allowed buyer-side updates.

  Seller:
      Only seller-side order updates.

  Admin:
      Full access.

  The service remains responsible for determining
  exactly which fields each role may modify.
  =========================================================
  */

  update: asyncHandler(async (req, res) => {

    const order =
      await orderService.update(
        req.params.id,
        req.body,
        req.auth
      );

    res.json({
      success: true,
      message:
        "Order updated successfully.",
      data: order
    });

  }),


  /*
  =========================================================
  CANCEL ORDER
  =========================================================

  POST /api/orders/:id/cancel

  Buyer or admin only.

  Seller cannot cancel a buyer's order through this
  endpoint.
  =========================================================
  */

  cancel: asyncHandler(async (req, res) => {

    if (
      req.auth.role !== ROLES.BUYER &&
      req.auth.role !== ROLES.ADMIN
    ) {
      throw forbidden(
        "You are not allowed to cancel this order."
      );
    }

    const order =
      await orderService.cancel(
        req.params.id,
        req.auth
      );

    res.json({
      success: true,
      message:
        "Order cancelled successfully.",
      data: order
    });

  })

};