import { ROLES } from "../config/constants.js";
import { auth } from "../config/firebase.js";
import { verifyToken } from "../utils/jwt.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { userService } from "../services/userService.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function getTrustedRole(authUser, profile, jwtPayload) {
  if (authUser.customClaims?.role) return authUser.customClaims.role;
  if (authUser.customClaims?.admin) return ROLES.ADMIN;
  if (profile?.role) return profile.role;
  // for admins/investors who have no users doc, trust the signed JWT role
  if (jwtPayload?.role) return jwtPayload.role;
  return ROLES.BUYER;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    const payload = verifyToken(token);

    if (!payload.uid) throw unauthorized("Invalid token payload.");

    const [authUser, profile] = await Promise.all([
      auth.getUser(payload.uid),
      userService.findById(payload.uid)
    ]);

    if (authUser.disabled) throw forbidden("This account has been disabled.");

    const role = getTrustedRole(authUser, profile, payload);
    req.auth = {
      uid: authUser.uid,
      email: authUser.email,
      role,
      claims: authUser.customClaims || {}
    };
    req.user = {
      id: authUser.uid,
      uid: authUser.uid,
      email: authUser.email,
      role,
      ...profile,
      isAdmin: role === ROLES.ADMIN,
      isSeller: role === ROLES.SELLER
    };

    next();
  } catch (error) {
    next(error.statusCode ? error : unauthorized(error.message));
  }
}

export function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }
  requireAuth(req, res, next);
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(forbidden());
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(ROLES.ADMIN);
export const requireSellerOrAdmin = requireRole(ROLES.SELLER, ROLES.ADMIN);
