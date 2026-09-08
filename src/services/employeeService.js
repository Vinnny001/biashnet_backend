import { db, FieldValue } from "../config/firebase.js";
import { FINANCE_COLLECTIONS, EMPLOYMENT_STATUS, EMPLOYEE_ROLE_KEYS } from "../config/financeCollections.js";
import { badRequest, notFound } from "../utils/errors.js";
import { notificationService } from "./notificationService.js";
import { approvalService } from "./approvalService.js";
import { APPROVAL_LEVEL, ROLE_CHANGE_REQUEST_TYPE } from "../config/financeCollections.js";

/*
=========================================================
EMPLOYEE SERVICE (native — ported from mpesa-api)
=========================================================

employees/{uid}
{
  employeeId, userId, positionId,
  roles: { ceo, hr, accountant, techlead, marketing, admin, logistics },
  employmentStatus, addedBy, createdAt, updatedAt
}

Never writes to users/{uid} — only links an existing
Firebase user (by uid) into the employees collection.
=========================================================
*/

function normalizeRoles(roles = {}) {
  const normalized = {};
  EMPLOYEE_ROLE_KEYS.forEach((key) => {
    normalized[key] = roles[key] === true;
  });
  return normalized;
}

export const employeeService = {
  normalizeRoles,

  async createEmployee({ userId, positionId, roles = {}, addedBy }) {
    if (!userId) throw badRequest("User ID is required.");
    if (!positionId) throw badRequest("Position ID is required.");

    const positionSnap = await db.collection(FINANCE_COLLECTIONS.POSITIONS).doc(positionId).get();
    if (!positionSnap.exists) throw notFound("Position not found.");

    const employeeRef = db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(userId);
    const existing = await employeeRef.get();
    if (existing.exists) throw badRequest("This user is already an employee.");

    const data = {
      employeeId: userId,
      userId,
      positionId,
      roles: normalizeRoles(roles),
      employmentStatus: EMPLOYMENT_STATUS.ACTIVE,
      addedBy: addedBy || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await employeeRef.set(data);
    return { id: userId, ...data };
  },

  async getEmployee(employeeId) {
    if (!employeeId) throw badRequest("Employee ID is required.");
    const snap = await db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(employeeId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  },

  async listEmployees() {
    const snapshot = await db.collection(FINANCE_COLLECTIONS.EMPLOYEES).get();
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  },

  async updateEmployeeStatus(employeeId, employmentStatus) {
    if (!Object.values(EMPLOYMENT_STATUS).includes(employmentStatus)) {
      throw badRequest(`Employment status must be one of: ${Object.values(EMPLOYMENT_STATUS).join(", ")}.`);
    }

    const employeeRef = db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(employeeId);
    const snap = await employeeRef.get();
    if (!snap.exists) throw notFound("Employee not found.");

    await employeeRef.update({ employmentStatus, updatedAt: FieldValue.serverTimestamp() });
    return { id: employeeId, ...snap.data(), employmentStatus };
  },

  async updateEmployeePosition(employeeId, positionId) {
    const positionSnap = await db.collection(FINANCE_COLLECTIONS.POSITIONS).doc(positionId).get();
    if (!positionSnap.exists) throw notFound("Position not found.");

    const employeeRef = db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(employeeId);
    const snap = await employeeRef.get();
    if (!snap.exists) throw notFound("Employee not found.");

    await employeeRef.update({ positionId, updatedAt: FieldValue.serverTimestamp() });
    return { id: employeeId, ...snap.data(), positionId };
  },

  async requestRoleChange({ employeeId, proposedRoles, requestedBy }) {
    const employeeSnap = await db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(employeeId).get();
    if (!employeeSnap.exists) throw notFound("Employee not found.");

    const invalidKeys = Object.keys(proposedRoles || {}).filter((key) => !EMPLOYEE_ROLE_KEYS.includes(key));
    if (invalidKeys.length > 0) throw badRequest(`Unknown role key(s): ${invalidKeys.join(", ")}.`);

    const request = await approvalService.createApprovalRequest({
      requestType: ROLE_CHANGE_REQUEST_TYPE,
      requestedBy,
      targetId: employeeId,
      requiredLevel: APPROVAL_LEVEL.CEO,
      payload: {
        employeeId,
        proposedRoles: normalizeRoles({ ...employeeSnap.data().roles, ...proposedRoles })
      },
      description: `Role change for employee ${employeeId}`
    });

    await notificationService
      .create(employeeId, {
        title: "Role change requested",
        message: "HR has requested a role change for your account. It is awaiting CEO approval."
      })
      .catch(() => {});

    return request;
  },

  async applyRoleChange(payload) {
    const { employeeId, proposedRoles } = payload;
    const employeeRef = db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(employeeId);
    const snap = await employeeRef.get();
    if (!snap.exists) throw notFound("Employee not found.");

    await employeeRef.update({ roles: normalizeRoles(proposedRoles), updatedAt: FieldValue.serverTimestamp() });

    await notificationService
      .create(employeeId, {
        title: "Role change approved",
        message: "Your role change has been approved by the CEO and is now active."
      })
      .catch(() => {});

    return { employeeId, roles: normalizeRoles(proposedRoles) };
  }
};
