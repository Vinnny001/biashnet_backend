import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.patch("/me", requireAuth, userController.updateMe);

router.use(requireAuth, requireAdmin);
router.get("/", userController.list);
router.post("/", userController.create);
router.get("/:id", userController.get);
router.patch("/:id", userController.update);
router.delete("/:id", userController.remove);

export default router;
