import { authService } from "../services/authService.js";
import { asyncHandler } from "../utils/errors.js";
import { assertEmail, requireFields } from "../utils/validators.js";

export const authController = {

  /*
  |--------------------------------------------------------------------------
  | SIGNUP
  |--------------------------------------------------------------------------
  */

  signup: asyncHandler(async (req, res) => {

    const { userType } = req.body;

    requireFields(
      req.body,
      ["email", "password", "userType"]
    );

    requireFields(
      req.body,
      userType === "business"
        ? ["businessName"]
        : ["firstName", "surname"]
    );

    assertEmail(req.body.email);

    const session =
      await authService.signup(req.body);

    res.status(201).json({
      success: true,
      ...session
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  login: asyncHandler(async (req, res) => {

    requireFields(
      req.body,
      ["email", "password"]
    );

    assertEmail(req.body.email);

    const session =
      await authService.login(req.body);

    res.json({
      success: true,
      ...session
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  logout: asyncHandler(async (req, res) => {

    res.json({
      success: true,
      message: "Logged out."
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  me: asyncHandler(async (req, res) => {

    const user =
      await authService.me(req.auth.uid);

    res.json({
      success: true,
      user
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | VERIFY UPLOAD
  |--------------------------------------------------------------------------
  |
  | This endpoint is called by the upload server.
  |
  | The middleware before this controller should already have:
  |
  | 1. Verified UPLOAD_API_KEY
  | 2. Verified JWT
  | 3. Verified seller/admin role
  |
  */

  verifyUpload: asyncHandler(async (req, res) => {

  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      authorized: false,
      error: "Unauthorized"
    });
  }

  res.json({
    success: true,
    authorized: true,

    user: {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name || user.displayName || "",
      phone: user.phone || "",
      location: user.location || "",
      role: user.role,
      isSeller: user.isSeller,
      isAdmin: user.isAdmin
    }
  });

}),


  /*
  |--------------------------------------------------------------------------
  | FORGOT PASSWORD
  |--------------------------------------------------------------------------
  */

  forgotPassword: asyncHandler(async (req, res) => {

    requireFields(
      req.body,
      ["email"]
    );

    assertEmail(req.body.email);

    const result =
      await authService.forgotPassword(
        req.body.email
      );

    res.json({
      success: true,
      ...result
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | RESET PASSWORD
  |--------------------------------------------------------------------------
  */

  resetPassword: asyncHandler(async (req, res) => {

    const result =
      await authService.resetPassword(
        req.body
      );

    res.json({
      success: true,
      ...result
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | CHECK EMAIL
  |--------------------------------------------------------------------------
  */

  checkEmail: asyncHandler(async (req, res) => {

    requireFields(
      req.body,
      ["email"]
    );

    assertEmail(req.body.email);

    const result =
      await authService.checkEmail(
        req.body.email
      );

    res.json({
      success: true,
      ...result
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | LOGIN INITIATE
  |--------------------------------------------------------------------------
  */

  loginInitiate: asyncHandler(async (req, res) => {

    requireFields(
      req.body,
      ["email", "password", "accountType"]
    );

    assertEmail(req.body.email);

    const result =
      await authService.loginInitiate(
        req.body
      );

    res.json({
      success: true,
      ...result
    });

  }),


  /*
  |--------------------------------------------------------------------------
  | LOGIN VERIFY OTP
  |--------------------------------------------------------------------------
  */

  loginVerifyOtp: asyncHandler(async (req, res) => {

    requireFields(
      req.body,
      ["email", "code"]
    );

    assertEmail(req.body.email);

    const session =
      await authService.loginVerifyOtp(
        req.body
      );

    res.json({
      success: true,
      ...session
    });

  })

};

