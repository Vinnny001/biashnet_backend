import {
  PRODUCT_REVIEW_FIELDS,
  ROLES
} from "../config/constants.js";

import {
  productService
} from "../services/productService.js";

import {
  notifySellerOfProductReview
} from "../services/productReviewNotificationService.js";

import {
  asyncHandler,
  forbidden,
  notFound
} from "../utils/errors.js";

import { logger } from "../utils/logger.js";


/*
=========================================================
HIDE MODERATION DETAILS FROM BUYERS
=========================================================

An admin's note on a listing is written to its seller.
Only that seller and admins get it back; anyone else
browsing receives the product without it.
=========================================================
*/

function withoutReviewDetails(product) {

  const visible = { ...product };

  PRODUCT_REVIEW_FIELDS.forEach(
    (field) => delete visible[field]
  );

  return visible;

}


/*
=========================================================
ENSURE PRODUCT OWNER
=========================================================
*/

function ensureCanModify(product, actor) {

  if (!product) {
    throw notFound(
      "Product not found."
    );
  }

  if (
    actor.role !== ROLES.ADMIN &&
    product.sellerId !== actor.uid
  ) {
    throw forbidden(
      "You are not allowed to modify this product."
    );
  }

}


/*
=========================================================
PRODUCT CONTROLLER
=========================================================
*/

export const productController = {


  /*
  =======================================================
  PUBLIC PRODUCT LIST
  =======================================================

  GET /api/products

  Examples:

  /api/products
  /api/products?category=Phones
  /api/products?status=active
  /api/products?sellerId=ABC
  /api/products?limit=20
  =======================================================
  */

  list: asyncHandler(async (req, res) => {

    const isAdmin =
      req.auth?.role === ROLES.ADMIN;

    const products =
      await productService.list({
        ...req.query,
        includeUnavailable: isAdmin
      });


    /*
    The seller dashboard lists its own products through
    this route with ?sellerId=<their uid>.
    */

    const canSeeReviewDetails =
      isAdmin ||
      (req.auth?.uid &&
        req.query.sellerId === req.auth.uid);


    res.json({
      success: true,
      data: canSeeReviewDetails
        ? products
        : products.map(withoutReviewDetails)
    });

  }),


  /*
  =======================================================
  MY PRODUCTS
  =======================================================

  GET /api/products/mine

  IMPORTANT:

  Seller ID comes from authentication.

  Frontend does NOT send sellerId.

  Authorization
      ↓
  req.auth.uid
      ↓
  productService.list({
    sellerId: req.auth.uid
  })
  =======================================================
  */

  mine: asyncHandler(async (req, res) => {

    const products =
      await productService.list({

        sellerId:
          req.auth.uid,

        /*
        Only active products by default
        is NOT forced here because the seller
        needs to see drafts/inactive products
        in the seller dashboard.
        */

        status:
          req.query.status,

        category:
          req.query.category,

        q:
          req.query.q,

        sort:
          req.query.sort,

        limit:
          req.query.limit

      });


    res.json({
      success: true,
      data: products
    });

  }),


  /*
  =======================================================
  GET SINGLE PRODUCT
  =======================================================
  */

  get: asyncHandler(async (req, res) => {

    const product =
      await productService.findById(
        req.params.id
      );


    if (!product) {
      throw notFound(
        "Product not found."
      );
    }


    /*
    A product that isn't publicly available (pending
    moderation, deactivated, etc.) can't be checked out —
    so the public product page must not expose it either,
    except to its own seller or an admin previewing it.
    */

    const isOwner =
      req.auth &&
      (product.sellerId === req.auth.uid ||
        product.userId === req.auth.uid);

    const isAdmin =
      req.auth?.role === ROLES.ADMIN;

    if (
      !productService.isPubliclyAvailable(product) &&
      !isOwner &&
      !isAdmin
    ) {
      throw notFound(
        "Product not found."
      );
    }


    res.json({
      success: true,
      data: isOwner || isAdmin
        ? product
        : withoutReviewDetails(product)
    });

  }),


  /*
  =======================================================
  CREATE PRODUCT
  =======================================================

  POST /api/products

  Seller identity comes from req.user.
  =======================================================
  */

  create: asyncHandler(async (req, res) => {

    const product =
      await productService.create(
        req.body,
        req.user
      );


    res.status(201).json({
      success: true,
      message:
        "Product created successfully.",
      data: product
    });

  }),


  /*
  =======================================================
  UPDATE PRODUCT
  =======================================================
  */

  update: asyncHandler(async (req, res) => {

    const existing =
      await productService.findById(
        req.params.id
      );


    ensureCanModify(
      existing,
      req.auth
    );


    const product =
      await productService.update(
        req.params.id,
        req.body
      );


    res.json({
      success: true,
      message:
        "Product updated successfully.",
      data: product
    });

  }),


  /*
  =======================================================
  MODERATE PRODUCT (approve / reject)
  =======================================================

  PATCH /api/products/:id/status

  Admin-only — gated by requireAdmin at the route level,
  not by ensureCanModify (a seller must never approve
  their own listing).

  Body: { status: "approved" | "rejected", note }
  The note is required to reject, optional to approve.

  The seller is notified either way. The decision is
  already saved by then, so a notification failure is
  logged and reported back (sellerNotified: false)
  rather than failing the request.
  =======================================================
  */

  updateStatus: asyncHandler(async (req, res) => {

    const { status, note } =
      req.body || {};

    const product =
      await productService.updateStatus(
        req.params.id,
        status,
        req.auth.uid,
        note
      );


    const sellerNotified =
      await notifySellerOfProductReview({
        product,
        status,
        note: product.reviewNote
      }).catch((error) => {
        logger.error(
          "Product review notification failed:",
          product.id,
          error.message
        );
        return false;
      });


    res.json({
      success: true,
      message:
        `Product ${status}.`,
      sellerNotified,
      data: product
    });

  }),


  /*
  =======================================================
  DELETE PRODUCT
  =======================================================
  */

  remove: asyncHandler(async (req, res) => {

    const existing =
      await productService.findById(
        req.params.id
      );


    ensureCanModify(
      existing,
      req.auth
    );


    const result =
      await productService.remove(
        req.params.id
      );


    res.json({
      success: true,
      message:
        "Product deleted successfully.",
      data: result
    });

  }),


  /*
  =======================================================
  REVIEWS
  =======================================================
  */

  reviews: asyncHandler(async (req, res) => {

    const product =
      await productService.findById(
        req.params.id
      );


    if (!product) {
      throw notFound(
        "Product not found."
      );
    }


    const reviews =
      await productService.reviews(
        req.params.id
      );


    res.json({
      success: true,
      data: reviews
    });

  }),


  /*
  =======================================================
  TRACK PRODUCT VIEW
  =======================================================
  */

  trackView: asyncHandler(async (req, res) => {

    const {
      id
    } = req.params;


    const viewerKey =
      req.cookies?.viewerId ||
      req.ip;


    const authedUid =
      req.auth?.uid ||
      null;


    try {

      await productService.recordView(
        id,
        {
          viewerKey,
          authedUid
        }
      );

    } catch (error) {

      /*
      View tracking should never
      break the buyer experience.
      */

      console.error(
        "recordView failed:",
        error
      );

    }


    res.sendStatus(204);

  })

};