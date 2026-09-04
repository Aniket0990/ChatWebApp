const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMessages,
  updateMessageStatus,
  editMessage,
  deleteMessage,
  togglePinMessage,
  reactMessage,
} = require("../controllers/messageController");

router.post("/", auth, sendMessage);
router.get("/:chatId", auth, getMessages);
router.put("/status", auth, updateMessageStatus);
router.put("/:messageId/pin", auth, togglePinMessage);
router.put("/:messageId/react", auth, reactMessage);
router.put("/:messageId", auth, editMessage);
router.delete("/:messageId", auth, deleteMessage);

module.exports = router;
