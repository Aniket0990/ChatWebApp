const router = require("express").Router();
const {
  register,
  login,
  getAllUsers,
  getSingleUser,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const auth = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);

// 🔥 NEW ROUTES
router.get("/users", auth, getAllUsers);
router.get("/users/:id", auth, getSingleUser);

router.put("/update-profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);

module.exports = router;