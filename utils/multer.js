const multer = require("multer");
const sharp = require("sharp");

// Memory Storage (keep image in memory for compression)
const storage = multer.memoryStorage();

// Upload Middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit before compression
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Compression Middleware (using sharp)
const compressImage = async (req, res, next) => {
  const files = [];
  if (req.file) {
    files.push(req.file);
  }

  if (req.files && typeof req.files === "object") {
    Object.values(req.files)
      .flat()
      .forEach((f) => files.push(f));
  }

  if (!files.length) {
    return next();
  }

  try {
    await Promise.all(
      files.map(async (file) => {
        if (!file?.buffer) return;

        const compressedBuffer = await sharp(file.buffer)
          .resize(800) // Resize to 800px width (height auto)
          .jpeg({ quality: 70 }) // Compress JPEG with 70% quality
          .toBuffer();

        file.buffer = compressedBuffer;
        file.mimetype = "image/jpeg";
      })
    );

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, compressImage };
