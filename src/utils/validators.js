import { ALLOWED_SIGNUP_ROLES } from "../config/constants.js";
import { badRequest } from "./errors.js";

export function requireFields(body, fields) {
  const missing = fields.filter((field) => !body?.[field]);
  if (missing.length) {
    throw badRequest(`Missing required field(s): ${missing.join(", ")}`);
  }
}

export function assertEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    throw badRequest("Enter a valid email address.");
  }
}

export function normalizeSignupRole(role) {
  return ALLOWED_SIGNUP_ROLES.includes(role) ? role : "buyer";
}

export function toPositiveInt(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
