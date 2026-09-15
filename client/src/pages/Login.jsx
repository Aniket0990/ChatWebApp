import { useState, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { useLogin } from "../hooks/useAuthMutations";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { socket } from "../socket/socket";
import SEO from "../components/SEO";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import ConnectoLogo from "../components/ConnectoLogo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Manual loading state is gone: the mutation tracks pending/error for us.
  const login = useLogin();
  const loading = login.isPending;
  const queryClient = useQueryClient();

  const submit = async (e) => {
    if (e) e.preventDefault();
    setFormError("");

    if (!email.trim() || !password) {
      toast.warning("Please fill in all fields");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError("Please enter a valid email address.");
      return;
    }
    setFieldError("");

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
      setFormError(
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message ||
              "Email or password is incorrect. Please try again.",
      );
    }
  };

  return (
    <AuthLayout
      topRight={
        <p>
          New to Connecto?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Sign Up
          </Link>
        </p>
      }
    >
      <SEO
        title="Login — Connecto | Fast & Secure Real-Time Web Chat App"
        description="Sign in to Connecto to access your real-time chats, messages, and friend connections. Blazing fast instant messaging."
        canonical="/login"
      />

      <div className="w-full max-w-[440px] rounded-card border border-line bg-white p-7 shadow-soft sm:p-9">
        <div className="mb-7 text-center">
          <ConnectoLogo
            size={44}
            stacked
            wordClassName="text-[22px] tracking-[0.2em]"
          />
          <h1 className="mt-5 text-[26px] font-bold leading-tight text-ink">
            Welcome Back
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Sign in to continue your conversations.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <AuthField
            label="Email address"
            icon={FiMail}
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            error={fieldError}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError("");
              if (formError) setFormError("");
            }}
          />

          <AuthField
            label="Password"
            icon={FiLock}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (formError) setFormError("");
            }}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 cursor-pointer text-muted transition hover:text-ink"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <FiEyeOff className="text-[17px]" />
                ) : (
                  <FiEye className="text-[17px]" />
                )}
              </button>
            }
          />

          {formError && (
            <p
              role="alert"
              className="rounded-input border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[50px] w-full cursor-pointer rounded-input bg-brand text-[15px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-7 text-center text-[13.5px] text-muted">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
