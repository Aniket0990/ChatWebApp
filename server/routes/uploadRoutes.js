const router = require("express").Router();
const upload = require("../utils/multer");
const cloudinary = require("../config/cloudinary");

router.post("/", upload.single("file"), async (req, res) => {
  const result = await cloudinary.uploader.upload(req.file.path);
  res.json({ url: result.secure_url });
});

module.exports = router;