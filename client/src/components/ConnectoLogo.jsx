/**
 * Connecto wordmark: signal-wave logo mark + optional uppercase wordmark.
 * Used by the landing navbar, the auth branding panel and the login card.
 */
export default function ConnectoLogo({
  size = 32,
  showWord = true,
  className = "",
  wordClassName = "",
  stacked = false,
}) {
  return (
    <span
      className={`inline-flex select-none items-center ${
        stacked ? "flex-col gap-2" : "gap-2"
      } ${className}`}
    >
      <img
        src="/logo.svg"
        alt="Connecto"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
      />
      {showWord && (
        <span
          className={`font-extrabold uppercase leading-none tracking-[0.18em] text-ink ${wordClassName}`}
        >
          Connecto
        </span>
      )}
    </span>
  );
}
