const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: Number, ref: "User" },
    content: String,
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    seenBy: [{ type: Number, ref: "User" }],
    fileUrl: String,
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Number, ref: "User" }],
    reactions: [
      {
        user: { type: Number, ref: "User" },
        emoji: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
