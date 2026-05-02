"use client";

import { useState } from "react";

export default function InstallStack({
  cliCommand,
  installUrls,
  agentPaste,
}: {
  cliCommand: string;
  installUrls: string[];
  agentPaste: string;
}) {
  const [copied, setCopied] = useState<"cli" | "agent" | null>(null);

  const copy = async (text: string, key: "cli" | "agent") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="glass-panel">
      <h3 style={{ marginBottom: "0.5rem" }}>⚡ Install Stack</h3>

      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
        One-liner for your terminal:
      </p>
      <div
        className="terminal-block"
        style={{
          fontSize: "0.78rem",
          padding: "0.65rem 0.75rem",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-mono)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        $ {cliCommand}
      </div>
      <button
        type="button"
        onClick={() => copy(cliCommand, "cli")}
        className="btn btn-sm"
        style={{ marginBottom: "1.25rem", width: "100%" }}
      >
        {copied === "cli" ? "✓ Copied" : "Copy CLI command"}
      </button>

      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        Or paste this into Cursor / Claude Code / OpenClaw / Codex:
      </p>
      <div
        className="terminal-block"
        style={{
          fontSize: "0.75rem",
          padding: "0.65rem 0.75rem",
          marginBottom: "0.5rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {agentPaste}
      </div>
      <button
        type="button"
        onClick={() => copy(agentPaste, "agent")}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: "1rem", width: "100%" }}
      >
        {copied === "agent" ? "✓ Copied" : "Copy agent prompt"}
      </button>

      <details>
        <summary style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", cursor: "pointer" }}>
          {installUrls.length} install URL{installUrls.length === 1 ? "" : "s"}
        </summary>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {installUrls.map((u) => (
            <li key={u} style={{ wordBreak: "break-all", marginBottom: "0.25rem" }}>
              <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-tertiary)" }}>{u}</a>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
