import { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import Avatar from "./Avatar";
import axios from "../utils/axios";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiSearch,
  FiX,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiCheck,
  FiXCircle,
  FiClock,
} from "react-icons/fi";

const TABS = [
  { id: "all", label: "All Connections", icon: FiUsers },
  { id: "send", label: "Send Request", icon: FiUserPlus },
  { id: "received", label: "Received", icon: FiUserCheck },
];

export default function ConnectionPanel({
  isOpen,
  onClose,
  darkMode,
  onConnectionAccepted, // callback so Chat.jsx can refresh sidebar users
  onSelectUser, // callback to open chat with connected user
}) {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("all");

  // All Connections tab
  const [connections, setConnections] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Send Request tab
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

  // Received tab
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const authHeader = { Authorization: `Bearer ${user?.token}` };

  // ---------- FETCH helpers ----------

  const fetchConnections = useCallback(async () => {
    if (!user?.token) return;
    setLoadingAll(true);
    try {
      const { data } = await axios.get("/connection/all", {
        headers: authHeader,
      });
      setConnections(data);
    } catch {
      toast.error("Failed to load connections");
    } finally {
      setLoadingAll(false);
    }
  }, [user?.token]);

  const fetchReceived = useCallback(async () => {
    if (!user?.token) return;
    setLoadingReceived(true);
    try {
      const { data } = await axios.get("/connection/received", {
        headers: authHeader,
      });
      setReceivedRequests(data);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoadingReceived(false);
    }
  }, [user?.token]);

  // Refresh on open / tab change
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "all") fetchConnections();
    if (activeTab === "received") fetchReceived();
    if (activeTab === "send") {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen, activeTab]);

  // ---------- SEARCH (debounced) ----------
  useEffect(() => {
    if (activeTab !== "send") return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get(
          `/connection/search?q=${encodeURIComponent(searchQuery)}`,
          { headers: authHeader }
        );
        setSearchResults(data);
      } catch {
        toast.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, activeTab]);

  // ---------- ACTIONS ----------

  const sendRequest = async (receiverId) => {
    setSendingTo(receiverId);
    try {
      await axios.post(`/connection/send/${receiverId}`, {}, { headers: authHeader });
      toast.success("Connection request sent!");
      // Update local state to reflect pending status
      setSearchResults((prev) =>
        prev.map((u) =>
          u._id === receiverId
            ? {
                ...u,
                connectionStatus: { status: "pending", isSender: true },
              }
            : u
        )
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send request");
    } finally {
      setSendingTo(null);
    }
  };

  const acceptRequest = async (connectionId, senderName) => {
    setProcessingId(connectionId);
    try {
      await axios.put(`/connection/accept/${connectionId}`, {}, { headers: authHeader });
      toast.success(`Connected with ${senderName}!`);
      setReceivedRequests((prev) => prev.filter((r) => r._id !== connectionId));
      onConnectionAccepted?.(); // refresh sidebar user list
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const declineRequest = async (connectionId) => {
    setProcessingId(connectionId);
    try {
      await axios.put(`/connection/decline/${connectionId}`, {}, { headers: authHeader });
      toast.info("Request declined");
      setReceivedRequests((prev) => prev.filter((r) => r._id !== connectionId));
    } catch {
      toast.error("Failed to decline request");
    } finally {
      setProcessingId(null);
    }
  };

  // ---------- RENDER HELPERS ----------

  const dm = darkMode;

  const cardBg = dm ? "bg-[#202c33]" : "bg-gray-50";
  const cardHover = dm ? "hover:bg-[#2a3942]" : "hover:bg-gray-100";
  const textPrimary = dm ? "text-[#e9edef]" : "text-gray-800";
  const textSub = "text-gray-400";
  const panelBg = dm ? "bg-[#111b21]" : "bg-white";
  const borderColor = dm ? "border-[#222e35]" : "border-gray-200";
  const inputBg = dm ? "bg-[#202c33] text-[#e9edef]" : "bg-[#f0f2f5] text-gray-800";

  // ---------- JSX ----------
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col transition-transform duration-300 ease-in-out ${panelBg} ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* HEADER */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 border-b shrink-0 ${borderColor} ${
          dm ? "bg-[#202c33]" : "bg-emerald-600"
        }`}
      >
        <button
          onClick={onClose}
          className={`p-1.5 rounded-full transition cursor-pointer ${
            dm
              ? "text-gray-300 hover:text-white hover:bg-white/10"
              : "text-white/80 hover:text-white hover:bg-white/20"
          }`}
        >
          <FiArrowLeft className="text-xl" />
        </button>
        <h2
          className={`text-base font-semibold tracking-tight ${
            dm ? textPrimary : "text-white"
          }`}
        >
          Connections
        </h2>
      </div>

      {/* TABS */}
      <div
        className={`flex border-b shrink-0 ${borderColor} ${dm ? "bg-[#111b21]" : "bg-white"}`}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer relative ${
                isActive
                  ? dm
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : dm
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="text-base" />
              <span className="leading-tight text-center">{tab.label}</span>
              {isActive && (
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${
                    dm ? "bg-emerald-400" : "bg-emerald-600"
                  }`}
                />
              )}
              {/* Badge for received */}
              {tab.id === "received" && receivedRequests.length > 0 && (
                <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                  {receivedRequests.length > 9 ? "9+" : receivedRequests.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto">

        {/* ===== ALL CONNECTIONS TAB ===== */}
        {activeTab === "all" && (
          <div>
            {loadingAll ? (
              <LoadingSpinner dm={dm} />
            ) : connections.length === 0 ? (
              <EmptyState
                dm={dm}
                icon={<FiUsers className="text-4xl mb-3 text-gray-400" />}
                title="No connections yet"
                subtitle='Click "Send Request" to find people'
              />
            ) : (
              <div className={`divide-y ${dm ? "divide-[#202c33]" : "divide-gray-100"}`}>
                {connections.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      if (onSelectUser) {
                        onSelectUser(c);
                        onClose();
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 ${cardHover} transition-colors cursor-pointer`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={c.profilePic}
                        name={c.name}
                        className="w-11 h-11 rounded-full object-cover text-lg"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                          dm ? "border-[#111b21]" : "border-white"
                        } ${c.isOnline ? "bg-emerald-500" : dm ? "bg-gray-600" : "bg-gray-300"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{c.name}</p>
                      <p className={`text-xs truncate ${textSub}`}>{c.email}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        dm
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Connected
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== SEND REQUEST TAB ===== */}
        {activeTab === "send" && (
          <div>
            {/* Search input */}
            <div className={`p-3 sticky top-0 z-10 ${panelBg} border-b ${borderColor}`}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${inputBg} border ${
                  dm ? "border-transparent focus-within:border-emerald-500/40" : "border-transparent focus-within:border-emerald-500/40 focus-within:bg-white"
                } transition-all`}
              >
                <FiSearch className="text-gray-400 shrink-0 text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className={`flex-1 bg-transparent text-xs focus:outline-none placeholder-gray-400 ${textPrimary}`}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <FiX className="text-xs" />
                  </button>
                )}
              </div>
            </div>

            {!searchQuery.trim() ? (
              <EmptyState
                dm={dm}
                icon={<FiSearch className="text-4xl mb-3 text-gray-400" />}
                title="Search for people"
                subtitle="Type a name or email to find users"
              />
            ) : searching ? (
              <LoadingSpinner dm={dm} />
            ) : searchResults.length === 0 ? (
              <EmptyState
                dm={dm}
                icon={<FiXCircle className="text-4xl mb-3 text-gray-400" />}
                title="No users found"
                subtitle="Try a different name or email"
              />
            ) : (
              <div className={`divide-y ${dm ? "divide-[#202c33]" : "divide-gray-100"}`}>
                {searchResults.map((u) => {
                  const cs = u.connectionStatus;
                  const isPending = cs?.status === "pending";
                  const isAccepted = cs?.status === "accepted";
                  const isSending = sendingTo === u._id;

                  return (
                    <div
                      key={u._id}
                      className={`flex items-center gap-3 px-4 py-3 ${cardHover} transition-colors`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={u.profilePic}
                          name={u.name}
                          className="w-11 h-11 rounded-full object-cover text-lg"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                            dm ? "border-[#111b21]" : "border-white"
                          } ${u.isOnline ? "bg-emerald-500" : dm ? "bg-gray-600" : "bg-gray-300"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{u.name}</p>
                        <p className={`text-xs truncate ${textSub}`}>{u.email}</p>
                      </div>

                      {/* Action button */}
                      {isAccepted ? (
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                            dm
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <FiCheck className="text-xs" /> Connected
                        </span>
                      ) : isPending ? (
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                            dm
                              ? "bg-amber-900/30 text-amber-400"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          <FiClock className="text-xs" /> Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => sendRequest(u._id)}
                          disabled={isSending}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                            dm
                              ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                              : "border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isSending ? "Sending..." : "Connect"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== RECEIVED REQUESTS TAB ===== */}
        {activeTab === "received" && (
          <div>
            {loadingReceived ? (
              <LoadingSpinner dm={dm} />
            ) : receivedRequests.length === 0 ? (
              <EmptyState
                dm={dm}
                icon={<FiUserCheck className="text-4xl mb-3 text-gray-400" />}
                title="No pending requests"
                subtitle="When someone sends you a request, it'll appear here"
              />
            ) : (
              <div className={`divide-y ${dm ? "divide-[#202c33]" : "divide-gray-100"}`}>
                {receivedRequests.map((req) => {
                  const isProcessing = processingId === req._id;
                  return (
                    <div
                      key={req._id}
                      className={`flex items-center gap-3 px-4 py-3 ${cardHover} transition-colors`}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={req.sender?.profilePic}
                          name={req.sender?.name}
                          className="w-11 h-11 rounded-full object-cover text-lg"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                            dm ? "border-[#111b21]" : "border-white"
                          } ${
                            req.sender?.isOnline
                              ? "bg-emerald-500"
                              : dm
                              ? "bg-gray-600"
                              : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>
                          {req.sender?.name}
                        </p>
                        <p className={`text-xs truncate ${textSub}`}>{req.sender?.email}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Wants to connect</p>
                      </div>

                      {/* Accept / Decline */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => acceptRequest(req._id, req.sender?.name)}
                          disabled={isProcessing}
                          title="Accept"
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${
                            dm
                              ? "bg-emerald-700/50 text-emerald-300 hover:bg-emerald-600"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <FiCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => declineRequest(req._id)}
                          disabled={isProcessing}
                          title="Decline"
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${
                            dm
                              ? "bg-red-900/30 text-red-400 hover:bg-red-700"
                              : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Helper sub-components ----------

function LoadingSpinner({ dm }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  );
}

function EmptyState({ dm, icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon}
      <p className={`text-sm font-semibold ${dm ? "text-gray-300" : "text-gray-600"}`}>
        {title}
      </p>
      <p className="text-xs text-gray-400 mt-1 leading-snug">{subtitle}</p>
    </div>
  );
}
