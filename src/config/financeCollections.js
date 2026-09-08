/*
=========================================================
FINANCE / EMPLOYEE COLLECTIONS
=========================================================

Same Firestore project, same collection names as
payment/biashnet-mpesa-api's config/financeCollections.js
and config/collections.js — this is NOT a separate data
store, just a different service reading/writing some of
the same collections (exactly like `users` and
`marketplaceOrders` already are). Employees/positions/
companyInfos/approvalRequests are natively owned here now;
everything money-related stays owned by mpesa-api and is
reached via src/services/paymentApiClient.js instead.
=========================================================
*/

export const FINANCE_COLLECTIONS = {
  POSITIONS: "positions",
  EMPLOYEES: "employees",
  COMPANY_INFOS: "companyInfos",
  APPROVAL_REQUESTS: "approvalRequests"
};

export const EMPLOYMENT_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  TERMINATED: "terminated"
};

export const EMPLOYEE_ROLE_KEYS = [
  "ceo",
  "hr",
  "accountant",
  "techlead",
  "marketing",
  "admin",
  "logistics"
];

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

export const APPROVAL_LEVEL = {
  ADMIN: "ADMIN",
  CEO: "CEO"
};

export const ROLE_CHANGE_REQUEST_TYPE = "ROLE_CHANGE";
