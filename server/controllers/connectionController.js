const Connection = require("../models/Connection");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Helper to remove attachment files (local disk / Cloudinary)
const deleteAttachmentFile = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    if (fileUrl.includes("/api/upload/file/")) {
      const filename = decodeURIComponent(
        fileUrl.split("/api/upload/file/")[1] || "",
      );
      if (filename) {
        const safeName = path.basename(filename);
        const filePath = path.join(
          __dirname,
          "..",
          "uploads",
          "docs",
          safeName,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } else if (fileUrl.includes("res.cloudinary.com")) {
      const parts = fileUrl.split("/");
      const fileWithExt = parts[parts.length - 1];
      const publicId = fileWithExt.split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
  } catch (err) {
    console.error("Error deleting attachment file:", err);
  }
};

// POST /api/connection/send/:receiverId
// Send a connection request to another user
exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.params;

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot connect with yourself" });
    }

    // Check if connection already exists in either direction
    const existing = await Connection.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    let connection;
    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Already connected" });
      }
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Request already sent or pending" });
      }
      // If declined, allow re-send by updating to pending
      existing.status = "pending";
      existing.sender = senderId;
      existing.receiver = receiverId;
      await existing.save();
      connection = existing;
    } else {
      connection = await Connection.create({
        sender: senderId,
        receiver: receiverId,
      });
    }

    // Emit real-time notification to the receiver
    const io = req.app.get("io");
    if (io) {
      io.to(receiverId.toString()).emit("connection_request_received", {
        senderId,
        connectionId: connection._id,
      });
    }

    res.status(201).json(connection);
  } catch (error) {
    console.error("sendRequest error:", error);
    res.status(500).json({ message: "Failed to send request" });
  }
};

// PUT /api/connection/accept/:connectionId
// Accept an incoming connection request
exports.acceptRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (connection.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    connection.status = "accepted";
    await connection.save();

    // Emit real-time socket events to both sender and receiver
    const io = req.app.get("io");
    if (io) {
      io.to(connection.sender.toString()).emit("connection_accepted", {
        userId: connection.receiver.toString(),
        connectionId: connection._id,
      });
      io.to(connection.receiver.toString()).emit("connection_accepted", {
        userId: connection.sender.toString(),
        connectionId: connection._id,
      });
    }

    res.json(connection);
  } catch (error) {
    console.error("acceptRequest error:", error);
    res.status(500).json({ message: "Failed to accept request" });
  }
};

// PUT /api/connection/decline/:connectionId
// Decline an incoming connection request
exports.declineRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (connection.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    connection.status = "declined";
    await connection.save();

    // Emit real-time socket events to both sender and receiver
    const io = req.app.get("io");
    if (io) {
      io.to(connection.sender.toString()).emit("connection_declined", {
        userId: connection.receiver.toString(),
        connectionId: connection._id,
      });
      io.to(connection.receiver.toString()).emit("connection_declined", {
        userId: connection.sender.toString(),
        connectionId: connection._id,
      });
    }

    res.json(connection);
  } catch (error) {
    console.error("declineRequest error:", error);
    res.status(500).json({ message: "Failed to decline request" });
  }
};

// DELETE /api/connection/cancel/:connectionId
// Cancel a sent pending request
exports.cancelRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (connection.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const receiverId = connection.receiver.toString();
    const connectionId = connection._id;
    await connection.deleteOne();

    const io = req.app.get("io");
    if (io) {
      io.to(receiverId).emit("connection_request_cancelled", {
        senderId: req.user.id,
        connectionId,
      });
    }

    res.json({ message: "Request cancelled" });
  } catch (error) {
    console.error("cancelRequest error:", error);
    res.status(500).json({ message: "Failed to cancel request" });
  }
};

// DELETE /api/connection/remove/:connectionId
// Remove an accepted connection between two users and purge their chats & attachments
exports.removeConnection = async (req, res) => {
  try {
    const myId = req.user.id;
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (
      connection.sender.toString() !== myId &&
      connection.receiver.toString() !== myId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const otherUserId =
      connection.sender.toString() === myId
        ? connection.receiver.toString()
        : connection.sender.toString();

    // 1. Find 1:1 chat between these two users
    const chats = await Chat.find({
      users: { $all: [myId, otherUserId] },
      isGroupChat: false,
    });

    // 2. For each chat, delete attached files from disk/cloud, then remove messages and the chat
    for (const chat of chats) {
      const messages = await Message.find({ chat: chat._id }).select("fileUrl");
      for (const msg of messages) {
        if (msg.fileUrl) {
          await deleteAttachmentFile(msg.fileUrl);
        }
      }
      await Message.deleteMany({ chat: chat._id });
      await Chat.deleteOne({ _id: chat._id });
    }

    // 3. Delete the connection record from DB
    await connection.deleteOne();

    // 4. Emit real-time socket events to both parties
    const io = req.app.get("io");
    if (io) {
      io.to(otherUserId).emit("connection_removed", {
        userId: myId,
        connectionId,
      });
      io.to(myId).emit("connection_removed", {
        userId: otherUserId,
        connectionId,
      });
    }

    res.json({ message: "Connection, chats, and attachments removed successfully" });
  } catch (error) {
    console.error("removeConnection error:", error);
    res.status(500).json({ message: "Failed to remove connection" });
  }
};

// GET /api/connection/all
// Get all accepted connections for the logged-in user (with user data)
exports.getMyConnections = async (req, res) => {
  try {
    const myId = req.user.id;

    const connections = await Connection.find({
      $or: [{ sender: myId }, { receiver: myId }],
      status: "accepted",
    }).populate("sender receiver", "name email profilePic isOnline lastSeen");

    const users = connections.map((c) => {
      const other =
        c.sender._id.toString() === myId ? c.receiver : c.sender;
      return { ...other.toObject(), connectionId: c._id };
    });

    res.json(users);
  } catch (error) {
    console.error("getMyConnections error:", error);
    res.status(500).json({ message: "Failed to fetch connections" });
  }
};

// GET /api/connection/received
// Pending requests where I am the receiver
exports.getReceivedRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      receiver: req.user.id,
      status: "pending",
    }).populate("sender", "name email profilePic isOnline");

    res.json(requests);
  } catch (error) {
    console.error("getReceivedRequests error:", error);
    res.status(500).json({ message: "Failed to fetch received requests" });
  }
};

// GET /api/connection/sent
// Pending requests where I am the sender
exports.getSentRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      sender: req.user.id,
      status: "pending",
    }).populate("receiver", "name email profilePic isOnline");

    res.json(requests);
  } catch (error) {
    console.error("getSentRequests error:", error);
    res.status(500).json({ message: "Failed to fetch sent requests" });
  }
};

// GET /api/connection/search?q=...
// Search all registered users (excluding self, with connection status info)
exports.searchUsers = async (req, res) => {
  try {
    const myId = req.user.id;
    const q = req.query.q?.trim();

    if (!q) return res.json([]);

    // Find users matching name or email
    const users = await User.find({
      _id: { $ne: myId },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("name email profilePic isOnline")
      .limit(20);

    // Get all connection records involving this user
    const userIds = users.map((u) => u._id);
    const connections = await Connection.find({
      $or: [
        { sender: myId, receiver: { $in: userIds } },
        { sender: { $in: userIds }, receiver: myId },
      ],
    });

    // Map connection status per user
    const connectionMap = {};
    connections.forEach((c) => {
      const otherId =
        c.sender.toString() === myId
          ? c.receiver.toString()
          : c.sender.toString();
      connectionMap[otherId] = {
        connectionId: c._id,
        status: c.status,
        isSender: c.sender.toString() === myId,
      };
    });

    const result = users.map((u) => ({
      ...u.toObject(),
      connectionStatus: connectionMap[u._id.toString()] || null,
    }));

    res.json(result);
  } catch (error) {
    console.error("searchUsers error:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};
