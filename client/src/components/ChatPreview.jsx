/**
 * Stylised Connecto app window used on the landing page — matches the
 * "Connections → conversation" preview from the design reference.
 * Built from markup and authentic portrait avatars to follow the palette.
 *
 * variant: "desktop" (full app window) | "phone" (device frame)
 */
import {
  FiUsers,
  FiUserPlus,
  FiInbox,
  FiSearch,
  FiPhone,
  FiVideo,
  FiMoreVertical,
  FiPaperclip,
  FiSmile,
  FiSend,
  FiCheck,
  FiArrowLeft,
  FiFileText,
} from "react-icons/fi";

const TABS = [
  { icon: <FiUsers className="text-[14px]" />, label: "Connections", active: true },
  { icon: <FiUserPlus className="text-[14px]" />, label: "Send Request" },
  { icon: <FiInbox className="text-[14px]" />, label: "Received" },
];

const CONNECTIONS = [
  {
    name: "robot",
    meta: "robot@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    color: "#FF7A1A",
    online: true,
  },
  {
    name: "user1",
    meta: "user1@gmail.com",
    initial: "U",
    color: "#FF7A1A",
    online: true,
    active: true,
  },
  {
    name: "Sophia",
    meta: "sophia@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    color: "#D9534F",
    online: false,
  },
  {
    name: "Rohit",
    meta: "rohit@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    color: "#5B8AD6",
    online: true,
  },
  {
    name: "Team Project",
    meta: "8 members",
    color: "#39B982",
    group: true,
  },
];

function PreviewAvatar({ name, avatar, initial, color = "#FF7A1A", size = 28, online = false, group = false }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
          onError={(e) => {
            e.target.style.display = "none";
            if (e.target.nextSibling) e.target.nextSibling.style.display = "grid";
          }}
        />
      ) : null}
      <span
        className="grid place-items-center rounded-full font-bold text-white shadow-xs shrink-0"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          background: color,
          fontSize: Math.max(9, size * 0.44),
          display: avatar ? "none" : "grid",
        }}
      >
        {group ? <FiUsers className="text-[13px]" /> : initial || name.charAt(0).toUpperCase()}
      </span>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-[1.5px] border-white bg-[#39B982] shrink-0"
          style={{ width: Math.max(8, size * 0.32), height: Math.max(8, size * 0.32) }}
        />
      )}
      {!online && !group && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-[1.5px] border-white bg-[#A0A0A0] shrink-0"
          style={{ width: Math.max(8, size * 0.32), height: Math.max(8, size * 0.32) }}
        />
      )}
    </span>
  );
}

function Bubble({ children, time, mine = false }) {
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span
        className={`max-w-[88%] whitespace-pre-line rounded-[14px] px-3 py-2 text-[10.5px] leading-snug sm:max-w-[85%] sm:px-3.5 sm:text-[11px] ${
          mine
            ? "rounded-br-[3px] bg-[#FFEFE5] text-[#1F1F1F]"
            : "rounded-bl-[3px] border border-[#EAE2D5] bg-white text-[#1F1F1F] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]"
        }`}
      >
        {children}
      </span>
      <span className="mt-1 flex items-center gap-1 text-[9px] text-[#888888]">
        {time}
        {mine && <FiCheck className="text-[9.5px] text-[#888888]" />}
      </span>
    </div>
  );
}

function DesktopPreview() {
  return (
    <div className="w-full overflow-hidden rounded-[24px] border border-[#EAE2D5] bg-white shadow-[0_22px_55px_-20px_rgba(36,36,36,0.12)]">
      <div className="flex h-[400px] sm:h-[430px]">
        {/* Unified Left Sidebar — percentage width so the window never outgrows
            narrow phone screens, clamped so desktop keeps its 220px rail. */}
        <div className="flex w-[46%] min-w-[150px] max-w-[220px] shrink-0 flex-col border-r border-[#EAE2D5] bg-white p-3 sm:p-3.5">
          {/* Brand header */}
          <div className="flex items-center gap-2 pb-3">
            <img src="/logo.svg" alt="" className="h-5 w-5 shrink-0" style={{ width: 20, height: 20 }} />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#1F1F1F]">
              Connecto
            </span>
          </div>

          {/* Navigation tabs */}
          <div className="space-y-1 pb-3">
            {TABS.map(({ icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[10.5px] font-medium transition sm:gap-2.5 sm:px-2.5 sm:text-[11px] ${
                  active
                    ? "bg-[#FFEFE2] font-semibold text-[#FF7A1A]"
                    : "text-[#555555] hover:bg-[#FAF6F0]"
                }`}
              >
                <span className={active ? "text-[#FF7A1A]" : "text-[#777777]"}>
                  {icon}
                </span>
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="mb-2.5 flex items-center gap-2 rounded-[8px] bg-[#FAF6F0] px-2 py-1.5 text-[10px] text-[#888888] sm:px-2.5">
            <FiSearch className="text-[11px] text-[#888888] shrink-0" />
            <span className="truncate">Search connections...</span>
          </div>

          {/* Connections list */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {CONNECTIONS.map((c) => (
              <div
                key={c.name}
                className={`flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 transition sm:gap-2.5 sm:px-2 ${
                  c.active ? "bg-[#FFF4EB]" : "hover:bg-[#FAF6F0]"
                }`}
              >
                <PreviewAvatar
                  name={c.name}
                  avatar={c.avatar}
                  initial={c.initial}
                  color={c.color}
                  online={c.online}
                  group={c.group}
                  size={26}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-semibold text-[#1F1F1F] sm:text-[10.5px]">
                    {c.name}
                  </span>
                  <span className="block truncate text-[9px] text-[#888888]">
                    {c.meta}
                  </span>
                </span>
                {c.online && !c.group && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39B982] shrink-0" />
                )}
                {!c.online && !c.group && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B0B0B0] shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Conversation Panel */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#FAF7F2]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[#EAE2D5] bg-white px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
            <PreviewAvatar name="user1" initial="U" color="#FF7A1A" size={28} online />
            <span className="min-w-0">
              <span className="block truncate text-[11.5px] font-bold text-[#1F1F1F]">
                user1
              </span>
              <span className="flex items-center gap-1 text-[9px] font-medium text-[#39B982]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#39B982]" />
                Online
              </span>
            </span>
            <span className="ml-auto flex items-center gap-2.5 text-[12.5px] text-[#777777] sm:gap-3.5 sm:text-[13px]">
              <FiSearch className="hidden cursor-pointer hover:text-ink sm:inline-block" />
              <FiPhone className="cursor-pointer hover:text-ink" />
              <FiVideo className="hidden cursor-pointer hover:text-ink sm:inline-block" />
              <FiMoreVertical className="cursor-pointer hover:text-ink" />
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-hidden p-3 sm:p-4">
            <Bubble time="10:18 pm">{"Hi\nHow are you?"}</Bubble>
            <Bubble mine time="10:19 pm">
              {"Hey!\nI'm good. How about you?"}
            </Bubble>
            <Bubble time="10:20 pm">{"Great!\nLet's catch up tomorrow."}</Bubble>
            <Bubble mine time="10:21 pm">
              {"Sure! 😊"}
            </Bubble>
          </div>

          {/* Bottom input */}
          <div className="flex items-center gap-2 border-t border-[#EAE2D5] bg-white px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
            <FiPaperclip className="hidden cursor-pointer text-[14px] text-[#777777] hover:text-[#FF7A1A] sm:inline-block" />
            <FiSmile className="hidden cursor-pointer text-[14px] text-[#777777] hover:text-[#FF7A1A] sm:inline-block" />
            <span className="min-w-0 flex-1 truncate rounded-full border border-[#EAE2D5] bg-[#FAF6F0] px-3 py-1.5 text-[10.5px] text-[#888888] sm:px-4">
              Type a message...
            </span>
            <span className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-[#FF7A1A] text-[11px] text-white shadow-xs transition hover:bg-[#E9680D]">
              <FiSend />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="w-[208px] max-w-full rounded-[32px] border-[6px] border-[#222222] bg-[#222222] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
      <div className="overflow-hidden rounded-[26px] bg-[#FAF7F2]">
        {/* Notch / Speaker */}
        <div className="flex justify-center bg-[#222222] pt-1.5 pb-1">
          <span className="h-1 w-11 rounded-full bg-white/30" />
        </div>

        {/* Group conversation header */}
        <div className="flex items-center gap-2 border-b border-[#EAE2D5] bg-white px-2.5 py-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FF7A1A] text-[9px] text-white">
            <FiArrowLeft />
          </span>
          <PreviewAvatar name="Project Team" color="#39B982" size={24} group />
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-bold text-[#1F1F1F]">
              Project Team
            </span>
            <span className="block text-[8px] text-[#888888]">12 members</span>
          </span>
          <span className="ml-auto h-2 w-2 rounded-full bg-[#39B982]" />
        </div>

        <div className="space-y-2 p-2.5">
          <div className="flex items-start gap-1.5">
            <PreviewAvatar
              name="Rohit"
              avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
              color="#5B8AD6"
              size={18}
            />
            <div className="min-w-0">
              <span className="block text-[8px] font-bold text-[#1F1F1F]">
                Rohit
              </span>
              <p className="mt-0.5 rounded-[12px] rounded-tl-[3px] border border-[#EAE2D5] bg-white px-2 py-1 text-[8.5px] leading-snug text-[#1F1F1F]">
                Here&apos;s the latest update
              </p>
              <div className="mt-1 flex items-center gap-1.5 rounded-[9px] border border-[#EAE2D5] bg-white px-2 py-1">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] bg-[#FDECE0] text-[#FF7A1A]">
                  <FiFileText className="text-[9px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[8px] font-bold text-[#1F1F1F]">
                    Project_Plan.pdf
                  </span>
                  <span className="block text-[7px] text-[#888888]">
                    2.4 MB
                  </span>
                </span>
                <FiCheck className="ml-auto text-[8.5px] text-[#FF7A1A]" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-[#1F1F1F]">Sophia</span>
            <p className="mt-0.5 rounded-[12px] rounded-tr-[3px] bg-[#FFEFE5] px-2 py-1 text-[8.5px] text-[#1F1F1F]">
              Looks good! 😊
            </p>
          </div>

          <div className="flex items-start gap-1.5">
            <PreviewAvatar
              name="You"
              initial="Y"
              color="#FF7A1A"
              size={18}
            />
            <div className="min-w-0">
              <span className="block text-[8px] font-bold text-[#1F1F1F]">
                You
              </span>
              <p className="mt-0.5 rounded-[12px] rounded-tl-[3px] border border-[#EAE2D5] bg-white px-2 py-1 text-[8.5px] text-[#1F1F1F]">
                Great work team! 🎉
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-[#EAE2D5] bg-white px-2.5 py-2">
          <FiPaperclip className="text-[11px] text-[#777777]" />
          <span className="min-w-0 flex-1 truncate rounded-full border border-[#EAE2D5] bg-[#FAF6F0] px-2 py-1 text-[8.5px] text-[#888888]">
            Type a message...
          </span>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FF7A1A] text-[9px] text-white">
            <FiSend />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPreview({ variant = "desktop" }) {
  return variant === "phone" ? <PhonePreview /> : <DesktopPreview />;
}
