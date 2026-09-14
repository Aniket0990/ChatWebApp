import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { useRegister } from "../hooks/useAuthMutations";
import SEO from "../components/SEO";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Manual loading state is gone: the mutation tracks pending/error for us.
  const register = useRegister();
  const loading = register.isPending;

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
      await register.mutateAsync({
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
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-cover bg-center bg-no-repeat transition-all"
      style={{ backgroundImage: "url('/wallpapers/wallpaper-2.jpg')" }}
    >
      <SEO
        title="Register — Connecto | Fast & Secure Real-Time Web Chat App"
        description="Create your free Connecto account. Connect with friends, send connection requests, and start instant messaging in real time."
        canonical="/register"
      />

      {/* Subtle Cinematic Vignette / Glass Backdrop Overlay */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-none" />

      {/* Main Frosted Glass Card */}
      <div className="w-full max-w-md rounded-[32px] p-8 sm:p-10 relative z-10 backdrop-blur-2xl bg-black/40 border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-white">
        {/* Brand Header inside the glass card */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 select-none mb-3">
            <img
              src="/favicon.svg"
              alt="Connecto Logo"
              className="w-9 h-9 rounded-xl shadow-md"
            />
            <h1 className="text-2xl font-bold tracking-[0.22em] uppercase text-[#FF8624] drop-shadow-sm">
              Connecto
            </h1>
          </div>
          <h2 className="text-xl font-medium tracking-wide text-white">
            Create Account
          </h2>
          <p className="text-xs mt-1 text-gray-300">
            Sign up to connect and chat with friends
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-200">
              Full Name
            </label>
            <div className="relative flex items-center">
              <FiUser className="absolute left-4 text-gray-300 text-base" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm border transition-all focus:outline-none focus:border-[#FF8624] focus:ring-1 focus:ring-[#FF8624]/40 bg-white/[0.08] border-white/20 text-white placeholder-gray-400 focus:bg-white/[0.14]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-200">
              Email Address
            </label>
            <div className="relative flex items-center">
              <FiMail className="absolute left-4 text-gray-300 text-base" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm border transition-all focus:outline-none focus:border-[#FF8624] focus:ring-1 focus:ring-[#FF8624]/40 bg-white/[0.08] border-white/20 text-white placeholder-gray-400 focus:bg-white/[0.14]"
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
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full pl-11 pr-11 py-2.5 rounded-2xl text-sm border transition-all focus:outline-none focus:border-[#FF8624] focus:ring-1 focus:ring-[#FF8624]/40 bg-white/[0.08] border-white/20 text-white placeholder-gray-400 focus:bg-white/[0.14]"
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

          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-200">
              Retype Password
            </label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-4 text-gray-300 text-base" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-11 pr-11 py-2.5 rounded-2xl text-sm border transition-all focus:outline-none focus:ring-1 ${
                  passwordMismatch
                    ? "border-red-500/80 bg-red-500/[0.08] focus:ring-red-500/40 focus:border-red-500 text-white"
                    : "border-white/20 bg-white/[0.08] text-white placeholder-gray-400 focus:bg-white/[0.14] focus:border-[#FF8624] focus:ring-[#FF8624]/40"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 text-gray-300 hover:text-white transition cursor-pointer"
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
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                ⚠ Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8624] to-[#FF6A00] hover:from-[#ff943a] hover:to-[#ff5c00] text-white font-semibold text-sm shadow-[0_4px_25px_rgba(255,134,36,0.45)] transition-all duration-200 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-300">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#FF8624] hover:underline transition ml-1"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}