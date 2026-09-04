import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // add Tailwind styles
import App from "./App";   // ✅ IMPORT APP
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);