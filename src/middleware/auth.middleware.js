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
  if (authUser.customClaims?.admin) return ROLES.ADMIN;

  // The JWT contains the currently selected login role
  if (jwtPayload?.role) return jwtPayload.role;

  if (authUser.customClaims?.role) return authUser.customClaims.role;

  if (profile?.role) return profile.role;

  return ROLES.BUYER;
}

async function resolveAuth(req) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  if (!payload.uid) throw unauthorized("Invalid token payload.");

  const [authUser, profile] = await Promise.all([
    auth.getUser(payload.uid),
    userService.findById(payload.uid)
  ]);

  if (authUser.disabled) throw forbidden("This account has been disabled.");

  const role = getTrustedRole(authUser, profile, payload);
  return {
    auth: {
      uid: authUser.uid,
      email: authUser.email,
      role,
      claims: authUser.customClaims || {}
    },
    user: {
      id: authUser.uid,
      uid: authUser.uid,
      email: authUser.email,
      role,
      ...profile,
      isAdmin: role === ROLES.ADMIN,
      isSeller: role === ROLES.SELLER,
      isInvestor: role === ROLES.INVESTOR
    }
  };
}

export async function requireAuth(req, res, next) {
  try {
    const resolved = await resolveAuth(req);
    req.auth = resolved.auth;
    req.user = resolved.user;
    next();
  } catch (error) {
    next(error.statusCode ? error : unauthorized(error.message));
  }
}

/*
 * Genuinely optional: an anonymous caller, or one with a stale/invalid
 * token, still proceeds — just without req.auth/req.user set. A route
 * using this must never assume req.auth exists.
 */
export async function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const resolved = await resolveAuth(req);
    req.auth = resolved.auth;
    req.user = resolved.user;
  } catch {
    // Invalid/expired token on an optional-auth route — proceed anonymously.
  }

  next();
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
export const requireInvestorOrAdmin = requireRole(ROLES.INVESTOR, ROLES.ADMIN);