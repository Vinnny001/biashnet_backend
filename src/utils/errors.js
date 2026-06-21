export class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export const badRequest = (message = "Bad request", details = null) =>
  new ApiError(message, 400, details);

export const unauthorized = (message = "Authentication required") =>
  new ApiError(message, 401);

export const forbidden = (message = "You do not have permission to access this resource") =>
  new ApiError(message, 403);

export const notFound = (message = "Resource not found") => new ApiError(message, 404);

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
