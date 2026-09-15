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
  FiUserPlus,
  FiMessageCircle,
  FiUsers,
  FiMail,
  FiTwitter,
  FiFacebook,
  FiInstagram,
  FiLinkedin,
} from "react-icons/fi";

/* ----------------------------- shared bits ----------------------------- */

/* Hero buttons — orange primary + neutral secondary, same height / radius. */
const BTN_PRIMARY =
  "inline-flex h-[46px] items-center justify-center gap-2 rounded-input bg-brand px-6 text-[14.5px] font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]";
const BTN_GHOST =
  "inline-flex h-[46px] items-center justify-center gap-2 rounded-input border border-line bg-white px-6 text-[14.5px] font-semibold text-ink transition hover:border-brand/40 hover:text-brand";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

const FEATURES = [
  {
    icon: <FiUserPlus className="text-[24px]" />,
    title: "Connect with People",
    text: "Send and receive connection requests and build your network inside Connecto.",
  },
  {
    icon: <FiMessageCircle className="text-[24px]" />,
    title: "One-to-One Conversations",
    text: "Chat privately with your connections through simple, real-time conversations.",
  },
  {
    icon: <FiUsers className="text-[24px]" />,
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

/** Soft peach eyebrow pill used above every section heading. */
function Eyebrow({ children, className = "", onPeach = false }) {
  return (
    <p
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.22em] text-brand ${
        onPeach ? "border border-white/70 bg-white/80" : "bg-brand-50"
      } ${className}`}
    >
      {children}
    </p>
  );
}

function CheckItem({ children }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-white">
        <FiCheck className="text-[11px]" strokeWidth={3} />
      </span>
      <span className="text-[14.5px] text-ink/80">{children}</span>
    </li>
  );
}

/** Warm off-white canvas with very subtle orange waves (5–10% opacity). */
function HeroDecor() {
  // No overflow clipping here on purpose: a clipped blur would end abruptly at
  // the section edge and read as a separator line. The page root already
  // clips horizontally, so the washes can bleed between sections smoothly.
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -right-24 -top-40 h-[560px] w-[560px] animate-float-slow rounded-full bg-brand/[0.13] blur-[120px]" />
      <div className="absolute -left-40 top-[-12%] h-[440px] w-[440px] animate-float-slower rounded-full bg-brand/[0.09] blur-[120px]" />
      <div className="absolute -right-40 top-[200px] h-[520px] w-[520px] rounded-full border border-brand/10" />
      <svg
        className="absolute bottom-6 left-0 h-[220px] w-full text-brand"
        viewBox="0 0 1400 220"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M-20 40C240 -20 430 150 720 90 1010 30 1160 140 1420 70"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeWidth="1.5"
        />
        <path
          d="M-20 180C300 110 470 240 780 180 1030 132 1180 200 1420 160"
          stroke="currentColor"
          strokeOpacity="0.06"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

/* -------------------------------- navbar -------------------------------- */

function Navbar() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const startHref = user ? "/chat" : "/register";

  // Transparent while at the very top so the navbar blends into the hero
  // (an opaque bar here would draw a visible edge across the page), then a
  // solid blurred bar once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled ? "bg-cream/95 backdrop-blur" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link to="/" aria-label="Connecto home">
          <ConnectoLogo size={30} wordClassName="text-[19px]" />
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[15px] font-medium text-ink/80 transition hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-7 md:flex">
          {!user && (
            <Link
              to="/login"
              className="text-[15px] font-medium text-ink transition hover:text-brand"
            >
              Login
            </Link>
          )}
          <Link
            to={startHref}
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-brand px-6 text-[14.5px] font-semibold text-white shadow-glow transition hover:bg-brand-600"
          >
            {user ? "Open Chat" : "Get Started"}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-input text-ink transition hover:bg-brand/10 md:hidden"
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
                className="text-[15px] font-medium text-ink/80"
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
              className="inline-flex h-[46px] items-center justify-center rounded-full bg-brand px-6 text-[14.5px] font-semibold text-white shadow-glow"
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
    <section className="relative">
      <HeroDecor />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-20">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-[12.5px] font-medium text-brand">
            Simple &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Always Connected
          </span>

          <h1 className="mt-7 text-[38px] font-extrabold leading-[1.06] tracking-tight text-ink sm:text-[46px] lg:text-[54px]">
            Connect. Chat.
            <br />
            Stay <span className="text-brand">Connected.</span>
          </h1>

          <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-muted">
            Connecto makes it simple to connect with people, have private
            conversations, and bring everyone together in group chats — all in
            one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={startHref} className={BTN_PRIMARY}>
              Get Started
              <FiArrowRight />
            </Link>
            {!user && (
              <Link to="/login" className={BTN_GHOST}>
                Login
              </Link>
            )}
          </div>

          <ul className="mt-9 space-y-3.5">
            <CheckItem>Connect with people</CheckItem>
            <CheckItem>Chat one-to-one</CheckItem>
            <CheckItem>Create groups</CheckItem>
          </ul>
        </div>

        <div className="relative min-w-0">
          <ChatPreview />

          {/* "Stay connected" pill overlapping the window's bottom-left */}
          <div className="absolute -bottom-10 left-0 z-10 flex items-center gap-3 lg:-left-6">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur">
              <span className="flex -space-x-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-brand text-[11px] font-semibold text-white">
                  A
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#5B8AD6] text-[11px] font-semibold text-white">
                  P
                </span>
              </span>
              <p className="text-[12px] font-medium leading-snug text-ink">
                Stay connected
                <br />
                anytime, anywhere
              </p>
            </div>
            <svg
              viewBox="0 0 40 46"
              className="hidden h-11 w-10 text-ink/30 lg:block"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 44c14-4 22-16 20-34"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M18 14l8-6 3 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Handwritten annotation */}
          <div className="absolute -right-2 -top-14 hidden text-right xl:block">
            <p className="rotate-[4deg] font-hand text-[26px] leading-tight text-ink">
              More than just
              <br />
              <span className="pr-4">Messages</span>
            </p>
            <svg
              viewBox="0 0 60 60"
              className="ml-auto mr-6 h-11 w-12 text-ink/40"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M50 6c-6 22-20 36-42 40"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M22 36l-14 10 16 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- features ------------------------------- */

function Features() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow>Why Connecto?</Eyebrow>
          <h2 className="mt-5 text-[30px] font-extrabold tracking-tight text-ink sm:text-[38px]">
            Everything you need to stay connected.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            A simple and powerful communication platform for individuals, teams
            and communities.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-line/70 bg-[#F8F7F4] px-7 py-9 text-center shadow-[0_22px_45px_-38px_rgba(36,36,36,0.65)] transition hover:border-brand-200 hover:bg-white hover:shadow-card"
            >
              <span className="mx-auto grid h-[86px] w-[86px] place-items-center rounded-full bg-brand-50">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
                  {icon}
                </span>
              </span>
              <h3 className="mt-5 text-[19px] font-bold text-ink">{title}</h3>
              <p className="mx-auto mt-2.5 max-w-[290px] text-[15px] leading-relaxed text-muted">
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
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#FFFAF5] via-[#FDF1E5] to-[#FBE7D5] px-6 py-12 sm:px-10 lg:px-16 lg:py-14">
          {/* faint waves inside the panel */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-brand"
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M-20 300C220 230 420 350 700 280 940 220 1080 300 1240 250"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1.5"
            />
            <path
              d="M-20 60C200 20 360 120 600 70 860 16 1020 90 1240 40"
              stroke="currentColor"
              strokeOpacity="0.07"
              strokeWidth="1.5"
            />
          </svg>

          <div className="relative text-center">
            <Eyebrow onPeach>How It Works</Eyebrow>
            <h2 className="mt-3 text-[27px] font-extrabold leading-tight tracking-tight text-ink sm:text-[33px]">
              Start connecting in three simple steps.
            </h2>
          </div>

          <div className="relative mt-8 flex flex-col items-center gap-9 lg:mt-9 lg:flex-row lg:items-start lg:gap-3">
            {STEPS.map((step, index) => (
              <Fragment key={step.n}>
                <div className="flex-1 text-center">
                  <span className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-[19px] font-extrabold text-brand shadow-[0_16px_32px_-20px_rgba(36,36,36,0.75)]">
                    {step.n}
                  </span>
                  <h3 className="mt-2.5 text-[17px] font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-[230px] text-[14.5px] leading-relaxed text-muted">
                    {step.text}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <FiArrowRight className="mt-6 hidden shrink-0 text-[26px] text-ink/25 lg:block" />
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
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-24">
        <div className="order-2 lg:order-1">
          <div className="relative w-full max-w-[520px]">
            <ChatPreview />
            <div className="absolute -bottom-12 -right-4 hidden sm:block lg:-right-8">
              <ChatPreview variant="phone" />
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow>Built for Connection</Eyebrow>
          <h2 className="mt-5 max-w-md text-[30px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">
            From private conversations to group chats.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-muted">
            Keep conversations personal with one-to-one messaging, or create a
            group and bring multiple people into the same conversation.
          </p>
          <ul className="mt-8 space-y-3.5">
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

const NODES = [
  { label: "Aniket", color: "#FF7A1A", x: 50, y: 4 },
  { label: "Priya", color: "#39B982", x: 8, y: 50 },
  { label: "Rahul", color: "#5B8AD6", x: 92, y: 50 },
  { label: "Sneha", color: "#D9534F", x: 50, y: 96 },
];

function ConnectionGraph() {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative h-[250px] w-[250px] shrink-0 sm:h-[280px] sm:w-[280px]">
        <svg
          className="absolute inset-0 h-full w-full text-brand"
          viewBox="0 0 250 250"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M125 125C125 90 125 58 125 30"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.6"
            strokeDasharray="3 6"
            strokeLinecap="round"
          />
          <path
            d="M125 125C90 125 58 125 30 125"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.6"
            strokeDasharray="3 6"
            strokeLinecap="round"
          />
          <path
            d="M125 125C160 125 192 125 220 125"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.6"
            strokeDasharray="3 6"
            strokeLinecap="round"
          />
          <path
            d="M125 125C125 160 125 192 125 220"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.6"
            strokeDasharray="3 6"
            strokeLinecap="round"
          />
        </svg>

        <span className="absolute left-1/2 top-1/2 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-card">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
        </span>

        {NODES.map((node) => (
          <span
            key={node.label}
            className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white text-[14px] font-semibold text-white shadow-card"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              background: node.color,
            }}
          >
            {node.label.charAt(0)}
          </span>
        ))}
      </div>

      <div className="hidden shrink-0 sm:block">
        <p className="font-hand text-[25px] leading-tight text-ink">People</p>
        <p className="pl-3 font-hand text-[25px] leading-tight text-ink">
          Conversations
        </p>
        <p className="pl-6 font-hand text-[25px] leading-tight text-ink">
          Communities
        </p>
        <svg
          viewBox="0 0 60 40"
          className="mt-1 h-9 w-12 text-brand"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 8c18 2 32 12 40 28"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M33 33l11 4 2-12"
            stroke="currentColor"
            strokeWidth="2.5"
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
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="relative overflow-hidden rounded-[24px] border border-brand-200 bg-gradient-to-br from-[#FFFAF5] via-[#FDEBDA] to-[#F9DCC2] px-7 py-12 sm:px-12 lg:px-16 lg:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-brand/15 blur-[90px]" />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-brand"
            viewBox="0 0 1200 420"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M-20 90C240 30 430 170 720 110 1010 50 1160 150 1240 90"
              stroke="currentColor"
              strokeOpacity="0.09"
              strokeWidth="1.5"
            />
            <path
              d="M-20 330C300 260 470 390 780 330 1030 282 1180 350 1240 310"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="1.5"
            />
          </svg>

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <h2 className="max-w-md text-[30px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">
                Your conversations start with a connection.
              </h2>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink/70">
                Join Connecto today and experience a simpler, faster and better
                way to stay connected.
              </p>
              <Link
                to={user ? "/chat" : "/register"}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white/70 px-7 py-3.5 text-[15px] font-semibold text-brand transition hover:bg-white active:scale-[0.98]"
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
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms & Conditions", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#contact" },
      { label: "FAQs", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: <FiTwitter className="text-[15px]" />, label: "Twitter" },
  { icon: <FiFacebook className="text-[15px]" />, label: "Facebook" },
  { icon: <FiInstagram className="text-[15px]" />, label: "Instagram" },
  { icon: <FiLinkedin className="text-[15px]" />, label: "LinkedIn" },
];

function Footer() {
  return (
    <footer id="contact" className="relative">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <ConnectoLogo size={30} wordClassName="text-[19px]" />
          <p className="mt-4 max-w-[240px] text-[14px] leading-relaxed text-muted">
            Connect. Chat. Stay Connected.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {SOCIALS.map(({ icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-brand hover:text-brand"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-[14px] font-semibold text-ink">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[14px] text-muted transition hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="hidden lg:block">
          <p className="-rotate-[5deg] font-hand text-[24px] leading-tight text-ink">
            A More Connected
            <br />
            <span className="ml-5 inline-block border-b-[3px] border-brand/70">
              Tomorrow
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-muted sm:flex-row sm:px-8 lg:px-10">
          <p className="flex items-center gap-2">
            <FiMail className="text-[15px]" />
            © 2026 Connecto. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Made with <span className="text-brand">❤</span> for better
            connections.
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
