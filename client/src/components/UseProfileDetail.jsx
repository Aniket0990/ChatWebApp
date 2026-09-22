import { useState, useEffect } from "react";
import Avatar from "./Avatar";
import {
  useConnections,
  useRemoveConnection,
  useSendConnectionRequest,
  useCancelConnectionRequest,
  useAcceptConnection,
  useDeclineConnection,
} from "../hooks/useConnections";
import {
  FiX,
  FiUser,
  FiMail,
  FiInfo,
  FiUserX,
  FiUserPlus,
  FiCheck,
} from "react-icons/fi";
import { toast } from "react-toastify";

export default function UseProfileDetail({
  isOpen,
  onClose,
  user,
  connectionType = "connected", // "connected" | "send" | "received"
  darkMode = false,
  onConnectionRemoved,
  onSendRequest: propSendRequest,
  onCancelRequest: propCancelRequest,
  onAcceptRequest: propAcceptRequest,
  onDeclineRequest: propDeclineRequest,
}) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  // Fallback mutations from hooks
  const { data: connections = [] } = useConnections(isOpen);
  const removeMutation = useRemoveConnection();
  const sendMutation = useSendConnectionRequest();
  const cancelMutation = useCancelConnectionRequest();
  const acceptMutation = useAcceptConnection();
  const declineMutation = useDeclineConnection();

  // Keep localStatus synced with user.connectionStatus
  useEffect(() => {
    if (user?.connectionStatus) {
      setLocalStatus(user.connectionStatus);
    } else {
      setLocalStatus(null);
    }
  }, [user]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPhotoPreview) {
          setShowPhotoPreview(false);
        } else if (showRemoveConfirm) {
          setShowRemoveConfirm(false);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showPhotoPreview, showRemoveConfirm, onClose]);

  if (!isOpen || !user) return null;

  // Resolve connection ID
  const matchedConnection = connections.find(
    (c) =>
      (c._id && user._id && String(c._id) === String(user._id)) ||
      (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase()),
  );
  const connectionId =
    user.connectionId || matchedConnection?.connectionId || matchedConnection?._id;

  const dm = darkMode;
  const modalBg = dm ? "bg-[#202c33]" : "bg-[#FAF8F5]";
  const borderColor = dm ? "border-[#2a3942]" : "border-[#E8E2D6]";
  const textPrimary = dm ? "text-[#e9edef]" : "text-gray-800";
  const textSub = "text-gray-400";
  const rowHover = dm ? "hover:bg-[#111b21]/50" : "hover:bg-[#F2ECE0]/50";

  // Check current status for Send Request tab
  const currentStatus = localStatus || user.connectionStatus;
  const isIncoming =
    connectionType === "received" ||
    (currentStatus?.status === "pending" && currentStatus?.isSender === false);
  const isPendingSent =
    currentStatus?.status === "pending" && currentStatus?.isSender !== false;
  const isAcceptedSent = currentStatus?.status === "accepted";

  // Action handlers
  const handleSendRequest = () => {
    if (propSendRequest) {
      propSendRequest(user._id);
      setLocalStatus({ status: "pending", isSender: true });
    } else {
      sendMutation.mutate(user._id, {
        onSuccess: () => {
          setLocalStatus({ status: "pending", isSender: true });
        },
      });
    }
  };

  const handleCancelRequest = () => {
    const target = currentStatus?.connectionId || user.connectionId || user._id;
    if (propCancelRequest) {
      propCancelRequest(target);
      setLocalStatus(null);
    } else {
      cancelMutation.mutate(target, {
        onSuccess: () => {
          setLocalStatus(null);
        },
      });
    }
  };

  const handleAccept = () => {
    const reqId =
      user.requestId ||
      currentStatus?.connectionId ||
      user.connectionId ||
      connectionId ||
      user._id;
    if (propAcceptRequest) {
      propAcceptRequest(reqId, user.name);
      onClose?.();
    } else {
      acceptMutation.mutate(
        { connectionId: reqId, senderName: user.name },
        {
          onSettled: () => {
            onClose?.();
            onConnectionRemoved?.();
          },
        },
      );
    }
  };

  const handleDecline = () => {
    const reqId =
      user.requestId ||
      currentStatus?.connectionId ||
      user.connectionId ||
      connectionId ||
      user._id;
    if (propDeclineRequest) {
      propDeclineRequest(reqId);
      onClose?.();
    } else {
      declineMutation.mutate(reqId, {
        onSettled: () => {
          onClose?.();
          onConnectionRemoved?.();
        },
      });
    }
  };

  const isSending = sendMutation.isPending;
  const isCancelling = cancelMutation.isPending;
  const isAccepting = acceptMutation.isPending;
  const isDeclining = declineMutation.isPending;

  return (
    <>
      {/* PROFILE DETAIL MODAL (CENTERED POPUP) */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-2xl shadow-2xl border p-5 sm:p-6 transition-all ${modalBg} ${borderColor} ${textPrimary}`}
        >
          {/* 1st ROW: Profile Avatar & Name + Close 'X' Button on top-right */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-inherit">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Clickable profile photo (opens fullscreen preview) */}
              <div
                onClick={() => setShowPhotoPreview(true)}
                className="relative group cursor-pointer shrink-0"
                title="Click to view profile photo"
              >
                <Avatar
                  src={user.profilePic}
                  name={user.name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF8624]/40 group-hover:ring-[#FF8624] transition-all text-xl shadow-xs"
                />
                <div className="absolute inset-0 rounded-full bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  View
                </div>
              </div>

              {/* User Name in 1st row */}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold truncate leading-tight">
                  {user.name}
                </h2>
              </div>
            </div>

            {/* Close 'X' Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full transition cursor-pointer shrink-0 ${
                dm
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-800 hover:bg-black/5"
              }`}
              title="Close modal"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* 2nd ROW: Name */}
          <div
            className={`flex items-start gap-3 py-3.5 px-2 rounded-xl transition-colors ${rowHover} border-b border-inherit`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                dm ? "bg-[#111b21] text-orange-400" : "bg-[#FFF2E2] text-[#ea580c]"
              }`}
            >
              <FiUser className="text-base" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${textSub}`}>
                Name
              </span>
              <p className="text-sm font-medium break-words mt-0.5">
                {user.name}
              </p>
            </div>
          </div>

          {/* 3rd ROW: Email */}
          <div
            className={`flex items-start gap-3 py-3.5 px-2 rounded-xl transition-colors ${rowHover} border-b border-inherit`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                dm ? "bg-[#111b21] text-orange-400" : "bg-[#FFF2E2] text-[#ea580c]"
              }`}
            >
              <FiMail className="text-base" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${textSub}`}>
                Email
              </span>
              <p className="text-sm font-medium break-words mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          {/* 4th ROW: About */}
          <div
            className={`flex items-start gap-3 py-3.5 px-2 rounded-xl transition-colors ${rowHover} border-b border-inherit`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                dm ? "bg-[#111b21] text-orange-400" : "bg-[#FFF2E2] text-[#ea580c]"
              }`}
            >
              <FiInfo className="text-base" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${textSub}`}>
                About
              </span>
              <p className="text-sm font-normal text-gray-600 dark:text-gray-300 break-words mt-0.5 leading-relaxed">
                {user.about || "Hey there! I am using Chat App."}
              </p>
            </div>
          </div>

          {/* LAST ROW: DYNAMIC BUTTONS DEPENDING ON CONNECTION TYPE */}
          {isIncoming ? (
            /* RECEIVED REQUEST / INCOMING PENDING REQUEST: DECLINE & ACCEPT */
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                disabled={isDeclining || isAccepting}
                onClick={handleDecline}
                className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isDeclining ? (
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiX className="text-sm shrink-0" />
                    <span>Decline</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isDeclining || isAccepting}
                onClick={handleAccept}
                className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-br from-[#ff8624] to-[#FF943A] hover:bg-[#e8873a] text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isAccepting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheck className="text-sm shrink-0" />
                    <span>Accept</span>
                  </>
                )}
              </button>
            </div>
          ) : connectionType === "send" ? (
            /* SEND REQUEST TAB FOOTER: CLOSE + CONNECT / CANCEL REQUEST / REMOVE */
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer border ${
                  dm
                    ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                    : "border-[#E8E2D6] text-gray-700 hover:bg-black/5"
                }`}
              >
                Close
              </button>

              {isAcceptedSent ? (
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <FiUserX className="text-sm shrink-0" />
                  <span>
                    Remove<span className="hidden sm:inline"> Connection</span>
                  </span>
                </button>
              ) : isPendingSent ? (
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelRequest}
                  className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiX className="text-sm shrink-0" />
                      <span>Cancel <span className="hidden sm:inline"> Request</span></span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendRequest}
                  className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-br from-[#ff8624] to-[#FF943A] hover:bg-[#e8873a] text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiUserPlus className="text-sm shrink-0" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* DEFAULT / CONNECTED TAB FOOTER: CLOSE & REMOVE CONNECTION */
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer border ${
                  dm
                    ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                    : "border-[#E8E2D6] text-gray-700 hover:bg-black/5"
                }`}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <FiUserX className="text-sm shrink-0" />
                <span>
                  Remove<span className="hidden sm:inline"> Connection</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION REMOVE CONNECTION POPUP (MATCHING CONNECTION PANEL) */}
      {showRemoveConfirm && (
        <div
          onClick={() => !removeMutation.isPending && setShowRemoveConfirm(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transform transition-all ${
              dm
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-800"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon Badge */}
              <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mb-3.5">
                <FiUserX className="text-2xl" />
              </div>

              <h3 className="text-base font-bold">Remove Connection</h3>
              <p className={`text-xs mt-1.5 mb-4 leading-relaxed ${textSub}`}>
                Are you sure you want to remove{" "}
                <span className="font-semibold text-rose-500">{user.name}</span>{" "}
                from your connections? They will no longer appear in your active chats or direct messages.
              </p>

              {/* User Card Preview */}
              <div
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-5 border ${
                  dm ? "bg-[#111b21] border-[#2a3942]" : "bg-white border-[#E8E2D6]"
                }`}
              >
                <Avatar
                  src={user.profilePic}
                  name={user.name}
                  className="w-10 h-10 rounded-full object-cover text-base shrink-0"
                />
                <div className="text-left min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${textPrimary}`}>
                    {user.name}
                  </p>
                  <p className={`text-xs font-normal truncate ${textSub}`}>
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => setShowRemoveConfirm(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    dm
                      ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (!connectionId) {
                      toast.error("Connection not found");
                      return;
                    }
                    removeMutation.mutate(
                      {
                        connectionId,
                        userName: user.name,
                      },
                      {
                        onSettled: () => {
                          setShowRemoveConfirm(false);
                          onClose?.();
                          onConnectionRemoved?.();
                        },
                      },
                    );
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {removeMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiUserX className="text-sm" />
                      <span>Remove</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROFILE PHOTO PREVIEW (ACROSS THE MODAL) */}
      {showPhotoPreview && (
        <div
          onClick={() => setShowPhotoPreview(false)}
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn select-none"
        >
          {/* Top Bar: Top Left Username + Top Right Close Button */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-between z-10"
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={user.profilePic}
                name={user.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20 text-sm shrink-0"
              />
              <span className="text-white font-medium text-sm sm:text-base tracking-wide">
                {user.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoPreview(false)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
              title="Close photo preview"
            >
              <FiX className="text-2xl" />
            </button>
          </div>

          {/* Center: Full Profile Photo */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto"
          >
            {user.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className="max-h-[78vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-transform"
              />
            ) : (
              <div className="w-52 h-52 sm:w-72 sm:h-72 rounded-3xl shadow-2xl flex items-center justify-center bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white text-7xl sm:text-8xl font-bold">
                {(user.name || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Bottom spacer */}
          <div className="h-6 pointer-events-none" />
        </div>
      )}
    </>
  );
}
