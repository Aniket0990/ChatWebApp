import ConnectoLogo from "./ConnectoLogo";
import { FiUsers, FiMessageCircle, FiUserPlus } from "react-icons/fi";

const HIGHLIGHTS = [
  {
    icon: <FiUserPlus className="text-xl" />,
    title: "Connect with People",
    text: "Send and receive connection requests",
  },
  {
    icon: <FiMessageCircle className="text-xl" />,
    title: "One-to-One Chat",
    text: "Have private and secure conversations",
  },
  {
    icon: <FiUsers className="text-xl" />,
    title: "Group Conversations",
    text: "Bring multiple people together",
  },
];

/** Faint orange curves referencing the signal-wave logo. */
function BackgroundCurves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-brand/10 blur-[110px]" />
      <div className="absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full bg-brand/10 blur-[130px]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M-40 120C160 40 340 260 620 190 900 120 1050 250 1250 170"
          stroke="#FF7A1A"
          strokeOpacity="0.14"
          strokeWidth="2"
        />
        <path
          d="M-40 660C220 560 420 760 700 660 940 574 1080 700 1250 640"
          stroke="#FF7A1A"
          strokeOpacity="0.12"
          strokeWidth="2"
        />
        <path
          d="M1100 -40C1010 180 1210 330 1120 500 1050 636 1180 720 1120 840"
          stroke="#FF7A1A"
          strokeOpacity="0.1"
          strokeWidth="2"
        />
        <ellipse
          cx="150"
          cy="760"
          rx="300"
          ry="150"
          stroke="#FF7A1A"
          strokeOpacity="0.08"
        />
      </svg>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="hidden lg:block">
      <ConnectoLogo size={44} wordClassName="text-[28px]" />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand">
        Connect. Chat. Stay Connected.
      </p>

      <h1 className="mt-8 text-[44px] font-extrabold leading-[1.08] tracking-tight text-ink xl:text-[52px]">
        Meaningful <span className="text-brand">Conversations</span>
        <br />
        Start Here.
      </h1>

      <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
        Connect with people, chat privately, create groups and stay connected —
        all in one place.
      </p>

      <ul className="mt-9 space-y-5">
        {HIGHLIGHTS.map(({ icon, title, text }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-200 bg-brand-100 text-brand">
              {icon}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">
                {title}
              </span>
              <span className="block text-[14px] text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 -rotate-[4deg]">
        <p className="font-hand text-[26px] leading-tight text-ink">
          People
          <br />
          <span className="pl-4">Conversations</span>
          <br />
          <span className="pl-8">Better Together</span>
        </p>
        <svg
          viewBox="0 0 170 12"
          className="mt-1 w-40 text-brand"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 9c34-7 68-9 100-5 20 2 40 3 64-1"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="mt-10 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand/30" />
      </div>
    </section>
  );
}

/**
 * Shared shell for the Login and Register pages:
 * warm cream canvas, brand story on the left, white form card on the right.
 */
export default function AuthLayout({ topRight, children }) {
  return (
    <main className="connecto-canvas relative min-h-screen overflow-hidden font-sans text-ink">
      <BackgroundCurves />

      <div className="absolute right-5 top-5 z-20 text-[14px] text-muted sm:right-8 sm:top-7">
        {topRight}
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1240px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-10 lg:py-12">
        <BrandPanel />

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>

      <p className="pointer-events-none absolute bottom-5 right-5 z-10 hidden -rotate-[6deg] text-right font-hand text-[24px] leading-tight text-ink sm:bottom-8 sm:right-10 lg:block">
        A More Connected
        <br />
        <span className="mr-1 inline-block border-b-[3px] border-brand/70">
          Tomorrow
        </span>
      </p>
    </main>
  );
}
