// routes/upload.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/authMiddleware");
const fs = require("fs");

// Local storage (dev). For production use S3 or Cloudinary.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // accept common image/audio/file types
    cb(null, true);
  },
});

router.post("/uploads", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });

    // In production, upload to S3/Cloudinary and return remote URL.
    const url = `${process.env.SERVER_URL || ""}/uploads/${req.file.filename}`;

    res.json({
      url,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error("UPLOAD ERR", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
