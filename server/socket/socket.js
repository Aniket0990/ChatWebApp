const User = require("../models/User");
const Message = require("../models/Message");
const Chat = require("../models/Chat");

module.exports = (io) => {
  io.on("connection", (socket) => {
    // USER SETUP
    socket.on("setup", async (userId) => {
      if (!userId) return;
      const uid = userId.toString();
      socket.userId = uid;
      socket.join(uid);

      await User.findByIdAndUpdate(uid, {
        isOnline: true,
        lastSeen: null,
      });

      // Mark all pending sent messages destined for this user as "delivered" in DB
      // and notify the senders in real time
      try {
        const userChats = await Chat.find({ users: uid }).select("_id");
        const chatIds = userChats.map((c) => c._id);
        const undeliveredMessages = await Message.find({
          chat: { $in: chatIds },
          sender: { $ne: uid },
          status: "sent",
        });

        if (undeliveredMessages.length > 0) {
          await Message.updateMany(
            { _id: { $in: undeliveredMessages.map((m) => m._id) } },
            { status: "delivered" }
          );

          undeliveredMessages.forEach((m) => {
            io.to(m.sender.toString()).emit("message delivered", m._id);
          });
        }
      } catch (err) {
        console.error("Error auto-delivering pending messages on setup:", err);
      }

      io.emit("user status changed", {
        userId: uid,
        isOnline: true,
      });
    });

    // JOIN CHAT
    socket.on("join chat", (room) => {
      socket.join(room);
    });

    // TYPING
    socket.on("typing", (room) => {
      socket.to(room).emit("typing");
    });

    socket.on("stop typing", (room) => {
      socket.to(room).emit("stop typing");
    });

    // NEW MESSAGE
    socket.on("new message", (msg) => {
      const chatId = msg.chat?._id || msg.chat;
      if (!chatId) return;

      // Broadcast to both the active chat room and participants' personal user rooms.
      // Chaining .to() deduplicates target sockets so users present in both rooms receive the message only ONCE.
      let broadcast = socket.to(chatId.toString());
      if (msg.chat && msg.chat.users && Array.isArray(msg.chat.users)) {
        msg.chat.users.forEach((u) => {
          const uid = u._id ? u._id.toString() : u.toString();
          if (uid !== socket.userId) {
            broadcast = broadcast.to(uid);
          }
        });
      }
      broadcast.emit("message received", msg);
    });

    // MESSAGE DELIVERED
    socket.on("message delivered", async ({ messageId, chatId }) => {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );

      let broadcast = socket;
      if (chatId) broadcast = broadcast.to(chatId.toString());
      if (message?.sender) broadcast = broadcast.to(message.sender.toString());
      broadcast.emit("message delivered", messageId);
    });

    // MESSAGE SEEN
    socket.on("message seen", async ({ messageId, chatId }) => {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "seen" },
        { new: true }
      );

      let broadcast = socket;
      if (chatId) broadcast = broadcast.to(chatId.toString());
      if (message?.sender) broadcast = broadcast.to(message.sender.toString());
      broadcast.emit("message seen", messageId);

      if (message?.sender) {
        socket
          .to(message.sender.toString())
          .emit("message seen status", { userId: socket.userId });
      }
    });

    // MESSAGE EDITED
    socket.on("message edited", (updatedMsg) => {
      const room = updatedMsg.chat?._id || updatedMsg.chat;
      if (room) socket.to(room).emit("message edited", updatedMsg);
    });

    // MESSAGE DELETED
    socket.on("message deleted", ({ messageId, chatId, isDeletedForEveryone, updatedMsg }) => {
      if (chatId) {
        socket.to(chatId).emit("message deleted", { messageId, isDeletedForEveryone, updatedMsg });
      }
    });

    // MESSAGE PINNED
    socket.on("message pinned", (updatedMsg) => {
      const room = updatedMsg.chat?._id || updatedMsg.chat;
      if (room) socket.to(room).emit("message pinned", updatedMsg);
    });

    // MESSAGE REACTED
    socket.on("message reacted", (updatedMsg) => {
      const room = updatedMsg.chat?._id || updatedMsg.chat;
      if (room) socket.to(room).emit("message reacted", updatedMsg);
    });

    // USER PROFILE UPDATED
    socket.on("user_profile_updated", (updatedUser) => {
      io.emit("user_profile_updated", updatedUser);
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
      if (socket.userId) {
        const uid = socket.userId;
        const userRoom = io.sockets.adapter.rooms.get(uid);
        if (!userRoom || userRoom.size === 0) {
          await User.findByIdAndUpdate(uid, {
            isOnline: false,
            lastSeen: new Date(),
          });

          io.emit("user status changed", {
            userId: uid,
            isOnline: false,
          });
        }
      }
    });
  });
};
