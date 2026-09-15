import { useContext, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { socket } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  updateProfile,
  uploadFile,
  useChangePassword,
  useUpdateProfile,
} from "../hooks/useAuthMutations";
import Avatar from "./Avatar";
import {
  FiArrowLeft,
  FiCamera,
  FiRefreshCw,
  FiEdit2,
  FiCheck,
  FiX,
  FiLock,
  FiLogOut,
} from "react-icons/fi";
import { IoMoon, IoSunny } from "react-icons/io5";

export default function Profile({
  isOpen = true,
  onClose,
  darkMode = false,
  setDarkMode = () => {},
}) {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutInput, setAboutInput] = useState("");

  // Change Password Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Logout Confirmation Modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const profileInputRef = useRef(null);

  // Photo upload is a two-step flow (upload file, then patch the profile),
  // so it lives in one mutation. Everything else reuses the shared hooks.
  const uploadProfileImage = useMutation({
    mutationFn: async (file) => {
      const url = await uploadFile(file);
      return updateProfile({ profilePic: url });
    },
  });
  const saveProfile = useUpdateProfile();
  const savePassword = useChangePassword();
  const uploadingPhoto = uploadProfileImage.isPending;

  if (!user) return null;

  const handleImageClick = () => {
    if (profileInputRef.current) {
      profileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await uploadProfileImage.mutateAsync(file);

      const updatedUser = {
        ...user,
        user: data,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Failed to upload photo");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      const data = await saveProfile.mutateAsync({ name: nameInput.trim() });

      const updatedUser = { ...user, user: { ...user.user, ...data } };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEditingName(false);
      toast.success("Name updated");
    } catch (err) {
      console.error("Failed to update name", err);
      toast.error("Failed to update name");
    }
  };

  const handleSaveAbout = async () => {
    if (!aboutInput.trim()) return;
    try {
      const data = await saveProfile.mutateAsync({ about: aboutInput.trim() });

      const updatedUser = { ...user, user: { ...user.user, ...data } };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEditingAbout(false);
      toast.success("About updated");
    } catch (err) {
      console.error("Failed to update about", err);
      toast.error("Failed to update about");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      await savePassword.mutateAsync({ currentPassword, newPassword });

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Failed to change password",
      );
    }
  };

  const handleConfirmLogout = () => {
    if (user?.user?._id) {
      socket.disconnect();
    }
    logout();
    navigate("/login");
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/chat");
    }
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-30 flex flex-col transition-transform duration-300 ease-in-out ${
          darkMode ? "bg-[#111b21] text-[#e9edef]" : "bg-[#FAF8F5] text-gray-800"
        } ${
          isOpen
            ? "translate-x-0 max-lg:animate-slide-in-up"
            : "-translate-x-full pointer-events-none"
        }`}
      >
        {/* Hidden File Input for Profile Photo */}
        <input
          type="file"
          ref={profileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Profile Header */}
        <div
          className={`h-16 px-4 flex items-center gap-3 shrink-0 shadow-xs border-b transition-colors ${
            darkMode
              ? "bg-[#202c33] border-[#222e35] text-[#e9edef]"
              : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-900"
          }`}
        >
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition cursor-pointer ${
              darkMode
                ? "text-gray-300 hover:text-[#FF8624] hover:bg-white/10"
                : "text-gray-600 hover:text-[#FF8624] hover:bg-[#FFF2E2]"
            }`}
            title="Back to chats"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <h2 className="text-lg font-bold tracking-tight">Edit profile</h2>
        </div>

        {/* Profile Body */}
        <div
          className={`flex-1 overflow-y-auto p-6 flex flex-col items-center transition-colors ${
            darkMode ? "bg-[#111b21]" : "bg-[#FAF8F5]"
          }`}
        >
          {/* Profile Photo with Change Photo overlay */}
          <div
            onClick={handleImageClick}
            className="relative group cursor-pointer my-3"
          >
            <Avatar
              src={user.user.profilePic}
              name={user.user.name}
              className="w-36 h-36 rounded-full object-cover shadow-md text-5xl"
            />
            <div
              className={`absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center text-white ${
                uploadingPhoto
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              } transition-opacity duration-200`}
            >
              {uploadingPhoto ? (
                <div className="flex flex-col items-center">
                  <FiRefreshCw className="text-2xl animate-spin mb-1" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Uploading...
                  </span>
                </div>
              ) : (
                <>
                  <FiCamera className="text-2xl mb-1" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Change Photo
                  </span>
                </>
              )}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mb-6 text-center">
            Click photo to change profile photo
          </p>

          {/* Profile Info Cards (WhatsApp Style) */}
          <div className="w-full space-y-6">
            {/* About Section */}
            <div
              className={`border-b pb-3 ${
                darkMode ? "border-[#222e35]" : "border-[#E8E2D6]"
              }`}
            >
              <span
                className={`text-[12px] font-bold tracking-wider block mb-1 ${
                  darkMode ? "text-orange-400" : "text-[#ea580c]"
                }`}
              >
                About
              </span>
              <div className="flex items-center justify-between gap-2">
                {editingAbout ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={aboutInput}
                      onChange={(e) => setAboutInput(e.target.value)}
                      className={`flex-1 text-sm border-b-2 border-[#FF8624] bg-transparent focus:outline-none py-1 ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveAbout}
                      className={`p-1.5 text-[#FF8624] rounded-full cursor-pointer ${
                        darkMode
                          ? "hover:bg-[#202c33]"
                          : "hover:bg-[#fff4e6]"
                      }`}
                      title="Save about"
                    >
                      <FiCheck className="text-base" />
                    </button>
                    <button
                      onClick={() => setEditingAbout(false)}
                      className={`p-1.5 text-gray-400 rounded-full cursor-pointer ${
                        darkMode ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
                      }`}
                      title="Cancel"
                    >
                      <FiX className="text-base" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p
                        className={`text-sm truncate font-normal ${
                          darkMode ? "text-[#e9edef]" : "text-gray-700"
                        }`}
                      >
                        {user.user.about || "What's happening?"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAboutInput(user.user.about || "What's happening?");
                        setEditingAbout(true);
                      }}
                      className={`p-1.5 rounded-full transition shrink-0 cursor-pointer ${
                        darkMode
                          ? "text-gray-400 hover:text-[#FF8624] hover:bg-[#202c33]"
                          : "text-gray-400 hover:text-[#FF8624] hover:bg-gray-50"
                      }`}
                      title="Edit about"
                    >
                      <FiEdit2 className="text-sm" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name Section */}
            <div
              className={`border-b pb-3 ${
                darkMode ? "border-[#222e35]" : "border-[#E8E2D6]"
              }`}
            >
              <span
                className={`text-[12px] font-bold tracking-wider block mb-1 ${
                  darkMode ? "text-orange-400" : "text-[#ea580c]"
                }`}
              >
                Name
              </span>
              <div className="flex items-center justify-between gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className={`flex-1 text-sm border-b-2 border-[#FF8624] bg-transparent focus:outline-none py-1 ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className={`p-1.5 text-[#FF8624] rounded-full cursor-pointer ${
                        darkMode
                          ? "hover:bg-[#202c33]"
                          : "hover:bg-[#fff4e6]"
                      }`}
                      title="Save name"
                    >
                      <FiCheck className="text-base" />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className={`p-1.5 text-gray-400 rounded-full cursor-pointer ${
                        darkMode ? "hover:bg-[#202c33]" : "hover:bg-gray-100"
                      }`}
                      title="Cancel"
                    >
                      <FiX className="text-base" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p
                      className={`text-sm font-semibold truncate flex-1 ${
                        darkMode ? "text-[#e9edef]" : "text-gray-900"
                      }`}
                    >
                      {user.user.name}
                    </p>
                    <button
                      onClick={() => {
                        setNameInput(user.user.name);
                        setEditingName(true);
                      }}
                      className={`p-1.5 rounded-full transition shrink-0 cursor-pointer ${
                        darkMode
                          ? "text-gray-400 hover:text-[#FF8624] hover:bg-[#202c33]"
                          : "text-gray-400 hover:text-[#FF8624] hover:bg-gray-50"
                      }`}
                      title="Edit name"
                    >
                      <FiEdit2 className="text-sm" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Email Section */}
            <div
              className={`border-b pb-3 ${
                darkMode ? "border-[#222e35]" : "border-[#E8E2D6]"
              }`}
            >
              <span
                className={`text-[12px] font-bold tracking-wider block mb-1 ${
                  darkMode ? "text-orange-400" : "text-[#ea580c]"
                }`}
              >
                Email
              </span>
              <p
                className={`text-sm font-medium ${
                  darkMode ? "text-[#e9edef]" : "text-gray-700"
                }`}
              >
                {user.user.email}
              </p>
            </div>

            {/* Action Buttons: Dark Theme Toggle, Change Password, Logout */}
            <div className="pt-2 space-y-3">
              {/* Dark Theme Toggle */}
              <div
                id="profile-theme-toggle"
                onClick={() => setDarkMode((prev) => !prev)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none group shadow-xs ${
                  darkMode
                    ? "border-[#2a3942] bg-[#202c33] hover:bg-[#28363f]"
                    : "border-[#E8E2D6] bg-[#F1ECE2] hover:bg-[#EBE4D6]"
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {darkMode ? (
                    <IoSunny className="text-amber-400 text-xl shrink-0 transition-transform group-hover:rotate-45" />
                  ) : (
                    <IoMoon className="text-gray-600 text-xl shrink-0 transition-transform group-hover:-rotate-12" />
                  )}
                  <div className="flex flex-col min-w-0 text-left">
                    <span
                      className={`text-sm font-semibold leading-tight ${
                        darkMode ? "text-[#e9edef]" : "text-gray-800"
                      }`}
                    >
                      {darkMode ? "Light Mode" : "Dark Mode"}
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                      {darkMode
                        ? "Click to switch to light mode"
                        : "Click to switch to dark mode"}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    darkMode ? "bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      darkMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Change Password Button */}
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                  setPasswordSuccess("");
                  setShowPasswordModal(true);
                }}
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  darkMode
                    ? "border-[#2a3942] text-gray-200 bg-[#111b21] hover:border-[#FF8624] hover:text-[#FF8624] hover:bg-[#202c33]"
                    : "border-[#E8E2D6] text-gray-700 bg-[#FAF8F5] hover:border-[#FF8624] hover:text-[#FF8624] hover:bg-[#FFF2E2]"
                }`}
              >
                <FiLock className="text-sm text-[#FF8624]" />
                <span>Change Password</span>
              </button>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  darkMode
                    ? "border-red-900/40 text-red-400 bg-[#111b21] hover:bg-red-950/20"
                    : "border-red-200 text-red-600 bg-[#FAF8F5] hover:bg-red-50"
                }`}
              >
                <FiLogOut className="text-sm" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD POPUP MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className={`rounded-2xl shadow-2xl border w-full max-w-sm p-6 space-y-4 transition-colors ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`font-semibold text-base flex items-center gap-2 ${
                  darkMode ? "text-gray-100" : "text-gray-900"
                }`}
              >
                <FiLock
                  className="text-[#FF8624]"
                />{" "}
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  darkMode
                    ? "hover:bg-[#2a3942] text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                }`}
              >
                <FiX className="text-base" />
              </button>
            </div>

            {passwordError && (
              <div
                className={`p-2.5 text-xs rounded-xl border ${
                  darkMode
                    ? "text-red-400 bg-red-950/40 border-red-900/40"
                    : "text-red-600 bg-red-50 border-red-200"
                }`}
              >
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div
                className={`p-2.5 text-xs rounded-xl border ${
                  darkMode
                    ? "text-[#FF8624] bg-[#FF8624]/10 border-[#FF8624]/20"
                    : "text-[#FF8624] bg-[#fff4e6] border-[#FF8624]/30"
                }`}
              >
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label
                  className={`text-xs font-semibold block mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF8624]/30 focus:border-[#FF8624] ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-[#E8E2D6] bg-white text-gray-900"
                  }`}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label
                  className={`text-xs font-semibold block mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF8624]/30 focus:border-[#FF8624] ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-[#E8E2D6] bg-white text-gray-900"
                  }`}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label
                  className={`text-xs font-semibold block mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Re-type New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF8624]/30 focus:border-[#FF8624] ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-[#E8E2D6] bg-white text-gray-900"
                  }`}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                    darkMode
                      ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white hover:bg-[#e8873a] rounded-xl transition shadow-xs cursor-pointer"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className={`rounded-2xl shadow-2xl border w-full max-w-sm p-6 space-y-4 transition-colors ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-800 shadow-2xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  darkMode
                    ? "bg-red-950/50 text-red-400"
                    : "bg-red-50 text-red-500"
                }`}
              >
                <FiLogOut />
              </div>
              <div>
                <h3
                  className={`font-semibold text-base ${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Log out?
                </h3>
                <p
                  className={`text-xs mt-0.5 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Are you sure you want to log out of your account?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                  darkMode
                    ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                    : "border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
