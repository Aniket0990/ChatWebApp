import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useRegister } from "../hooks/useAuthMutations";
import SEO from "../components/SEO";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import ConnectoLogo from "../components/ConnectoLogo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  // Manual loading state is gone: the mutation tracks pending/error for us.
  const register = useRegister();
  const loading = register.isPending;
  const navigate = useNavigate();

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (formError) setFormError("");
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your full name.";
    if (!form.email.trim()) next.email = "Email address is required.";
    else if (!EMAIL_RE.test(form.email.trim()))
      next.email = "Please enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 6)
      next.password = "Password must be at least 6 characters.";
    if (!confirmPassword) next.confirm = "Please confirm your password.";
    else if (form.password !== confirmPassword)
      next.confirm = "Passwords do not match.";
    return next;
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    setFormError("");

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    try {
      await register.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success("Account created successfully! Please log in.");
      navigate("/login");
    } catch (err) {
      setFormError(
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message ||
              "We couldn't create your account. Please try again.",
      );
    }
  };

  return (
    <AuthLayout
      topRight={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Login
          </Link>
        </p>
      }
    >
      <SEO
        title="Register — Connecto | Fast & Secure Real-Time Web Chat App"
        description="Create your free Connecto account. Connect with friends, send connection requests, and start instant messaging in real time."
        canonical="/register"
      />

      <div className="w-full max-w-[440px] rounded-card border border-line bg-white p-7 shadow-soft sm:p-8">
        <div className="mb-6 text-center">
          <ConnectoLogo
            size={42}
            stacked
            wordClassName="text-[21px] tracking-[0.2em]"
          />
          <h1 className="mt-4 text-[26px] font-bold leading-tight text-ink">
            Create Account
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Join Connecto and start your first conversation.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5" noValidate>
          <AuthField
            label="Full Name"
            icon={FiUser}
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={form.name}
            error={errors.name}
            onChange={(e) => setField("name", e.target.value)}
          />

          <AuthField
            label="Email address"
            icon={FiMail}
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={form.email}
            error={errors.email}
            onChange={(e) => setField("email", e.target.value)}
          />

          <AuthField
            label="Password"
            icon={FiLock}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            error={errors.password}
            onChange={(e) => setField("password", e.target.value)}
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

          <AuthField
            label="Confirm Password"
            icon={FiLock}
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            error={errors.confirm}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((prev) => ({ ...prev, confirm: "" }));
              if (formError) setFormError("");
            }}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3.5 cursor-pointer text-muted transition hover:text-ink"
                title={showConfirmPassword ? "Hide password" : "Show password"}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
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
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13.5px] text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
