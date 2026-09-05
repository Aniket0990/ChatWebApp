import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: `${backendUrl}/api`,
});

export default instance;