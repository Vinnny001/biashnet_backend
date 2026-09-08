import { employeeService } from "../services/employeeService.js";
import { asyncHandler } from "../utils/errors.js";
import { forwardToPaymentApi } from "../services/paymentApiClient.js";

/*
=========================================================
EMPLOYEE CONTROLLER
=========================================================
*/

export const employeeController = {
  me: asyncHandler(async (req, res) => {
    /*
     * Wallet balance is mpesa-api's data (financeWalletAccounts),
     * not backend's — proxy just that piece, best-effort.
     */
    let wallet = null;
    try {
      const { status, data } = await forwardToPaymentApi(req, "/finance-withdrawals/wallet", { method: "GET" });
      if (status === 200) wallet = data?.wallet || null;
    } catch {
      wallet = null;
    }

    res.json({ success: true, employee: req.employee, wallet });
  }),

  create: asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee({ ...req.body, addedBy: req.employee.id });
    res.status(201).json({ success: true, employee });
  }),

  list: asyncHandler(async (req, res) => {
    const employees = await employeeService.listEmployees();
    res.json({ success: true, employees });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployeeStatus(req.params.employeeId, req.body.employmentStatus);
    res.json({ success: true, employee });
  }),

  updatePosition: asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployeePosition(req.params.employeeId, req.body.positionId);
    res.json({ success: true, employee });
  }),

  changeRoles: asyncHandler(async (req, res) => {
    const request = await employeeService.requestRoleChange({
      employeeId: req.params.employeeId,
      proposedRoles: req.body.roles,
      requestedBy: req.employee.id
    });
    res.status(201).json({ success: true, message: "Role change request submitted for CEO approval.", request });
  })
};
