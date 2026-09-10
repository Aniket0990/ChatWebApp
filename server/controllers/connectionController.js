const Connection = require("../models/Connection");
const User = require("../models/User");
const mongoose = require("mongoose");

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
      return res.json(existing);
    }

    const connection = await Connection.create({
      sender: senderId,
      receiver: receiverId,
    });

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

    await connection.deleteOne();
    res.json({ message: "Request cancelled" });
  } catch (error) {
    console.error("cancelRequest error:", error);
    res.status(500).json({ message: "Failed to cancel request" });
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
