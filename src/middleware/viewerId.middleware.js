// src/middleware/viewerId.middleware.js
import crypto from "crypto";

export function viewerId(req, res, next) {
  if (!req.cookies?.viewerId) {
    const id = crypto.randomUUID();
    res.cookie("viewerId", id, {
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    req.cookies = { ...req.cookies, viewerId: id };
  }
  next();
}