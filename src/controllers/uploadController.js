import { uploadService } from "../services/uploadService.js";
import { asyncHandler } from "../utils/errors.js";

export const uploadController = {
  image: asyncHandler(async (req, res) => {
    const result = await uploadService.uploadImage(req.file, req.body.folder);
    res.status(201).json({ success: true, data: result });
  }),

  removeImage: asyncHandler(async (req, res) => {
    const result = await uploadService.removeImage(req.body.publicId);
    res.json({ success: true, data: result });
  })
};
