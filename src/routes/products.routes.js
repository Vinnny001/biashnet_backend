import { Router } from "express";
import { productController } from "../controllers/productController.js";
import { requireAuth, requireSellerOrAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", productController.list);
router.get("/:id/reviews", productController.reviews);
router.get("/:id", productController.get);
router.post("/", requireAuth, requireSellerOrAdmin, productController.create);
router.patch("/:id", requireAuth, requireSellerOrAdmin, productController.update);
router.delete("/:id", requireAuth, requireSellerOrAdmin, productController.remove);

export default router;
