import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

router.post("/login/check-email", authLimiter, authController.checkEmail); // check if the email exist in users collection and returns the accounts owned by the email
router.post("/login/initiate", authLimiter, authController.loginInitiate); // Sends the otp to the email
router.post("/login/verify-otp", authLimiter, authController.loginVerifyOtp);

export default router;
