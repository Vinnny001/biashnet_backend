import { ROLES } from "../config/constants.js";
import { userService } from "../services/userService.js";
import { asyncHandler, forbidden } from "../utils/errors.js";

export const userController = {
  list: asyncHandler(async (req, res) => {
    const users = await userService.list(req.query);
    res.json({ success: true, data: users });
  }),

  get: asyncHandler(async (req, res) => {
    if (req.auth.role !== ROLES.ADMIN && req.auth.uid !== req.params.id) throw forbidden();
    const user = await userService.findById(req.params.id);
    res.json({ success: true, data: user });
  }),

  create: asyncHandler(async (req, res) => {
    const user = await userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  }),

  update: asyncHandler(async (req, res) => {
    const user = await userService.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.update(req.auth.uid, req.body);
    res.json({ success: true, data: user });
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await userService.remove(req.params.id);
    res.json({ success: true, data: result });
  })
};
