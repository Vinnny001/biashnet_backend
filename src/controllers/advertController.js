import { ROLES } from "../config/constants.js";
import { advertService } from "../services/advertService.js";
import { asyncHandler, forbidden, notFound } from "../utils/errors.js";

function ensureCanModify(advert, actor) {
  if (!advert) throw notFound("Advert not found.");
  if (actor.role !== ROLES.ADMIN && advert.ownerId !== actor.uid) throw forbidden();
}

export const advertController = {
  list: asyncHandler(async (req, res) => {
    const adverts = await advertService.list(req.query);
    res.json({ success: true, data: adverts });
  }),

  get: asyncHandler(async (req, res) => {
    const advert = await advertService.findById(req.params.id);
    if (!advert) throw notFound("Advert not found.");
    res.json({ success: true, data: advert });
  }),

  create: asyncHandler(async (req, res) => {
    const advert = await advertService.create(req.body, req.auth);
    res.status(201).json({ success: true, data: advert });
  }),

  update: asyncHandler(async (req, res) => {
    const existing = await advertService.findById(req.params.id);
    ensureCanModify(existing, req.auth);
    const advert = await advertService.update(req.params.id, req.body);
    res.json({ success: true, data: advert });
  }),

  remove: asyncHandler(async (req, res) => {
    const existing = await advertService.findById(req.params.id);
    ensureCanModify(existing, req.auth);
    const result = await advertService.remove(req.params.id);
    res.json({ success: true, data: result });
  })
};
