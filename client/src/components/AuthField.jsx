/**
 * Labelled auth input with a leading icon and optional trailing action
 * (used for the show/hide password toggle).
 */
export default function AuthField({
  label,
  icon: Icon,
  error,
  rightSlot,
  className = "",
  id,
  ...inputProps
}) {
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[13px] font-medium text-ink"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 text-[17px] text-muted" />
        )}
        <input
          id={inputId}
          className={`h-[46px] w-full rounded-input border bg-[#FDFBF7] ${
            Icon ? "pl-11" : "pl-3.5"
          } ${rightSlot ? "pr-11" : "pr-3.5"} text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:ring-2 ${
            error
              ? "border-danger focus:border-danger focus:ring-danger/20"
              : "border-line focus:border-brand focus:ring-brand/20"
          }`}
          {...inputProps}
        />
        {rightSlot}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
