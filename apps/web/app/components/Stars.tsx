interface Props {
  value: number | null;
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

export function Stars({ value, count, size = "sm", showCount = true }: Props) {
  const fontSize = size === "lg" ? "1.1rem" : size === "md" ? "0.95rem" : "0.85rem";
  if (value === null || value === undefined) {
    return (
      <span style={{ fontSize, color: "var(--text-tertiary)" }} title="No ratings yet">
        ☆☆☆☆☆ <span style={{ fontSize: "0.75rem" }}>no ratings</span>
      </span>
    );
  }
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize }}
      title={`${value.toFixed(1)} out of 5${count ? ` from ${count} review${count === 1 ? "" : "s"}` : ""}`}
    >
      <span style={{ color: "#ffb340", letterSpacing: "0.05em" }}>
        {"★".repeat(full)}
        {half ? "⯨" : ""}
        <span style={{ color: "var(--text-tertiary)" }}>{"☆".repeat(empty)}</span>
      </span>
      {showCount && (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          {value.toFixed(1)}{count !== undefined ? ` (${count})` : ""}
        </span>
      )}
    </span>
  );
}
