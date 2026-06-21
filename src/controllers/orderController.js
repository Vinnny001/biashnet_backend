import { orderService } from "../services/orderService.js";
import { asyncHandler } from "../utils/errors.js";

export const orderController = {
  list: asyncHandler(async (req, res) => {
    const orders = await orderService.list(req.query, req.auth);
    res.json({ success: true, data: orders });
  }),

  get: asyncHandler(async (req, res) => {
    const order = await orderService.findById(req.params.id, req.auth);
    res.json({ success: true, data: order });
  }),

  create: asyncHandler(async (req, res) => {
    const order = await orderService.create(req.body, req.user);
    res.status(201).json({ success: true, data: order });
  }),

  update: asyncHandler(async (req, res) => {
    const order = await orderService.update(req.params.id, req.body, req.auth);
    res.json({ success: true, data: order });
  }),

  cancel: asyncHandler(async (req, res) => {
    const order = await orderService.cancel(req.params.id, req.auth);
    res.json({ success: true, data: order });
  })
};
