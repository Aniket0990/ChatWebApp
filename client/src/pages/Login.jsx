import { useState, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { useLogin } from "../hooks/useAuthMutations";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { socket } from "../socket/socket";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Manual loading state is gone: the mutation tracks pending/error for us.
  const login = useLogin();
  const loading = login.isPending;
  const queryClient = useQueryClient();

  const isDark = localStorage.getItem("theme") === "dark";

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      toast.warning("Please fill in all fields");
      return;
    }
    try {
      const data = await login.mutateAsync({
        email: email.trim(),
        password,
      });
      // Login is the identity boundary — drop any cached data from a previous
      // session so the new user never sees another account's sidebar/chat data.
      queryClient.clear();
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      if (!socket.connected) {
        socket.connect();
      }
      toast.success("Welcome back!");
      navigate("/chat");
    } catch (err) {
      toast.error(
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message || "Invalid Credentials",
      );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-cover bg-center bg-no-repeat transition-all"
      style={{ backgroundImage: "url('/wallpapers/wallpaper-2.jpg')" }}
    >
      {/* Subtle Cinematic Vignette / Glass Backdrop Overlay */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Frosted Glass Card */}
      <div className="w-full max-w-md rounded-[32px] p-8 sm:p-10 relative z-10 backdrop-blur-2xl bg-black/40 border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-white">
        {/* Brand Header inside the glass card */}
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-2.5 select-none mb-3">
            <img
              src="/favicon.svg"
              alt="Connecto Logo"
              className="w-9 h-9 rounded-xl shadow-md"
            />
            <span className="text-2xl font-bold tracking-[0.22em] uppercase text-[#FF8624] drop-shadow-sm">
              Connecto
            </span>
          </div>
          <h2 className="text-xl font-medium tracking-wide text-white">
            Welcome Back
          </h2>
          <p className="text-xs mt-1 text-gray-300">
            Sign in with your email and password
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-200">
              Email address
            </label>
            <div className="relative flex items-center">
              <FiMail className="absolute left-4 text-gray-300 text-base" />
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm border transition-all focus:outline-none focus:border-[#FF8624] focus:ring-1 focus:ring-[#FF8624]/40 bg-white/[0.08] border-white/20 text-white placeholder-gray-400 focus:bg-white/[0.14]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-200">
              Password
            </label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-4 text-gray-300 text-base" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-2xl text-sm border transition-all focus:outline-none focus:border-[#FF8624] focus:ring-1 focus:ring-[#FF8624]/40 bg-white/[0.08] border-white/20 text-white placeholder-gray-400 focus:bg-white/[0.14]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-gray-300 hover:text-white transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <FiEyeOff className="text-base" />
                ) : (
                  <FiEye className="text-base" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8624] to-[#FF6A00] hover:from-[#ff943a] hover:to-[#ff5c00] text-white font-semibold text-sm shadow-[0_4px_25px_rgba(255,134,36,0.45)] transition-all duration-200 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-xs text-gray-300">
            Are You New Member?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#FF8624] hover:underline transition ml-1"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}