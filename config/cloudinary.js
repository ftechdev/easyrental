const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//debug
const isDebug = process.env.DEBUG === "true";

cloudinary.uploader.upload_stream_promise = (buffer, folderPath) => {
  return new Promise((resolve, reject) => {
    if (isDebug) {
      console.log("📤 Starting Cloudinary upload to folder:", folderPath);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderPath },
      (error, result) => {
        if (error) {
          if (isDebug) {
            console.error("❌ Cloudinary Upload Error:", error);
          }
          reject(error);
        } else {
          if (isDebug) {
            console.log("✅ Cloudinary Upload Success:", result.secure_url);
          }
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = cloudinary;
