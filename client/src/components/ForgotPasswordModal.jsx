import { useState, useEffect, useRef } from "react";
import { useForgotPassword, useResetPassword } from "../hooks/useAuthMutations";
import { toast } from "react-toastify";
import {
  FiX,
  FiMail,
  FiLock,
  FiShield,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
} from "react-icons/fi";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(0);

  const inputRefs = useRef([]);

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  // Timer countdown
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    // Strict BVA Email Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    try {
      await forgotPassword.mutateAsync({ email: trimmedEmail });
      toast.success("Verification code sent to your email!");
      setTimer(60);
      setStep(2);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to send verification code."
      );
    }
  };

  const handleResendCode = async () => {
    if (timer > 0 || forgotPassword.isPending) return;
    setErrorMsg("");
    try {
      await forgotPassword.mutateAsync({ email: email.trim() });
      setTimer(60);
      toast.success("New verification code sent!");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to resend code.");
    }
  };

  const handleOtpChange = (index, value) => {
    const numericVal = value.replace(/\D/g, "");
    if (!numericVal) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // Support pasting multi-digit OTP
    if (numericVal.length > 1) {
      const pasted = numericVal.slice(0, 4).split("");
      const updated = ["", "", "", ""];
      pasted.forEach((char, i) => {
        updated[i] = char;
      });
      setOtpDigits(updated);
      const nextIndex = Math.min(pasted.length, 3);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = numericVal[0];
    setOtpDigits(updated);

    if (index < 3 && numericVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 4) {
      setErrorMsg("Please enter the complete 4-digit verification code.");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      await resetPassword.mutateAsync({
        email: email.trim(),
        otp: fullOtp,
        newPassword,
      });
      toast.success("Password reset successfully! You can now log in.");
      closeModal();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to reset password."
      );
    }
  };

  const closeModal = () => {
    setStep(1);
    setEmail("");
    setOtpDigits(["", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPass(false);
    setShowConfirmPass(false);
    setErrorMsg("");
    setTimer(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div
        className="relative w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-2xl border border-[#f3eee5] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right close button */}
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
        >
          <FiX className="text-xl" />
        </button>

        {/* STEP 1: Enter Email */}
        {step === 1 ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Reset Credentials
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-normal">
                Follow the steps to reset your password
              </p>
            </div>

            {/* Email Pill Tag */}
            <div className="flex justify-center my-4">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#fdfbf7] border border-[#f3eee5] shadow-xs text-xs font-semibold text-[#FF8624]">
                <FiMail className="text-sm" />
                <span>Email</span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSendCode} className="space-y-4">
              {/* Floating label Email Box */}
              <div className="relative rounded-2xl border-2 border-orange-400/80 bg-white p-3.5 focus-within:border-[#FF8624] focus-within:ring-2 focus-within:ring-orange-500/20 transition mt-2">
                <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[11px] font-semibold text-[#ea580c]">
                  Email address
                </span>
                <div className="flex items-center gap-2.5">
                  <FiMail className="text-orange-500 text-lg shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400 font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={forgotPassword.isPending}
                className="w-full py-3.5 rounded-2xl bg-[#FF8624] hover:bg-[#ea7313] text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {forgotPassword.isPending
                  ? "Sending Code..."
                  : "Send Verification Code"}
              </button>
            </form>

            {/* Back to Login Footer */}
            <button
              type="button"
              onClick={closeModal}
              className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition cursor-pointer"
            >
              <FiArrowLeft className="text-sm" />
              <span>Back to Login</span>
            </button>
          </div>
        ) : (
          /* STEP 2: OTP and Password Reset */
          <div>
            <div className="text-center mb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Reset Credentials
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-normal">
                Follow the steps to reset your password
              </p>
            </div>

            {/* Code sent to notice box */}
            <div className="bg-[#fdfbf7] border border-[#f3eee5] rounded-2xl p-3 text-center my-3">
              <p className="text-[11px] text-gray-400 font-medium">
                Code sent to
              </p>
              <p className="text-sm font-bold text-gray-800 tracking-wide mt-0.5 truncate px-2">
                {email}
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {/* 4 Segmented OTP Inputs */}
              <div className="flex items-center justify-center gap-3 my-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] shrink-0 rounded-2xl border border-gray-200 bg-white text-center text-xl font-bold font-mono text-gray-900 focus:border-[#FF8624] focus:ring-2 focus:ring-orange-500/20 outline-none transition shadow-xs"
                  />
                ))}
              </div>

              {/* New Password Input */}
              <div className="relative rounded-2xl border border-gray-200 bg-white p-3 flex items-center gap-2.5 focus-within:border-[#FF8624] focus-within:ring-2 focus-within:ring-orange-500/20 transition">
                <FiLock className="text-gray-400 text-lg shrink-0" />
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  placeholder="New Password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm outline-none text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                >
                  {showNewPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="relative rounded-2xl border border-gray-200 bg-white p-3 flex items-center gap-2.5 focus-within:border-[#FF8624] focus-within:ring-2 focus-within:ring-orange-500/20 transition">
                <FiShield className="text-gray-400 text-lg shrink-0" />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm outline-none text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                >
                  {showConfirmPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="w-full py-3.5 rounded-2xl bg-[#FF8624] hover:bg-[#ea7313] text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {resetPassword.isPending ? "Resetting..." : "Reset & Login"}
              </button>
            </form>

            {/* Bottom Row (Change Email & Resend Code) */}
            <div className="flex items-center justify-between text-xs mt-4 px-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtpDigits(["", "", "", ""]);
                  setErrorMsg("");
                }}
                className="text-gray-500 hover:text-gray-800 font-medium hover:underline cursor-pointer"
              >
                Change email
              </button>

              {timer > 0 ? (
                <span className="text-orange-400 font-medium">
                  Resend in {timer}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={forgotPassword.isPending}
                  onClick={handleResendCode}
                  className="text-[#FF8624] font-bold hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
