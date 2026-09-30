import { Fragment, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import SEO from "../components/SEO";
import ConnectoLogo from "../components/ConnectoLogo";
import ChatPreview from "../components/ChatPreview";
import {
  FiArrowRight,
  FiCheck,
  FiMenu,
  FiX,
  FiInstagram,
  FiLinkedin,
  FiGithub,
  FiMail,
} from "react-icons/fi";
import { FaCommentDots, FaPeopleGroup, FaUserGroup } from "react-icons/fa6";

/* ----------------------------- shared bits ----------------------------- */

/* Hero buttons matching target design: rounded-[14px] */
const BTN_PRIMARY =
  "inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] bg-brand px-8 text-[15px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]";
const BTN_GHOST =
  "inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] border border-[#DDCFC0] bg-white px-8 text-[15px] font-semibold text-ink transition hover:border-brand/50 hover:text-brand active:scale-[0.98]";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

const FEATURES = [
  {
    icon: <FaUserGroup className="text-[26px]" />,
    title: "Connect with People",
    text: "Send and receive connection requests and build your network inside Connecto.",
  },
  {
    icon: <FaCommentDots className="text-[26px]" />,
    title: "One-to-One Conversations",
    text: "Chat privately with your connections through simple, real-time messaging.",
  },
  {
    icon: <FaPeopleGroup className="text-[26px]" />,
    title: "Bring Everyone Together",
    text: "Create groups and communicate with multiple people in one shared conversation.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect",
    text: "Find people and send a connection request.",
  },
  {
    n: "02",
    title: "Chat",
    text: "Start a private conversation once you're connected.",
  },
  {
    n: "03",
    title: "Create a Group",
    text: "Bring multiple connections together and chat as a group.",
  },
];

const BUILT_ITEMS = [
  "Private conversations",
  "Group conversations",
  "Simple connection management",
  "Real-time messaging",
  "Clean and easy to use interface",
];

/** Soft peach eyebrow pill matching Image 1: Simple • Secure • Always Connected */
function Eyebrow({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#F7D3B4] px-5 py-1.5 text-[12.5px] font-semibold text-[#B85507] ${className}`}
    >
      {children}
    </span>
  );
}

function CheckItem({ children }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-white shadow-xs">
        <FiCheck className="text-[11px]" strokeWidth={3.5} />
      </span>
      <span className="text-[14.5px] font-medium text-ink/90">{children}</span>
    </li>
  );
}

/** Smooth ambient peach/warm glow washes */
function HeroBackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-32 -top-20 h-[600px] w-[600px] animate-float-slower rounded-full bg-[#FF7A1A]/[0.08] blur-[120px]" />
      <div className="absolute -right-20 top-10 h-[580px] w-[580px] animate-float-slow rounded-full bg-[#FF7A1A]/[0.10] blur-[120px]" />
      <div className="absolute left-1/3 top-[45%] h-[500px] w-[500px] animate-float-slower rounded-full bg-[#FF7A1A]/[0.06] blur-[130px]" />
    </div>
  );
}

/* -------------------------------- navbar -------------------------------- */

function Navbar() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const startHref = user ? "/chat" : "/register";

  // Logo acts as a "home" link: close the mobile menu and jump back to the top of the page.
  const goHome = () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled ? "bg-cream/95 backdrop-blur-[3px] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" onClick={goHome} aria-label="Connecto home">
          <ConnectoLogo size={30} wordClassName="text-[19px]" />
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14.5px] font-medium text-ink transition hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-7 md:flex">
          {!user && (
            <Link
              to="/login"
              className="text-[14.5px] font-medium text-ink transition hover:text-brand"
            >
              Login
            </Link>
          )}
          <Link
            to={startHref}
            className="inline-flex h-[42px] items-center justify-center rounded-[12px] bg-brand px-6 text-[14.5px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]"
          >
            {user ? "Open Chat" : "Get Started"}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-ink transition hover:bg-brand/10 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-cream px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-ink"
              >
                {link.label}
              </a>
            ))}
            {!user && (
              <Link
                to="/login"
                className="text-[15px] font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
            )}
            <Link
              to={startHref}
              className="inline-flex h-[44px] items-center justify-center rounded-[12px] bg-brand px-6 text-[14.5px] font-semibold text-white shadow-glow"
              onClick={() => setOpen(false)}
            >
              {user ? "Open Chat" : "Get Started"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* --------------------------------- hero --------------------------------- */

function Hero() {
  const { user } = useContext(AuthContext);
  const startHref = user ? "/chat" : "/register";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF5EE] via-[#FDF2E8] to-[#FCEEE2]/80">
      <HeroBackgroundDecor />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pb-16 lg:pt-12">
        {/* Left column */}
        <div className="min-w-0">
          <Eyebrow>Simple &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Always Connected</Eyebrow>

          <h1 className="mt-6 text-[40px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[48px] lg:text-[52px]">
            Connect. Chat.
            <br />
            Stay <span className="text-brand">Connected.</span>
          </h1>

          <p className="mt-5 max-w-[440px] text-[15.5px] leading-relaxed text-muted">
            Connecto makes it simple to connect with people, have private
            conversations, and bring everyone together in group chats — all in
            one place.
          </p>

          <ul className="mt-9 space-y-3.5">
            <CheckItem>Connect with people</CheckItem>
            <CheckItem>Chat one-to-one</CheckItem>
            <CheckItem>Create groups</CheckItem>
          </ul>
        </div>

        {/* Right column */}
        <div className="relative min-w-0">
          {/* 3D Cylindrical Peach/Orange Disc peeking out behind right/bottom-right (Image 1 & 3) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[85px] top-[40%] z-0 h-[270px] w-[270px]"
          >
            <svg viewBox="0 0 270 270" className="h-full w-full" fill="none">
              {/* Ambient soft glow */}
              <circle cx="135" cy="135" r="115" fill="#FF7A1A" fillOpacity="0.14" filter="blur(16px)" />
              {/* 3D Extrusion Rim */}
              <circle cx="142" cy="142" r="106" fill="#F49149" />
              {/* Disc Face */}
              <circle cx="134" cy="134" r="106" fill="url(#discFaceGrad)" />
              <defs>
                <linearGradient id="discFaceGrad" x1="40" y1="40" x2="230" y2="230" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFE4D1" />
                  <stop offset="55%" stopColor="#FFC39B" />
                  <stop offset="100%" stopColor="#FFA670" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-10">
            <ChatPreview />
          </div>

          {/* "Stay connected" floating card below the preview window (Image 1) */}
          <div
            className="absolute -bottom-10 left-[26%] z-20 flex items-center gap-3.5 sm:left-[30%]"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-[#EAE2D5] bg-white/95 px-4 py-2.5 shadow-card backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt=""
                className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
              />
              <div>
                <p className="text-[12px] font-bold leading-tight text-ink">
                  Stay connected
                </p>
                <p className="text-[11px] font-medium leading-tight text-muted">
                  anytime, anywhere
                </p>
              </div>
            </div>
            <svg
              viewBox="0 0 50 48"
              className="h-10 w-11 text-[#4A2E1B] shrink-0"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 36C18 34 32 24 36 8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M24 12L36 8L38 20"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* "More than just Messages" handwritten 3-line annotation (Image 2) */}
          <div
            className="pointer-events-none absolute -right-24 top-0 hidden xl:flex flex-col items-center z-20"
            style={{ transform: "rotate(4deg)" }}
          >
            <p className="font-hand text-[24px] font-bold leading-[1.05] text-[#4A2E1B] text-center tracking-wide">
              More<br />
              than just<br />
              Messages
            </p>
            <svg
              viewBox="0 0 60 70"
              className="mt-1 h-16 w-14 text-[#4A2E1B]"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M38 4C38 26 34 48 14 57"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M26 55L14 60L16 46"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Organic Curved Wave Divider between 1st (Hero) and 2nd (Why Connecto) section (Image 1) */}
      <div className="pointer-events-none relative -mb-1 w-full overflow-hidden leading-none z-0" aria-hidden="true">
        <svg
          viewBox="0 0 1440 180"
          className="relative block w-full h-[90px] sm:h-[130px] lg:h-[170px]"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* Subtle peach layered depth wave */}
          <path
            d="M0,45 C340,130 620,140 940,75 C1180,30 1340,60 1440,70 L1440,180 L0,180 Z"
            fill="#FEEFE2"
            fillOpacity="0.7"
          />
          {/* Main smooth canvas wave blending seamlessly into next section */}
          <path
            d="M0,70 C360,155 640,160 960,90 C1200,40 1350,70 1440,80 L1440,180 L0,180 Z"
            fill="#FAF5EE"
          />
        </svg>
      </div>
    </section>
  );
}

/* ------------------------------- features ------------------------------- */

function Features() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-5 pt-4 pb-20 sm:px-8 lg:pt-6 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="uppercase tracking-[0.2em] text-[11px] font-bold">WHY CONNECTO?</Eyebrow>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-tight text-ink sm:text-[38px]">
            Everything you need to stay connected.
          </h2>
          <p className="mt-3.5 text-[15.5px] leading-relaxed text-muted">
            A simple and powerful communication platform for individuals, teams
            and communities.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon, title, text }) => (
            <div
              key={title}
              className="rounded-[22px] border border-[#EFE8DE] bg-white px-7 py-9 text-center shadow-[0_12px_36px_-24px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-card"
            >
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FEEFE2] text-brand">
                {icon}
              </span>
              <h3 className="mt-6 text-[19px] font-bold text-ink">{title}</h3>
              <p className="mx-auto mt-2.5 max-w-[280px] text-[14.5px] leading-relaxed text-muted">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- how it works ----------------------------- */

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#FDF1E7] via-[#FEEDDE] to-[#FCEEE1] border border-[#F7E4D2] px-8 py-12 sm:px-12 lg:px-16 lg:py-14 shadow-lg hover:shadow-xl">
          {/* Ambient soft warm bloom */}
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 h-[260px] w-[520px] rounded-full bg-[#FF7A1A]/[0.08] blur-[80px]" />

          <div className="relative text-center">
            <span className="inline-flex items-center rounded-full bg-[#F7D3B4] px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B85507]">
              HOW IT WORKS
            </span>
            <h2 className="mt-3.5 text-[28px] sm:text-[32px] font-extrabold leading-tight tracking-tight text-[#18181B]">
              Start connecting in three simple steps.
            </h2>
          </div>

          <div className="relative mt-10 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-3">
            {STEPS.map((step, index) => (
              <Fragment key={step.n}>
                <div className="flex-1 text-center">
                  {/* Outer white ring with inner peach gradient circle (Close-up Reference) */}
                  <div className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-white shadow-[0_10px_25px_-8px_rgba(36,36,36,0.08)]">
                    <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-gradient-to-b from-[#FFE8D6] to-[#FCD1B0] text-[17.5px] font-extrabold text-[#FF7A1A]">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-[17px] font-bold text-[#1F1F1F]">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-[230px] text-[14px] leading-relaxed text-[#666666]">
                    {step.text}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <svg
                    viewBox="0 0 32 20"
                    className="mt-7 hidden h-5 w-8 shrink-0 text-[#6E4D37] lg:block"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 10H28M20 3L28 10L20 17"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- built for connection ------------------------ */

function BuiltForConnection() {
  return (
    <section id="about" className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:gap-14 sm:px-8 lg:grid-cols-2 lg:py-24">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="relative w-full max-w-[500px]">
            <ChatPreview />
            <div className="absolute -bottom-10 -right-3 hidden sm:block lg:-right-6">
              <ChatPreview variant="phone" />
            </div>
          </div>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <Eyebrow className="uppercase tracking-[0.2em] text-[11px] font-bold">BUILT FOR CONNECTION</Eyebrow>
          <h2 className="mt-4 max-w-md text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">
            From private conversations to group chats.
          </h2>
          <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-muted">
            Keep conversations personal with one-to-one messaging, or create a
            group and bring multiple people into the same conversation.
          </p>
          <ul className="mt-7 space-y-3.5">
            {BUILT_ITEMS.map((item) => (
              <CheckItem key={item}>{item}</CheckItem>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- CTA --------------------------------- */

const AVATAR_NODES = [
  {
    label: "Rahul",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    x: 50,
    y: 10,
  },
  {
    label: "Priya",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    x: 88,
    y: 28,
  },
  {
    label: "Rohit",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    x: 90,
    y: 80,
  },
  {
    label: "Sneha",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    x: 48,
    y: 88,
  },
  {
    label: "Aniket",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80",
    x: 12,
    y: 62,
  },
];

function ConnectionGraph() {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative h-[210px] w-[210px] shrink-0 sm:h-[280px] sm:w-[280px]">
        {/* Radiating orange dashed lines from center */}
        <svg
          className="absolute inset-0 h-full w-full text-brand"
          viewBox="0 0 280 280"
          fill="none"
          aria-hidden="true"
        >
          {AVATAR_NODES.map((node) => (
            <line
              key={node.label}
              x1="140"
              y1="140"
              x2={(node.x / 100) * 280}
              y2={(node.y / 100) * 280}
              stroke="#FF7A1A"
              strokeWidth="1.8"
              strokeDasharray="4 5"
              strokeOpacity="0.75"
            />
          ))}
        </svg>

        {/* Central Logo */}
        <span className="absolute left-1/2 top-1/2 grid h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-card">
          <img src="/logo.svg" alt="Connecto" className="h-8 w-8" />
        </span>

        {/* User Avatars */}
        {AVATAR_NODES.map((node) => (
          <span
            key={node.label}
            className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[2.5px] border-white shadow-card"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
            }}
          >
            <img
              src={node.avatar}
              alt={node.label}
              className="h-full w-full object-cover"
            />
          </span>
        ))}
      </div>

      <div className="hidden shrink-0 sm:block">
        <p className="font-hand text-[24px] leading-tight text-ink">People</p>
        <p className="pl-3 font-hand text-[24px] leading-tight text-ink">
          Conversations
        </p>
        <p className="pl-6 font-hand text-[24px] leading-tight text-ink">
          Communities
        </p>
        <svg
          viewBox="0 0 60 40"
          className="mt-1 h-9 w-12 text-ink/40"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 8c18 2 32 12 40 28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M33 33l11 4 2-12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function CallToAction() {
  const { user } = useContext(AuthContext);

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#FDE8D7] via-[#FDE4CF] to-[#FCE0CA] border border-[#F5DCBE] px-7 py-12 sm:px-12 lg:px-16 lg:py-8 shadow-lg hover:shadow-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] animate-float-slow rounded-full bg-brand/[0.12] blur-[90px]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <h2 className="max-w-md text-[30px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">
                Your conversations start with a connection.
              </h2>
              <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-[#555555]">
                Join Connecto today and experience a simpler, faster and better
                way to stay connected.
              </p>
              <Link
                to={user ? "/chat" : "/register"}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-[14px] bg-brand px-8 py-3.5 text-[15px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]"
              >
                Get Started
                <FiArrowRight />
              </Link>
            </div>

            <ConnectionGraph />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- footer -------------------------------- */

const FOOTER_COLUMNS = [
  {
    title: "Quick Links",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "About", href: "#about" },
      { label: "Contact", href: "#contact" },
    ],
  },
  // {
  //   title: "Legal",
  //   links: [
  //     { label: "Privacy Policy", href: "#" },
  //     { label: "Terms & Conditions", href: "#" },
  //     { label: "Cookie Policy", href: "#" },
  //   ],
  // },
  // {
  //   title: "Support",
  //   links: [
  //     { label: "Help Center", href: "#" },
  //     { label: "Contact Us", href: "#contact" },
  //     { label: "FAQs", href: "#" },
  //   ],
  // },
];

const SOCIALS = [
  { icon: <FiLinkedin className="text-[14px]" />, label: "LinkedIn", href:"https://www.linkedin.com/in/shelkeaniket/" },
  { icon: <FiGithub className="text-[14px]" />, label: "GitHub", href:"https://github.com/Aniket0990" },
  { icon: <FiInstagram className="text-[14px]" />, label: "Instagram", href:"https://www.instagram.com/heyanikets/" },
  { icon: <FiMail className="text-[14px]" />, label: "Email", href:"mailto:aniketshelke554@gmail.com" },
];

function Footer() {
  return (
    <footer id="contact" className="relative border-t border-line/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-10 px-5 py-16 sm:gap-12">
        <div>
          <ConnectoLogo size={28} wordClassName="text-[18px]" />
          <p className="mt-3.5 max-w-[240px] text-[13.5px] leading-relaxed text-muted">
            Connect. Chat. Stay Connected.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            {SOCIALS.map(({ icon, label,href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#DFD6C8] text-[#777777] transition hover:border-brand hover:text-brand hover:bg-white"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-[14px] font-bold text-ink">
              {column.title}
            </h3>
            <ul className="mt-3.5 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[13.5px] text-muted transition hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="w-full sm:w-auto">
          <p className="-rotate-[5deg] font-hand text-[21px] leading-tight text-ink sm:text-[23px]">
            A
            <br />
            More Connected
            <br />
            <span className="ml-3 inline-block border-b-[3px] border-brand/70">
              Tomorrow
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-[13px] text-muted sm:flex-row sm:px-8">
          <p className="flex items-center gap-2">
            © 2026 Connecto. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------- page --------------------------------- */

export default function Landing() {
  return (
    <div className="landing-canvas min-h-screen overflow-x-clip font-sans text-ink">
      <SEO
        title="Connecto — Connect. Chat. Stay Connected."
        description="Connecto makes it simple to connect with people, have private conversations, and bring everyone together in group chats — all in one place."
        keywords="connecto, realtime chat app, group chat, private messaging, connect with people, instant messaging web app"
        canonical="/"
      />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <BuiltForConnection />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
