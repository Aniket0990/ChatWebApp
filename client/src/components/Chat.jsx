import {
  useEffect,
  useLayoutEffect,
  useState,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import axios from "../utils/axios";
import { prepareFileForUpload } from "../utils/compressFile";
import { socket } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "../hooks/useUsers";
import { queryKeys } from "../lib/queryClient";
import {
  clearChatMessages,
  createMessage,
  deleteMessage,
  getMessages,
  getOrCreateChat,
  reactToMessage,
  togglePinMessage,
  updateMessage,
  uploadFile as uploadFileApi,
} from "../hooks/useChat";
import EmojiPicker from "emoji-picker-react";
import Avatar from "./Avatar";
import DocumentPreviewModal from "./DocumentPreviewModal";
import UseProfileDetail from "./UseProfileDetail";
import Sidebar from "./Sidebar";
import SEO from "./SEO";
import {
  FiPaperclip,
  FiSmile,
  FiX,
  FiMoreVertical,
  FiCornerUpLeft,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiArrowLeft,
  FiCheck,
  FiCheckSquare,
  FiEye,
  FiDownload,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import { MdSend } from "react-icons/md";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Chat() {
  const { user, setUser, logout } = useContext(AuthContext);

  const [selectedUser, setSelectedUser] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Emoji picker dimensions: shrink to fit small (mobile) viewports.
  const [emojiPickerSize, setEmojiPickerSize] = useState({
    width: 340,
    height: 400,
  });

  useEffect(() => {
    const updateEmojiPickerSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setEmojiPickerSize({
        width: Math.max(260, Math.min(340, vw - 32)),
        // Keep room for the input row (and the reply preview) above the picker
        height: Math.max(220, Math.min(400, Math.round(vh * 0.5), vh - 240)),
      });
    };
    updateEmojiPickerSize();
    window.addEventListener("resize", updateEmojiPickerSize);
    window.addEventListener("orientationchange", updateEmojiPickerSize);
    return () => {
      window.removeEventListener("resize", updateEmojiPickerSize);
      window.removeEventListener("orientationchange", updateEmojiPickerSize);
    };
  }, []);

  // Dark Mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // Chat header menu & Clear Chat confirmation modal
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showProfileDetail, setShowProfileDetail] = useState(false);

  // File drag & drop upload + document preview modal
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, mimeType }

  // Pending file attachments: staged before sending, max 10
  // Each entry: { id, file, previewUrl (image only) }
  const [pendingFiles, setPendingFiles] = useState([]);

  // Mobile/tablet layout: which panel is visible below lg screens.
  // false = chat list (with bottom tab bar), true = open chat view.
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Message actions & state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState("down");
  // Horizontal anchoring of the message action menu ("left" = grows to the
  // right from the trigger, "right" = grows to the left from the trigger).
  const [menuAlign, setMenuAlign] = useState("left");
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Multi-select mode (select messages to pin/delete in bulk)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] =
    useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --------------------- SERVER STATE (React Query) ---------------------
  // Sidebar users: a cached list that socket events patch in place.
  const { data: users = [] } = useUsers();
  const setUsers = useCallback(
    (updater) =>
      queryClient.setQueryData(queryKeys.users, (prev = []) =>
        typeof updater === "function" ? updater(prev) : updater,
      ),
    [queryClient],
  );

  // Messages: one cache entry per chat. Every existing `setMessages(updater)`
  // call (socket events + local actions) now writes into that cache entry.
  const messagesKey = queryKeys.messages(currentChat?._id);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: messagesKey,
    queryFn: () => getMessages(currentChat._id, { limit: 50 }),
    enabled: Boolean(currentChat?._id),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setHasMoreMessages(true);
    setIsLoadingMore(false);
  }, [currentChat?._id]);

  const setMessages = useCallback(
    (updater) =>
      queryClient.setQueryData(messagesKey, (prev = []) =>
        typeof updater === "function" ? updater(prev) : updater,
      ),
    [queryClient, messagesKey],
  );
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatFileRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // Helper to update sidebar lastMessage for a target user given an updated list of messages
  const updateLastMessageFromList = (targetUserId, messageList) => {
    if (!targetUserId) return;
    const nonDeleted = messageList.filter((m) => !m.isDeleted);
    const last = nonDeleted[nonDeleted.length - 1];
    setUsers((prev) =>
      prev.map((u) =>
        u._id === targetUserId
          ? {
              ...u,
              lastMessage: last
                ? {
                    content: last.content,
                    hasAttachment: Boolean(last.fileUrl),
                    isMine:
                      (last.sender?._id || last.sender) === user?.user?._id,
                    createdAt: last.createdAt,
                  }
                : null,
            }
          : u,
      ),
    );
  };

  // SOCKET SETUP & RECONNECTION
  useEffect(() => {
    if (!user?.user?._id) return;
    const userId = user.user._id.toString();

    const handleConnect = () => {
      socket.emit("setup", userId);
      if (currentChat?._id) {
        socket.emit("join chat", currentChat._id);
      }
    };

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.io?.on("reconnect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.io?.off("reconnect", handleConnect);
    };
  }, [user?.user?._id, currentChat?._id]);

  useEffect(() => {
    if (currentChat?._id && socket.connected) {
      socket.emit("join chat", currentChat._id);
    }
  }, [currentChat?._id]);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("message received", (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const chatId = msg.chat?._id || msg.chat;

      if (currentChat && chatId === currentChat._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        if (senderId !== user?.user?._id) {
          socket.emit("message delivered", {
            messageId: msg._id,
            chatId: chatId,
          });
          socket.emit("message seen", {
            messageId: msg._id,
            chatId: chatId,
          });
        }
      }

      // Update the sidebar preview/badge for this sender in real time
      if (senderId !== user?.user?._id) {
        const isActiveChat = currentChat && chatId === currentChat._id;
        setUsers((prev) =>
          prev.map((u) =>
            u._id === senderId
              ? {
                  ...u,
                  lastMessage: {
                    content: msg.content,
                    hasAttachment: Boolean(msg.fileUrl),
                    isMine: false,
                    createdAt: msg.createdAt,
                  },
                  // Only count unread when the chat isn't open on screen
                  unreadCount: isActiveChat ? 0 : (u.unreadCount || 0) + 1,
                }
              : u,
          ),
        );
      }
    });

    socket.on("message delivered", (messageId) => {
      const idStr = messageId?.toString();
      setMessages((prev) =>
        prev.map((m        ) =>
          (m._id?.toString() === idStr || m._id === messageId) && m.status !== "seen"

            ? { ...m, status: "delivered" }
            : m,
        ),
      );
    });

    socket.on("message seen", (messageId) => {
      const idStr = messageId?.toString();
      setMessages((prev) =>
        prev.map((m) =>
          m._id?.toString() === idStr || m._id === messageId
            ? { ...m, status: "seen" }
            : m,
        ),
      );
    });

    // My sent message was seen by the receiver -> clear their unread badge
    socket.on("message seen status", ({ userId }) => {
      if (userId) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, unreadCount: 0 } : u)),
        );
      }
    });

    socket.on("message edited", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
      );
      const senderId = updatedMsg.sender?._id || updatedMsg.sender;
      const isMine = senderId === user?.user?._id;
      setUsers((prev) =>
        prev.map((u) => {
          const isTarget = isMine
            ? u._id === selectedUser?._id
            : u._id === senderId;
          if (isTarget && u.lastMessage) {
            return {
              ...u,
              lastMessage: {
                ...u.lastMessage,
                content: updatedMsg.content,
                hasAttachment: Boolean(updatedMsg.fileUrl),
              },
            };
          }
          return u;
        }),
      );
    });

    socket.on(
      "message deleted",
      ({ messageId, isDeletedForEveryone, updatedMsg }) => {
        setMessages((prev) => {
          const next =
            isDeletedForEveryone && updatedMsg
              ? prev.map((m) => (m._id === messageId ? updatedMsg : m))
              : prev.filter((m) => m._id !== messageId);
          if (selectedUser?._id) {
            updateLastMessageFromList(selectedUser._id, next);
          }
          return next;
        });
      },
    );

    socket.on("message pinned", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
      );
    });

    socket.on("message reacted", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
      );
    });

    socket.on("typing", () => setTyping(true));
    socket.on("stop typing", () => setTyping(false));

    socket.on("user status changed", ({ userId, isOnline }) => {
      if (!userId) return;
      const targetId = userId.toString();
      setUsers((prev) =>
        prev.map((u) =>
          u._id?.toString() === targetId ? { ...u, isOnline } : u,
        ),
      );
      setSelectedUser((prev) =>
        prev && prev._id?.toString() === targetId
          ? { ...prev, isOnline }
          : prev,
      );
    });

    // Real-time connection events
    socket.on("connection_request_received", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
    });

    socket.on("connection_request_cancelled", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionSearchRoot });
    });

    socket.on("connection_accepted", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionSearchRoot });
    });

    socket.on("connection_declined", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionSearchRoot });
    });

    socket.on("connection_removed", ({ userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionSearchRoot });
      if (userId) {
        setSelectedUser((prev) => (prev && prev._id === userId ? null : prev));
        setCurrentChat((prev) => {
          if (
            prev &&
            prev.users?.some(
              (u) => (u._id?.toString() || u.toString()) === userId.toString(),
            )
          ) {
            return null;
          }
          return prev;
        });
      }
    });

    // Real-time profile updates (photo, bio/about, name)
    const handleProfileUpdated = (updatedUser) => {
      if (!updatedUser?._id) return;
      const targetId = updatedUser._id.toString();

      // 1. Update React Query users cache (Sidebar users list)
      setUsers((prev) =>
        prev.map((u) =>
          u._id?.toString() === targetId
            ? {
                ...u,
                name: updatedUser.name !== undefined ? updatedUser.name : u.name,
                profilePic:
                  updatedUser.profilePic !== undefined
                    ? updatedUser.profilePic
                    : u.profilePic,
                about:
                  updatedUser.about !== undefined ? updatedUser.about : u.about,
                email:
                  updatedUser.email !== undefined ? updatedUser.email : u.email,
              }
            : u,
        ),
      );

      // 2. Update selectedUser if active chat is with this user
      setSelectedUser((prev) =>
        prev && prev._id?.toString() === targetId
          ? {
              ...prev,
              name:
                updatedUser.name !== undefined ? updatedUser.name : prev.name,
              profilePic:
                updatedUser.profilePic !== undefined
                  ? updatedUser.profilePic
                  : prev.profilePic,
              about:
                updatedUser.about !== undefined ? updatedUser.about : prev.about,
              email:
                updatedUser.email !== undefined ? updatedUser.email : prev.email,
            }
          : prev,
      );

      // 3. Update currentChat participant info
      setCurrentChat((prev) => {
        if (!prev || !Array.isArray(prev.users)) return prev;
        return {
          ...prev,
          users: prev.users.map((u) => {
            const uid = u._id ? u._id.toString() : u.toString();
            if (uid === targetId) {
              return typeof u === "object"
                ? {
                    ...u,
                    name:
                      updatedUser.name !== undefined
                        ? updatedUser.name
                        : u.name,
                    profilePic:
                      updatedUser.profilePic !== undefined
                        ? updatedUser.profilePic
                        : u.profilePic,
                    about:
                      updatedUser.about !== undefined
                        ? updatedUser.about
                        : u.about,
                    email:
                      updatedUser.email !== undefined
                        ? updatedUser.email
                        : u.email,
                  }
                : u;
            }
            return u;
          }),
        };
      });

      // 4. Update messages in active chat (sender info, replyTo preview, reactions)
      setMessages((prev) =>
        prev.map((m) => {
          let changed = false;
          let newSender = m.sender;
          if (
            m.sender &&
            (m.sender._id?.toString() === targetId ||
              m.sender.toString() === targetId)
          ) {
            newSender =
              typeof m.sender === "object"
                ? {
                    ...m.sender,
                    name:
                      updatedUser.name !== undefined
                        ? updatedUser.name
                        : m.sender.name,
                    profilePic:
                      updatedUser.profilePic !== undefined
                        ? updatedUser.profilePic
                        : m.sender.profilePic,
                  }
                : m.sender;
            changed = true;
          }

          let newReplyTo = m.replyTo;
          if (
            m.replyTo?.sender &&
            (m.replyTo.sender._id?.toString() === targetId ||
              m.replyTo.sender.toString() === targetId)
          ) {
            newReplyTo = {
              ...m.replyTo,
              sender:
                typeof m.replyTo.sender === "object"
                  ? {
                      ...m.replyTo.sender,
                      name:
                        updatedUser.name !== undefined
                          ? updatedUser.name
                          : m.replyTo.sender.name,
                      profilePic:
                        updatedUser.profilePic !== undefined
                          ? updatedUser.profilePic
                          : m.replyTo.sender.profilePic,
                    }
                  : m.replyTo.sender,
            };
            changed = true;
          }

          let newReactions = m.reactions;
          if (
            Array.isArray(m.reactions) &&
            m.reactions.some(
              (r) =>
                r.user?._id?.toString() === targetId ||
                r.user?.toString() === targetId,
            )
          ) {
            newReactions = m.reactions.map((r) => {
              if (
                r.user?._id?.toString() === targetId ||
                r.user?.toString() === targetId
              ) {
                return {
                  ...r,
                  user:
                    typeof r.user === "object"
                      ? {
                          ...r.user,
                          name:
                            updatedUser.name !== undefined
                              ? updatedUser.name
                              : r.user.name,
                          profilePic:
                            updatedUser.profilePic !== undefined
                              ? updatedUser.profilePic
                              : r.user.profilePic,
                        }
                      : r.user,
                };
              }
              return r;
            });
            changed = true;
          }

          if (changed) {
            return {
              ...m,
              sender: newSender,
              replyTo: newReplyTo,
              reactions: newReactions,
            };
          }
          return m;
        }),
      );

      // 5. Update ConnectionPanel queries in place + invalidate
      queryClient.setQueryData(queryKeys.connections, (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((c) =>
          c._id?.toString() === targetId
            ? {
                ...c,
                name: updatedUser.name !== undefined ? updatedUser.name : c.name,
                profilePic:
                  updatedUser.profilePic !== undefined
                    ? updatedUser.profilePic
                    : c.profilePic,
                about:
                  updatedUser.about !== undefined ? updatedUser.about : c.about,
                email:
                  updatedUser.email !== undefined ? updatedUser.email : c.email,
              }
            : c,
        );
      });

      queryClient.setQueryData(queryKeys.receivedRequests, (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((req) => {
          if (
            req.sender &&
            (req.sender._id?.toString() === targetId ||
              req.sender.toString() === targetId)
          ) {
            return {
              ...req,
              sender:
                typeof req.sender === "object"
                  ? {
                      ...req.sender,
                      name:
                        updatedUser.name !== undefined
                          ? updatedUser.name
                          : req.sender.name,
                      profilePic:
                        updatedUser.profilePic !== undefined
                          ? updatedUser.profilePic
                          : req.sender.profilePic,
                    }
                  : req.sender,
            };
          }
          return req;
        });
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedRequests });
      queryClient.invalidateQueries({ queryKey: queryKeys.connectionSearchRoot });

      // 6. If updated user is current logged-in user, sync AuthContext and localStorage
      if (user?.user?._id?.toString() === targetId) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            user: {
              ...prev.user,
              name:
                updatedUser.name !== undefined
                  ? updatedUser.name
                  : prev.user.name,
              profilePic:
                updatedUser.profilePic !== undefined
                  ? updatedUser.profilePic
                  : prev.user.profilePic,
              about:
                updatedUser.about !== undefined
                  ? updatedUser.about
                  : prev.user.about,
              email:
                updatedUser.email !== undefined
                  ? updatedUser.email
                  : prev.user.email,
            },
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    };

    socket.on("user_profile_updated", handleProfileUpdated);

    return () => {
      socket.off("message received");
      socket.off("message delivered");
      socket.off("message seen");
      socket.off("message seen status");
      socket.off("message edited");
      socket.off("message deleted");
      socket.off("message pinned");
      socket.off("message reacted");
      socket.off("typing");
      socket.off("stop typing");
      socket.off("user status changed");
      socket.off("connection_request_received");
      socket.off("connection_request_cancelled");
      socket.off("connection_accepted");
      socket.off("connection_declined");
      socket.off("connection_removed");
      socket.off("user_profile_updated", handleProfileUpdated);
    };
  }, [currentChat, user, setUser, queryClient]);

  const lastMsgId = messages[messages.length - 1]?._id;

  // AUTO SCROLL TO BOTTOM (only on opening a chat or when a new message arrives at bottom)
  useLayoutEffect(() => {
    if (!highlightedId && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [currentChat?._id, lastMsgId, highlightedId]);

  // CLOSE MENUS ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".message-action-menu-container")) {
        setActiveMenuId(null);
      }
      if (!e.target.closest(".message-reaction-container")) {
        setActiveReactionId(null);
      }
      if (!e.target.closest(".chat-header-menu")) {
        setShowChatMenu(false);
      }
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !e.target.closest(".emoji-toggle-button")
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Leave multi-select when switching conversations
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedMsgIds([]);
    setShowDeleteSelectedConfirm(false);
  }, [currentChat?._id]);

  // Escape leaves multi-select
  useEffect(() => {
    if (!isSelectMode) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsSelectMode(false);
        setSelectedMsgIds([]);
        setShowDeleteSelectedConfirm(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSelectMode]);

  // Refresh the sidebar list (used after a new connection is accepted).
  const fetchUsers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
    [queryClient],
  );

  if (!user) return null;

  // OPEN CHAT
  const openChat = async (u) => {
    if (!u?._id) return;
    if (selectedUser?._id === u._id && currentChat) {
      setMobileShowChat(true);
      return;
    }

    // 1. Immediately set selected user & mobile view
    setSelectedUser(u);
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage("");
    setMobileShowChat(true);

    // 2. Instantly check if chat object is already cached for this user (0ms delay)
    const cachedChat = queryClient.getQueryData(queryKeys.chat(u._id));
    if (cachedChat) {
      setCurrentChat(cachedChat);
      if (socket.connected) {
        socket.emit("join chat", cachedChat._id);
      }
    }

    try {
      // 3. Resolve chat (instant if cached, fast network fallback if new)
      const data = cachedChat || (await getOrCreateChat(u._id));
      if (!cachedChat) {
        queryClient.setQueryData(queryKeys.chat(u._id), data);
        setCurrentChat(data);
      }
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("join chat", data._id);

      // 4. Mark existing unseen received messages as seen locally and over socket
      const existingMessages =
        queryClient.getQueryData(queryKeys.messages(data._id)) || [];
      let hasUnseen = false;
      existingMessages.forEach((msg) => {
        if (
          msg.status !== "seen" &&
          (msg.sender?._id || msg.sender) !== user?.user?._id
        ) {
          hasUnseen = true;
          socket.emit("message seen", {
            messageId: msg._id,
            chatId: data._id,
          });
        }
      });

      if (hasUnseen) {
        queryClient.setQueryData(queryKeys.messages(data._id), (prev = []) =>
          prev.map((m) =>
            (m.sender?._id || m.sender) !== user?.user?._id
              ? { ...m, status: "seen" }
              : m,
          ),
        );
      }

      // Clear sidebar unread badge immediately
      setUsers((prev) =>
        prev.map((x) => (x._id === u._id ? { ...x, unreadCount: 0 } : x)),
      );

      // 5. Silent background sync to get latest message statuses (seen/delivered)
      getMessages(data._id, { limit: 50 })
        .then((freshMessages) => {
          if (Array.isArray(freshMessages)) {
            freshMessages.forEach((msg) => {
              if (
                msg.status !== "seen" &&
                (msg.sender?._id || msg.sender) !== user?.user?._id
              ) {
                socket.emit("message seen", {
                  messageId: msg._id,
                  chatId: data._id,
                });
              }
            });

            queryClient.setQueryData(queryKeys.messages(data._id), freshMessages);

            const nonDeleted = freshMessages.filter((m) => !m.isDeleted);
            const last = nonDeleted[nonDeleted.length - 1];
            if (last) {
              setUsers((prev) =>
                prev.map((x) =>
                  x._id === u._id
                    ? {
                        ...x,
                        unreadCount: 0,
                        lastMessage: {
                          content: last.content,
                          hasAttachment: Boolean(last.fileUrl),
                          isMine:
                            (last.sender?._id || last.sender) ===
                            user?.user?._id,
                          createdAt: last.createdAt,
                        },
                      }
                    : x,
                ),
              );
            }
          }
        })
        .catch(() => {});
    } catch (err) {
      toast.error("Failed to load chat");
    }
  };

  // SEND OR EDIT MESSAGE
  const sendMessage = async (fileUrl = null) => {
    const hasText = message.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !fileUrl && !hasFiles) return;

    if (!currentChat) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("stop typing", currentChat._id);

    // If in editing mode
    if (editingMessage) {
      try {
        const data = await updateMessage(editingMessage._id, message);

        setMessages((prev) =>
          prev.map((m) => (m._id === data._id ? data : m)),
        );
        socket.emit("message edited", data);
        setEditingMessage(null);
        setMessage("");

        // Update sidebar preview in real time if editing message
        if (selectedUser?._id) {
          setUsers((prev) =>
            prev.map((u) => {
              if (u._id === selectedUser._id && u.lastMessage) {
                return {
                  ...u,
                  lastMessage: {
                    ...u.lastMessage,
                    content: data.content,
                    hasAttachment: Boolean(data.fileUrl),
                  },
                };
              }
              return u;
            }),
          );
        }
      } catch (err) {
        console.error("Failed to edit message", err);
      }
      return;
    }

    // Helper to send a single message and update UI
    const dispatchMessage = async (content, url, replyId) => {
      const data = await createMessage({
        content,
        chatId: currentChat._id,
        fileUrl: url || null,
        replyTo: replyId || null,
      });
      socket.emit("new message", data);
      setMessages((prev) => {
        if (prev.some((m) => m._id === data._id)) return prev;
        return [...prev, data];
      });
      // Update sidebar preview for this user in real time
      if (selectedUser?._id) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id
              ? {
                  ...u,
                  lastMessage: {
                    content: data.content,
                    hasAttachment: Boolean(data.fileUrl),
                    isMine: true,
                    createdAt: data.createdAt,
                  },
                }
              : u,
          ),
        );
      }
      return data;
    };

    // If called with a direct fileUrl (legacy, drag-drop) just send that
    if (fileUrl) {
      try {
        await dispatchMessage(message, fileUrl, replyingTo?._id);
        setMessage("");
        setReplyingTo(null);
      } catch {
        toast.error("Failed to send message");
      }
      return;
    }

    // Normal flow: text first (if any), then each pending file as its own message
    const filesToSend = [...pendingFiles];
    const replyId = replyingTo?._id || null;
    const textToSend = message.trim();

    // Immediately clear input and pending list so UI feels snappy
    setMessage("");
    setReplyingTo(null);
    setPendingFiles([]);
    // Revoke object URLs
    filesToSend.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });

    try {
      // 1. Text message first (if any)
      if (textToSend) {
        await dispatchMessage(textToSend, null, replyId);
      }

      // 2. File messages (one per file, with no text)
      if (filesToSend.length > 0) {
        if (filesToSend.length > 1) toast.info(`Uploading ${filesToSend.length} files...`);
        for (const entry of filesToSend) {
          try {
            const url = await uploadFileApi(entry.file);
            await dispatchMessage("", url, null);
          } catch {
            toast.error(`Failed to send: ${entry.file.name}`);
          }
        }
        if (filesToSend.length > 1) toast.success("Files sent!");
      }
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  // TYPING HANDLER
  let typingTimeout = useRef(null);
  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!currentChat) return;

    socket.emit("typing", currentChat._id);
    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit("stop typing", currentChat._id);
    }, 1500);
  };

  // FILE DRAG & DROP (adapted from KARYAH-v3 Chatbox)
  const handleGlobalDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only stop showing the overlay once the cursor truly left the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addPendingFiles(Array.from(droppedFiles));
    }
  };

  // Add files to the pending list (max 10 total). Anything over the 2 MB cap is
  // compressed first (images) or rejected up front, so the user gets feedback
  // immediately instead of a failed send later.
  const addPendingFiles = async (fileList) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const remaining = 10 - pendingFiles.length;
    if (remaining <= 0) {
      toast.warn("Maximum 10 files allowed at once");
      return;
    }

    const candidates = incoming.slice(0, remaining);
    if (incoming.length > remaining) {
      toast.warn(`Only ${remaining} more file${remaining > 1 ? "s" : ""} can be added (max 10)`);
    }

    const results = await Promise.all(
      candidates.map(async (file) => {
        try {
          const prepared = await prepareFileForUpload(file);
          return { file: prepared, original: file, ok: true };
        } catch {
          return { file, original: file, ok: false };
        }
      }),
    );

    const accepted = [];
    const rejected = [];
    let compressedCount = 0;

    results.forEach((result) => {
      if (!result.ok) {
        rejected.push(result.original.name);
        return;
      }
      if (result.file !== result.original) compressedCount += 1;
      accepted.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: result.file,
        previewUrl: result.file.type.startsWith("image/")
          ? URL.createObjectURL(result.file)
          : null,
      });
    });

    if (compressedCount > 0) {
      toast.info(
        `${compressedCount} file${compressedCount > 1 ? "s" : ""} compressed to fit the 2 MB limit`,
      );
    }

    if (rejected.length > 0) {
      toast.error(
        rejected.length === 1
          ? `"${rejected[0]}" is over 2 MB and can't be compressed`
          : `${rejected.length} files are over 2 MB and can't be compressed`,
      );
    }

    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted].slice(0, 10));
    }
  };

  // Remove one pending file and clean up its object URL
  const removePendingFile = (id) => {
    setPendingFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Shared upload helper used by both the picker button and drag & drop
  const uploadFile = async (file) => {
    if (!file || !currentChat) return;
    const url = await uploadFileApi(file);
    await sendMessage(url);
  };

  // START EDITING
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setMessage(msg.content || "");
    setReplyingTo(null);
    setActiveMenuId(null);
    messageInputRef.current?.focus();
  };

  // START REPLYING
  const handleStartReply = (msg) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setActiveMenuId(null);
    messageInputRef.current?.focus();
  };

  // DELETE MESSAGE
  const handleDeleteMessage = async (msg, mode) => {
    try {
      setActiveMenuId(null);
      const { data } = await deleteMessage(msg._id, mode);

      if (mode === "everyone") {
        setMessages((prev) => {
          const next = prev.map((m) => (m._id === msg._id ? data.data : m));
          if (selectedUser?._id) {
            updateLastMessageFromList(selectedUser._id, next);
          }
          return next;
        });
        socket.emit("message deleted", {
          messageId: msg._id,
          chatId: currentChat._id,
          isDeletedForEveryone: true,
          updatedMsg: data.data,
        });
      } else {
        setMessages((prev) => {
          const next = prev.filter((m) => m._id !== msg._id);
          if (selectedUser?._id) {
            updateLastMessageFromList(selectedUser._id, next);
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // --------------------- MULTI-SELECT MODE ---------------------
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMsgIds([]);
    setShowDeleteSelectedConfirm(false);
  };

  // ENTER MULTI-SELECT (from the header menu)
  const enterSelectMode = () => {
    setShowChatMenu(false);
    setActiveMenuId(null);
    setActiveReactionId(null);
    setShowEmojiPicker(false);
    setSelectedMsgIds([]);
    setIsSelectMode(true);
  };

  const toggleSelectMessage = (msg) => {
    setSelectedMsgIds((prev) =>
      prev.includes(msg._id)
        ? prev.filter((id) => id !== msg._id)
        : [...prev, msg._id],
    );
  };

  const selectedMessages = messages.filter((m) =>
    selectedMsgIds.includes(m._id),
  );

  // "Delete for everyone" is only offered when every selected message is our
  // own and none of them is already deleted. Any received / deleted message in
  // the selection restricts the action to "Delete for me".
  const canDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (m) => m.sender._id === user?.user?._id && !m.isDeleted,
    );

  // PIN EVERY SELECTED MESSAGE (no conditions - already pinned ones are skipped)
  const handlePinSelected = async () => {
    if (selectedMsgIds.length === 0 || isBulkActionLoading) return;
    // If a selected message is already pinned, unpin it (and toggle any pinned
    // selection off). Otherwise pin all unpinned selected messages.
    const allAlreadyPinned = selectedMessages.every((m) => m.isPinned);
    const toToggle = selectedMessages.filter((m) => m.isPinned === !!allAlreadyPinned);

    if (toToggle.length === 0) {
      exitSelectMode();
      return;
    }

    try {
      setIsBulkActionLoading(true);
      const updated = await Promise.all(
        toToggle.map((m) => togglePinMessage(m._id)),
      );
      const updatedById = new Map(updated.map((m) => [m._id, m]));

      setMessages((prev) => prev.map((m) => updatedById.get(m._id) || m));
      updated.forEach((m) => socket.emit("message pinned", m));
      toast.success(
        toToggle.length === 1
          ? "Message toggled"
          : `${toToggle.length} messages toggled`,
      );
    } catch (err) {
      console.error("Failed to toggle messages", err);
      toast.error("Failed to toggle messages");
    } finally {
      setIsBulkActionLoading(false);
      exitSelectMode();
    }
  };

  // DELETE EVERY SELECTED MESSAGE ("everyone" or "me")
  const handleDeleteSelected = async (mode) => {
    if (selectedMsgIds.length === 0 || isBulkActionLoading) return;
    const targets = selectedMessages;
    const blockingIds = new Set(targets.filter((m) => m.isDeleted).map((m) => m._id));
    // We normally block the whole action when the selection includes deleted messages
    // (because you can't bulk-delete them), but when every selected message is deleted
    // (i.e. the user selected only deleted messages) fall back to a no-op exit.
    if (!canDeleteForEveryone && blockingIds.size !== targets.length) {
      toast.info("Can't delete for everyone if any selected message is deleted");
      exitSelectMode();
      return;
    }

    try {
      setIsBulkActionLoading(true);
      const results = await Promise.all(
        targets
          .filter((m) => !blockingIds.has(m._id))
          .map((m) => deleteMessage(m._id, mode)),
      );

      setMessages((prev) => {
        let next;
        if (mode === "everyone") {
          const updatedById = new Map(
            results.map((res) => [res.data.data._id, res.data.data]),
          );
          next = prev.map((m) => updatedById.get(m._id) || m);
        } else {
          const removed = new Set(targets.map((m) => m._id));
          next = prev.filter((m) => !removed.has(m._id));
        }
        if (selectedUser?._id) {
          updateLastMessageFromList(selectedUser._id, next);
        }
        return next;
      });

      if (mode === "everyone") {
        results.forEach((res) => {
          socket.emit("message deleted", {
            messageId: res.data.data._id,
            chatId: currentChat._id,
            isDeletedForEveryone: true,
            updatedMsg: res.data.data,
          });
        });
      }

      toast.success(
        targets.length === 1
          ? "Message deleted"
          : `${targets.length} messages deleted`,
      );
    } catch (err) {
      console.error("Failed to delete messages", err);
      toast.error("Failed to delete messages");
    } finally {
      setIsBulkActionLoading(false);
      exitSelectMode();
    }
  };

  // TOGGLE PIN
  const handleTogglePin = async (msg) => {
    try {
      setActiveMenuId(null);
      const data = await togglePinMessage(msg._id);

      setMessages((prev) =>
        prev.map((m) => (m._id === data._id ? data : m)),
      );
      socket.emit("message pinned", data);
    } catch (err) {
      console.error("Failed to update pin status", err);
    }
  };

  // EMOJI REACTION
  const handleReaction = async (msg, emoji) => {
    try {
      setActiveReactionId(null);
      const data = await reactToMessage(msg._id, emoji);

      setMessages((prev) =>
        prev.map((m) => (m._id === data._id ? data : m)),
      );
      socket.emit("message reacted", data);
    } catch (err) {
      toast.error("Failed to add reaction");
    }
  };

  // SCROLL TO A SPECIFIC MESSAGE (e.g. from Pin or Reply click)
  const scrollToMessage = (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  // Width of the action menu (w-48) plus a small margin, used to decide which
  // way it should open so it never gets clipped by the message list edge.
  const MENU_WIDTH = 200;

  // Pick the horizontal anchor that keeps the menu on screen: open rightwards
  // from the trigger when there is room, otherwise open leftwards from it.
  const resolveMenuAlign = (rect) =>
    rect.left + MENU_WIDTH > window.innerWidth ? "right" : "left";

  // Resolve the action-menu trigger geometry for both click and right-click.
  const getMenuTriggerRect = (el) => {
    const trigger =
      el?.querySelector?.(".message-action-menu-container") || el;
    return trigger?.getBoundingClientRect();
  };

  // TOGGLE ACTION MENU WITH DYNAMIC UP/DOWN & LEFT/RIGHT PLACEMENT
  const handleToggleMenu = (e, msgId) => {
    e.stopPropagation();
    if (activeMenuId === msgId) {
      setActiveMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom > window.innerHeight - 250;
    setMenuPlacement(openUp ? "up" : "down");
    setMenuAlign(resolveMenuAlign(rect));
    setActiveMenuId(msgId);
  };

  // RIGHT-CLICK A MESSAGE -> OPEN ITS ACTION MENU
  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    // In multi-select mode a right-click simply toggles the selection
    if (isSelectMode) {
      toggleSelectMessage(msg);
      return;
    }
    setActiveReactionId(null);
    // Open away from the half of the screen the pointer is in
    setMenuPlacement(e.clientY > window.innerHeight / 2 ? "up" : "down");
    // Anchor to the message's own action button so the menu stays on screen
    setMenuAlign(
      resolveMenuAlign(getMenuTriggerRect(e.currentTarget) || e.currentTarget.getBoundingClientRect()),
    );
    setActiveMenuId(msg._id);
  };

  // DETECT SCROLL POSITION & INFINITE SCROLL (fetch older messages when scrolling to top)
  const handleScroll = async () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 20);

    // Infinite scroll trigger: when user scrolls near top and there are older messages
    if (
      scrollTop <= 50 &&
      hasMoreMessages &&
      !isLoadingMore &&
      messages.length >= 50 &&
      currentChat?._id
    ) {
      const oldestMsg = messages[0];
      if (oldestMsg?.createdAt) {
        setIsLoadingMore(true);
        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;

        try {
          const olderMessages = await getMessages(currentChat._id, {
            limit: 50,
            before: oldestMsg.createdAt,
          });

          if (olderMessages && olderMessages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m._id));
              const uniqueOlder = olderMessages.filter(
                (m) => !existingIds.has(m._id),
              );
              return [...uniqueOlder, ...prev];
            });

            if (olderMessages.length < 50) {
              setHasMoreMessages(false);
            }

            // Keep user viewport exactly where it was before prepending older messages
            requestAnimationFrame(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop =
                  messagesContainerRef.current.scrollHeight -
                  prevScrollHeight +
                  prevScrollTop;
              }
            });
          } else {
            setHasMoreMessages(false);
          }
        } catch (err) {
          console.error("Failed to load older messages", err);
        } finally {
          setIsLoadingMore(false);
        }
      }
    }
  };

  // PINNED MESSAGES LIST
  const pinnedMessages = messages.filter((m) => m.isPinned && !m.isDeleted);
  const currentPinned =
    pinnedMessages.length > 0
      ? pinnedMessages[pinnedIndex % pinnedMessages.length]
      : null;

  // CLEAR CHAT (for this user only)
  const handleClearChat = async () => {
    setShowClearChatConfirm(false);
    if (!currentChat) return;
    try {
      await clearChatMessages(currentChat._id);
      setMessages([]);
      if (selectedUser?._id) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id
              ? { ...u, lastMessage: null, unreadCount: 0 }
              : u,
          ),
        );
      }
      toast.success("Chat cleared");
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  // CLOSE CHAT (deselect current user)
  const handleCloseChat = () => {
    setShowChatMenu(false);
    setMobileShowChat(false);
    setIsSearching(false);
    setSearchQuery("");
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage("");

    // On mobile (<1024px), keep selectedUser active while the panel slides off screen
    // so the placeholder never flashes/splashes during the 300ms transition.
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        setSelectedUser(null);
        setCurrentChat(null);
      }, 300);
    } else {
      setSelectedUser(null);
      setCurrentChat(null);
    }
  };

  // MESSAGE CONTENT RENDERER (Supports search highlighting when search query is active)
  const renderMessageContent = (content) => {
    if (!content) return null;

    if (!isSearching || !searchQuery.trim()) {
      return content;
    }

    const searchRegex = new RegExp(
      `(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
      "gi",
    );
    const parts = content.split(searchRegex);
    return parts.map((part, index) =>
      searchRegex.test(part) ? (
        <mark
          key={index}
          className={`${
            darkMode
              ? "bg-amber-400 text-black font-semibold rounded-sm px-0.5"
              : "bg-yellow-300 text-gray-900 font-medium rounded-sm px-0.5"
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  // PINNED MESSAGE CONTENT RENDERER
  const renderPinnedContent = (content) => {
    if (!content)
      return <span className="italic text-gray-400">📄 Attachment</span>;
    return content;
  };

  // ATTACHMENT HELPERS (adapted from KARYAH-v3 Chatbox)
  // Handles both absolute (cloudinary images) and relative (/api/upload/file/... docs) urls
  const getFileUrl = (url) =>
    url?.startsWith("/") ? `${backendUrl}${url}` : url;

  const getAttachmentInfo = (rawUrl) => {
    const url = getFileUrl(rawUrl);
    const lower = (url || "").toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower);
    const isPdf = /\.pdf(\?|$)/.test(lower);
    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/.test(lower);
    const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/.test(lower);
    const rawName = (url || "").split("/").pop() || "file";
    const name = decodeURIComponent(rawName.split("?")[0]).replace(
      /^\d{10,}[-_]/,
      "",
    );
    const type = isImage
      ? "image"
      : isPdf
        ? "pdf"
        : isVideo
          ? "video"
          : isAudio
            ? "audio"
            : "doc";
    const labels = {
      image: "Image",
      pdf: "PDF Document",
      video: "Video",
      audio: "Audio",
      doc: "Document",
    };
    const colors = {
      image: "#3B82F6",
      pdf: "#EF4444",
      video: "#8B5CF6",
      audio: "#EC4899",
      doc: "#1070b9",
    };
    return { isImage, type, name, label: labels[type], color: colors[type] };
  };

  // DOWNLOAD ATTACHMENT — fetched as an authenticated blob so restricted files
  // (cloudinary PDFs / locally stored docs) always download with a clean name.
  const handleDownloadAttachment = async (rawUrl) => {
    try {
      const info = getAttachmentInfo(rawUrl);
      let blob;

      if (rawUrl?.startsWith("/")) {
        // Locally stored doc — strip the leading /api because axios baseURL
        // already ends with /api (otherwise the path doubles: /api/api/...)
        const res = await axios.get(rawUrl.replace(/^\/api/, ""), {
          responseType: "blob",
        });
        blob = res.data;
      } else {
        // Cloudinary-hosted (images/legacy files) — download directly
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        blob = await res.blob();
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = info.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Download failed");
    }
  };

  // MATCHING MESSAGES FOR SEARCH NAVIGATION
  const matchingMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) => !m.isDeleted && m.content?.toLowerCase().includes(q),
    );
  }, [messages, searchQuery]);

  // Jump to first match whenever search query changes or search begins
  useEffect(() => {
    if (isSearching && searchQuery.trim() && matchingMessages.length > 0) {
      setSearchMatchIndex(0);
      scrollToMessage(matchingMessages[0]._id);
    }
  }, [searchQuery, isSearching]);

  const handleNextMatch = (delta) => {
    if (matchingMessages.length === 0) return;
    let nextIdx = searchMatchIndex + delta;
    if (nextIdx < 0) nextIdx = matchingMessages.length - 1;
    if (nextIdx >= matchingMessages.length) nextIdx = 0;
    setSearchMatchIndex(nextIdx);
    scrollToMessage(matchingMessages[nextIdx]._id);
  };

  const formatMessageDate = (dateString) => {
    if (!dateString) return "";
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return msgDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // GROUP MESSAGES BY DATE
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = formatMessageDate(msg.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  return (
    <div
      className={`chat-page-height flex select-none font-sans relative overflow-hidden ${
        darkMode
          ? "dark bg-[#0c1317] text-[#e9edef]"
          : "bg-[#F5EFE6] text-gray-800"
      }`}
    >
      <SEO
        title="Connecto - Web Chat App"
        description="Private real-time messaging and chat dashboard."
        canonical="/chat"
        robots="noindex, nofollow"
      />

      {/* SIDEBAR */}
      <Sidebar
        users={users}
        selectedUser={selectedUser}
        openChat={openChat}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        mobileShowChat={mobileShowChat}
        onConnectionAccepted={fetchUsers}
      />

      {/* CHAT MAIN CONTAINER */}
      <div
        onDragOver={handleGlobalDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200
          max-lg:absolute max-lg:inset-0 max-lg:z-30 max-lg:transition-transform max-lg:duration-300 ${
            mobileShowChat
              ? "max-lg:translate-x-0"
              : "max-lg:translate-x-full max-lg:pointer-events-none"
          } ${darkMode ? "bg-[#0c1317]" : "bg-[#F5EFE6]"}`}
      >
        {selectedUser ? (
          <>
            {/* FILE DRAG & DROP OVERLAY (Karyah Style) */}
            {isDraggingFile && (
              <div className="absolute inset-0 z-[100] bg-white/30 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-[#FF8624] m-2 rounded-xl pointer-events-none animate-fadeIn">
                <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-4">
                  <FiPaperclip className="w-10 h-10 text-[#FF8624] animate-bounce" />
                </div>
                <h3
                  className={`text-xl font-bold ${darkMode ? "text-gray-100" : "text-gray-800"}`}
                >
                  Drop files here
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Upload images, pdfs, and documents
                </p>
              </div>
            )}

            {/* CHAT HEADER */}
            <div
              className={`h-14 sm:h-16 px-3 sm:px-6 border-b flex items-center justify-between shrink-0 shadow-xs z-20 transition-colors duration-200 ${
                darkMode
                  ? "bg-[#202c33] border-[#222e35]"
                  : "bg-[#FAF8F5] border-[#E8E2D6]"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                {/* BACK ARROW (returns to chat list & closes active chat) */}
                <button
                  onClick={handleCloseChat}
                  className={`lg:hidden p-2 -ml-1 rounded-full transition cursor-pointer shrink-0 ${
                    darkMode
                      ? "text-gray-300 hover:bg-[#2a3942]"
                      : "text-gray-600 hover:bg-[#F2ECE0]"
                  }`}
                  title="Back to chats"
                >
                  <FiArrowLeft className="text-xl" />
                </button>

                {/* User Info — collapsed on mobile only while search is open;
                    tablet keeps it visible. Clickable to open Profile Detail modal */}
                <div
                  onClick={() => setShowProfileDetail(true)}
                  className={`flex items-center gap-2.5 min-w-0 cursor-pointer p-1 -m-1 rounded-xl hover:opacity-80 transition select-none group ${
                    isSearching ? "max-sm:hidden" : ""
                  }`}
                  title={`View ${selectedUser.name}'s profile details`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={selectedUser.profilePic}
                      name={selectedUser.name}
                      className={`w-9 h-9 rounded-full object-cover ring-1 transition-transform group-hover:scale-105 ${
                        darkMode ? "ring-[#2a3942]" : "ring-gray-200"
                      } text-base`}
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border ${
                        darkMode ? "border-[#202c33]" : "border-white"
                      } ${
                        selectedUser.isOnline
                          ? "bg-emerald-500"
                          : darkMode
                            ? "bg-gray-600"
                            : "bg-gray-300"
                      }`}
                    ></span>
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`font-semibold text-sm leading-none truncate group-hover:text-[#FF8624] transition-colors ${
                        darkMode ? "text-[#e9edef]" : "text-gray-800"
                      }`}
                    >
                      {selectedUser.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-none">
                      {typing ? (
                        <span className="text-emerald-500 font-medium animate-pulse">
                          Typing...
                        </span>
                      ) : selectedUser.isOnline ? (
                        <span className="text-emerald-500">Online</span>
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Icon / Search Input on Right Corner */}
              <div
                className={`flex items-center gap-2 min-w-0 ${isSearching ? "max-sm:flex-1" : ""}`}
              >
                {isSearching ? (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border animate-fadeIn transition-all shadow-xs ${
                      darkMode
                        ? "bg-[#111b21] border-[#222e35] text-[#e9edef] focus-within:border-[#FF8624]"
                        : "bg-[#F1ECE2] border-[#E8E2D6] text-gray-800 focus-within:border-[#FF8624] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF8624]/20"
                    }`}
                  >
                    <FiSearch className="text-gray-400 text-sm shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            handleNextMatch(-1);
                          } else {
                            handleNextMatch(1);
                          }
                        } else if (e.key === "Escape") {
                          setIsSearching(false);
                          setSearchQuery("");
                        }
                      }}
                      placeholder="Search messages..."
                      className={`bg-transparent border-none text-xs focus:outline-none max-sm:w-full sm:w-52 lg:w-36 min-w-0 ${
                        darkMode
                          ? "text-[#e9edef] placeholder-gray-500"
                          : "text-gray-800 placeholder-gray-400"
                      }`}
                    />
                    {searchQuery.trim() && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-semibold whitespace-nowrap ${
                            darkMode ? "text-orange-400" : "text-[#FF8624]"
                          }`}
                        >
                          {matchingMessages.length > 0
                            ? `${searchMatchIndex + 1} of ${matchingMessages.length}`
                            : "0 found"}
                        </span>
                        {matchingMessages.length > 1 && (
                          <div className="flex items-center ml-0.5">
                            <button
                              type="button"
                              onClick={() => handleNextMatch(-1)}
                              className={`p-1 rounded-full cursor-pointer transition ${
                                darkMode
                                  ? "text-gray-300 hover:text-white hover:bg-[#202c33]"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                              }`}
                              title="Previous match (Shift+Enter)"
                            >
                              <FiChevronUp className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNextMatch(1)}
                              className={`p-1 rounded-full cursor-pointer transition ${
                                darkMode
                                  ? "text-gray-300 hover:text-white hover:bg-[#202c33]"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                              }`}
                              title="Next match (Enter)"
                            >
                              <FiChevronDown className="text-xs" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsSearching(false);
                        setSearchQuery("");
                      }}
                      className={`p-1 rounded-full transition cursor-pointer ${
                        darkMode
                          ? "text-gray-400 hover:text-gray-200 hover:bg-[#202c33]"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Close search (Esc)"
                    >
                      <FiX className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="relative chat-header-menu">
                    <button
                      onClick={() => setShowChatMenu((prev) => !prev)}
                      className={`p-2 rounded-full transition cursor-pointer ${
                        darkMode
                          ? "text-gray-300 hover:text-white hover:bg-[#202c33]"
                          : "text-black hover:text-black hover:bg-black/5"
                      } ${
                        showChatMenu
                          ? darkMode
                            ? "bg-[#202c33] text-white"
                            : "bg-black/10 text-black"
                          : ""
                      }`}
                      title="Chat options"
                    >
                      <FiMoreVertical className="text-lg text-black dark:text-gray-300" />
                    </button>

                    {showChatMenu && (
                      <div
                        className={`absolute top-full mt-1.5 right-0 z-40 w-48 rounded-2xl shadow-xl border p-1.5 text-xs animate-fadeIn ${
                          darkMode
                            ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                            : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-700 shadow-xl"
                        }`}
                      >
                        {/* Contact Info / Profile Details */}
                        <button
                          onClick={() => {
                            setShowChatMenu(false);
                            setShowProfileDetail(true);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-[#F2ECE0] text-gray-700"
                          }`}
                        >
                          <FiUser
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          />
                          <span>User info</span>
                        </button>

                        {/* Search Messages */}
                        <button
                          onClick={() => {
                            setShowChatMenu(false);
                            setIsSearching(true);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-[#F2ECE0] text-gray-700"
                          }`}
                        >
                          <FiSearch
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          />
                          <span>Search messages</span>
                        </button>

                        {/* Select Messages (multi-select to pin/delete) */}
                        <button
                          onClick={enterSelectMode}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-[#F2ECE0] text-gray-700"
                          }`}
                        >
                          <FiCheckSquare
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          />
                          <span>Select messages</span>
                        </button>

                        {/* Clear Chat (for this user only) */}
                        <button
                          onClick={() => {
                            setShowChatMenu(false);
                            setShowClearChatConfirm(true);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-red-950/30 text-red-400"
                              : "hover:bg-red-50 text-red-600"
                          }`}
                        >
                          <FiTrash2 className="text-sm" />
                          <span>Clear chat</span>
                        </button>

                        {/* Close Chat */}
                        <button
                          onClick={handleCloseChat}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-[#F2ECE0] text-gray-700"
                          }`}
                        >
                          <FiX
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          />
                          <span>Close chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PINNED MESSAGES BANNER (Karyah v3 Discussion Room Pill Style) */}
            {currentPinned && (
              <div className="px-3 sm:px-6 pt-2.5 pb-1 z-10 shrink-0">
                <div
                  className={`w-full rounded-full border px-4 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between shadow-sm transition-all animate-fadeIn ${
                    darkMode
                      ? "bg-[#182229] border-amber-500/30 text-[#e9edef]"
                      : "bg-[#fff6ea] border-[#fed7aa] text-gray-800"
                  }`}
                >
                  <div
                    onClick={() => scrollToMessage(currentPinned._id)}
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
                    title="Click to jump to message"
                  >
                    <BsPinAngleFill className="text-[#ea580c] dark:text-orange-400 text-sm sm:text-base shrink-0 group-hover:scale-110 transition-transform" />
                    <span
                      className={`font-semibold shrink-0 text-xs sm:text-[13px] ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {currentPinned.sender._id === user.user._id
                        ? "You:"
                        : `${currentPinned.sender.name}:`}
                    </span>
                    <span
                      className={`truncate text-xs sm:text-[13px] transition-colors ${
                        darkMode
                          ? "text-gray-300 group-hover:text-white"
                          : "text-gray-700 group-hover:text-gray-900"
                      }`}
                    >
                      {renderPinnedContent(currentPinned.content)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 ml-3">
                    {/* Segmented Dash Indicator (Karyah v3 style) */}
                    {pinnedMessages.length > 1 && (
                      <div className="flex items-center gap-1">
                        {pinnedMessages.map((_, idx) => (
                          <span
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinnedIndex(idx);
                            }}
                            className={`cursor-pointer transition-all duration-300 ${
                              idx === pinnedIndex % pinnedMessages.length
                                ? "w-7 sm:w-10 h-1 bg-[#FF8624] dark:bg-orange-400 rounded-full"
                                : "w-3 sm:w-4 h-1 bg-gray-300/80 dark:bg-gray-600 hover:bg-[#FF8624]/60 rounded-full"
                            }`}
                            title={`Pinned message ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Cycle / Refresh Button */}
                    {pinnedMessages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedIndex(
                            (prev) => (prev + 1) % pinnedMessages.length,
                          );
                        }}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition p-1 hover:rotate-180 duration-300 cursor-pointer"
                        title="Next Pinned Message"
                      >
                        <FiRefreshCw className="text-xs sm:text-sm" />
                      </button>
                    )}

                    {/* Unpin Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(currentPinned);
                      }}
                      className="text-gray-400 hover:text-red-500 transition p-1 cursor-pointer"
                      title="Unpin Message"
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHAT MESSAGES STREAM */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 space-y-4 relative"
            >
              {/* Loading indicator for previous messages */}
              {isLoadingMore && (
                <div className="flex justify-center py-2 sticky top-0 z-10 pointer-events-none">
                  <div className="flex items-center gap-2 bg-white/95 dark:bg-[#182229]/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-xs border border-orange-200 dark:border-orange-900/40 text-xs text-[#FF8624]">
                    <div className="w-3.5 h-3.5 border-2 border-[#FF8624] border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Loading messages...</span>
                  </div>
                </div>
              )}
              {Object.keys(groupedMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF8624] flex items-center justify-center text-2xl mb-3 shadow-sm">
                    💬
                  </div>
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    No messages yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                  <div key={dateKey} className="space-y-4">
                    {/* Centered Date Separator Pill */}
                    <div className="flex items-center justify-center my-3">
                      <span
                        className={`text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-2xs ${
                          darkMode
                            ? "bg-[#182229] text-[#8696a0] border border-[#2a3942]"
                            : "bg-white/95 text-gray-600 border border-[#E8E2D6]/80"
                        }`}
                      >
                        {dateKey}
                      </span>
                    </div>

                    {/* Messages in this Date Group */}
                    {msgs.map((m) => {
                      const isSelf = m.sender._id === user.user._id;
                      const isMenuOpen = activeMenuId === m._id;
                      const isReactionOpen = activeReactionId === m._id;
                      const isHighlighted = highlightedId === m._id;
                      const isSelected = selectedMsgIds.includes(m._id);

                      return (
                        <div
                          key={m._id}
                          id={`msg-${m._id}`}
                          onContextMenu={(e) => handleMessageContextMenu(e, m)}
                          onClick={() => {
                            if (isSelectMode) toggleSelectMessage(m);
                          }}
                          className={`message-row flex items-start gap-2 group transition-all duration-300 w-full min-w-0 ${
                            isSelf
                              ? "message-row-self justify-end"
                              : "message-row-other justify-start"
                          } ${isHighlighted ? "highlight-pulse" : ""} ${
                            isSelectMode
                              ? "cursor-pointer select-none rounded-xl"
                              : ""
                          } ${isSelected ? "bg-orange-100/50 dark:bg-orange-950/20" : ""}`}
                        >
                          {/* Selection checkbox (multi-select mode) */}
                          {isSelectMode && (
                            <span
                              className={`mt-1 shrink-0 w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-[#FF8624] border-[#FF8624] text-white"
                                  : darkMode
                                    ? "border-[#8696a0] bg-transparent text-transparent"
                                    : "border-gray-300 bg-white text-transparent"
                              }`}
                            >
                              <FiCheck className="text-xs" />
                            </span>
                          )}

                          {/* Partner Avatar for received messages */}
                          {!isSelf && (
                            <Avatar
                              src={m.sender.profilePic}
                              name={m.sender.name}
                              className="w-8 h-8 rounded-full object-cover shadow-sm text-sm"
                            />
                          )}

                          <div
                            className={`flex flex-col min-w-0 max-w-md md:max-w-lg ${
                              isSelf ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Sender Name above received message */}
                            {!isSelf && (
                              <span
                                className={`text-xs font-semibold ml-1 mb-1 ${
                                  darkMode ? "text-orange-400" : "text-gray-900"
                                }`}
                              >
                                {m.sender.name}
                              </span>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`relative transition-all shadow-sm border max-w-full ${
                                m.fileUrl && !m.content && !m.replyTo
                                  ? "p-2 sm:p-2.5 rounded-2xl"
                                  : "px-4 py-2.5 rounded-2xl"
                              } ${
                                isSelf
                                  ? darkMode
                                    ? "bg-[#382012] text-[#fdf4ee] border-orange-500/20 rounded-tr-none bubble-tail-right"
                                    : "bg-[#FFE3CC] text-gray-900 border-[#FFD0A8] rounded-tr-none bubble-tail-right"
                                  : darkMode
                                    ? "bg-[#202c33] text-[#e9edef] border-transparent rounded-tl-none bubble-tail-left"
                                    : "bg-white text-gray-900 border-[#E8E2D6]/80 rounded-tl-none bubble-tail-left shadow-xs"
                              }`}
                            >
                              {/* Quick Reply Button: sits beside the bubble (own msgs left, received right) with a gap,
                                  revealed on hover on pointer devices / always visible on touch */}
                              {!m.isDeleted && !isSelectMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartReply(m);
                                  }}
                                  className={`reply-fab absolute top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                                    isSelf
                                      ? "right-full mr-2"
                                      : "left-full ml-2"
                                  } ${
                                    darkMode
                                      ? "bg-[#202c33] border-[#2a3942] text-gray-300 hover:text-[#FF8624]"
                                      : "bg-white border-[#E8E2D6] text-gray-500 hover:text-[#ea580c]"
                                  }`}
                                  title="Reply"
                                >
                                  <FiCornerUpLeft className="text-[11px] sm:text-xs" />
                                </button>
                              )}

                              {/* Floating Quick Reaction Bar: anchored to the bubble so it always stays on screen */}
                              {isReactionOpen && !isSelectMode && (
                                <div
                                  className={`message-reaction-container absolute -bottom-3 z-50 flex items-center gap-1 px-2.5 py-1.5 rounded-full shadow-xl border animate-fadeIn whitespace-nowrap ${
                                    isSelf ? "right-0" : "left-0"
                                  } ${
                                    darkMode
                                      ? "bg-[#202c33] border-[#2a3942]"
                                      : "bg-[#FAF8F5] border-[#E8E2D6] shadow-xl"
                                  }`}
                                >
                                  {quickReactions.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(m, emoji)}
                                      className={`text-base hover:scale-125 transition-transform p-1 rounded-full cursor-pointer ${
                                        darkMode
                                          ? "hover:bg-[#111b21]"
                                          : "hover:bg-[#F2ECE0]"
                                      }`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Top Bar inside bubble: Reply preview badge + Quick Pin / 3-dots actions */}
                              <div
                                className={`flex items-start justify-between gap-2 ${
                                  m.replyTo ? "mb-1.5" : "mb-0.5"
                                }`}
                              >
                                {/* Reply Quote Box if message is a reply */}
                                {m.replyTo && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(m.replyTo._id);
                        }}
                        className={`cursor-pointer rounded-xl p-2.5 mb-1 border-l-[3.5px] border-[#FF8624] text-xs w-full min-w-0 transition-all ${
                          isSelf
                            ? darkMode
                              ? "bg-black/30 hover:bg-black/45 text-gray-300 border border-white/5"
                              : "bg-white/80 hover:bg-white text-gray-700 border border-[#FFD0A8]/80 shadow-2xs"
                            : darkMode
                              ? "bg-black/30 hover:bg-black/40 text-gray-300 border border-white/5"
                              : "bg-[#fff8f2] hover:bg-[#fff2e6] text-gray-700 border border-orange-200/80 shadow-2xs"
                        }`}
                      >
                                    <div
                                      className={`font-semibold text-xs ${
                                        darkMode
                                          ? "text-orange-400"
                                          : "text-[#ea580c]"
                                      }`}
                                    >
                                      {m.replyTo.sender?._id === user.user._id
                                        ? "You"
                                        : m.replyTo.sender?.name || "User"}
                                    </div>
                                    <div className="truncate text-xs mt-0.5 font-normal text-gray-600 dark:text-gray-300">
                                      {m.replyTo.content || "📄 Attachment"}
                                    </div>
                                  </div>
                                )}

                                {/* Hover icons on top right: Pin + 3 dots menu */}
                                {!isSelectMode && (
                                  <div className="ml-auto flex items-center gap-1">
                                    {/* Pin indicator or button (hidden for deleted messages) */}
                                    {!m.isDeleted && (
                                      <button
                                        onClick={() => handleTogglePin(m)}
                                        className={`p-1 rounded-lg transition opacity-60 group-hover:opacity-100 ${
                                          m.isPinned
                                            ? "text-[#ea580c] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30"
                                            : darkMode
                                              ? "text-gray-400 hover:text-orange-400 hover:bg-white/5"
                                              : "text-gray-500 hover:text-[#ea580c] hover:bg-orange-50"
                                        }`}
                                        title={
                                          m.isPinned
                                            ? "Unpin message"
                                            : "Pin message"
                                        }
                                      >
                                        {m.isPinned ? (
                                          <BsPinAngleFill className="text-xs" />
                                        ) : (
                                          <BsPinAngle className="text-xs" />
                                        )}
                                      </button>
                                    )}

                                    {/* Three Dots Menu Button */}
                                    <div className="relative message-action-menu-container">
                                      <button
                                        onClick={(e) =>
                                          handleToggleMenu(e, m._id)
                                        }
                                        className={`p-1 rounded hover:bg-black/5 transition cursor-pointer ${
                                          isMenuOpen
                                            ? "text-black dark:text-white opacity-100 bg-black/5"
                                            : "text-black/60 dark:text-gray-400 hover:text-black dark:hover:text-white opacity-70 group-hover:opacity-100"
                                        }`}
                                        title="Message actions"
                                      >
                                        <FiMoreVertical className="text-xs text-black dark:text-gray-300" />
                                      </button>

                                      {/* Action Dropdown Menu */}
                                      {isMenuOpen && (
                                        <div
                                          className={`absolute z-50 ${
                                            menuPlacement === "up"
                                              ? "bottom-full mb-1"
                                              : "top-full mt-1"
                                          } ${
                                            menuAlign === "right"
                                              ? "right-0"
                                              : "left-0"
                                          } w-48 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-xl border p-1.5 text-xs animate-fadeIn ${
                                            darkMode
                                              ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                                              : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-700 shadow-xl"
                                          }`}
                                        >
                                          {/* Reply (hidden for deleted messages) */}
                                          {!m.isDeleted && (
                                            <button
                                              onClick={() =>
                                                handleStartReply(m)
                                              }
                                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
                                                darkMode
                                                  ? "hover:bg-[#111b21] text-[#e9edef]"
                                                  : "hover:bg-[#F2ECE0] text-gray-700"
                                              }`}
                                            >
                                              <FiCornerUpLeft
                                                className={`text-sm ${
                                                  darkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-500"
                                                }`}
                                              />
                                              <span>Reply</span>
                                            </button>
                                          )}

                                          {/* Edit (only self & not deleted) */}
                                          {isSelf && !m.isDeleted && (
                                            <button
                                              onClick={() => handleStartEdit(m)}
                                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
                                                darkMode
                                                  ? "hover:bg-[#111b21] text-[#e9edef]"
                                                  : "hover:bg-[#F2ECE0] text-gray-700"
                                              }`}
                                            >
                                              <FiEdit2
                                                className={`text-sm ${
                                                  darkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-500"
                                                }`}
                                              />
                                              <span>Edit</span>
                                            </button>
                                          )}

                                          {/* Pin / Unpin (hidden for deleted messages) */}
                                          {!m.isDeleted && (
                                            <button
                                              onClick={() => handleTogglePin(m)}
                                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
                                                darkMode
                                                  ? "hover:bg-[#111b21] text-[#e9edef]"
                                                  : "hover:bg-[#F2ECE0] text-gray-700"
                                              }`}
                                            >
                                              <BsPinAngle
                                                className={`text-sm ${
                                                  darkMode
                                                    ? "text-gray-400"
                                                    : "text-gray-500"
                                                }`}
                                              />
                                              <span>
                                                {m.isPinned ? "Unpin" : "Pin"}
                                              </span>
                                            </button>
                                          )}

                                          {/* Delete for Everyone (only sender) */}
                                          {isSelf && !m.isDeleted && (
                                            <button
                                              onClick={() =>
                                                handleDeleteMessage(
                                                  m,
                                                  "everyone",
                                                )
                                              }
                                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
                                                darkMode
                                                  ? "hover:bg-red-950/30 text-red-400"
                                                  : "hover:bg-red-50 text-red-600"
                                              }`}
                                            >
                                              <FiTrash2 className="text-sm" />
                                              <span>Delete for Everyone</span>
                                            </button>
                                          )}

                                          {/* Delete for Me */}
                                          <button
                                            onClick={() =>
                                              handleDeleteMessage(m, "me")
                                            }
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
                                              darkMode
                                                ? "hover:bg-red-950/30 text-red-400"
                                                : "hover:bg-red-50 text-red-600"
                                            }`}
                                          >
                                            <FiTrash2 className="text-sm" />
                                            <span>Delete for Me</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Message Content */}
                              {m.isDeleted ? (
                                <span className="italic text-gray-400 text-xs flex items-center gap-1.5 py-1">
                                  This message was deleted
                                </span>
                              ) : m.fileUrl ? (
                                <div className="py-0.5">
                                  {(() => {
                                    const info = getAttachmentInfo(m.fileUrl);
                                    return info.isImage ? (
                                      /* Images: Click to open preview modal with subtle frame */
                                      <div className="relative group/img overflow-hidden rounded-xl border border-black/5 dark:border-white/10 shadow-xs bg-black/5 dark:bg-black/20">
                                        <img
                                          src={m.fileUrl}
                                          alt={info.name}
                                          onClick={() =>
                                            setPreviewFile({ url: m.fileUrl })
                                          }
                                          className="w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] object-cover cursor-pointer hover:scale-[1.015] transition-transform duration-200 block"
                                        />
                                      </div>
                                    ) : (
                                      /* Docs: Modern card with preview & download */
                                      <div
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition w-[220px] sm:w-[300px] ${
                                          isSelf
                                            ? darkMode
                                              ? "bg-black/30 border-orange-500/20 text-[#fdf4ee] hover:bg-black/40 shadow-xs"
                                              : "bg-white/90 border-[#FFD0A8]/90 text-gray-900 shadow-xs backdrop-blur-xs hover:bg-white hover:border-[#FF8624]/60"
                                            : darkMode
                                              ? "bg-black/25 border-[#2a3942] text-[#e9edef] hover:bg-black/35 shadow-xs"
                                              : "bg-[#FAF7F2] border-orange-200/70 text-gray-900 shadow-xs hover:bg-[#F4EFE6]"
                                        }`}
                                      >
                                        <div
                                          className={`sm:w-10 sm:h-10 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-wider shrink-0 shadow-2xs ${
                                            info.type === "pdf"
                                              ? "bg-red-50 text-red-600 border border-red-200/90 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40"
                                              : info.type === "video"
                                                ? "bg-purple-50 text-purple-600 border border-purple-200/90 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40"
                                                : info.type === "audio"
                                                  ? "bg-pink-50 text-pink-600 border border-pink-200/90 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-800/40"
                                                  : info.type === "image"
                                                    ? "bg-amber-50 text-amber-600 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40"
                                                    : "bg-blue-50 text-blue-600 border border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40"
                                          }`}
                                        >
                                          {info.type.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-xs font-semibold truncate leading-tight text-gray-900 dark:text-gray-100"
                                            title={info.name}
                                          >
                                            {info.name}
                                          </p>
                                          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                                            {info.label}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            onClick={() =>
                                              setPreviewFile({ url: m.fileUrl })
                                            }
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                                              isSelf
                                                ? darkMode
                                                  ? "bg-white/10 hover:bg-white/20 text-orange-300 border border-white/5"
                                                  : "bg-orange-50 hover:bg-orange-100 text-[#ea580c] border border-orange-200/70 shadow-2xs"
                                                : darkMode
                                                  ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                                                  : "bg-white hover:bg-orange-50 text-gray-700 hover:text-[#ea580c] border border-orange-200/70 shadow-2xs"
                                            }`}
                                            title="Preview file"
                                          >
                                            <FiEye size={14} />
                                          </button>
                                          {/* Hide download for own sent files */}
                                          {!isSelf && (
                                            <button
                                              onClick={() =>
                                                handleDownloadAttachment(
                                                  m.fileUrl,
                                                )
                                              }
                                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                                                darkMode
                                                  ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                                                  : "bg-white hover:bg-orange-50 text-gray-700 hover:text-[#ea580c] border border-orange-200/70 shadow-2xs"
                                              }`}
                                              title="Download file"
                                            >
                                              <FiDownload size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {m.content && (
                                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {renderMessageContent(m.content, isSelf)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {renderMessageContent(m.content, isSelf)}
                                </p>
                              )}

                              {/* Bottom Row: Reaction button & emoji chips + timestamp & ticks */}
                              <div
                                className={`flex items-center justify-between gap-4 mt-2 pt-1 border-t ${
                                  isSelf
                                    ? darkMode
                                      ? "border-orange-500/20"
                                      : "border-[#FFD0A8]/70"
                                    : darkMode
                                      ? "border-white/10"
                                      : "border-black/5"
                                }`}
                              >
                                {/* Left: Reaction Trigger Button & Emojis */}
                                <div className="relative message-reaction-container flex items-center gap-1.5">
                                  {!m.isDeleted && !isSelectMode && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveReactionId(
                                          isReactionOpen ? null : m._id,
                                        );
                                      }}
                                      className={`transition p-1 rounded-lg ${
                                        isReactionOpen
                                          ? darkMode
                                            ? "text-orange-400 bg-white/5"
                                            : "text-gray-500 bg-orange-50"
                                          : darkMode
                                            ? "text-gray-500 hover:text-orange-400 hover:bg-white/5"
                                            : "text-gray-500 hover:text-[#ea580c] hover:bg-orange-50"
                                      }`}
                                      title="React"
                                    >
                                      <FiSmile className="text-xs" />
                                    </button>
                                  )}

                                  {/* Rendered Reaction Badges */}
                                  {m.reactions && m.reactions.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {Array.from(
                                        new Set(
                                          m.reactions.map((r) => r.emoji),
                                        ),
                                      ).map((emoji) => {
                                        const count = m.reactions.filter(
                                          (r) => r.emoji === emoji,
                                        ).length;
                                        const userReacted = m.reactions.some(
                                          (r) =>
                                            (r.user?._id || r.user) ===
                                              user.user._id &&
                                            r.emoji === emoji,
                                        );
                                        return (
                                          <button
                                            key={emoji}
                                            onClick={() =>
                                              handleReaction(m, emoji)
                                            }
                                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                                              userReacted
                                                ? darkMode
                                                  ? "bg-orange-950/60 border-orange-500/50 text-orange-300"
                                                  : "bg-[#FFF2E2] border-orange-200 text-orange-700"
                                                : darkMode
                                                  ? "bg-[#202c33] border-[#2a3942] text-[#e9edef] hover:bg-[#111b21]"
                                                  : "bg-white border-[#E8E2D6] text-gray-700 hover:bg-[#FAF8F5]"
                                            }`}
                                          >
                                            <span>{emoji}</span>
                                            {count > 1 && <span>{count}</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Right: Edited tag, Timestamp & Read Status Ticks */}
                                <div
                                  className={`flex items-center gap-1.5 text-[10px] font-medium shrink-0 ${
                                    isSelf
                                      ? darkMode
                                        ? "text-orange-200/60"
                                        : "text-gray-500"
                                      : darkMode
                                        ? "text-gray-400"
                                        : "text-gray-400"
                                  }`}
                                >
                                  {m.isEdited && !m.isDeleted && (
                                    <span
                                      className={`italic font-normal ${
                                        isSelf
                                          ? darkMode
                                            ? "text-orange-200/50"
                                            : "text-gray-500"
                                          : darkMode
                                            ? "text-gray-500"
                                            : "text-gray-400"
                                      }`}
                                    >
                                      edited
                                    </span>
                                  )}

                                  <span>
                                    {new Date(m.createdAt).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>

                                  {isSelf && !m.isDeleted && (
                                    <span className="flex justify-end items-center">
                                      {m.status === "sent" &&
                                        (selectedUser?.isOnline ? (
                                          <IoCheckmarkDone
                                            className={`text-base ${darkMode ? "text-orange-200/50" : "text-[#c2521a]/60"}`}
                                          />
                                        ) : (
                                          <IoCheckmark
                                            className={`text-base ${darkMode ? "text-orange-200/50" : "text-[#c2521a]/60"}`}
                                          />
                                        ))}
                                      {m.status === "delivered" && (
                                        <IoCheckmarkDone
                                          className={`text-base ${darkMode ? "text-orange-200/50" : "text-[#c2521a]/60"}`}
                                        />
                                      )}
                                      {m.status === "seen" && (
                                        <IoCheckmarkDone className="text-[#53bdeb] text-base" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{ maxWidth: "calc(100vw - 1rem)" }}
                className={`absolute z-40 shadow-2xl rounded-2xl border overflow-hidden left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 ${
                  replyingTo || editingMessage ? "bottom-32" : "bottom-20"
                } ${darkMode ? "border-[#2a3942]" : "border-[#E8E2D6]"}`}
              >
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setMessage((prev) => prev + emojiObject.emoji);
                  }}
                  theme={darkMode ? "dark" : "light"}
                  width={emojiPickerSize.width}
                  height={emojiPickerSize.height}
                />
              </div>
            )}

            {/* DOCUMENT PREVIEW MODAL */}
            {previewFile && (
              <DocumentPreviewModal
                url={previewFile.url}
                darkMode={darkMode}
                onClose={() => setPreviewFile(null)}
                getFileUrl={async (u) => {
                  if (u?.startsWith("/")) {
                    return `${backendUrl}${u}?token=${user.token}`;
                  }
                  try {
                    const res = await fetch(u);
                    if (!res.ok) throw new Error(String(res.status));
                    return URL.createObjectURL(await res.blob());
                  } catch {
                    return u;
                  }
                }}
              />
            )}

            {/* CONNECTION PROFILE DETAIL MODAL */}
            {showProfileDetail && selectedUser && (
              <UseProfileDetail
                isOpen={showProfileDetail}
                onClose={() => setShowProfileDetail(false)}
                user={selectedUser}
                darkMode={darkMode}
                onConnectionRemoved={() => {
                  setShowProfileDetail(false);
                  handleCloseChat();
                  fetchUsers();
                }}
              />
            )}

            {/* FLOATING SCROLL DOWN BUTTON */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => {
                  if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop =
                      messagesContainerRef.current.scrollHeight;
                  }
                  setShowScrollBottom(false);
                }}
                className={`absolute right-6 bottom-24 z-30 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-fadeIn cursor-pointer ${
                  darkMode
                    ? "bg-[#202c33] text-gray-200 hover:text-[#FF8624] border-[#2a3942]"
                    : "bg-white text-gray-700 hover:text-[#FF8624] border-[#E8E2D6]"
                }`}
                title="Scroll to Latest Message"
              >
                <FiChevronDown className="text-xl" />
              </button>
            )}

            {/* DELETE SELECTED MESSAGES CONFIRMATION MODAL */}
            {showDeleteSelectedConfirm && (                <div
                onClick={() => setShowDeleteSelectedConfirm(false)}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
              >

                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transform transition-all ${
                    darkMode
                      ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                      : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-800"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-3.5">
                      <FiTrash2 className="text-2xl" />
                    </div>
                    <h3 className="text-base font-bold">Delete messages?</h3>
                    <p
                      className={`text-xs mt-1.5 mb-5 leading-relaxed ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {selectedMessages.length === 1
                        ? "Are you sure you want to delete this message?"
                        : `Are you sure you want to delete these ${selectedMessages.length} messages?`}
                      {!canDeleteForEveryone &&
                        " They will only be removed for you."}
                    </p>

                    <div className="flex flex-col items-stretch gap-2.5 w-full">
                      {/* Only offered when every selected message is our own & not deleted */}
                      {canDeleteForEveryone && (
                        <button
                          onClick={() => handleDeleteSelected("everyone")}
                          disabled={isBulkActionLoading}
                          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs disabled:opacity-60"
                        >
                          Delete for everyone
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSelected("me")}
                        disabled={isBulkActionLoading}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer disabled:opacity-60 ${
                          darkMode
                            ? "bg-red-950/30 border-red-800/40 text-red-400 hover:bg-red-950/50"
                            : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        }`}
                      >
                        Delete for me
                      </button>

                      <button
                        onClick={() => setShowDeleteSelectedConfirm(false)}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          darkMode
                            ? "text-gray-400 hover:text-gray-200"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CLEAR CHAT CONFIRMATION MODAL */}
            {showClearChatConfirm && (
              <div
                onClick={() => setShowClearChatConfirm(false)}
                className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transform transition-all ${
                    darkMode
                      ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                      : "bg-[#FAF8F5] border-[#E8E2D6] text-gray-800"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-3.5">
                      <FiTrash2 className="text-2xl" />
                    </div>
                    <h3 className="text-base font-bold">Clear Chat</h3>
                    <p
                      className={`text-xs mt-1.5 mb-5 leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Are you sure you want to clear all messages in this chat?
                      This action cannot be undone.
                    </p>
                    <div className="flex items-center gap-3 w-full">
                      <button
                        onClick={() => setShowClearChatConfirm(false)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          darkMode
                            ? "border-[#2a3942] text-gray-300 hover:bg-[#111b21]"
                            : "border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WHATSAPP-STYLE INPUT SECTION (Floating Rounded Pill + Preview) */}
            <div className="p-2.5 sm:p-3.5 shrink-0 bg-transparent">

              {/* PENDING FILE PREVIEW STRIP — card matching input pill bg */}
              {pendingFiles.length > 0 && !isSelectMode && (
                <div
                  className={`mb-2 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden animate-fadeIn ${
                    darkMode ? "bg-[#202c33] text-[#e9edef]" : "bg-white text-gray-800"
                  }`}
                >
                  {/* Header row */}
                  <div
                    className={`flex items-center justify-between px-3.5 pt-2.5 pb-1.5 border-b ${
                      darkMode ? "border-white/5" : "border-[#F0EAE0]"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Attachments ({pendingFiles.length} / 10)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pendingFiles.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
                        setPendingFiles([]);
                      }}
                      className="text-xs font-semibold text-[#FF8624] hover:text-[#e8771b] transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Scrollable file chips row */}
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 overflow-x-auto"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    {pendingFiles.map((entry) => {
                      const isImage = Boolean(entry.previewUrl);
                      const fileName = entry.file.name;
                      const ext = fileName.split(".").pop()?.toLowerCase() || "";
                      const extColors = {
                        pdf:  { bg: darkMode ? "bg-red-950/50"     : "bg-red-50",     text: darkMode ? "text-red-400"     : "text-red-600",     badge: "PDF" },
                        doc:  { bg: darkMode ? "bg-blue-950/40"    : "bg-blue-50",    text: darkMode ? "text-blue-400"    : "text-blue-600",    badge: "DOC" },
                        docx: { bg: darkMode ? "bg-blue-950/40"    : "bg-blue-50",    text: darkMode ? "text-blue-400"    : "text-blue-600",    badge: "DOC" },
                        xls:  { bg: darkMode ? "bg-emerald-950/40" : "bg-emerald-50", text: darkMode ? "text-emerald-400" : "text-emerald-600", badge: "XLS" },
                        xlsx: { bg: darkMode ? "bg-emerald-950/40" : "bg-emerald-50", text: darkMode ? "text-emerald-400" : "text-emerald-600", badge: "XLS" },
                        mp4:  { bg: darkMode ? "bg-purple-950/40"  : "bg-purple-50",  text: darkMode ? "text-purple-400"  : "text-purple-600",  badge: "VID" },
                        mp3:  { bg: darkMode ? "bg-pink-950/40"    : "bg-pink-50",    text: darkMode ? "text-pink-400"    : "text-pink-600",    badge: "AUD" },
                      };
                      const docStyle = extColors[ext] || {
                        bg: darkMode ? "bg-gray-700" : "bg-gray-100",
                        text: darkMode ? "text-gray-300" : "text-gray-600",
                        badge: ext.toUpperCase().slice(0, 3) || "FILE",
                      };

                      return (
                        <div
                          key={entry.id}
                          className={`relative flex items-center gap-2 shrink-0 rounded-xl px-2.5 py-1.5 border animate-fadeIn ${
                            darkMode ? "border-white/8 bg-white/5" : "border-black/8 bg-black/[0.03]"
                          }`}
                        >
                          {/* Thumbnail (image) or doc-type badge */}
                          {isImage ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shrink-0">
                              <img src={entry.previewUrl} alt={fileName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${docStyle.bg}`}>
                              <span className={`text-[9px] font-bold leading-none ${docStyle.text}`}>
                                {docStyle.badge}
                              </span>
                            </div>
                          )}

                          {/* File name */}
                          <span
                            className={`text-xs font-medium max-w-[110px] truncate ${
                              darkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                            title={fileName}
                          >
                            {fileName}
                          </span>

                          {/* Remove X */}
                          <button
                            type="button"
                            onClick={() => removePendingFile(entry.id)}
                            className={`ml-0.5 p-0.5 rounded-full transition cursor-pointer shrink-0 ${
                              darkMode
                                ? "text-gray-500 hover:text-white hover:bg-white/10"
                                : "text-gray-400 hover:text-gray-700 hover:bg-black/8"
                            }`}
                            title={`Remove ${fileName}`}
                          >
                            <FiX className="text-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isSelectMode ? (
                /* SELECTION TOOLBAR: X + selected count (left) | pin + delete (right) */
                <div
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)] animate-fadeIn ${
                    darkMode
                      ? "bg-[#202c33] text-[#e9edef]"
                      : "bg-white text-gray-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={exitSelectMode}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      darkMode
                        ? "text-gray-400 hover:text-white hover:bg-[#111b21]"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    title="Cancel selection"
                  >
                    <FiX className="text-lg" />
                  </button>

                  <span className="text-sm font-semibold truncate">
                    {selectedMsgIds.length > 0
                      ? `${selectedMsgIds.length} selected`
                      : "Select messages"}
                  </span>

                  <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePinSelected}
                      disabled={
                        selectedMsgIds.length === 0 || isBulkActionLoading
                      }
                      className={`p-2 rounded-full transition ${
                        selectedMsgIds.length === 0 || isBulkActionLoading
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer hover:scale-110 active:scale-95 " +
                            (darkMode
                              ? "text-orange-400 hover:bg-white/5"
                              : "text-[#ea580c] hover:bg-orange-50")
                      }`}
                      title="Pin selected messages"
                    >
                      <BsPinAngle className="text-lg" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteSelectedConfirm(true)}
                      disabled={
                        selectedMsgIds.length === 0 || isBulkActionLoading
                      }
                      className={`p-2 rounded-full transition ${
                        selectedMsgIds.length === 0 || isBulkActionLoading
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer hover:scale-110 active:scale-95 " +
                            (darkMode
                              ? "text-red-400 hover:bg-red-950/30"
                              : "text-red-600 hover:bg-red-50")
                      }`}
                      title="Delete selected messages"
                    >
                      <FiTrash2 className="text-lg" />
                    </button>
                  </div>
                </div>
              ) : (
                /* WhatsApp Unified Input Pill / Card */
                <div
                  className={`transition-all shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
                    replyingTo || editingMessage
                      ? "rounded-2xl sm:rounded-[22px] flex flex-col"
                      : "rounded-full flex items-center gap-1 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2"
                  } ${darkMode ? "bg-[#202c33] text-[#e9edef]" : "bg-white text-gray-800"}`}
                >
                  {/* Reply / Edit Preview (Integrated inside the input card, WhatsApp Web style) */}
                  {(replyingTo || editingMessage) && (
                    <div className="pt-2.5 px-3.5 sm:px-4 pb-1 flex items-start justify-between gap-3 animate-fadeIn border-b border-[#F0EAE0] dark:border-white/5">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Orange brand vertical bar */}
                        <span
                          className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${
                            editingMessage ? "bg-amber-500" : "bg-[#FF8624]"
                          }`}
                        />

                        <div className="flex-1 min-w-0 py-0.5">
                          <div
                            className={`text-xs font-semibold leading-tight ${
                              editingMessage
                                ? darkMode
                                  ? "text-amber-400"
                                  : "text-amber-600"
                                : "text-[#ea580c] dark:text-orange-400"
                            }`}
                          >
                            {replyingTo
                              ? replyingTo.sender._id === user.user._id
                                ? "You"
                                : replyingTo.sender.name || "User"
                              : "Editing message"}
                          </div>
                          <div
                            className={`text-xs truncate mt-0.5 ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {replyingTo
                              ? replyingTo.content || "📄 Attachment"
                              : editingMessage.content}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setEditingMessage(null);
                          setMessage("");
                        }}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer shrink-0 mt-0.5"
                        title="Cancel"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Input Row */}
                  <div
                    className={`flex items-center gap-1 sm:gap-2 ${
                      replyingTo || editingMessage
                        ? "px-3 sm:px-4 pb-1.5 sm:pb-2 pt-0.5"
                        : "w-full"
                    }`}
                  >
                    {/* File Attachment Button (left, WhatsApp style) */}
                    <button
                      type="button"
                      onClick={() => chatFileRef.current.click()}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        darkMode
                          ? "text-gray-400 hover:text-[#FF8624] hover:bg-gray-700/50"
                          : "text-gray-500 hover:text-[#FF8624] hover:bg-gray-100"
                      }`}
                      title="Attach file"
                    >
                      <FiPaperclip className="text-lg sm:text-xl" />
                    </button>

                    {/* Hidden File Input (multi-select, max 10) */}
                    <input
                      type="file"
                      ref={chatFileRef}
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) addPendingFiles(files);
                        if (e.target) e.target.value = "";
                      }}
                    />

                    {/* Emoji Picker Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`emoji-toggle-button p-1.5 rounded-full transition cursor-pointer ${
                        darkMode
                          ? "text-gray-400 hover:text-amber-400 hover:bg-gray-700/50"
                          : "text-gray-500 hover:text-amber-500 hover:bg-gray-100"
                      }`}
                      title="Insert emoji"
                    >
                      <FiSmile className="text-lg sm:text-xl" />
                    </button>

                    {/* Text Input Field */}
                    <input
                      ref={messageInputRef}
                      value={message}
                      onChange={handleTyping}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className={`flex-1 bg-transparent border-none px-2 py-1 text-sm sm:text-[15px] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none min-w-0 ${
                        darkMode ? "text-[#e9edef]" : "text-gray-800"
                      }`}
                      placeholder="Type a message"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => sendMessage()}
                      disabled={!message.trim() && pendingFiles.length === 0}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        message.trim() || pendingFiles.length > 0
                          ? "bg-gradient-to-br from-[#ff8624] to-[#FF943A] hover:bg-[#e8771b] text-white shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                          : darkMode
                            ? "text-gray-500 cursor-not-allowed"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                      title={editingMessage ? "Save Edit" : "Send message"}
                    >
                      <MdSend className="text-base sm:text-lg ml-0.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* NO CHAT SELECTED PLACEHOLDER (Desktop only) */
          <div
            className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 max-lg:hidden ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            <img
              src="/favicon.svg"
              alt="Connecto"
              className="w-20 h-20 rounded-2xl mb-4 shadow-md hover:scale-105 transition-transform"
            />
            <h2
              className={`text-lg font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              Welcome to Connecto - A Realtime Chat App
            </h2>
            <p
              className={`text-sm max-w-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
            >
              Select a user from the sidebar to view their messages or start a
              new conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
