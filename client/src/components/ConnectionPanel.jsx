import { useState, useEffect } from "react";
import Avatar from "./Avatar";
import {
  useAcceptConnection,
  useCancelConnectionRequest,
  useConnections,
  useDeclineConnection,
  useReceivedRequests,
  useRemoveConnection,
  useSearchUsers,
  useSendConnectionRequest,
} from "../hooks/useConnections";
import {
  FiArrowLeft,
  FiSearch,
  FiX,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiUsers,
  FiCheck,
  FiXCircle,
  FiClock,
} from "react-icons/fi";

const TABS = [
  { id: "all", label: "Connections", icon: FiUsers },
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
  const [activeTab, setActiveTab] = useState("all");
  const [userToRemove, setUserToRemove] = useState(null);

  // Send Request tab
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // ---------- SERVER STATE (React Query) ----------
  // Queries are scoped to the open panel / active tab so we never fetch tabs
  // the user hasn't opened. The received-requests query is shared with the
  // sidebar badge, so the badge and the list stay in sync from one request.
  const { data: connections = [], isLoading: loadingAll } = useConnections(
    isOpen && activeTab === "all",
  );
  const { data: receivedRequests = [], isLoading: loadingReceived } =
    useReceivedRequests(isOpen);
  const { data: searchResults = [], isFetching: searching } = useSearchUsers(
    debouncedQuery,
    { enabled: isOpen && activeTab === "send" },
  );

  // ---------- MUTATIONS ----------
  const sendMutation = useSendConnectionRequest();
  const cancelMutation = useCancelConnectionRequest();
  const acceptMutation = useAcceptConnection();
  const declineMutation = useDeclineConnection();
  const removeMutation = useRemoveConnection();

  // Per-row pending state comes from the mutation itself instead of extra state.
  const sendingTo = sendMutation.isPending ? sendMutation.variables : null;
  const cancellingId = cancelMutation.isPending
    ? cancelMutation.variables
    : null;
  const processingId = acceptMutation.isPending
    ? acceptMutation.variables?.connectionId
    : declineMutation.isPending
      ? declineMutation.variables
      : null;

  // ---------- EFFECTS ----------

  // Debounce the search box before it hits the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ---------- ACTIONS ----------

  // Reset the search box when (re)entering the "Send Request" tab or closing.
  const selectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "send") {
      setSearchQuery("");
      setDebouncedQuery("");
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    onClose?.();
  };

  const sendRequest = (receiverId) => sendMutation.mutate(receiverId);

  const cancelRequest = (target) => cancelMutation.mutate(target);

  const acceptRequest = (connectionId, senderName) =>
    acceptMutation.mutate(
      { connectionId, senderName },
      { onSettled: () => onConnectionAccepted?.() },
    );

  const declineRequest = (connectionId) => declineMutation.mutate(connectionId);

  // ---------- RENDER HELPERS ----------

  const dm = darkMode;

  const cardBg = dm ? "bg-[#202c33]" : "bg-[#F3EEDD]";
  const cardHover = dm ? "hover:bg-[#2a3942]" : "hover:bg-[#EFE8D6]";
  const textPrimary = dm ? "text-[#e9edef]" : "text-gray-800";
  const textSub = "text-gray-400";
  const panelBg = dm ? "bg-[#111b21]" : "bg-[#F8F4E8]";
  const borderColor = dm ? "border-[#222e35]" : "border-[#E8E0CE]";
  const inputBg = dm ? "bg-[#202c33] text-[#e9edef]" : "bg-[#EDE7D6] text-gray-800";

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
          dm ? "bg-[#202c33]" : "bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white"
        }`}
      >
        <button
          onClick={handleClose}
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

      {/* TABS — Karyah v-3 pill style */}
      <div
        className={`px-1 py-2.5 border-b shrink-0 ${borderColor} ${
          dm ? "bg-[#111b21]" : "bg-[#F8F4E8]"
        }`}
      >
        <div
          className={`p-1 rounded-2xl flex items-center gap-1 ${
            dm
              ? "bg-[#1c272e] border border-[#2a3942]"
              : "bg-[#F3EDE2] border border-[#E8DFD3]"
          }`}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? dm
                      ? "bg-[#2a3942] text-[#FF8624] shadow-sm font-semibold"
                      : "bg-white text-[#FF8624] shadow-sm font-semibold"
                    : dm
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon
                  className={`text-sm shrink-0 ${
                    isActive
                      ? "text-[#FF8624]"
                      : dm
                        ? "text-gray-400"
                        : "text-gray-400"
                  }`}
                />
                <span className="truncate">{tab.label}</span>
                {/* Badge for received requests — filled circle count */}
                {tab.id === "received" && receivedRequests.length > 0 && (
                  <span className="min-w-[17px] h-[17px] px-1 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#ff8624] to-[#FF943A] text-white text-[10px] font-bold shrink-0">
                    {receivedRequests.length > 9
                      ? "9+"
                      : receivedRequests.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                          dm
                            ? "bg-green-950/40 text-green-400 border-green-800/50"
                            : "bg-green-50 text-green-600 border-green-200"
                        }`}
                      >Connected
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToRemove(c);
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                          dm
                            ? "text-gray-400 hover:text-rose-400 hover:bg-rose-500/15"
                            : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={`Remove ${c.name} from connections`}
                      >
                        <FiUserX className="text-base" />
                      </button>
                    </div>
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
                  dm
                    ? "border-transparent focus-within:border-[#FF8624]"
                    : "border-transparent focus-within:border-[#FF8624] focus-within:bg-[#F8F4E8]"
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
                          className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                            dm
                              ? "bg-green-950/40 text-green-400 border-green-800/50"
                              : "bg-green-50 text-green-600 border-green-200"
                          }`}
                        >Connected
                        </span>
                      ) : isPending ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                              dm
                                ? "bg-amber-900/30 text-amber-400"
                                : "bg-amber-50 text-amber-600 border border-amber-200/60"
                            }`}
                          > Pending
                          </span>
                          {cs?.isSender !== false && (
                            <button
                              onClick={() =>
                                cancelRequest(cs?.connectionId || u._id)
                              }
                              disabled={
                                cancellingId === (cs?.connectionId || u._id)
                              }
                              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                dm
                                  ? "border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                                  : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title="Cancel connection request"
                            >
                              {cancellingId === (cs?.connectionId || u._id)
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => sendRequest(u._id)}
                          disabled={isSending}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                            dm
                              ? "border-[#FF8624] text-[#FF8624] hover:bg-[#e8873a] hover:text-white"
                              : "border-[#FF8624] text-[#FF8624] hover:bg-[#e8873a] hover:text-white"
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
                              ? "bg-[#FF8624]/50 text-[#FF8624] hover:bg-[#e8873a]"
                              : "bg-[#fff4e6] text-[#FF8624] hover:bg-[#e8873a] hover:text-white"
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

      {/* REMOVE CONNECTION CONFIRMATION POPUP */}
      {userToRemove && (
        <div
          onClick={() => !removeMutation.isPending && setUserToRemove(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/5 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transform transition-all animate-scaleUp ${
              dm
                ? "bg-[#111b21] border-[#222e35] text-[#e9edef]"
                : "bg-white border-gray-100 text-gray-800"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon Badge */}
              <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mb-3.5">
                <FiUserX className="text-2xl" />
              </div>

              <h3 className="text-base font-bold">Remove Connection</h3>
              <p className={`text-xs mt-1.5 mb-4 leading-relaxed ${textSub}`}>
                Are you sure you want to remove{" "}
                <span className="font-semibold text-rose-500">
                  {userToRemove.name}
                </span>{" "}
                from your connections? They will no longer appear in your active chats or direct messages.
              </p>

              {/* User Card Preview */}
              <div
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-5 ${
                  dm ? "bg-[#202c33]" : "bg-gray-50 border border-gray-100"
                }`}
              >
                <Avatar
                  src={userToRemove.profilePic}
                  name={userToRemove.name}
                  className="w-10 h-10 rounded-full object-cover text-base shrink-0"
                />
                <div className="text-left min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${textPrimary}`}>
                    {userToRemove.name}
                  </p>
                  <p className={`text-xs truncate ${textSub}`}>
                    {userToRemove.email}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => setUserToRemove(null)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    dm
                      ? "border-[#2a3942] text-gray-300 hover:bg-[#202c33]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    removeMutation.mutate(
                      {
                        connectionId: userToRemove.connectionId,
                        userName: userToRemove.name,
                      },
                      {
                        onSettled: () => {
                          setUserToRemove(null);
                          onConnectionAccepted?.();
                        },
                      },
                    );
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
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
    </div>
  );
}

// ---------- Helper sub-components ----------

function LoadingSpinner({ dm }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 rounded-full border-2 border-[#FF8624] border-t-transparent animate-spin" />
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
