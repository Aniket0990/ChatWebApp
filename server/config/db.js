const mongoose = require("mongoose");
const dns = require("dns");

// Use public DNS servers to resolve MongoDB Atlas SRV records if local DNS fails
dns.setServers(["8.8.8.8", "8.8.4.4"]);
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.log("Retrying connection in background...");
  }
};

module.exports = connectDB;