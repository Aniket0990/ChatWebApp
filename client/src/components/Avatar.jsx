// Reusable avatar: shows the profile photo if available,
// otherwise falls back to the first character of the name.
// The SVG initial auto-scales to whatever size the container is given.
export default function Avatar({ src, name, className = "" }) {
  if (src) {
    return <img src={src} className={className} alt={name || "User"} />;
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${className} shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center select-none overflow-hidden`}
      title={name}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="46"
          fontWeight="600"
          fill="currentColor"
        >
          {initial}
        </text>
      </svg>
    </div>
  );
}
