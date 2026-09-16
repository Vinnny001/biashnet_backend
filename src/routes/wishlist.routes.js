import { Router } from "express";

import { wishlistService } from "../services/wishlistService.js";
import { requireAuth, requireBuyer } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/errors.js";

/*
=========================================================
WISHLIST (LIKED LISTINGS)
=========================================================

GET    /api/wishlist       the buyer's liked listings
GET    /api/wishlist/ids   just the ids, for the heart on each card
POST   /api/wishlist/:productId
DELETE /api/wishlist/:productId

Buyer-only, every route: liking is a shopper's action, so a seller,
admin or signed-out visitor is refused here rather than in the UI alone.
=========================================================
*/

const router = Router();

router.use(requireAuth, requireBuyer);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await wishlistService.list(req.auth.uid);
    res.json({ success: true, data: products });
  })
);

router.get(
  "/ids",
  asyncHandler(async (req, res) => {
    const productIds = await wishlistService.productIds(req.auth.uid);
    res.json({ success: true, data: productIds });
  })
);

router.post(
  "/:productId",
  asyncHandler(async (req, res) => {
    const result = await wishlistService.add(req.auth.uid, req.params.productId);
    res.json({ success: true, message: "Added to your likes.", data: result });
  })
);

router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const result = await wishlistService.remove(req.auth.uid, req.params.productId);
    res.json({ success: true, message: "Removed from your likes.", data: result });
  })
);

export default router;
