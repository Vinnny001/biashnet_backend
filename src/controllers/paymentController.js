import { paymentService } from "../services/paymentService.js";
import { asyncHandler } from "../utils/errors.js";

export const paymentController = {
  checkout: asyncHandler(async (req, res) => {
    const payment = await paymentService.checkout(req.body, req.auth);
    res.status(201).json({ success: true, data: payment });
  }),

  status: asyncHandler(async (req, res) => {
    const payment = await paymentService.status(req.params.id);
    res.json({ success: true, data: payment });
  })
};
