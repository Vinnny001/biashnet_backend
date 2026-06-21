import { Router } from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";
import { requireAuth, requireSellerOrAdmin } from "../middleware/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are allowed."));
      return;
    }
    callback(null, true);
  }
});

router.use(requireAuth, requireSellerOrAdmin);
router.post("/image", upload.single("image"), uploadController.image);
router.delete("/image", uploadController.removeImage);

export default router;
