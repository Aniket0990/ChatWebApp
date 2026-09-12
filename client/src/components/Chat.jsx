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
import { socket } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import Avatar from "./Avatar";
import DocumentPreviewModal from "./DocumentPreviewModal";
import Sidebar from "./Sidebar";
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
  FiEye,
  FiDownload,
  FiRefreshCw,
} from "react-icons/fi";
import { BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import { MdSend } from "react-icons/md";

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

  // SOCKET SETUP
  useEffect(() => {
    if (user?.user?._id) {
      socket.emit("setup", user.user._id);
    }
  }, [user]);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("message received", (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const chatId = msg.chat?._id || msg.chat;

      if (currentChat && chatId === currentChat._id) {
        setMessages((prev) => [...prev, msg]);

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

  // AUTO SCROLL (Directly show latest message without scrolling animation)
  useLayoutEffect(() => {
    if (!highlightedId && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;

      const raf = requestAnimationFrame(() => {
        if (messagesContainerRef.current && !highlightedId) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [messages, currentChat, highlightedId]);

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
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/auth/users", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) fetchUsers();
  }, [user?.token, fetchUsers]);

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

      // Mark unread messages as seen + clear sidebar badge for this user + sync lastMessage
      let hasUnseen = false;
      const nonDeleted = messagesRes.data.filter((m) => !m.isDeleted);
      const last = nonDeleted[nonDeleted.length - 1];

      messagesRes.data.forEach((msg) => {
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

      setUsers((prev) =>
        prev.map((x) =>
          x._id === u._id
            ? {
                ...x,
                unreadCount: 0,
                ...(last
                  ? {
                      lastMessage: {
                        content: last.content,
                        hasAttachment: Boolean(last.fileUrl),
                        isMine:
                          (last.sender?._id || last.sender) ===
                          user?.user?._id,
                        createdAt: last.createdAt,
                      },
                    }
                  : {}),
              }
            : x,
        ),
      );
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



  // CLEAR CHAT (for this user only)
  const handleClearChat = async () => {
    setShowClearChatConfirm(false);
    if (!currentChat) return;
    try {
      await axios.delete(`/message/clear/${currentChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
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

  // PINNED MESSAGE CONTENT RENDERER (Highlights @mentions in blue like Karyah v3)
  const renderPinnedContent = (content) => {
    if (!content) return <span className="italic text-gray-400">📄 Attachment</span>;
    const parts = content.split(/(@[a-zA-Z0-9_*~.-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="text-blue-600 dark:text-blue-400 font-medium">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
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
        darkMode ? "dark bg-[#0c1317] text-[#e9edef]" : "bg-[#efeae2] text-gray-800"
      }`}
    >
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
          max-lg:absolute max-lg:inset-0 max-lg:z-30 max-lg:transition-transform max-lg:duration-300 max-lg:animate-slide-in-right ${
          mobileShowChat
            ? "max-lg:translate-x-0"
            : "max-lg:translate-x-full max-lg:pointer-events-none"
        } ${
          darkMode ? "bg-[#0b141a]" : "bg-[#efeae2]"
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
              className={`h-14 sm:h-16 px-3 sm:px-6 border-b flex items-center justify-between shrink-0 shadow-sm z-20 transition-colors duration-200 ${
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
                        : "bg-[#f0f2f5] border-gray-200 text-gray-800 focus-within:border-emerald-500/60 focus-within:bg-white shadow-sm"
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
                                ? "w-7 sm:w-10 h-1 bg-[#2563eb] rounded-full"
                                : "w-3 sm:w-4 h-1 bg-gray-300/80 dark:bg-gray-600 hover:bg-gray-400 rounded-full"
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
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 relative"
            >
              {Object.keys(groupedMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl mb-3 shadow-sm">
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
                        className={`text-[11px] font-medium px-3.5 py-1 rounded-full shadow-sm ${
                          darkMode
                            ? "bg-[#182229] text-[#8696a0]"
                            : "bg-white/95 text-[#54656f] border border-black/[0.05]"
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
                              className="w-8 h-8 rounded-full object-cover shadow-sm text-sm"
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
                              className={`relative px-4 py-2.5 rounded-2xl transition-all shadow-sm border ${
                                isSelf
                                  ? darkMode
                                    ? "bg-[#005c4b] text-[#e9edef] border-transparent rounded-tr-[4px]"
                                    : "bg-[#d9fdd3] text-gray-900 border-black/[0.07] rounded-tr-[4px]"
                                  : darkMode
                                    ? "bg-[#202c33] text-[#e9edef] border-transparent rounded-tl-[4px]"
                                    : "bg-white text-gray-900 border-black/[0.08] rounded-tl-[4px]"
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
                                    className={`cursor-pointer rounded-lg p-2 mb-1.5 border-l-[3px] border-emerald-500 text-xs w-full transition-colors ${
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
                              <div className={`flex items-center justify-between gap-4 mt-2 pt-1 border-t ${darkMode ? "border-white/10" : "border-black/5"}`}>
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
                                          className={`text-base hover:scale-125 transition-transform p-1 rounded-full cursor-pointer ${
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

            {/* EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className={`absolute left-6 z-40 shadow-2xl rounded-2xl border overflow-hidden ${
                  replyingTo || editingMessage ? "bottom-32" : "bottom-20"
                } ${
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
                  if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop =
                      messagesContainerRef.current.scrollHeight;
                  }
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

            {/* WHATSAPP-STYLE INPUT SECTION (Floating Rounded Pill + Preview) */}
            <div
              className={`p-2.5 sm:p-3.5 border-t shrink-0 transition-colors duration-200 ${
                darkMode ? "bg-[#202c33] border-[#222e35]" : "bg-[#efeae2] border-black/[0.04]"
              }`}
            >
              {/* REPLY / EDIT PREVIEW (Floating card above rounded input pill) */}
              {(replyingTo || editingMessage) && (
                <div
                  className={`mb-2 px-4 py-2.5 rounded-2xl border shadow-sm flex items-start justify-between gap-3 animate-fadeIn ${
                    darkMode
                      ? "bg-[#2a3942] border-transparent text-[#e9edef]"
                      : "bg-white border-black/[0.06] text-gray-800"
                  }`}
                >
                  {/* Colored vertical bar */}
                  <span
                    className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${
                      editingMessage ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[11px] font-semibold leading-tight ${
                        editingMessage
                          ? darkMode ? "text-amber-400" : "text-amber-600"
                          : darkMode ? "text-emerald-400" : "text-emerald-600"
                      }`}
                    >
                      {replyingTo ? (
                        <>
                          Replying to{" "}
                          {replyingTo.sender._id === user.user._id
                            ? "You"
                            : replyingTo.sender.name}
                          :
                        </>
                      ) : (
                        "Editing message"
                      )}
                    </div>
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {replyingTo
                        ? replyingTo.content || "📄 Attachment"
                        : editingMessage.content}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      setMessage("");
                    }}
                    className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                      darkMode
                        ? "hover:bg-[#111b21] text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                    }`}
                    title="Cancel"
                  >
                    <FiX className="text-sm" />
                  </button>
                </div>
              )}

              {/* WhatsApp Rounded-Full Input Pill */}
              <div
                className={`rounded-full border transition-all shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 ${
                  darkMode
                    ? "bg-[#2a3942] border-transparent text-[#e9edef] focus-within:ring-1 focus-within:ring-emerald-500/40"
                    : "bg-white border-black/[0.06] text-gray-800 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30"
                }`}
              >
                {/* File Attachment Button (left, WhatsApp style) */}
                <button
                  type="button"
                  onClick={() => chatFileRef.current.click()}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    darkMode
                      ? "text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50"
                      : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
                  }`}
                  title="Attach file"
                >
                  <FiPaperclip className="text-lg sm:text-xl" />
                </button>

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
                  disabled={!message.trim()}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    message.trim()
                      ? "bg-[#00a884] hover:bg-[#008f6f] text-white shadow-md hover:scale-105 active:scale-95 cursor-pointer"
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


    </div>
  );
}

