/**
 * Stylised Connecto app window used on the landing page — matches the
 * "Connections → conversation" preview from the design reference.
 * Built from markup (no image assets) so it always follows the palette.
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
} from "react-icons/fi";

const RAIL = [
  { icon: <FiUsers className="text-[13px]" />, label: "Connections", active: true },
  { icon: <FiUserPlus className="text-[13px]" />, label: "Send Request" },
  { icon: <FiInbox className="text-[13px]" />, label: "Received" },
];

const CONNECTIONS = [
  { name: "robot", meta: "robot@gmail.com", color: "#FF7A1A", online: true },
  { name: "user1", meta: "user1@gmail.com", color: "#FF7A1A", online: true, active: true },
  { name: "Sophia", meta: "sophia@gmail.com", color: "#D9534F", online: false },
  { name: "Rohit", meta: "rohit@gmail.com", color: "#5B8AD6", online: true },
  { name: "Team Project", meta: "8 members", color: "#39B982", group: true },
];

function Avatar({ name, color, size = 24, online = false, group = false }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className="grid place-items-center rounded-full font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: color,
          fontSize: Math.max(8, size * 0.42),
        }}
      >
        {group ? <FiUsers className="text-[11px]" /> : name.charAt(0).toUpperCase()}
      </span>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-[1.5px] border-white"
          style={{ width: size * 0.36, height: size * 0.36, background: "#39B982" }}
        />
      )}
      {!online && !group && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-[1.5px] border-white bg-muted/60"
          style={{ width: size * 0.36, height: size * 0.36 }}
        />
      )}
    </span>
  );
}

function Bubble({ children, time, mine = false }) {
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <span
        className={`max-w-[85%] whitespace-pre-line rounded-[14px] px-2.5 py-1.5 text-[10px] leading-snug ${
          mine
            ? "rounded-br-[4px] bg-brand-100 text-ink"
            : "rounded-bl-[4px] border border-line bg-white text-ink"
        }`}
      >
        {children}
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-[8px] text-muted">
        {time}
        {mine && <span className="text-brand">✓✓</span>}
      </span>
    </div>
  );
}

function DesktopPreview() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-soft">
      {/* App header */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <img src="/logo.svg" alt="" className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
          Connecto
        </span>
        <span className="ml-auto hidden gap-3 text-[12px] text-muted sm:flex">
          <FiSearch />
          <FiUsers />
        </span>
      </div>

      <div className="flex h-[352px] sm:h-[400px]">
        {/* Rail */}
        <div className="hidden w-[112px] shrink-0 flex-col gap-1 border-r border-line p-2 sm:flex">
          {RAIL.map(({ icon, label, active }) => (
            <span
              key={label}
              className={`flex items-center gap-2 rounded-[10px] px-2 py-2 text-[10px] font-medium ${
                active ? "bg-brand-100 text-brand" : "text-muted"
              }`}
            >
              {icon}
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>

        {/* Connections list */}
        <div className="hidden w-[168px] shrink-0 border-r border-line p-2 md:block">
          <div className="mb-2 flex items-center gap-1.5 rounded-[8px] bg-[#F6F3EE] px-2 py-1.5 text-[9px] text-muted">
            <FiSearch className="text-[11px]" />
            Search connections...
          </div>
          <div className="space-y-0.5">
            {CONNECTIONS.map((c) => (
              <div
                key={c.name}
                className={`flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 ${
                  c.active ? "bg-brand-50" : ""
                }`}
              >
                <Avatar
                  name={c.name}
                  color={c.color}
                  online={c.online}
                  group={c.group}
                  size={24}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-semibold text-ink">
                    {c.name}
                  </span>
                  <span className="block truncate text-[8.5px] text-muted">
                    {c.meta}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#FDFBF7]">
          <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2.5">
            <Avatar name="user1" color="#FF7A1A" size={26} online />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-ink">
                user1
              </span>
              <span className="block text-[9px] font-medium text-online">
                Online
              </span>
            </span>
            <span className="ml-auto flex items-center gap-3 text-[13px] text-muted">
              <FiSearch />
              <FiVideo />
              <FiPhone />
              <FiMoreVertical />
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-hidden p-3">
            <Bubble time="10:18 pm">{"Hi\nHow are you?"}</Bubble>
            <Bubble mine time="10:18 pm">
              {"Hey!\nI'm good. How about you?"}
            </Bubble>
            <Bubble time="10:20 pm">{"Great!\nLet's catch up tomorrow."}</Bubble>
            <Bubble mine time="10:21 pm">
              {"Sure! 😊"}
            </Bubble>
          </div>

          <div className="flex items-center gap-2.5 border-t border-line bg-white px-3 py-2.5">
            <FiPaperclip className="text-[13px] text-muted" />
            <FiSmile className="text-[13px] text-muted" />
            <span className="min-w-0 flex-1 truncate rounded-full border border-line bg-[#FDFBF7] px-3 py-1.5 text-[10px] text-muted">
              Type a message...
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-[11px] text-white">
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
    <div className="w-[198px] rounded-[30px] border-[6px] border-[#2A2A2A] bg-[#2A2A2A] shadow-soft">
      <div className="overflow-hidden rounded-[24px] bg-[#FDFBF7]">
        <div className="flex justify-center bg-[#2A2A2A] pt-1.5">
          <span className="h-1 w-10 rounded-full bg-white/30" />
        </div>

        {/* Group conversation header */}
        <div className="flex items-center gap-2 border-b border-line bg-white px-2.5 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[10px] text-white">
            <FiArrowLeft />
          </span>
          <Avatar name="Project Team" color="#8E6CE4" size={24} group />
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-semibold text-ink">
              Project Team
            </span>
            <span className="block text-[8.5px] text-muted">8 members</span>
          </span>
        </div>

        <div className="space-y-2 p-2.5">
          <div className="flex items-start gap-1.5">
            <Avatar name="Naman" color="#FF7A1A" size={18} />
            <div className="min-w-0">
              <span className="block text-[8px] font-semibold text-ink">
                Naman
              </span>
              <p className="mt-0.5 rounded-[12px] rounded-tl-[4px] border border-line bg-white px-2 py-1.5 text-[9px] leading-snug text-ink">
                Here&apos;s the latest updates
              </p>
              <div className="mt-1 flex items-center gap-1.5 rounded-[10px] border border-line bg-white px-2 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-brand-50 text-brand">
                  <FiPaperclip className="text-[10px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[8.5px] font-semibold text-ink">
                    Project_Plan.pdf
                  </span>
                  <span className="block text-[7.5px] text-muted">
                    2.4 MB
                  </span>
                </span>
                <FiCheck className="ml-auto text-[9px] text-brand" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[8px] font-semibold text-ink">Riya</span>
            <p className="mt-0.5 rounded-[12px] rounded-tr-[4px] bg-brand-100 px-2 py-1.5 text-[9px] text-ink">
              Looks good! 😊
            </p>
          </div>

          <div className="flex items-start gap-1.5">
            <Avatar name="Ravi" color="#39B982" size={18} />
            <div className="min-w-0">
              <span className="block text-[8px] font-semibold text-ink">
                Ravi
              </span>
              <p className="mt-0.5 rounded-[12px] rounded-tl-[4px] border border-line bg-white px-2 py-1.5 text-[9px] text-ink">
                Great work team! 🎉
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line bg-white px-3 py-2.5">
          <FiPaperclip className="text-[12px] text-muted" />
          <span className="min-w-0 flex-1 truncate rounded-full border border-line bg-[#FDFBF7] px-2.5 py-1.5 text-[9px] text-muted">
            Type a message...
          </span>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[10px] text-white">
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
