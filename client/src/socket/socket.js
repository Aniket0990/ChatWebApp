import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const socket = io(backendUrl, {
  transports: ["polling", "websocket"],
});
