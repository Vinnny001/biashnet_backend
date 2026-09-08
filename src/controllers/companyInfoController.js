import { companyInfoService } from "../services/companyInfoService.js";
import { asyncHandler } from "../utils/errors.js";

/*
=========================================================
COMPANY INFO CONTROLLER
=========================================================
*/

export const companyInfoController = {
  get: asyncHandler(async (req, res) => {
    const companyInfo = await companyInfoService.getCompanyInfo();
    res.json({ success: true, companyInfo });
  }),

  update: asyncHandler(async (req, res) => {
    const companyInfo = await companyInfoService.updateCompanyInfo(req.body);
    res.json({ success: true, companyInfo });
  })
};
