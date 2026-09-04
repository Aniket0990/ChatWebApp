const User = require("../models/User");
const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    // USER SETUP
    socket.on("setup", async (userId) => {
      socket.userId = userId;
      socket.join(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: null,
      });

      io.emit("user status changed", {
        userId,
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
      socket.to(msg.chat._id).emit("message received", msg);
    });

    // MESSAGE DELIVERED
    socket.on("message delivered", async ({ messageId, chatId }) => {
      await Message.findByIdAndUpdate(messageId, {
        status: "delivered",
      });

      socket.to(chatId).emit("message delivered", messageId);
    });

    // MESSAGE SEEN
    socket.on("message seen", async ({ messageId, chatId }) => {
      await Message.findByIdAndUpdate(messageId, {
        status: "seen",
      });

      socket.to(chatId).emit("message seen", messageId);
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

    // DISCONNECT
    socket.on("disconnect", async () => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user status changed", {
          userId: socket.userId,
          isOnline: false,
        });
      }
    });
  });
};
