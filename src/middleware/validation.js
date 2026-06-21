import { badRequest } from "../utils/errors.js";

export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = requiredFields.filter((field) => !req.body?.[field]);
    if (missing.length) {
      next(badRequest(`Missing required field(s): ${missing.join(", ")}`));
      return;
    }
    next();
  };
}
