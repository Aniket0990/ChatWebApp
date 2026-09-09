import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Avatar from "./Avatar";
import Profile from "./Profile";
import {
  FiSearch,
  FiX,
  FiSettings,
  FiMessageCircle,
} from "react-icons/fi";

export default function Sidebar({
  users = [],
  selectedUser = null,
  openChat = () => {},
  darkMode = false,
  setDarkMode = () => {},
  mobileShowChat = false,
}) {
  const { user } = useContext(AuthContext);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);

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
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!user) return null;

  return (
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
            darkMode
              ? "bg-[#111b21] border-[#222e35]"
              : "bg-white border-gray-100/80"
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
          className={`flex-1 overflow-y-auto divide-y transition-colors duration-200 ${
            darkMode
              ? "bg-[#111b21] divide-[#202c33]"
              : "bg-white divide-gray-50"
          }`}
        >
          <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Direct Messages
          </div>
          {users
            .filter((u) =>
              u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()),
            )
            .sort((a, b) => {
              const timeA = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
              const timeB = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
              return timeB - timeA;
            })
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
                          : darkMode
                            ? "bg-gray-600"
                            : "bg-gray-300"
                      }`}
                    ></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + time */}
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm truncate leading-tight ${
                          isSelected
                            ? darkMode
                              ? "text-emerald-400 font-semibold"
                              : "text-emerald-900 font-semibold"
                            : darkMode
                              ? "text-[#e9edef]"
                              : "text-gray-800"
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

                    {/* Row 2: preview + unread badge */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {u.lastMessage ? (
                        <p className="text-xs text-gray-400 truncate leading-tight flex-1">
                          {u.lastMessage.isMine && (
                            <span className="text-gray-500 font-medium">
                              You:{" "}
                            </span>
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
            darkMode
              ? "border-[#222e35] bg-[#111b21]"
              : "border-gray-200/80 bg-white"
          }`}
        >
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

        {/* MOBILE BOTTOM TAB BAR (Chats / Settings) */}
        <div
          className={`lg:hidden border-t flex items-stretch shrink-0 transition-colors duration-200 ${
            darkMode
              ? "border-[#222e35] bg-[#111b21]"
              : "border-gray-200/80 bg-white"
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
      <Profile
        isOpen={showProfileSidebar}
        onClose={() => setShowProfileSidebar(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    </div>
  );
}
