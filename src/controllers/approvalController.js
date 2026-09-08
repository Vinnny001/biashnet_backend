import { approvalService } from "../services/approvalService.js";
import { employeeService } from "../services/employeeService.js";
import { forwardToPaymentApi } from "../services/paymentApiClient.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../utils/errors.js";
import { ROLE_CHANGE_REQUEST_TYPE } from "../config/financeCollections.js";

/*
=========================================================
APPROVAL CONTROLLER
=========================================================

The approvalRequests collection is shared by both services
(same Firestore project). backend owns ROLE_CHANGE natively;
every other request type (EXPENSE, PAYROLL_RUN, LOAN_ENTRY,
INVESTOR_PAYOUT) is mpesa-api's. The frontend still wants
ONE unified queue, so list() merges both, and approve/reject
look the request up (any type is readable here — same
collection) and either apply it natively or proxy the
approve/reject call to mpesa-api, whichever owns that type.
=========================================================
*/

const APPLY_HANDLERS = {
  [ROLE_CHANGE_REQUEST_TYPE]: employeeService.applyRoleChange
};

export const approvalController = {
  list: asyncHandler(async (req, res) => {
    const roleChangeApprovals = await approvalService.listPendingRoleChangeApprovals();

    let financialApprovals = [];
    try {
      const { status, data } = await forwardToPaymentApi(req, "/approvals", { method: "GET" });
      if (status === 200 && Array.isArray(data?.approvals)) financialApprovals = data.approvals;
    } catch {
      financialApprovals = [];
    }

    const requiredLevel = req.query?.requiredLevel;
    let approvals = [...roleChangeApprovals, ...financialApprovals];
    if (requiredLevel) approvals = approvals.filter((request) => request.requiredLevel === requiredLevel);

    res.json({ success: true, approvals });
  }),

  approve: asyncHandler(async (req, res) => {
    const request = await approvalService.getApprovalRequest(req.params.requestId);
    if (!request) throw notFound("Approval request not found.");

    if (request.requestType !== ROLE_CHANGE_REQUEST_TYPE) {
      const { status, data } = await forwardToPaymentApi(req, `/approvals/${req.params.requestId}/approve`, { method: "POST" });
      res.status(status).json(data);
      return;
    }

    const applyFn = APPLY_HANDLERS[request.requestType];
    if (!applyFn) throw badRequest(`No handler is registered for request type ${request.requestType}.`);

    const roles = req.employee.roles || {};
    const isCeo = roles.ceo === true || roles.admin === true;
    if (request.requiredLevel === "CEO" && !isCeo) {
      throw forbidden(`This request requires ${request.requiredLevel} approval.`);
    }

    const result = await approvalService.approveRequest(req.params.requestId, req.employee.id, applyFn);
    res.json({ success: true, ...result });
  }),

  reject: asyncHandler(async (req, res) => {
    const request = await approvalService.getApprovalRequest(req.params.requestId);
    if (!request) throw notFound("Approval request not found.");

    if (request.requestType !== ROLE_CHANGE_REQUEST_TYPE) {
      const { status, data } = await forwardToPaymentApi(req, `/approvals/${req.params.requestId}/reject`, {
        method: "POST",
        body: req.body
      });
      res.status(status).json(data);
      return;
    }

    const result = await approvalService.rejectRequest(req.params.requestId, req.employee.id, req.body?.reason);
    res.json({ success: true, ...result });
  })
};
