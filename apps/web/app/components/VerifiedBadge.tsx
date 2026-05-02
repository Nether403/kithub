interface Props {
  verified: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function VerifiedBadge({ verified, size = "sm", showLabel = false }: Props) {
  if (!verified) return null;
  const fontSize = size === "sm" ? "0.7rem" : "0.85rem";
  return (
    <span
      title="Verified publisher — identity confirmed by SkillKitHub"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        background: "rgba(0, 232, 143, 0.12)",
        border: "1px solid rgba(0, 232, 143, 0.4)",
        color: "var(--accent)",
        padding: "0.15rem 0.5rem",
        borderRadius: "999px",
        fontSize,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
      }}
    >
      ✓{showLabel ? " Verified" : ""}
    </span>
  );
}
