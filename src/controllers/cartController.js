import { cartService } from "../services/cartService.js";
import { asyncHandler, badRequest } from "../utils/errors.js";
import { toPositiveInt } from "../utils/validators.js";

export const cartController = {
  list: asyncHandler(async (req, res) => {
    const items = await cartService.list(req.auth.uid);
    res.json({ success: true, data: items });
  }),

  listPending: asyncHandler(async (req, res) => {
    const items = await cartService.list(req.auth.uid, "pending");
    res.json({ success: true, data: items });
  }),

  addItem: asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    if (!productId) throw badRequest("productId is required.");

    const item = await cartService.addItem(req.auth.uid, {
      productId,
      quantity: toPositiveInt(quantity, 1) || 1
    });
    res.status(201).json({ success: true, data: item });
  }),

  updateQuantity: asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const result = await cartService.updateQuantity(
      req.auth.uid,
      req.params.itemId,
      Number(quantity)
    );
    res.json({ success: true, data: result });
  }),

  removeItem: asyncHandler(async (req, res) => {
    const result = await cartService.removeItem(req.auth.uid, req.params.itemId);
    res.json({ success: true, data: result });
  }),

  initiateCheckout: asyncHandler(async (req, res) => {
    const { orderId, paymentId } = req.body;
    const result = await cartService.markPending(req.auth.uid, req.params.itemId, {
      orderId,
      paymentId
    });
    res.json({ success: true, data: result });
  }),

  merge: asyncHandler(async (req, res) => {
    const { items } = req.body;
    const merged = await cartService.mergeLocalCart(req.auth.uid, Array.isArray(items) ? items : []);
    res.json({ success: true, data: merged });
  })
};