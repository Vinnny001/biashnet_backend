import { db, FieldValue } from "../config/firebase.js";
import { FINANCE_COLLECTIONS, APPROVAL_STATUS, ROLE_CHANGE_REQUEST_TYPE } from "../config/financeCollections.js";
import { badRequest, notFound } from "../utils/errors.js";

/*
=========================================================
APPROVAL SERVICE (native — ROLE_CHANGE only)
=========================================================

This shares the SAME approvalRequests collection mpesa-api
already uses for EXPENSE/PAYROLL_RUN/LOAN_ENTRY/
INVESTOR_PAYOUT requests — each service only ever queries/
resolves its own request types, so there's no collision.
This service is intentionally generic (doesn't import
employeeService) to avoid a circular dependency; the
requestType -> apply-function wiring lives in
approvalController.js, mirroring mpesa-api's own pattern.
=========================================================
*/

function getApprovalRef(requestId) {
  if (!requestId) throw badRequest("Approval request ID is required.");
  return db.collection(FINANCE_COLLECTIONS.APPROVAL_REQUESTS).doc(requestId);
}

export const approvalService = {
  async createApprovalRequest({ requestType, requestedBy, targetId = null, requiredLevel, payload = {}, description = "" }) {
    if (!requestType) throw badRequest("Approval request type is required.");
    if (!requestedBy) throw badRequest("Requesting user ID is required.");
    if (!requiredLevel) throw badRequest("Required approval level is required.");

    const requestRef = db.collection(FINANCE_COLLECTIONS.APPROVAL_REQUESTS).doc();
    const data = {
      requestId: requestRef.id,
      requestType,
      requestedBy,
      targetId,
      requiredLevel,
      payload,
      description,
      status: APPROVAL_STATUS.PENDING,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await requestRef.set(data);
    return { id: requestRef.id, ...data };
  },

  async getApprovalRequest(requestId) {
    const snap = await getApprovalRef(requestId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  },

  /*
   * Only ever returns ROLE_CHANGE requests — mpesa-api's
   * own /api/approvals list excludes this type, so the
   * two never show overlapping items.
   */
  async listPendingRoleChangeApprovals() {
    const snapshot = await db
      .collection(FINANCE_COLLECTIONS.APPROVAL_REQUESTS)
      .where("status", "==", APPROVAL_STATUS.PENDING)
      .where("requestType", "==", ROLE_CHANGE_REQUEST_TYPE)
      .get();

    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  },

  async claimApproval(requestId, nextStatus, actorField, actorId) {
    const requestRef = getApprovalRef(requestId);
    let claimed;

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists) throw notFound("Approval request not found.");

      const request = snap.data();
      if (request.status !== APPROVAL_STATUS.PENDING) {
        throw badRequest(`Approval request has already been ${request.status}.`);
      }

      const updates = { status: nextStatus, updatedAt: FieldValue.serverTimestamp() };
      updates[actorField] = actorId;
      updates[nextStatus === APPROVAL_STATUS.APPROVED ? "approvedAt" : "rejectedAt"] = FieldValue.serverTimestamp();

      transaction.update(requestRef, updates);
      claimed = { id: requestRef.id, ...request, ...updates };
    });

    return claimed;
  },

  async revertToPending(requestId) {
    await getApprovalRef(requestId).update({
      status: APPROVAL_STATUS.PENDING,
      approvedBy: null,
      approvedAt: null,
      updatedAt: FieldValue.serverTimestamp()
    });
  },

  async approveRequest(requestId, approvedBy, applyFn) {
    if (typeof applyFn !== "function") throw badRequest("An apply() callback is required to approve a request.");

    const claimed = await approvalService.claimApproval(requestId, APPROVAL_STATUS.APPROVED, "approvedBy", approvedBy);

    try {
      const applyResult = await applyFn(claimed.payload, claimed);
      return { success: true, request: claimed, result: applyResult };
    } catch (error) {
      await approvalService.revertToPending(requestId);
      throw error;
    }
  },

  async rejectRequest(requestId, rejectedBy, reason = "") {
    const claimed = await approvalService.claimApproval(requestId, APPROVAL_STATUS.REJECTED, "rejectedBy", rejectedBy);
    if (reason) await getApprovalRef(requestId).update({ rejectionReason: reason });
    return { success: true, request: claimed };
  }
};
