const Message = require("../models/Message");

// Helper to populate message fields consistently
const populateMessage = (query) => {
  return query
    .populate("sender", "name profilePic")
    .populate("chat")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name profilePic" },
    })
    .populate("reactions.user", "name profilePic");
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, chatId, fileUrl, replyTo } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      content,
      chat: chatId,
      fileUrl,
      replyTo: replyTo || null,
      status: "sent",
    });

    const fullMessage = await populateMessage(Message.findById(message._id));

    res.status(201).json(fullMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { limit, before } = req.query;
    const filter = {
      chat: req.params.chatId,
      deletedFor: { $ne: req.user.id },
    };

    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    let query = Message.find(filter);

    if (limit) {
      const parsedLimit = parseInt(limit, 10) || 50;
      query = query.sort({ createdAt: -1 }).limit(parsedLimit);
      const messages = await populateMessage(query);
      return res.json(messages.reverse());
    }

    const messages = await populateMessage(query.sort({ createdAt: 1 }));
    res.json(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
};

// Update status (delivered, seen)
exports.updateMessageStatus = async (req, res) => {
  try {
    const { messageId, status } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { status },
      { new: true },
    );

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: "Status update failed" });
  }
};

// Edit message content
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to edit this message" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: "Cannot edit a deleted message" });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const updated = await populateMessage(Message.findById(messageId));
    res.json(updated);
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// Delete message ("everyone" or "me")
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { mode } = req.body; // "everyone" or "me"

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (mode === "everyone") {
      if (message.sender.toString() !== req.user.id) {
        return res.status(403).json({ error: "Only the sender can delete for everyone" });
      }

      message.isDeleted = true;
      message.content = "This message was deleted";
      message.fileUrl = null;
      await message.save();

      const updated = await populateMessage(Message.findById(messageId));
      return res.json({ message: "Message deleted successfully", data: updated, mode });
    } else {
      // mode === "me"
      if (!message.deletedFor.includes(req.user.id)) {
        message.deletedFor.push(req.user.id);
      }

      // Smart Hard-Delete: in a 1-on-1 chat (2 users), if both users have deleted this message, permanently remove from DB
      if (message.deletedFor.length >= 2) {
        await Message.deleteOne({ _id: messageId });
        return res.json({
          message: "Message permanently deleted from DB",
          data: { _id: messageId, isDeleted: true },
          mode,
        });
      }

      await message.save();
      const updated = await populateMessage(Message.findById(messageId));
      return res.json({ message: "Message deleted successfully", data: updated, mode });
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// Toggle Pin
exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    const updated = await populateMessage(Message.findById(messageId));
    res.json(updated);
  } catch (error) {
    console.error("Error pinning message:", error);
    res.status(500).json({ error: "Failed to toggle pin" });
  }
};

// Clear entire chat for the current user only
// Smart Batch Delete:
// 1. Permanently delete messages that the other user already deleted/cleared
// 2. Add current user to deletedFor for remaining messages
exports.clearChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    // 1. Permanently remove messages where another user is already in deletedFor
    await Message.deleteMany({
      chat: chatId,
      "deletedFor.0": { $exists: true },
      deletedFor: { $ne: req.user.id },
    });

    // 2. For remaining messages, add this user to deletedFor
    await Message.updateMany(
      { chat: chatId, deletedFor: { $ne: req.user.id } },
      { $addToSet: { deletedFor: req.user.id } },
    );

    res.json({ message: "Chat cleared" });
  } catch (error) {
    console.error("Error clearing chat:", error);
    res.status(500).json({ error: "Failed to clear chat" });
  }
};

// React to message with emoji
exports.reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user.id,
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Toggle off if same emoji clicked again
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ user: req.user.id, emoji });
    }

    await message.save();

    const updated = await populateMessage(Message.findById(messageId));
    res.json(updated);
  } catch (error) {
    console.error("Error reacting to message:", error);
    res.status(500).json({ error: "Failed to react to message" });
  }
};
