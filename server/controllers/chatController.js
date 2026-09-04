const Chat = require("../models/Chat");

// Create private chat
exports.createChat = async (req, res) => {
  try {
    const { userId } = req.body;

    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user.id, userId] },
    }).populate("users", "-password");

    if (chat) {
      return res.json(chat);
    }

    chat = await Chat.create({
      users: [req.user.id, userId],
      isGroupChat: false,
    });

    const fullChat = await Chat.findById(chat._id).populate(
      "users",
      "-password"
    );

    res.json(fullChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all chats of logged in user
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $in: [req.user.id] },
    })
      .populate("users", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create group chat
exports.createGroup = async (req, res) => {
  try {
    const chat = await Chat.create({
      chatName: req.body.name,
      users: req.body.users,
      isGroupChat: true,
      groupAdmin: req.user.id,
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};