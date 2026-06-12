// Config: cloudinary.js
// Configures the Cloudinary SDK for file uploads (images + videos).
// multer-storage-cloudinary is used to stream uploads directly.

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

/**
 * CloudinaryConfiguration
 * Authenticates with Cloudinary using environment credentials.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ──────────────────────────────────────────────
// ImageUploadStorage
// Stores course thumbnails and user avatars as images.
// Applies auto-quality and progressive JPEG transformation.
// ──────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "lms/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

// ──────────────────────────────────────────────
// VideoUploadStorage
// Stores lesson videos. resource_type must be "video".
// Large file size limit; chunked upload handled by Cloudinary.
// ──────────────────────────────────────────────
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "lms/videos",
    resource_type:  "video",
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
  },
});

/**
 * uploadImage - Multer middleware for single image uploads.
 * Field name: "image"
 */
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("image");

/**
 * uploadVideo - Multer middleware for single video uploads.
 * Field name: "video"
 * Limit: 500 MB to support HD course content.
 */
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
}).single("video");

/**
 * deleteFromCloudinary
 * Deletes a resource from Cloudinary by its public_id.
 * @param {string} publicId   - Cloudinary public_id
 * @param {string} [resourceType="image"] - "image" | "video"
 * @returns {Promise<object>}
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo,
  deleteFromCloudinary,
};
