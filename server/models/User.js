const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: Number },            // readable auto-incremented ID (1, 2, 3...)
    name: String,
    email: { type: String, unique: true },
    password: String,
    profilePic: String,
    about: { type: String, default: "Hey there! I am using Chat App." },
    lastSeen: Date,
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-increment _id before saving a new user
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await mongoose.model("User").findOne().sort({ _id: -1 }).select("_id");
    this._id = last ? last._id + 1 : 1;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
