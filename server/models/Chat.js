const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chatName: String,
    isGroupChat: Boolean,
    users: [{ type: Number, ref: "User" }],
    groupAdmin: { type: Number, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);