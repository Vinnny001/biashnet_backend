import { Router } from "express";
import { orderController } from "../controllers/orderController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", orderController.list);      // buyer OR seller, filtered by role in service
router.post("/", orderController.create);   // buyer
router.get("/:id", orderController.get);     // buyer, seller-on-order, or admin
router.patch("/:id", orderController.update);// buyer (full), seller-on-order (status/timeline only), admin (full)
router.post("/:id/cancel", orderController.cancel); // buyer or admin only

export default router;
