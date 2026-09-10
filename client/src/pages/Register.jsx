import { useState } from "react";
import axios from "../utils/axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { IoChatbubbleEllipses } from "react-icons/io5";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && form.password !== confirmPassword;
  const navigate = useNavigate();

  const isDark = localStorage.getItem("theme") === "dark";

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.warning("Please fill in all fields");
      return;
    }
    if (form.password.length < 6) {
      toast.warning("Password must be at least 6 characters");
      return;
    }
    if (form.password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success("Account created successfully! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message || "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 relative ${
        isDark ? "bg-[#0c1317]" : "bg-[#f0f2f5]"
      }`}
    >
      {/* WhatsApp Green Top Header Strip */}
      <div className="absolute top-0 left-0 right-0 h-56 bg-emerald-600 z-0 shadow-sm" />

      {/* Main Register Card Wrapper */}
      <div className="w-full max-w-md z-10 my-8">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6 text-white select-none">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner">
            <IoChatbubbleEllipses className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Chat Box</span>
        </div>

        {/* Card */}
        <div
          className={`rounded-2xl shadow-xl p-8 sm:p-10 border transition-all ${
            isDark
              ? "bg-[#111b21] border-[#222e35] text-[#e9edef]"
              : "bg-white border-gray-100 text-gray-800"
          }`}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              Create Account
            </h2>
            <p className="text-xs text-gray-400">
              Sign up to connect and chat with friends
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Full Name
              </label>
              <div className="relative flex items-center">
                <FiUser className="absolute left-3.5 text-gray-400 text-base" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isDark
                      ? "bg-[#202c33] border-[#2a3942] text-[#e9edef] placeholder-gray-500 focus:border-emerald-500"
                      : "bg-[#f8fafc] border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-emerald-500"
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <FiMail className="absolute left-3.5 text-gray-400 text-base" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isDark
                      ? "bg-[#202c33] border-[#2a3942] text-[#e9edef] placeholder-gray-500 focus:border-emerald-500"
                      : "bg-[#f8fafc] border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-emerald-500"
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Password
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-gray-400 text-base" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isDark
                      ? "bg-[#202c33] border-[#2a3942] text-[#e9edef] placeholder-gray-500 focus:border-emerald-500"
                      : "bg-[#f8fafc] border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition cursor-pointer"
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
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Retype Password
              </label>
              <div className="relative flex items-center">
                <FiLock className="absolute left-3.5 text-gray-400 text-base" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Retype your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                    passwordMismatch
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : "focus:ring-emerald-500/20"
                  } ${
                    isDark
                      ? `bg-[#202c33] text-[#e9edef] placeholder-gray-500 ${
                          passwordMismatch ? "border-red-500" : "border-[#2a3942] focus:border-emerald-500"
                        }`
                      : `bg-[#f8fafc] text-gray-800 placeholder-gray-400 ${
                          passwordMismatch ? "border-red-500" : "border-gray-200 focus:bg-white focus:border-emerald-500"
                        }`
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="text-base" />
                  ) : (
                    <FiEye className="text-base" />
                  )}
                </button>
              </div>
              {passwordMismatch && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  ⚠ Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60 hover:shadow-md active:scale-[0.99]"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>

          <div
            className={`mt-6 pt-5 border-t text-center ${
              isDark ? "border-[#202c33]" : "border-gray-100"
            }`}
          >
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}