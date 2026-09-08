export const REPORTS_COLLECTION = "employeeReports";

export const REPORT_STATUS = {
  SUBMITTED: "submitted",
  ACKNOWLEDGED: "acknowledged",
  FLAGGED: "flagged"
};

/*
=========================================================
REPORT TYPES BY ROLE
=========================================================

Each employee role files a report shaped for what they
actually do day to day, instead of one generic free-text
box. An employee with admin:true (checked separately, see
reportService.isValidReportType) may file any type.
=========================================================
*/

export const REPORT_TYPES_BY_ROLE = {
  hr: ["hr-update"],
  accountant: ["reconciliation"],
  techlead: ["incident"],
  marketing: ["campaign-update"],
  logistics: ["delivery-discrepancy"],
  ceo: ["executive-summary"]
};

export const REPORT_TYPE_LABELS = {
  "hr-update": "HR Update",
  "reconciliation": "Financial Reconciliation",
  "incident": "Technical Incident",
  "campaign-update": "Marketing Campaign Update",
  "delivery-discrepancy": "Delivery Discrepancy",
  "executive-summary": "Executive Summary"
};

export const ALL_REPORT_TYPES = Object.values(REPORT_TYPES_BY_ROLE).flat();
