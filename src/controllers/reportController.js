import { reportService } from "../services/reportService.js";
import { asyncHandler } from "../utils/errors.js";

/*
=========================================================
REPORT CONTROLLER
=========================================================
*/

export const reportController = {
  create: asyncHandler(async (req, res) => {
    const report = await reportService.createReport({
      employeeId: req.employee.id,
      employeeRoles: req.employee.roles,
      ...req.body
    });
    res.status(201).json({ success: true, report });
  }),

  listMine: asyncHandler(async (req, res) => {
    const reports = await reportService.listMyReports(req.employee.id);
    res.json({ success: true, reports });
  }),

  listAll: asyncHandler(async (req, res) => {
    const reports = await reportService.listAllReports(req.query);
    res.json({ success: true, reports });
  }),

  review: asyncHandler(async (req, res) => {
    const report = await reportService.reviewReport(req.params.reportId, req.employee.id, req.body);
    res.json({ success: true, report });
  })
};
