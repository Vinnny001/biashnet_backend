import { ROLES } from "../config/constants.js";
import { productService } from "../services/productService.js";
import { asyncHandler, forbidden, notFound } from "../utils/errors.js";

function ensureCanModify(product, actor) {
  if (!product) throw notFound("Product not found.");
  if (actor.role !== ROLES.ADMIN && product.sellerId !== actor.uid) throw forbidden();
}

export const productController = {
  list: asyncHandler(async (req, res) => {
    const products = await productService.list(req.query);
    res.json({ success: true, data: products });
  }),

  get: asyncHandler(async (req, res) => {
    const product = await productService.findById(req.params.id);
    if (!product) throw notFound("Product not found.");
    res.json({ success: true, data: product });
  }),

  create: asyncHandler(async (req, res) => {
    const product = await productService.create(req.body, req.user);
    res.status(201).json({ success: true, data: product });
  }),

  update: asyncHandler(async (req, res) => {
    const existing = await productService.findById(req.params.id);
    ensureCanModify(existing, req.auth);
    const product = await productService.update(req.params.id, req.body);
    res.json({ success: true, data: product });
  }),

  remove: asyncHandler(async (req, res) => {
    const existing = await productService.findById(req.params.id);
    ensureCanModify(existing, req.auth);
    const result = await productService.remove(req.params.id);
    res.json({ success: true, data: result });
  }),

  reviews: asyncHandler(async (req, res) => {
    const reviews = await productService.reviews(req.params.id);
    res.json({ success: true, data: reviews });
  })
};
