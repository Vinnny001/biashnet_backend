import { positionService } from "../services/positionService.js";
import { asyncHandler } from "../utils/errors.js";

/*
=========================================================
POSITION CONTROLLER
=========================================================
*/

export const positionController = {
  create: asyncHandler(async (req, res) => {
    const position = await positionService.createPosition({ ...req.body, createdBy: req.employee.id });
    res.status(201).json({ success: true, position });
  }),

  list: asyncHandler(async (req, res) => {
    const positions = await positionService.listPositions();
    res.json({ success: true, positions });
  }),

  get: asyncHandler(async (req, res) => {
    const position = await positionService.getPosition(req.params.positionId);
    res.json({ success: true, position });
  }),

  update: asyncHandler(async (req, res) => {
    const position = await positionService.updatePosition(req.params.positionId, req.body);
    res.json({ success: true, position });
  })
};
