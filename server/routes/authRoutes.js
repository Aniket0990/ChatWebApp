const router = require("express").Router();
const {
  register,
  login,
  getAllUsers,
  getSingleUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  requestEmailChange,
  verifyEmailChange,
} = require("../controllers/authController");

const auth = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔥 NEW ROUTES
router.get("/users", auth, getAllUsers);
router.get("/users/:id", auth, getSingleUser);

router.put("/update-profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.post("/change-email-request", auth, requestEmailChange);
router.post("/change-email-verify", auth, verifyEmailChange);

module.exports = router;