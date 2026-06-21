import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.post("/checkout", paymentController.checkout);
router.get("/:id", paymentController.status);

export default router;
