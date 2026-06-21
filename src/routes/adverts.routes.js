import { Router } from "express";
import { advertController } from "../controllers/advertController.js";
import { requireAuth, requireSellerOrAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", advertController.list);
router.get("/:id", advertController.get);
router.post("/", requireAuth, requireSellerOrAdmin, advertController.create);
router.patch("/:id", requireAuth, requireSellerOrAdmin, advertController.update);
router.delete("/:id", requireAuth, requireSellerOrAdmin, advertController.remove);

export default router;
