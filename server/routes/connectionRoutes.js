const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const {
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  getMyConnections,
  getReceivedRequests,
  getSentRequests,
  searchUsers,
} = require("../controllers/connectionController");

// Search all registered users (with connection status)
router.get("/search", auth, searchUsers);

// Get all accepted connections
router.get("/all", auth, getMyConnections);

// Get received pending requests
router.get("/received", auth, getReceivedRequests);

// Get sent pending requests
router.get("/sent", auth, getSentRequests);

// Send a connection request
router.post("/send/:receiverId", auth, sendRequest);

// Accept a connection request
router.put("/accept/:connectionId", auth, acceptRequest);

// Decline a connection request
router.put("/decline/:connectionId", auth, declineRequest);

// Cancel a sent request
router.delete("/cancel/:connectionId", auth, cancelRequest);

module.exports = router;
