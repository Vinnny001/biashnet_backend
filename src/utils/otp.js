import crypto from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}