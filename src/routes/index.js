import { Router } from "express";
import advertsRoutes from "./adverts.routes.js";
import authRoutes from "./auth.routes.js";
import chatRoutes from "./chat.routes.js";
import ordersRoutes from "./orders.routes.js";
import paymentsRoutes from "./payments.routes.js";
import productsRoutes from "./products.routes.js";
import uploadRoutes from "./upload.routes.js";
import usersRoutes from "./users.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "biashnet-api",
    timestamp: new Date().toISOString()
  });
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/products", productsRoutes);
router.use("/orders", ordersRoutes);
router.use("/chat", chatRoutes);
router.use("/adverts", advertsRoutes);
router.use("/upload", uploadRoutes);
router.use("/payments", paymentsRoutes);

export default router;
