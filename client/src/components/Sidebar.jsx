import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import Avatar from "./Avatar";
import Profile from "./Profile";
import ConnectionPanel from "./ConnectionPanel";
import {
  FiSearch,
  FiX,
  FiSettings,
  FiMessageCircle,
  FiUserPlus,
  FiTrash2,
} from "react-icons/fi";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useReceivedRequests } from "../hooks/useConnections";
import { getOrCreateChat, clearChatMessages } from "../hooks/useChat";
import { queryKeys } from "../lib/queryClient";
import { socket } from "../socket/socket";

export default function Sidebar({
  users = [],
  selectedUser = null,
  openChat = () => {},
  darkMode = false,
  setDarkMode = () => {},
  mobileShowChat = false,
  onConnectionAccepted = () => {},
  onCloseActiveChat = () => {},
}) {
  const { user } = useContext(AuthContext);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);

  // Sidebar Contextual Selection (Pin / Delete chat)
  const [selectedSidebarUser, setSelectedSidebarUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // Touch Long-Press tracking for mobile
  const touchTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  // Pinned user IDs (persisted in localStorage per logged-in user)
  const [pinnedUserIds, setPinnedUserIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`connecto_pinned_${user?.user?._id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Soft-deleted/hidden user IDs (persisted in localStorage per logged-in user)
  const [hiddenUserIds, setHiddenUserIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`connecto_hidden_${user?.user?._id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Derived pending request count for connection badge
  const { data: receivedRequests = [] } = useReceivedRequests();
  const pendingCount = receivedRequests.length;
  const queryClient = useQueryClient();

  // Refresh the badge/list after the connection panel closes.
  const fetchPendingCount = () => {
    if (!user?.token) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
  };

  // Close contextual header on Escape
  useEffect(() => {
    if (!selectedSidebarUser) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedSidebarUser(null);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSidebarUser]);

  // CROSS-DEVICE SYNC: receive pin/hide state from another session of the same account
  useEffect(() => {
    const handlePinSync = ({ pinnedIds }) => {
      if (!Array.isArray(pinnedIds)) return;
      setPinnedUserIds(pinnedIds);
      try {
        localStorage.setItem(
          `connecto_pinned_${user?.user?._id}`,
          JSON.stringify(pinnedIds),
        );
      } catch {}
    };

    const handleHideSync = ({ hiddenIds }) => {
      if (!Array.isArray(hiddenIds)) return;
      setHiddenUserIds(hiddenIds);
      try {
        localStorage.setItem(
          `connecto_hidden_${user?.user?._id}`,
          JSON.stringify(hiddenIds),
        );
      } catch {}
      // If the currently open chat was hidden by another device, close it here too
      if (selectedUser?._id && hiddenIds.includes(selectedUser._id)) {
        onCloseActiveChat?.();
      }
    };

    socket.on("sidebar_pin_sync", handlePinSync);
    socket.on("sidebar_hide_sync", handleHideSync);
    return () => {
      socket.off("sidebar_pin_sync", handlePinSync);
      socket.off("sidebar_hide_sync", handleHideSync);
    };
  // selectedUser & onCloseActiveChat must be deps so handleHideSync always
  // sees the latest open chat when the sync arrives from another device.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user?._id, selectedUser?._id, onCloseActiveChat]);

  // AUTO-UNHIDE: if a hidden user sends a new message, bring them back to the
  // sidebar (WhatsApp-style) and sync the unhide to other devices.
  useEffect(() => {
    const handleMsgReceived = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      if (!senderId) return;
      setHiddenUserIds((prev) => {
        if (!prev.includes(senderId)) return prev;
        const updated = prev.filter((id) => id !== senderId);
        try {
          localStorage.setItem(
            `connecto_hidden_${user?.user?._id}`,
            JSON.stringify(updated),
          );
        } catch {}
        // Broadcast the unhide so other sessions of the same account sync
        socket.emit("sidebar_hide_sync", { hiddenIds: updated });
        return updated;
      });
    };

    socket.on("message received", handleMsgReceived);
    return () => socket.off("message received", handleMsgReceived);
  }, [user?.user?._id]);

  // Sidebar list time format: today -> HH:MM, yesterday -> "Yesterday", else date
  const formatListTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // TOGGLE PIN USER
  const handleTogglePinUser = (targetId) => {
    const isPinned = pinnedUserIds.includes(targetId);
    const updated = isPinned
      ? pinnedUserIds.filter((id) => id !== targetId)
      : [targetId, ...pinnedUserIds];

    setPinnedUserIds(updated);
    try {
      localStorage.setItem(
        `connecto_pinned_${user?.user?._id}`,
        JSON.stringify(updated),
      );
    } catch (e) {
      console.error("Failed to save pinned users", e);
    }

    // Broadcast pin change to other devices of the same account
    socket.emit("sidebar_pin_sync", { pinnedIds: updated });

    setSelectedSidebarUser(null);
    toast.success(isPinned ? "Chat unpinned" : "Chat pinned to top");
  };

  // CONFIRM DELETE & CLEAR CHAT
  const handleConfirmDeleteChat = async () => {
    if (!selectedSidebarUser) return;
    try {
      setIsDeletingChat(true);

      // 1. Get or create the chat entity so we have the chatId to clear
      const chatData = await getOrCreateChat(selectedSidebarUser._id);
      if (chatData?._id) {
        await clearChatMessages(chatData._id);
        // Clear React Query cache for this chat's messages
        queryClient.setQueryData(queryKeys.messages(chatData._id), []);
      }

      // 2. Add to hidden/soft-removed users list
      const updatedHidden = Array.from(
        new Set([...hiddenUserIds, selectedSidebarUser._id]),
      );
      setHiddenUserIds(updatedHidden);
      try {
        localStorage.setItem(
          `connecto_hidden_${user?.user?._id}`,
          JSON.stringify(updatedHidden),
        );
      } catch (e) {
        console.error("Failed to save hidden users", e);
      }

      // Broadcast hide change to other devices of the same account
      socket.emit("sidebar_hide_sync", { hiddenIds: updatedHidden });

      // 3. Remove from pinned if it was pinned
      if (pinnedUserIds.includes(selectedSidebarUser._id)) {
        const updatedPinned = pinnedUserIds.filter(
          (id) => id !== selectedSidebarUser._id,
        );
        setPinnedUserIds(updatedPinned);
        try {
          localStorage.setItem(
            `connecto_pinned_${user?.user?._id}`,
            JSON.stringify(updatedPinned),
          );
        } catch (e) {
          console.error("Failed to save pinned users", e);
        }
        // Broadcast pin change too
        socket.emit("sidebar_pin_sync", { pinnedIds: updatedPinned });
      }

      // 4. Update sidebar preview in React Query users cache
      queryClient.setQueryData(queryKeys.users, (prev = []) =>
        prev.map((u) =>
          u._id === selectedSidebarUser._id
            ? { ...u, lastMessage: null, unreadCount: 0 }
            : u,
        ),
      );

      // 5. If this user's chat was open in the active view, close it
      if (selectedUser?._id === selectedSidebarUser._id) {
        onCloseActiveChat?.();
      }

      toast.success("Chat deleted");
    } catch (err) {
      console.error("Failed to delete chat", err);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeletingChat(false);
      setShowDeleteModal(false);
      setSelectedSidebarUser(null);
    }
  };

  // RIGHT CLICK ON USER ROW
  const handleUserContextMenu = (e, u) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSidebarUser(u);
  };

  // TOUCH START (Mobile Long Press)
  const handleTouchStart = (u) => {
    isLongPressRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setSelectedSidebarUser(u);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // CLICK ON USER ROW
  const handleUserClick = (u) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (selectedSidebarUser) {
      if (selectedSidebarUser._id === u._id) {
        setSelectedSidebarUser(null);
      } else {
        setSelectedSidebarUser(u);
      }
      return;
    }

    // If clicking a previously soft-removed user from search, unhide them
    if (hiddenUserIds.includes(u._id)) {
      const updated = hiddenUserIds.filter((id) => id !== u._id);
      setHiddenUserIds(updated);
      try {
        localStorage.setItem(
          `connecto_hidden_${user?.user?._id}`,
          JSON.stringify(updated),
        );
      } catch (e) {
        console.error("Failed to update hidden users", e);
      }
      // Broadcast unhide to other devices
      socket.emit("sidebar_hide_sync", { hiddenIds: updated });
    }

    setUserSearchQuery("");
    openChat(u);
  };

  if (!user) return null;

  const isSearching = Boolean(userSearchQuery.trim());
  const normalizedQuery = userSearchQuery.trim().toLowerCase();

  // Filter and sort user list
  const filteredUsers = users
    .filter((u) => {
      if (isSearching) {
        // When searching: search across all connected users (including soft-removed ones)
        return (
          u.name?.toLowerCase().includes(normalizedQuery) ||
          u.email?.toLowerCase().includes(normalizedQuery)
        );
      }
      // When not searching: show only users who are not soft-removed
      return !hiddenUserIds.includes(u._id);
    })
    .sort((a, b) => {
      // Pinned chats appear first
      const aPinned = pinnedUserIds.includes(a._id);
      const bPinned = pinnedUserIds.includes(b._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const timeA = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const timeB = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return timeB - timeA;
    });

  return (
    <div
      className={`w-full lg:w-[420px] xl:w-[450px] 2xl:w-[480px] shrink-0 border-r flex flex-col shadow-[4px_0_20px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)] relative overflow-hidden transition-all duration-200 max-lg:absolute max-lg:inset-0 max-lg:z-40 max-lg:transition-transform max-lg:duration-300 ${
        mobileShowChat ? "max-lg:-translate-x-full" : ""
      } ${
        darkMode
          ? "bg-[#111b21] border-[#222e35]"
          : "bg-[#FAF8F5] border-[#E8E2D6]"
      }`}
    >
      {/* REGULAR CHAT LIST SIDEBAR */}
      <div className="flex flex-col h-full w-full">
        {/* SIDEBAR TOP HEADER (Switches between Brand header & Contextual Action header) */}
        {selectedSidebarUser ? (
          /* CONTEXTUAL ACTION HEADER */
          <div
            className={`px-4 pt-3.5 pb-2.5 flex items-center justify-between shrink-0 animate-fadeIn transition-colors duration-200 border-b ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942]"
                : "bg-[#FAF8F5] border-[#E8E2D6]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Close Button */}
              <button
                onClick={() => setSelectedSidebarUser(null)}
                className={`p-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  darkMode
                    ? "text-gray-300 hover:bg-[#111b21] hover:text-white"
                    : "text-gray-600 hover:bg-[#F0EBE1] hover:text-gray-900"
                }`}
                title="Cancel selection"
              >
                <FiX className="text-lg" />
              </button>

              <span
                className={`text-sm font-semibold truncate ${
                  darkMode ? "text-[#e9edef]" : "text-gray-800"
                }`}
              >
                {selectedSidebarUser.name}
              </span>
            </div>

            {/* Actions: Pin & Delete */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Pin / Unpin Button */}
              <button
                onClick={() => handleTogglePinUser(selectedSidebarUser._id)}
                className={`p-2 rounded-full transition cursor-pointer ${
                  pinnedUserIds.includes(selectedSidebarUser._id)
                    ? darkMode
                      ? "text-[#FF8624] bg-orange-950/40 hover:bg-orange-900/40"
                      : "text-[#FF8624] bg-orange-50 hover:bg-orange-100"
                    : darkMode
                      ? "text-gray-400 hover:text-[#FF8624] hover:bg-[#111b21]"
                      : "text-gray-500 hover:text-[#FF8624] hover:bg-[#F0EBE1]"
                }`}
                title={
                  pinnedUserIds.includes(selectedSidebarUser._id)
                    ? "Unpin chat"
                    : "Pin chat to top"
                }
              >
                {pinnedUserIds.includes(selectedSidebarUser._id) ? (
                  <BsPinAngleFill className="text-base text-[#FF8624]" />
                ) : (
                  <BsPinAngle className="text-base" />
                )}
              </button>

              {/* Delete Chat Button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className={`p-2 rounded-full transition cursor-pointer ${
                  darkMode
                    ? "text-red-400 hover:bg-red-950/40 hover:text-red-300"
                    : "text-red-600 hover:bg-red-50 hover:text-red-700"
                }`}
                title="Delete chat"
              >
                <FiTrash2 className="text-base" />
              </button>
            </div>
          </div>
        ) : (
          /* REGULAR TOP HEADER */
          <div
            className={`px-5 pt-4 pb-2 flex items-center justify-between shrink-0 transition-colors duration-200 ${
              darkMode ? "bg-[#111b21]" : "bg-[#FAF8F5]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/favicon.svg"
                alt="Connecto"
                className="w-7 h-7 rounded-lg shadow-sm"
              />
              <h1
                className={`text-xl sm:text-2xl font-bold tracking-tight select-none ${
                  darkMode ? "text-[#FF8624]" : "text-[#FF8624]"
                }`}
              >
                Connecto
              </h1>
            </div>

            {/* + Add Connection button with pending badge */}
            <button
              onClick={() => setShowConnectionPanel(true)}
              title="Manage Connections"
              className={`relative p-2 rounded-full transition-all cursor-pointer group ${
                darkMode
                  ? "text-gray-400 hover:text-[#FF8624] hover:bg-[#202c33]"
                  : "text-gray-500 hover:text-[#FF8624] hover:bg-[#FFF2E2]"
              }`}
            >
              <FiUserPlus className="text-lg" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  {/* Outer animated ping halo/ring */}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF8624] opacity-80 animate-ping" />
                  {/* Solid inner badge */}
                  <span className="relative min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white text-[9px] font-bold shadow-xs">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                </span>
              )}
            </button>
          </div>
        )}

        {/* SEARCH BAR */}
        <div
          className={`px-4 py-2 shrink-0 border-b transition-colors duration-200 ${
            darkMode
              ? "bg-[#111b21] border-[#222e35]"
              : "bg-[#FAF8F5] border-[#E8E2D6]"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all shadow-xs ${
              darkMode
                ? "bg-[#202c33] border-transparent text-[#e9edef] focus-within:border-[#FF8624] focus-within:ring-2 focus-within:ring-[#FF8624]/20"
                : "bg-[#F1ECE2] border-transparent text-gray-800 focus-within:border-[#FF8624] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF8624]/20"
            }`}
          >
            <FiSearch className="text-gray-400 text-sm shrink-0" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search connected users"
              className={`w-full bg-transparent text-xs placeholder-gray-400 focus:outline-none ${
                darkMode ? "text-[#e9edef]" : "text-gray-800"
              }`}
            />
            {userSearchQuery && (
              <button
                onClick={() => setUserSearchQuery("")}
                className={`p-0.5 rounded-full cursor-pointer ${
                  darkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <FiX className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES LIST */}
        <div
          className={`flex-1 overflow-y-auto transition-colors duration-200 ${
            darkMode ? "bg-[#111b21]" : "bg-[#FAF8F5]"
          }`}
        >
          {filteredUsers.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  darkMode ? "bg-[#202c33]" : "bg-[#fff4e6]"
                }`}
              >
                {isSearching ? (
                  <FiSearch className="text-2xl text-[#FF8624]" />
                ) : (
                  <FiUserPlus className="text-2xl text-[#FF8624]" />
                )}
              </div>
              <p
                className={`text-sm font-semibold mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {isSearching ? "No users found" : "No active chats"}
              </p>
              <p className="text-xs text-gray-400 leading-snug mb-4">
                {isSearching
                  ? "Try searching with a different name or email"
                  : "Connect with people or search above to start chatting"}
              </p>
              {!isSearching && (
                <button
                  onClick={() => setShowConnectionPanel(true)}
                  className="text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white hover:opacity-90 shadow-sm"
                >
                  Add Connection
                </button>
              )}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUser?._id === u._id;
              const isActionSelected = selectedSidebarUser?._id === u._id;
              const isPinned = pinnedUserIds.includes(u._id);
              const isHiddenFromList = hiddenUserIds.includes(u._id);

              return (
                <div
                  key={u._id}
                  onClick={() => handleUserClick(u)}
                  onContextMenu={(e) => handleUserContextMenu(e, u)}
                  onTouchStart={() => handleTouchStart(u)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`px-4 py-3 flex items-center gap-3.5 cursor-pointer transition-all border-b border-l-[3.5px] select-none ${
                    darkMode ? "border-b-[#202c33]" : "border-b-[#E8E2D6]"
                  } ${
                    isActionSelected
                      ? darkMode
                        ? "bg-orange-950/30 border-l-[#FF8624]"
                        : "bg-orange-50/70 border-l-[#FF8624]"
                      : isSelected
                        ? darkMode
                          ? "bg-[#1f2c33] border-l-[#FF8624]"
                          : "bg-[#F0EBE1] border-l-[#FF8624]"
                        : darkMode
                          ? "hover:bg-[#1a252c] border-l-transparent"
                          : "hover:bg-[#F5EFE6] border-l-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={u.profilePic}
                      name={u.name}
                      className="w-12 h-12 rounded-full object-cover shadow-2xs text-xl"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                        darkMode ? "border-[#111b21]" : "border-white"
                      } ${
                        u.isOnline
                          ? "bg-emerald-500"
                          : darkMode
                            ? "bg-gray-600"
                            : "bg-gray-300"
                      }`}
                    ></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + pin indicator + time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate leading-tight ${
                            isSelected || isActionSelected
                              ? darkMode
                                ? "text-orange-400"
                                : "text-gray-900"
                              : darkMode
                                ? "text-[#e9edef]"
                                : "text-gray-800"
                          }`}
                        >
                          {u.name}
                        </p>
                        {isPinned && (
                          <BsPinAngleFill
                            className="text-[#FF8624] text-xs shrink-0"
                            title="Pinned conversation"
                          />
                        )}
                      </div>

                      {u.lastMessage?.createdAt && (
                        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap shrink-0 leading-tight">
                          {formatListTime(u.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Row 2: preview + Chat button (if soft-removed in search) + unread badge */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {u.lastMessage ? (
                        <p className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate leading-tight flex-1">
                          {u.lastMessage.isMine && (
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                              You:{" "}
                            </span>
                          )}
                          {u.lastMessage.hasAttachment
                            ? "📄 Attachment"
                            : u.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate leading-tight flex-1">
                          {u.isOnline ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Online
                            </span>
                          ) : u.lastSeen ? (
                            `Last seen ${new Date(u.lastSeen).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}`
                          ) : (
                            "Offline"
                          )}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* If user was soft-removed and shown in search, show Chat button */}
                        {isSearching && isHiddenFromList && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(u);
                            }}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF8624] hover:bg-[#e8771b] text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="Start chat"
                          >
                            <FiMessageCircle className="text-[11px]" />
                            <span>Chat</span>
                          </button>
                        )}

                        {u.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white text-[10px] font-bold shrink-0">
                            {u.unreadCount > 99 ? "99+" : u.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* SIDEBAR FOOTER (Profile Section with Settings Button) — desktop only */}
        <div
          className={`border-t px-3 py-2.5 shrink-0 shadow-xs transition-colors duration-200 hidden lg:block ${
            darkMode
              ? "border-[#222e35] bg-[#111b21]"
              : "border-[#E8E2D6] bg-[#FAF8F5]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => setShowProfileSidebar(true)}
              className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1 p-1.5 -ml-1 rounded-xl hover:bg-[#F1ECE2]/70 dark:hover:bg-[#202c33]/70 transition-all"
              title="View Profile / Settings"
            >
              <div className="relative shrink-0">
                <Avatar
                  src={user.user.profilePic}
                  name={user.user.name}
                  className="w-10 h-10 rounded-full object-cover shadow-2xs text-lg"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${
                    darkMode ? "border-[#111b21]" : "border-[#FAF8F5]"
                  }`}
                ></span>
              </div>

              <div className="min-w-0 flex-1">
                <h4
                  className={`font-semibold text-[15px] truncate leading-tight transition ${
                    darkMode
                      ? "text-[#e9edef] group-hover:text-[#FF8624]"
                      : "text-gray-900 group-hover:text-[#FF8624]"
                  }`}
                >
                  {user.user.name}
                </h4>
                <p className="text-xs text-gray-400 font-normal truncate leading-tight mt-0.5">
                  {user.user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileSidebar(true)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition cursor-pointer shrink-0 ${
                darkMode
                  ? "text-gray-400 hover:text-[#FF8624] hover:bg-[#202c33]"
                  : "text-gray-500 hover:text-[#FF8624] hover:bg-[#F1ECE2]"
              }`}
              title="Settings / Edit Profile"
            >
              <FiSettings className="text-lg" />
            </button>
          </div>
        </div>

        {/* MOBILE BOTTOM TAB BAR (Chats / Settings) */}
        <div
          className={`lg:hidden border-t flex items-stretch shrink-0 transition-colors duration-200 ${
            darkMode
              ? "border-[#222e35] bg-[#111b21]"
              : "border-[#E8E2D6] bg-[#FAF8F5]"
          }`}
        >
          <button
            onClick={() => setShowProfileSidebar(false)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors cursor-pointer ${
              !showProfileSidebar
                ? darkMode
                  ? "text-[#FF8624]"
                  : "text-[#FF8624]"
                : "text-gray-400"
            }`}
          >
            <FiMessageCircle className="text-xl" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setShowProfileSidebar(true)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors cursor-pointer ${
              showProfileSidebar
                ? darkMode
                  ? "text-[#FF8624]"
                  : "text-[#FF8624]"
                : "text-gray-400"
            }`}
          >
            <FiSettings className="text-xl" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* DELETE CHAT CONFIRMATION MODAL */}
      {showDeleteModal && selectedSidebarUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl border transition-all ${
              darkMode
                ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                : "bg-white border-[#E8E2D6] text-gray-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center text-lg shrink-0">
                <FiTrash2 />
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">
                  Delete Chat
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedSidebarUser.name}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Are you sure you want to delete this chat? All messages with{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {selectedSidebarUser.name}
              </span>{" "}
              will be cleared and the conversation will be removed from your
              sidebar list.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingChat}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSidebarUser(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  darkMode
                    ? "bg-[#111b21] hover:bg-[#2a3942] text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingChat}
                onClick={handleConfirmDeleteChat}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingChat ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTION PANEL (SLIDE DRAWER) */}
      <ConnectionPanel
        isOpen={showConnectionPanel}
        onClose={() => {
          setShowConnectionPanel(false);
          fetchPendingCount(); // refresh badge after panel closes
        }}
        darkMode={darkMode}
        onConnectionAccepted={() => {
          onConnectionAccepted();
          fetchPendingCount();
        }}
        onSelectUser={openChat}
      />

      {/* WHATSAPP-STYLE PROFILE PANEL (SLIDE DRAWER) */}
      <Profile
        isOpen={showProfileSidebar}
        onClose={() => setShowProfileSidebar(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    </div>
  );
}
