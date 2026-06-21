import { authService } from "../services/authService.js";
import { asyncHandler } from "../utils/errors.js";
import { assertEmail, requireFields } from "../utils/validators.js";

export const authController = {
  signup: asyncHandler(async (req, res) => {
    requireFields(req.body, ["name", "email", "password"]);
    assertEmail(req.body.email);
    const session = await authService.signup(req.body);
    res.status(201).json({ success: true, ...session });
  }),

  login: asyncHandler(async (req, res) => {
    requireFields(req.body, ["email", "password"]);
    assertEmail(req.body.email);
    const session = await authService.login(req.body);
    res.json({ success: true, ...session });
  }),

  logout: asyncHandler(async (req, res) => {
    res.json({ success: true, message: "Logged out." });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.auth.uid);
    res.json({ success: true, user });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    requireFields(req.body, ["email"]);
    assertEmail(req.body.email);
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, ...result });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.json({ success: true, ...result });
  })
};
