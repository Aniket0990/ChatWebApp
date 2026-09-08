import { useEffect, useState, useContext, useRef, useMemo } from "react";
import axios from "../utils/axios";
import { socket } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import Avatar from "../components/Avatar";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiX,
  FiMoreVertical,
  FiCornerUpLeft,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSearch,
  FiArrowLeft,
  FiMessageCircle,
  FiCamera,
  FiLock,
  FiLogOut,
  FiCheck,
  FiSettings,
  FiEye,
  FiDownload,
} from "react-icons/fi";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { IoCheckmark, IoCheckmarkDone, IoMoon, IoSunny } from "react-icons/io5";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Chat() {
  const { user, setUser, logout } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // User search in sidebar & Dark Mode state
  const [userSearchQuery, setUserSearchQuery] = useState("");
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

  // WhatsApp-style Profile Sidebar & Password modal states
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutInput, setAboutInput] = useState("");

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Logout Confirmation Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Chat header menu & Clear Chat confirmation modal
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  // File drag & drop upload + document preview modal
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, mimeType }

  // Mobile/tablet layout: which panel is visible below lg screens.
  // false = chat list (with bottom tab bar), true = open chat view.
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Message actions & state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState("down");
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const navigate = useNavigate();
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const profileInputRef = useRef(null);
  const chatFileRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // SOCKET SETUP
  useEffect(() => {
    if (user?.user?._id) {
      socket.emit("setup", user.user._id);
    }
  }, [user]);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("message received", (msg) => {
      if (currentChat && msg.chat._id === currentChat._id) {
        setMessages((prev) => [...prev, msg]);

        if (msg.sender._id !== user.user._id) {
          socket.emit("message delivered", {
            messageId: msg._id,
            chatId: msg.chat._id,
          });
          socket.emit("message seen", {
            messageId: msg._id,
            chatId: msg.chat._id,
          });
        }
      }

      // Update the sidebar preview/badge for this sender
      if (msg.sender._id !== user.user._id) {
        const isActiveChat = currentChat && msg.chat._id === currentChat._id;
        setUsers((prev) =>
          prev.map((u) =>
            u._id === msg.sender._id
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
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status: "delivered" } : m,
        ),
      );
    });

    socket.on("message seen", (messageId) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status: "seen" } : m)),
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
    });

    socket.on("message deleted", ({ messageId, isDeletedForEveryone, updatedMsg }) => {
      if (isDeletedForEveryone && updatedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? updatedMsg : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    });

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
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline } : u)),
      );
      setSelectedUser((prev) =>
        prev && prev._id === userId ? { ...prev, isOnline } : prev,
      );
    });

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
    };
  }, [currentChat, user]);

  // AUTO SCROLL
  useEffect(() => {
    if (!highlightedId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // FETCH USERS
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get("/auth/users", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };

    if (user?.token) fetchUsers();
  }, [user]);

  if (!user) return null;

  // OPEN CHAT
  const openChat = async (u) => {
    setSelectedUser(u);
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage("");
    setMobileShowChat(true);

    try {
      const { data } = await axios.post(
        "/chat",
        { userId: u._id },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      setCurrentChat(data);
      socket.emit("join chat", data._id);

      const messagesRes = await axios.get(`/message/${data._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setMessages(messagesRes.data);

      // Mark unread messages as seen + clear sidebar badge for this user
      let hasUnseen = false;
      messagesRes.data.forEach((msg) => {
        if (msg.status !== "seen" && msg.sender._id !== user.user._id) {
          hasUnseen = true;
          socket.emit("message seen", { messageId: msg._id, chatId: data._id });
        }
      });
      if (hasUnseen) {
        setUsers((prev) =>
          prev.map((x) => (x._id === u._id ? { ...x, unreadCount: 0 } : x)),
        );
      }
    } catch (err) {
      toast.error("Failed to load chat");
    }
  };

  // SEND OR EDIT MESSAGE
  const sendMessage = async (fileUrl = null) => {
    if (!message.trim() && !fileUrl) return;

    if (!currentChat) return;

    socket.emit("stop typing", currentChat._id);

    // If in editing mode
    if (editingMessage) {
      try {
        const { data } = await axios.put(
          `/message/${editingMessage._id}`,
          { content: message },
          { headers: { Authorization: `Bearer ${user.token}` } },
        );

        setMessages((prev) =>
          prev.map((m) => (m._id === data._id ? data : m)),
        );
        socket.emit("message edited", data);
        setEditingMessage(null);
        setMessage("");
      } catch (err) {
        console.error("Failed to edit message", err);
      }
      return;
    }

    // Normal send (with optional reply)
    try {
      const { data } = await axios.post(
        "/message",
        {
          content: message,
          chatId: currentChat._id,
          fileUrl,
          replyTo: replyingTo?._id || null,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      socket.emit("new message", data);
      setMessages((prev) => [...prev, data]);
      setMessage("");
      setReplyingTo(null);
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
      uploadFile(droppedFiles[0]);
    }
  };

  // Shared upload helper used by both the picker button and drag & drop
  const uploadFile = async (file) => {
    if (!file || !currentChat) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.info("Uploading file...");
      const { data } = await axios.post("/upload", formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      await sendMessage(data.url);
      toast.success("File sent");
    } catch {
      toast.error("File upload failed");
    }
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
      const { data } = await axios.delete(`/message/${msg._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        data: { mode },
      });

      if (mode === "everyone") {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? data.data : m)),
        );
        socket.emit("message deleted", {
          messageId: msg._id,
          chatId: currentChat._id,
          isDeletedForEveryone: true,
          updatedMsg: data.data,
        });
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // TOGGLE PIN
  const handleTogglePin = async (msg) => {
    try {
      setActiveMenuId(null);
      const { data } = await axios.put(
        `/message/${msg._id}/pin`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

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
      const { data } = await axios.put(
        `/message/${msg._id}/react`,
        { emoji },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

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

  // TOGGLE ACTION MENU WITH DYNAMIC UP/DOWN PLACEMENT
  const handleToggleMenu = (e, msgId) => {
    e.stopPropagation();
    if (activeMenuId === msgId) {
      setActiveMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom > window.innerHeight - 250;
    setMenuPlacement(openUp ? "up" : "down");
    setActiveMenuId(msgId);
  };

  // DETECT SCROLL POSITION (shows immediately as user scrolls away from bottom)
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 20);
  };

  // PINNED MESSAGES LIST
  const pinnedMessages = messages.filter((m) => m.isPinned && !m.isDeleted);
  const currentPinned =
    pinnedMessages.length > 0
      ? pinnedMessages[pinnedIndex % pinnedMessages.length]
      : null;

  // PROFILE UPLOAD
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
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  // UPDATE NAME HANDLER
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
    } catch (err) {
      console.error("Failed to update name", err);
    }
  };

  // UPDATE ABOUT HANDLER
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
    } catch (err) {
      console.error("Failed to update about", err);
    }
  };

  // CHANGE PASSWORD HANDLER
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

  // CONFIRM LOGOUT HANDLER
  const handleConfirmLogout = () => {
    if (user?.user?._id) {
      socket.disconnect();
    }
    logout();
    navigate("/login");
  };

  // CLEAR CHAT (for this user only)
  const handleClearChat = async () => {
    setShowClearChatConfirm(false);
    if (!currentChat) return;
    try {
      await axios.delete(`/message/clear/${currentChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMessages([]);
      toast.success("Chat cleared");
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  // CLOSE CHAT (deselect current user)
  const handleCloseChat = () => {
    setShowChatMenu(false);
    setMobileShowChat(false);
    setSelectedUser(null);
    setCurrentChat(null);
    setMessages([]);
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage("");
    setIsSearching(false);
    setSearchQuery("");
  };

  // SEARCH HELPER: Highlight matching text in message content
  const renderMessageContent = (content) => {
    if (!isSearching || !searchQuery.trim() || !content) return content;
    const regex = new RegExp(
      `(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
      "gi",
    );
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className={`${
            darkMode
              ? "bg-amber-400 text-black font-semibold rounded-xs px-0.5"
              : "bg-yellow-300 text-gray-900 font-medium rounded-xs px-0.5"
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
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

  // DATE HELPERS
  // Sidebar list time: today -> HH:MM, yesterday -> "Yesterday", else date
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
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        darkMode ? "dark bg-[#0c1317] text-[#e9edef]" : "bg-[#f0f2f5] text-gray-800"
      }`}
    >
      {/* SIDEBAR */}
      <div
        className={`w-full lg:w-96 border-r flex flex-col shadow-sm relative overflow-hidden transition-colors duration-200 max-lg:absolute max-lg:inset-0 max-lg:z-40 max-lg:transition-transform max-lg:duration-300 ${
          mobileShowChat ? "max-lg:-translate-x-full" : ""
        } ${
          darkMode ? "bg-[#111b21] border-[#222e35]" : "bg-white border-gray-200"
        }`}
      >
        {/* REGULAR CHAT LIST SIDEBAR */}
        <div className="flex flex-col h-full w-full">
          {/* SIDEBAR TOP HEADER */}
          <div
            className={`px-5 pt-4 pb-2 flex items-center justify-between shrink-0 transition-colors duration-200 ${
              darkMode ? "bg-[#111b21]" : "bg-white"
            }`}
          >
            <h1
              className={`text-xl sm:text-2xl font-bold tracking-tight select-none ${
                darkMode ? "text-emerald-500" : "text-emerald-600"
              }`}
            >
              Friends Chat App
            </h1>
          </div>

          {/* SEARCH BAR (To search user names) */}
          <div
            className={`px-4 py-2 shrink-0 border-b transition-colors duration-200 ${
              darkMode ? "bg-[#111b21] border-[#222e35]" : "bg-white border-gray-100/80"
            }`}
          >
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all shadow-2xs ${
                darkMode
                  ? "bg-[#202c33] border-transparent text-[#e9edef] focus-within:bg-[#202c33]"
                  : "bg-[#f0f2f5] border-transparent text-gray-800 focus-within:border-emerald-500/40 focus-within:bg-white"
              }`}
            >
              <FiSearch className="text-gray-400 text-sm shrink-0" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search or start a new chat"
                className={`w-full bg-transparent text-xs placeholder-gray-400 focus:outline-none ${
                  darkMode ? "text-[#e9edef]" : "text-gray-800"
                }`}
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery("")}
                  className={`p-0.5 rounded-full cursor-pointer ${
                    darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <FiX className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* DIRECT MESSAGES LIST */}
          <div
            className={`flex-1 overflow-y-auto divide-y transition-colors duration-200 ${
              darkMode ? "bg-[#111b21] divide-[#202c33]" : "bg-white divide-gray-50"
            }`}
          >
            <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Direct Messages
            </div>
            {users
              .filter((u) =>
                u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()),
              )
              .map((u) => {
                const isSelected = selectedUser?._id === u._id;
                return (
                  <div
                    key={u._id}
                    onClick={() => openChat(u)}
                    className={`px-4 py-3 flex items-center gap-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? darkMode
                          ? "bg-[#2a3942] border-l-4 border-emerald-500"
                          : "bg-emerald-50/80 border-l-4 border-emerald-600"
                        : darkMode
                          ? "hover:bg-[#202c33]"
                          : "hover:bg-gray-50/80"
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
                            : darkMode ? "bg-gray-600" : "bg-gray-300"
                        }`}
                      ></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + time (time always on this line) */}
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate leading-tight ${
                            isSelected
                              ? darkMode ? "text-emerald-400 font-semibold" : "text-emerald-900 font-semibold"
                              : darkMode ? "text-[#e9edef]" : "text-gray-800"
                          }`}
                        >
                          {u.name}
                        </p>
                        {u.lastMessage?.createdAt && (
                          <span
                            className={`text-[10px] whitespace-nowrap shrink-0 leading-tight ${
                              u.unreadCount > 0
                                ? darkMode
                                  ? "text-emerald-400 font-semibold"
                                  : "text-emerald-600 font-semibold"
                                : darkMode
                                  ? "text-gray-500"
                                  : "text-gray-400"
                            }`}
                          >
                            {formatListTime(u.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Row 2: preview + unread badge (aligned with preview line) */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {u.lastMessage ? (
                          <p className="text-xs text-gray-400 truncate leading-tight flex-1">
                            {u.lastMessage.isMine && (
                              <span className="text-gray-500 font-medium">You: </span>
                            )}
                            {u.lastMessage.hasAttachment
                              ? "📄 Attachment"
                              : u.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 truncate leading-tight flex-1">
                            {u.isOnline ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Online
                              </span>
                            ) : u.lastSeen ? (
                              `Last seen ${new Date(u.lastSeen).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            ) : (
                              "Offline"
                            )}
                          </p>
                        )}

                        {u.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">
                            {u.unreadCount > 99 ? "99+" : u.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* SIDEBAR FOOTER (Profile Section with Settings Button) — desktop only */}
          <div
            className={`border-t p-3 shrink-0 shadow-xs transition-colors duration-200 hidden lg:block ${
              darkMode ? "border-[#222e35] bg-[#111b21]" : "border-gray-200/80 bg-white"
            }`}
          >
            {/* Profile Row: Photo on left, Name & Email next, Setting button on right */}
            <div className="flex items-center justify-between px-2 py-0.5">
              <div
                onClick={() => setShowProfileSidebar(true)}
                className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1 py-0.5"
                title="View Profile / Settings"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={user.user.profilePic}
                    name={user.user.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500 transition text-lg"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${
                      darkMode ? "border-[#111b21]" : "border-white"
                    }`}
                  ></span>
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-semibold text-sm truncate leading-tight transition ${
                      darkMode
                        ? "text-[#e9edef] group-hover:text-emerald-400"
                        : "text-gray-800 group-hover:text-emerald-700"
                    }`}
                  >
                    {user.user.name}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                    {user.user.email}
                  </p>
                </div>
              </div>

              {/* Settings Button (replacing exit button) */}
              <button
                type="button"
                onClick={() => setShowProfileSidebar(true)}
                className={`p-2 rounded-full transition cursor-pointer shrink-0 ml-1 ${
                  darkMode
                    ? "text-gray-400 hover:text-emerald-400 hover:bg-[#202c33]"
                    : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
                }`}
                title="Settings / Edit Profile"
              >
                <FiSettings className="text-lg" />
              </button>
            </div>
          </div>

          {/* MOBILE BOTTOM TAB BAR (Chats / Settings) — WhatsApp style */}
          <div
            className={`lg:hidden border-t flex items-stretch shrink-0 transition-colors duration-200 ${
              darkMode ? "border-[#222e35] bg-[#111b21]" : "border-gray-200/80 bg-white"
            }`}
          >
            <button
              onClick={() => setShowProfileSidebar(false)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors cursor-pointer ${
                !showProfileSidebar
                  ? darkMode
                    ? "text-emerald-400"
                    : "text-emerald-600"
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
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : "text-gray-400"
              }`}
            >
              <FiSettings className="text-xl" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* WHATSAPP-STYLE PROFILE PANEL (SLIDE DRAWER) */}
        <div
          className={`absolute inset-0 z-30 flex flex-col transition-transform duration-300 ease-in-out ${
            darkMode ? "bg-[#111b21] text-[#e9edef]" : "bg-white text-gray-800"
          } ${
            showProfileSidebar
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
              darkMode ? "bg-[#202c33] border-b border-[#222e35] text-white" : "bg-emerald-600 text-white"
            }`}
          >
            <button
              onClick={() => setShowProfileSidebar(false)}
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
              <div className={`border-b pb-3 ${darkMode ? "border-[#222e35]" : "border-gray-200"}`}>
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
                          darkMode ? "hover:bg-[#202c33]" : "hover:bg-emerald-50"
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
                        <span className="text-emerald-500 text-base shrink-0">
                          😊
                        </span>
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
                          setAboutInput(
                            user.user.about || "What's happening?",
                          );
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
              <div className={`border-b pb-3 ${darkMode ? "border-[#222e35]" : "border-gray-200"}`}>
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
                          darkMode ? "hover:bg-[#202c33]" : "hover:bg-emerald-50"
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
              <div className={`border-b pb-3 ${darkMode ? "border-[#222e35]" : "border-gray-200"}`}>
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
                {/* Dark Theme Toggle (Matching reference image 2) */}
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
      </div>

      {/* CHAT MAIN CONTAINER */}
      <div
        onDragOver={handleGlobalDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200
          max-lg:absolute max-lg:inset-0 max-lg:z-30 max-lg:transition-transform max-lg:duration-300 max-lg:animate-slide-in-right ${
          mobileShowChat
            ? "max-lg:translate-x-0"
            : "max-lg:translate-x-full max-lg:pointer-events-none"
        } ${
          darkMode ? "bg-[#0b141a]" : "bg-[#f9fafb]"
        }`}
      >
        {selectedUser ? (
          <>
            {/* FILE DRAG & DROP OVERLAY (Karyah Style) */}
            {isDraggingFile && (
              <div className="absolute inset-0 z-[100] bg-white/30 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-emerald-500 m-2 rounded-xl pointer-events-none animate-fadeIn">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <FiPaperclip className="w-10 h-10 text-emerald-500 animate-bounce" />
                </div>
                <h3
                  className={`text-xl font-bold ${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
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
              className={`h-14 sm:h-16 px-3 sm:px-6 border-b flex items-center justify-between shrink-0 shadow-2xs z-20 transition-colors duration-200 ${
                darkMode ? "bg-[#202c33] border-[#222e35]" : "bg-white border-gray-200/80"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                {/* BACK ARROW (mobile/tablet only — returns to chat list) */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className={`lg:hidden p-2 -ml-1 rounded-full transition cursor-pointer shrink-0 ${
                    darkMode
                      ? "text-gray-300 hover:bg-[#2a3942]"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Back to chats"
                >
                  <FiArrowLeft className="text-xl" />
                </button>

                {/* User Info — collapsed on mobile only while search is open;
                    tablet keeps it visible */}
                <div
                  className={`flex items-center gap-2.5 min-w-0 ${
                    isSearching ? "max-sm:hidden" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar
                      src={selectedUser.profilePic}
                      name={selectedUser.name}
                      className={`w-9 h-9 rounded-full object-cover ring-1 ${
                        darkMode ? "ring-[#2a3942]" : "ring-gray-200"
                      } text-base`}
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border ${
                        darkMode ? "border-[#202c33]" : "border-white"
                      } ${
                        selectedUser.isOnline ? "bg-emerald-500" : (darkMode ? "bg-gray-600" : "bg-gray-300")
                      }`}
                    ></span>
                  </div>

                  <div>
                    <h3
                      className={`font-semibold text-sm leading-none ${
                        darkMode ? "text-[#e9edef]" : "text-gray-800"
                      }`}
                    >
                      {selectedUser.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-none">
                      {typing ? (
                        <span className="text-emerald-600 font-medium animate-pulse">
                          Typing...
                        </span>
                      ) : selectedUser.isOnline ? (
                        <span className="text-emerald-600">Online</span>
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Icon / Search Input on Right Corner */}
              <div
                className={`flex items-center gap-2 min-w-0 ${
                  isSearching ? "max-sm:flex-1" : ""
                }`}
              >
                {isSearching ? (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border animate-fadeIn transition-all ${
                      darkMode
                        ? "bg-[#111b21] border-[#222e35] text-[#e9edef] focus-within:border-emerald-500/50"
                        : "bg-[#f0f2f5] border-gray-200 text-gray-800 focus-within:border-emerald-500/60 focus-within:bg-white shadow-2xs"
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
                            darkMode ? "text-emerald-400" : "text-emerald-700"
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
                          ? "text-gray-400 hover:text-emerald-400 hover:bg-[#202c33]"
                          : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
                      }`}
                      title="Chat options"
                    >
                      <FiMoreVertical className="text-lg" />
                    </button>

                    {showChatMenu && (
                      <div
                        className={`absolute top-full mt-1.5 right-0 z-40 w-48 rounded-xl shadow-xl border py-1.5 text-xs animate-fadeIn ${
                          darkMode
                            ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                            : "bg-white border-gray-100 text-gray-700 shadow-lg"
                        }`}
                      >
                        {/* Search Messages */}
                        <button
                          onClick={() => {
                            setShowChatMenu(false);
                            setIsSearching(true);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <FiSearch
                            className={`text-sm ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <span>Search messages</span>
                        </button>

                        {/* Clear Chat (for this user only) */}
                        <button
                          onClick={() => {
                            setShowChatMenu(false);
                            setShowClearChatConfirm(true);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
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
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
                            darkMode
                              ? "hover:bg-[#111b21] text-[#e9edef]"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <FiX
                            className={`text-sm ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <span>Close chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PINNED MESSAGES BANNER (Karyah Style) */}
            {currentPinned && (
              <div
                className={`px-6 py-2 border-b flex items-center justify-between text-xs shadow-2xs z-10 animate-fadeIn ${
                  darkMode
                    ? "bg-[#182229] border-[#222e35] text-[#e9edef]"
                    : "bg-[#fff9f3] border-amber-100/80 text-gray-700"
                }`}
              >
                <div
                  onClick={() => scrollToMessage(currentPinned._id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
                >
                  <BsPinAngleFill className="text-amber-500 text-sm shrink-0 group-hover:scale-110 transition-transform" />
                  <span
                    className={`font-semibold shrink-0 ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {currentPinned.sender._id === user.user._id
                      ? "You:"
                      : `${currentPinned.sender.name}:`}
                  </span>
                  <span
                    className={`truncate transition-colors ${
                      darkMode
                        ? "text-gray-300 group-hover:text-white"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    {currentPinned.content || "📄 Attachment"}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {/* Pagination Dots */}
                  {pinnedMessages.length > 1 && (
                    <div className="flex items-center gap-1">
                      {pinnedMessages.map((_, idx) => (
                        <span
                          key={idx}
                          onClick={() => setPinnedIndex(idx)}
                          className={`cursor-pointer transition-all duration-200 ${
                            idx === pinnedIndex % pinnedMessages.length
                              ? "w-4 h-1.5 bg-blue-600 rounded-full"
                              : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400 rounded-full"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Cycle / Refresh Button */}
                  {pinnedMessages.length > 1 && (
                    <button
                      onClick={() =>
                        setPinnedIndex(
                          (prev) => (prev + 1) % pinnedMessages.length,
                        )
                      }
                      className="text-gray-400 hover:text-gray-700 transition p-1"
                      title="Next Pinned Message"
                    >
                      <FiRefreshCw className="text-xs" />
                    </button>
                  )}

                  {/* Unpin Button */}
                  <button
                    onClick={() => handleTogglePin(currentPinned)}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                    title="Unpin Message"
                  >
                    <FiX className="text-sm" />
                  </button>
                </div>
              </div>
            )}

            {/* CHAT MESSAGES STREAM */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 relative"
            >
              {Object.keys(groupedMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl mb-3 shadow-2xs">
                    💬
                  </div>
                  <p className="font-medium text-gray-600">No messages yet</p>
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
                        className={`text-[11px] font-medium px-3.5 py-1 rounded-full shadow-2xs ${
                          darkMode
                            ? "bg-[#182229] text-[#8696a0]"
                            : "bg-[#e9f0f8] text-[#4b6584]"
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

                      return (
                        <div
                          key={m._id}
                          id={`msg-${m._id}`}
                          className={`flex items-start gap-2 group transition-all duration-300 ${
                            isSelf ? "justify-end" : "justify-start"
                          } ${isHighlighted ? "highlight-pulse" : ""}`}
                        >
                          {/* Partner Avatar for received messages */}
                          {!isSelf && (
                            <Avatar
                              src={m.sender.profilePic}
                              name={m.sender.name}
                              className="w-8 h-8 rounded-full object-cover shadow-2xs text-sm"
                            />
                          )}

                          <div
                            className={`flex flex-col max-w-md md:max-w-lg ${
                              isSelf ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Sender Name above received message */}
                            {!isSelf && (
                              <span
                                className={`text-[12px] font-medium ml-1 mb-1 ${
                                  darkMode
                                    ? "text-emerald-400"
                                    : "text-gray-600"
                                }`}
                              >
                                {m.sender.name}
                              </span>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`relative px-4 py-2.5 rounded-2xl transition-all shadow-2xs border ${
                                isSelf
                                  ? darkMode
                                    ? "bg-[#005c4b] text-[#e9edef] border-transparent rounded-tr-xs"
                                    : "bg-[#dff7ea] text-gray-800 border-[#c6f0d7] rounded-tr-xs"
                                  : darkMode
                                    ? "bg-[#202c33] text-[#e9edef] border-transparent rounded-tl-xs"
                                    : "bg-white text-gray-800 border-gray-200/70 rounded-tl-xs"
                              }`}
                            >
                              {/* Top Bar inside bubble: Reply preview badge + Quick Pin / 3-dots actions */}
                              <div className="flex items-start justify-between gap-4 mb-1">
                                {/* Reply Quote Box if message is a reply */}
                                {m.replyTo && (
                                  <div
                                    onClick={() =>
                                      scrollToMessage(m.replyTo._id)
                                    }
                                    className={`cursor-pointer rounded-lg p-2 mb-1.5 border-l-3 border-emerald-500 text-xs w-full transition-colors ${
                                      darkMode
                                        ? "bg-black/30 hover:bg-black/40 text-gray-300"
                                        : "bg-black/5 hover:bg-black/10 text-gray-600"
                                    }`}
                                  >
                                    <div
                                      className={`font-semibold text-[11px] ${
                                        darkMode
                                          ? "text-emerald-400"
                                          : "text-emerald-700"
                                      }`}
                                    >
                                      {m.replyTo.sender?._id === user.user._id
                                        ? "You"
                                        : m.replyTo.sender?.name || "User"}
                                    </div>
                                    <div className="truncate text-[11px] mt-0.5">
                                      {m.replyTo.content || "📄 Attachment"}
                                    </div>
                                  </div>
                                )}

                                {/* Hover icons on top right: Pin + 3 dots menu */}
                                {/* NOTE: opacity must stay on the icon buttons, NOT on this container —
                                    an opacity < 1 creates a stacking context that traps the dropdown's
                                    z-index, letting later message bubbles paint over the open menu. */}
                                <div className="ml-auto flex items-center gap-1">
                                  {/* Pin indicator or button */}
                                  <button
                                    onClick={() => handleTogglePin(m)}
                                    className={`p-1 rounded hover:bg-black/5 transition opacity-70 group-hover:opacity-100 ${
                                      m.isPinned
                                        ? "text-amber-500"
                                        : "text-gray-400 hover:text-gray-700"
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

                                  {/* Three Dots Menu Button */}
                                  <div className="relative message-action-menu-container">
                                    <button
                                      onClick={(e) =>
                                        handleToggleMenu(e, m._id)
                                      }
                                      className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-black/5 transition opacity-70 group-hover:opacity-100"
                                      title="Message actions"
                                    >
                                      <FiMoreVertical className="text-xs" />
                                    </button>

                                    {/* Action Dropdown Menu (Karyah Style) */}
                                    {isMenuOpen && (
                                      <div
                                        className={`absolute z-50 ${
                                          menuPlacement === "up"
                                            ? "bottom-full mb-1"
                                            : "top-full mt-1"
                                        } ${
                                          isSelf ? "right-0" : "left-0"
                                        } w-44 rounded-xl shadow-xl border py-1.5 text-xs animate-fadeIn ${
                                          darkMode
                                            ? "bg-[#202c33] border-[#2a3942] text-[#e9edef]"
                                            : "bg-white border-gray-100 text-gray-700 shadow-lg"
                                        }`}
                                      >
                                        {/* Reply */}
                                        <button
                                          onClick={() => handleStartReply(m)}
                                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
                                            darkMode
                                              ? "hover:bg-[#111b21] text-[#e9edef]"
                                              : "hover:bg-gray-50 text-gray-700"
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

                                        {/* Edit (only self & not deleted) */}
                                        {isSelf && !m.isDeleted && (
                                          <button
                                            onClick={() => handleStartEdit(m)}
                                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
                                              darkMode
                                                ? "hover:bg-[#111b21] text-[#e9edef]"
                                                : "hover:bg-gray-50 text-gray-700"
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

                                        {/* Pin / Unpin */}
                                        <button
                                          onClick={() => handleTogglePin(m)}
                                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
                                            darkMode
                                              ? "hover:bg-[#111b21] text-[#e9edef]"
                                              : "hover:bg-gray-50 text-gray-700"
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

                                        {/* Delete for Everyone (only sender) */}
                                        {isSelf && !m.isDeleted && (
                                          <button
                                            onClick={() =>
                                              handleDeleteMessage(m, "everyone")
                                            }
                                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
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
                                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 font-medium transition cursor-pointer ${
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
                              </div>

                              {/* Message Content */}
                              {m.isDeleted ? (
                                <span className="italic text-gray-400 text-xs flex items-center gap-1.5 py-1">
                                  This message was deleted
                                  </span>
                              ) : m.fileUrl ? (
                                <div className="py-1">
                                  {(() => {
                                    const info = getAttachmentInfo(m.fileUrl);
                                    return info.isImage ? (
                                      /* Images: click to open preview modal */
                                      <img
                                        src={m.fileUrl}
                                        alt={info.name}
                                        onClick={() =>
                                          setPreviewFile({ url: m.fileUrl })
                                        }
                                        className="max-w-[240px] max-h-[240px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                                      />
                                    ) : (
                                      /* Docs: Karyah-style card with preview & download */
                                      <div
                                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition max-w-[260px] ${
                                          darkMode
                                            ? "bg-black/20 border-[#2a3942]"
                                            : "bg-black/[0.03] border-gray-200/80"
                                        }`}
                                      >
                                        <div
                                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
                                          style={{
                                            background: `${info.color}18`,
                                            color: info.color,
                                          }}
                                        >
                                          {info.type.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className={`text-xs font-medium truncate leading-tight ${
                                              darkMode ? "text-gray-100" : "text-gray-800"
                                            }`}
                                            title={info.name}
                                          >
                                            {info.name}
                                          </p>
                                          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                            {info.label}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() =>
                                              setPreviewFile({ url: m.fileUrl })
                                            }
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                              darkMode
                                                ? "bg-white/5 hover:bg-white/10 text-gray-300"
                                                : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                                            }`}
                                            title="Preview"
                                          >
                                            <FiEye size={13} />
                                          </button>
                                          {/* Hide download for own sent files */}
                                          {!isSelf && (
                                            <button
                                              onClick={() =>
                                                handleDownloadAttachment(m.fileUrl)
                                              }
                                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                                darkMode
                                                  ? "bg-white/5 hover:bg-white/10 text-gray-300"
                                                  : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                                              }`}
                                              title="Download"
                                            ><FiDownload size={13} />
                                            </button>
                                          )}
                                        </div>
</div>
                                    )
                                  })()}
                                  {m.content && (
                                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                                      {renderMessageContent(m.content)
                                      }
                                    </p>
                                    )}
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {renderMessageContent(m.content)}
                                </p>
                              )}

                              {/* Bottom Row: Reaction button & emoji chips + timestamp & ticks */}
                              <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-black/5">
                                {/* Left: Reaction Trigger Button & Emojis */}
                                <div className="relative message-reaction-container flex items-center gap-1.5">
                                  {!m.isDeleted && (
                                    <button
                                      onClick={() =>
                                        setActiveReactionId(
                                          isReactionOpen ? null : m._id,
                                        )
                                      }
                                      className="text-gray-400 hover:text-amber-500 transition p-0.5 rounded hover:bg-black/5"
                                      title="React"
                                    >
                                      <FiSmile className="text-xs" />
                                    </button>
                                  )}

                                  {/* Floating Quick Reaction Bar */}
                                  {isReactionOpen && (
                                    <div
                                      className={`absolute bottom-6 z-50 flex items-center gap-1 px-2.5 py-1.5 rounded-full shadow-lg border animate-fadeIn whitespace-nowrap ${
                                        isSelf ? "right-0" : "left-0"
                                      } ${
                                        darkMode
                                          ? "bg-[#202c33] border-[#2a3942]"
                                          : "bg-white border-gray-200/90 shadow-md"
                                      }`}
                                    >
                                      {quickReactions.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() =>
                                            handleReaction(m, emoji)
                                          }
                                          className={`text-base hover:scale-130 transition-transform p-1 rounded-full cursor-pointer ${
                                            darkMode
                                              ? "hover:bg-[#111b21]"
                                              : "hover:bg-gray-100"
                                          }`}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
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
                                        const userReacted =
                                          m.reactions.some(
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
                                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                                              userReacted
                                                ? darkMode
                                                  ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                                                  : "bg-emerald-100 border-emerald-300 text-emerald-800"
                                                : darkMode
                                                  ? "bg-[#202c33] border-[#2a3942] text-[#e9edef] hover:bg-[#111b21]"
                                                  : "bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-100"
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
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-normal shrink-0">
                                  {m.isEdited && !m.isDeleted && (
                                    <span className="text-gray-400 italic">
                                      (edited)
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
                                    <span className="flex items-center">
                                      {m.status === "sent" && (
                                        <IoCheckmark className="text-gray-400 text-xs" />
                                      )}
                                      {m.status === "delivered" && (
                                        <IoCheckmarkDone className="text-gray-400 text-xs" />
                                      )}
                                      {m.status === "seen" && (
                                        <IoCheckmarkDone className="text-emerald-500 text-xs" />
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

            {/* REPLY / EDIT PREVIEW BAR */}
            {(replyingTo || editingMessage) && (
              <div
                className={`px-6 py-2 border-t flex items-center justify-between text-xs animate-fadeIn shrink-0 ${
                  darkMode
                    ? "bg-[#111b21] border-[#222e35] text-[#e9edef]"
                    : "bg-emerald-50/70 border-emerald-100 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {replyingTo ? (
                    <>
                      <FiCornerUpLeft
                        className={`text-sm shrink-0 ${
                          darkMode
                            ? "text-emerald-400"
                            : "text-emerald-600"
                        }`}
                      />
                      <span
                        className={`font-semibold shrink-0 ${
                          darkMode
                            ? "text-emerald-400"
                            : "text-emerald-700"
                        }`}
                      >
                        Replying to{" "}
                        {replyingTo.sender._id === user.user._id
                          ? "You"
                          : replyingTo.sender.name}
                        :
                      </span>
                      <span
                        className={`truncate ${
                          darkMode
                            ? "text-gray-400"
                            : "text-gray-600 font-normal"
                        }`}
                      >
                        "{replyingTo.content || "Attachment"}"
                      </span>
                    </>
                  ) : (
                    <>
                      <FiEdit2
                        className={`text-sm shrink-0 ${
                          darkMode
                            ? "text-emerald-400"
                            : "text-emerald-600"
                        }`}
                      />
                      <span
                        className={`font-semibold shrink-0 ${
                          darkMode
                            ? "text-emerald-400"
                            : "text-emerald-700"
                        }`}
                      >
                        Editing message:
                      </span>
                      <span
                        className={`truncate ${
                          darkMode
                            ? "text-gray-400"
                            : "text-gray-600 font-normal"
                        }`}
                      >
                        "{editingMessage.content}"
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                    setMessage("");
                  }}
                  className={`p-1 rounded-full transition cursor-pointer ${
                    darkMode
                      ? "hover:bg-[#202c33] text-gray-400 hover:text-gray-200"
                      : "hover:bg-emerald-100 text-gray-500 hover:text-gray-800"
                  }`}
                  title="Cancel"
                >
                  <FiX className="text-sm" />
                </button>
              </div>
            )}

            {/* EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className={`absolute bottom-20 left-6 z-40 shadow-2xl rounded-2xl border overflow-hidden ${
                  darkMode ? "border-[#2a3942]" : "border-gray-200"
                }`}
              >
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setMessage((prev) => prev + emojiObject.emoji);
                  }}
                  theme={darkMode ? "dark" : "light"}
                  width={340}
                  height={400}
                />
              </div>
            )}

            {/* DOCUMENT PREVIEW MODAL */}
            {previewFile && (
              <DocumentPreviewModal
                url={previewFile.url}
                darkMode={darkMode}
                onClose={() => setPreviewFile(null)}
                /**
                 * Resolve a stored url into something the browser can open:
                 * - relative /api/... docs -> absolute url to our server (auth handled by caller)
                 * - cloudinary urls -> fetched as blob (bypasses restricted-type 401)
                 */
                getFileUrl={async (u) => {
                  if (u?.startsWith("/")) {
                    // Local doc — add token as query param so <iframe>/<img> can load it
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

            {/* FLOATING SCROLL DOWN BUTTON */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({
                    behavior: "smooth",
                  });
                  setShowScrollBottom(false);
                }}
                className={`absolute right-6 bottom-24 z-30 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all hover:scale-110 active:scale-95 animate-fadeIn cursor-pointer ${
                  darkMode
                    ? "bg-[#202c33] text-gray-200 hover:text-emerald-400 border-[#2a3942]"
                    : "bg-white text-gray-700 hover:text-emerald-600 border-gray-200"
                }`}
                title="Scroll to Latest Message"
              >
                <FiChevronDown className="text-xl" />
              </button>
            )}

            {/* KARYAH-STYLE INPUT BAR */}
            <div
              className={`p-2.5 sm:p-4 border-t shrink-0 transition-colors duration-200 ${
                darkMode ? "bg-[#202c33] border-[#222e35]" : "bg-white border-gray-200/80"
              }`}
            >
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all shadow-2xs ${
                  darkMode
                    ? "bg-[#2a3942] border-transparent"
                    : "bg-[#f8fafc] border-gray-200/90 focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20"
                }`}
              >
                {/* Emoji Picker Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`emoji-toggle-button p-1.5 rounded-full transition text-gray-400 hover:text-amber-500 ${
                    darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-200/50"
                  }`}
                  title="Insert emoji"
                >
                  <FiSmile className="text-lg" />
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
                  className={`flex-1 bg-transparent border-none px-2 py-1 text-sm placeholder-gray-400 focus:outline-none ${
                    darkMode ? "text-[#e9edef]" : "text-gray-800"
                  }`}
                  placeholder="Type a message..."
                />

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={chatFileRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    uploadFile(file);
                    if (e.target) e.target.value = "";
                  }}
                />

                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => chatFileRef.current.click()}
                  className={`p-1.5 rounded-full transition ${
                    darkMode
                      ? "text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50"
                      : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
                  }`}
                  title="Attach file"
                >
                  <FiPaperclip className="text-lg" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!message.trim()}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${
                    message.trim()
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:scale-105"
                      : darkMode
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={editingMessage ? "Save Edit" : "Send"}
                >
                  <FiSend className="text-sm translate-x-px" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* NO CHAT SELECTED PLACEHOLDER */
          <div
            className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm text-emerald-500 ${
                darkMode ? "bg-emerald-950/40" : "bg-emerald-50"
              }`}
            >
              💬
            </div>
            <h2
              className={`text-lg font-semibold ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Welcome to Chat Box
            </h2>
            <p
              className={`text-sm max-w-sm mt-1 ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Select a user from the sidebar to view their messages or start a new conversation.
            </p>
          </div>
        )}
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
                <FiLock className={darkMode ? "text-emerald-400" : "text-emerald-600"} /> Change Password
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

      {/* CLEAR CHAT CONFIRMATION MODAL */}
      {showClearChatConfirm && (
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
                <FiTrash2 />
              </div>
              <div>
                <h3
                  className={`font-semibold text-base ${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Clear chat?
                </h3>
                <p
                  className={`text-xs mt-0.5 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  All messages in this chat will be deleted for you only. The
                  other person can still see them.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearChatConfirm(false)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                  darkMode
                    ? "text-gray-300 hover:bg-[#2a3942]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-xs cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
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
    </div>
  );
}

