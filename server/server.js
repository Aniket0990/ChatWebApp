const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));

const PORT=5000
const server = app.listen(process.env.PORT, () =>
  console.log("Server running" ,PORT)
);

const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

require("./socket/socket")(io);