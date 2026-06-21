import { bucket } from "../config/firebase.js";
import { badRequest } from "../utils/errors.js";
import { cloudinary, hasCloudinaryConfig } from "../utils/cloudinary.js";

function bufferToDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

export const uploadService = {
  async uploadImage(file, folder = "biashnet") {
    if (!file) throw badRequest("Image file is required.");

    if (hasCloudinaryConfig) {
      const result = await cloudinary.uploader.upload(bufferToDataUri(file), {
        folder,
        resource_type: "image"
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        provider: "cloudinary"
      };
    }

    if (bucket) {
      const filename = `${folder}/${Date.now()}-${file.originalname}`.replace(/\s+/g, "-");
      const upload = bucket.file(filename);
      await upload.save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=31536000"
        }
      });
      await upload.makePublic();
      return {
        url: `https://storage.googleapis.com/${bucket.name}/${filename}`,
        publicId: filename,
        provider: "firebase-storage"
      };
    }

    throw badRequest("No upload provider is configured.");
  },

  async removeImage(publicId) {
    if (!publicId) throw badRequest("publicId is required.");

    if (hasCloudinaryConfig) {
      await cloudinary.uploader.destroy(publicId);
      return { publicId };
    }

    if (bucket) {
      await bucket.file(publicId).delete({ ignoreNotFound: true });
      return { publicId };
    }

    throw badRequest("No upload provider is configured.");
  }
};
