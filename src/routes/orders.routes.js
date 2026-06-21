import { Router } from "express";
import { orderController } from "../controllers/orderController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", orderController.list);
router.post("/", orderController.create);
router.get("/:id", orderController.get);
router.patch("/:id", orderController.update);
router.post("/:id/cancel", orderController.cancel);

export default router;
