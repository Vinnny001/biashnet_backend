import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", chatController.threads);
router.post("/", chatController.create);
router.get("/:threadId/messages", chatController.messages);
router.post("/:threadId/messages", chatController.send);

export default router;
