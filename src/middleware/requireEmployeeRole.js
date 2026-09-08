import { forbidden } from "../utils/errors.js";

/*
=========================================================
REQUIRE EMPLOYEE ROLE
=========================================================

Factory middleware, must run after employeeAuth. Mirrors
payment/biashnet-mpesa-api's middleware/requireEmployeeRole.js.
An employee with roles.admin === true is always authorized.
=========================================================
*/

export function requireEmployeeRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = req.employee?.roles || {};
    const isAdmin = roles.admin === true;
    const hasAllowedRole = allowedRoles.some((role) => roles[role] === true);

    if (!isAdmin && !hasAllowedRole) {
      next(forbidden(`This action requires one of the following roles: ${allowedRoles.join(", ")}.`));
      return;
    }

    next();
  };
}
