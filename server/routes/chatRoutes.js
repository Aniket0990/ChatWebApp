const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createChat, createGroup,getChats } = require("../controllers/chatController");

router.post("/", auth, createChat);
router.get("/", auth, getChats);
router.post("/group", auth, createGroup);

module.exports = router;


