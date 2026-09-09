import { useContext, useState, useRef } from "react";
import axios from "../utils/axios";
import { socket } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

  if (!user) return null;

  const handleImageClick = () => {
    if (profileInputRef.current) {
      profileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingPhoto(true);
      const { data } = await axios.post("/upload", formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const res = await axios.put(
        "/auth/update-profile",
        { profilePic: data.url },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      const updatedUser = {
        ...user,
        user: res.data,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      const { data } = await axios.put(
        "/auth/update-profile",
        { name: nameInput.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      const updatedUser = { ...user, user: { ...user.user, name: data.name } };
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
      const { data } = await axios.put(
        "/auth/update-profile",
        { about: aboutInput.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      const updatedUser = { ...user, user: { ...user.user, about: data.about } };
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
      await axios.put(
        "/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

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
          darkMode ? "bg-[#111b21] text-[#e9edef]" : "bg-white text-gray-800"
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
          className={`h-16 px-4 flex items-center gap-4 shrink-0 shadow-sm transition-colors ${
            darkMode
              ? "bg-[#202c33] border-b border-[#222e35] text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition cursor-pointer"
            title="Back to chats"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <h2 className="text-base font-semibold tracking-wide">Edit profile</h2>
        </div>

        {/* Profile Body */}
        <div
          className={`flex-1 overflow-y-auto p-6 flex flex-col items-center transition-colors ${
            darkMode ? "bg-[#111b21]" : "bg-white"
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
              className="w-36 h-36 rounded-full object-cover shadow-md ring-4 ring-emerald-500/20 text-5xl"
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
                darkMode ? "border-[#222e35]" : "border-gray-200"
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wider block mb-1 ${
                  darkMode ? "text-gray-400" : "text-emerald-700"
                }`}
              >
                ABOUT
              </span>
              <div className="flex items-center justify-between gap-2">
                {editingAbout ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={aboutInput}
                      onChange={(e) => setAboutInput(e.target.value)}
                      className={`flex-1 text-sm border-b-2 border-emerald-500 bg-transparent focus:outline-none py-1 ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveAbout}
                      className={`p-1.5 text-emerald-600 rounded-full cursor-pointer ${
                        darkMode
                          ? "hover:bg-[#202c33]"
                          : "hover:bg-emerald-50"
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
                          ? "text-gray-400 hover:text-emerald-400 hover:bg-[#202c33]"
                          : "text-gray-400 hover:text-emerald-600 hover:bg-gray-50"
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
                darkMode ? "border-[#222e35]" : "border-gray-200"
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wider block mb-1 ${
                  darkMode ? "text-gray-400" : "text-emerald-700"
                }`}
              >
                NAME
              </span>
              <div className="flex items-center justify-between gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className={`flex-1 text-sm border-b-2 border-emerald-500 bg-transparent focus:outline-none py-1 ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className={`p-1.5 text-emerald-600 rounded-full cursor-pointer ${
                        darkMode
                          ? "hover:bg-[#202c33]"
                          : "hover:bg-emerald-50"
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
                        darkMode ? "text-[#e9edef]" : "text-gray-800"
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
                          ? "text-gray-400 hover:text-emerald-400 hover:bg-[#202c33]"
                          : "text-gray-400 hover:text-emerald-600 hover:bg-gray-50"
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
                darkMode ? "border-[#222e35]" : "border-gray-200"
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wider block mb-1 ${
                  darkMode ? "text-gray-400" : "text-emerald-700"
                }`}
              >
                EMAIL
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer select-none group ${
                  darkMode
                    ? "border-[#2a3942] bg-[#111b21] hover:bg-[#202c33]"
                    : "border-gray-200 bg-gray-50/80 hover:bg-gray-100"
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
                      className={`text-sm font-medium leading-tight ${
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
                    darkMode ? "bg-emerald-500" : "bg-gray-300"
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
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                  darkMode
                    ? "border-[#2a3942] text-gray-200 hover:border-emerald-500 hover:text-emerald-400 hover:bg-[#202c33]"
                    : "border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/40 bg-white"
                }`}
              >
                <FiLock className="text-sm text-emerald-600" />
                <span>Change Password</span>
              </button>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                  darkMode
                    ? "border-red-900/50 text-red-400 hover:bg-red-950/20"
                    : "border-red-200 text-red-600 hover:bg-red-50 bg-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className={`rounded-2xl shadow-2xl border w-full max-w-sm p-6 space-y-4 transition-colors ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-white border-gray-200/80 text-gray-800 shadow-2xl"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`font-semibold text-base flex items-center gap-2 ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                <FiLock
                  className={
                    darkMode ? "text-emerald-400" : "text-emerald-600"
                  }
                />{" "}
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className={`p-1 rounded-full transition cursor-pointer ${
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
                className={`p-2.5 text-xs rounded-lg border ${
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
                className={`p-2.5 text-xs rounded-lg border ${
                  darkMode
                    ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/40"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200"
                }`}
              >
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label
                  className={`text-xs font-medium block mb-1 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-gray-200 bg-white text-gray-800"
                  }`}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label
                  className={`text-xs font-medium block mb-1 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-gray-200 bg-white text-gray-800"
                  }`}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label
                  className={`text-xs font-medium block mb-1 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Re-type New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                    darkMode
                      ? "border-[#2a3942] bg-[#111b21] text-white"
                      : "border-gray-200 bg-white text-gray-800"
                  }`}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                    darkMode
                      ? "text-gray-300 hover:bg-[#2a3942]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className={`rounded-2xl shadow-2xl border w-full max-w-sm p-6 space-y-4 transition-colors ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-white border-gray-200/80 text-gray-800 shadow-2xl"
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
                className={`px-4 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                  darkMode
                    ? "text-gray-300 hover:bg-[#2a3942]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-xs cursor-pointer"
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
