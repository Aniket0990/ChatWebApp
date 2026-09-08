const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Chat = require("../models/Chat");

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ ...req.body, password: hashed });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed: " + error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found with this email" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ user, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed: " + error.message });
  }
};

// GET ALL USERS (except logged user) with WhatsApp-style extras:
// lastMessage (preview + time + direction) and unreadCount (messages they
// sent that the logged-in user hasn't seen yet).
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
    }).select("-password");

    // Find 1:1 chats of the logged-in user, populated to read both members
    const chats = await Chat.find({
      users: req.user.id,
      isGroupChat: false,
    }).populate("users", "_id");

    const chatByOtherUserId = {};
    chats.forEach((c) => {
      const other = c.users.find(
        (u) => u._id.toString() !== req.user.id.toString(),
      );
      if (other) chatByOtherUserId[other._id.toString()] = c._id;
    });

    const usersWithMeta = await Promise.all(
      users.map(async (u) => {
        const chatId = chatByOtherUserId[u._id.toString()];
        const plain = u.toObject();

        if (!chatId) {
          return { ...plain, lastMessage: null, unreadCount: 0 };
        }

        // Latest non-deleted message in this chat
        const lastMsg = await Message.findOne({ chat: chatId, isDeleted: false })
          .sort({ createdAt: -1 })
          .select("content fileUrl sender status createdAt");

        // Unread = messages FROM the other user that are not seen
        const unreadCount = await Message.countDocuments({
          chat: chatId,
          isDeleted: false,
          sender: u._id,
          status: { $ne: "seen" },
        });

        return {
          ...plain,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                hasAttachment: Boolean(lastMsg.fileUrl),
                isMine: lastMsg.sender.toString() === req.user.id.toString(),
                createdAt: lastMsg.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );

    res.json(usersWithMeta);
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// GET SINGLE USER
exports.getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user" });
  }
};

// updateProfile (supports profilePic, name, about)
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.profilePic !== undefined) updates.profilePic = req.body.profilePic;
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.about !== undefined) updates.about = req.body.about;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true },
    ).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// changePassword
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};
