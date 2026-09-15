import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./components/Chat";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Profile from "./components/Profile";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<Landing />} />

        {/* Auth — signed-in users skip straight to the app */}
        <Route
          path="/login"
          element={user ? <Navigate to="/chat" replace /> : <Login />}
        />

        <Route
          path="/register"
          element={user ? <Navigate to="/chat" replace /> : <Register />}
        />

        <Route
          path="/chat"
          element={user ? <Chat /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={user ? <Profile /> : <Navigate to="/login" />}
        />
      </Routes>
      <ToastContainer position="top-right" autoClose={2000} />
    </>
  );
}

export default App;
