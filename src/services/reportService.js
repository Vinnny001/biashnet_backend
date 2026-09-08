import { db, FieldValue } from "../config/firebase.js";
import {
  REPORTS_COLLECTION,
  REPORT_STATUS,
  REPORT_TYPES_BY_ROLE,
  ALL_REPORT_TYPES
} from "../config/reportConstants.js";
import { badRequest, notFound } from "../utils/errors.js";
import { notificationService } from "./notificationService.js";

function isValidReportType(employeeRoles = {}, type) {
  if (employeeRoles.admin === true) return ALL_REPORT_TYPES.includes(type);

  return Object.entries(REPORT_TYPES_BY_ROLE).some(
    ([role, types]) => employeeRoles[role] === true && types.includes(type)
  );
}

export const reportService = {
  isValidReportType,

  async createReport({ employeeId, employeeRoles, type, title, summary, details = {} }) {
    if (!type) throw badRequest("Report type is required.");
    if (!title || !String(title).trim()) throw badRequest("Report title is required.");
    if (!isValidReportType(employeeRoles, type)) {
      throw badRequest(`Your roles don't permit filing a "${type}" report.`);
    }

    const reportRef = db.collection(REPORTS_COLLECTION).doc();
    const data = {
      reportId: reportRef.id,
      employeeId,
      type,
      title: String(title).trim(),
      summary: summary || "",
      details: typeof details === "object" && details !== null ? details : {},
      status: REPORT_STATUS.SUBMITTED,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await reportRef.set(data);
    return { id: reportRef.id, ...data };
  },

  async listMyReports(employeeId) {
    const snapshot = await db.collection(REPORTS_COLLECTION).where("employeeId", "==", employeeId).get();
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  },

  async listAllReports({ status, type } = {}) {
    const snapshot = await db.collection(REPORTS_COLLECTION).get();
    let reports = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

    if (status) reports = reports.filter((report) => report.status === status);
    if (type) reports = reports.filter((report) => report.type === type);

    return reports;
  },

  async reviewReport(reportId, reviewedBy, { decision, notes = "" }) {
    if (![REPORT_STATUS.ACKNOWLEDGED, REPORT_STATUS.FLAGGED].includes(decision)) {
      throw badRequest(`Decision must be one of: ${REPORT_STATUS.ACKNOWLEDGED}, ${REPORT_STATUS.FLAGGED}.`);
    }

    const reportRef = db.collection(REPORTS_COLLECTION).doc(reportId);
    const snap = await reportRef.get();
    if (!snap.exists) throw notFound("Report not found.");

    const updates = {
      status: decision,
      reviewedBy,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewNotes: notes,
      updatedAt: FieldValue.serverTimestamp()
    };

    await reportRef.update(updates);

    const report = snap.data();
    await notificationService
      .create(report.employeeId, {
        title: decision === REPORT_STATUS.ACKNOWLEDGED ? "Report acknowledged" : "Report flagged",
        message:
          decision === REPORT_STATUS.ACKNOWLEDGED
            ? `Your "${report.title}" report has been acknowledged.`
            : `Your "${report.title}" report was flagged for follow-up.${notes ? ` Note: ${notes}` : ""}`
      })
      .catch(() => {});

    return { id: reportId, ...report, ...updates };
  }
};
