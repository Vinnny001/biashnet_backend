import { Router } from "express";
import { cartController } from "../controllers/cartController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", cartController.list);
router.get("/pending", cartController.listPending);
router.post("/items", cartController.addItem);
router.patch("/items/:itemId", cartController.updateQuantity);
router.delete("/items/:itemId", cartController.removeItem);
router.post("/items/:itemId/checkout", cartController.initiateCheckout);
router.post("/merge", cartController.merge);

export default router;