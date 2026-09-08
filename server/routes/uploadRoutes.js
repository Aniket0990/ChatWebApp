const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/authMiddleware");

// Documents (pdf, doc, zip, audio...) are stored LOCALLY because Cloudinary's
// free plan hard-blocks their delivery even with signed URLs (401).
// They are served back through GET /api/upload/file/:filename below.
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "docs");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const uploadDoc = multer({ storage: docStorage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post("/", uploadDoc.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const isImage = req.file.mimetype && req.file.mimetype.startsWith("image/");

    if (isImage) {
      // Images work fine on Cloudinary's image pipeline
      const result = await cloudinary.uploader.upload(filePath);
      fs.unlink(filePath, () => {});
      return res.json({ url: result.secure_url });
    }

    // Non-image: keep on local disk, return our own serving url
    res.json({
      url: `/api/upload/file/${encodeURIComponent(req.file.filename)}`,
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ error: "File upload failed" });
  }
});

// GET /api/upload/file/:filename
// Authenticated endpoint serving locally-stored documents (pdf, doc, zip...).
router.get("/file/:filename", auth, (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(__dirname, "..", "uploads", "docs", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Map extension -> mime type so the browser can preview the file
  const mimeTypes = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".zip": "application/zip",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  const ext = path.extname(safeName).toLowerCase();
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  res.sendFile(filePath);
});

module.exports = router;