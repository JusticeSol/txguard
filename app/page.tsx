"use client";

import { useState } from "react";

const SNIPPET = `I'd like to use the service provided by Agent 4922:

Service title: Pre-flight risk checks
Service type: A2MCP
Endpoint: https://txguards.vercel.app/api/mcp
Please use OKX Agent Payments Protocol to send a request to this endpoint`;

const TOOLS = [
  { name: "check_token", desc: "Honeypots, hidden owners, tax traps, mintable supply, pausable transfers" },
  { name: "check_address", desc: "Phishing history, sanctions, theft, blacklists, mixer links" },
  { name: "check_approval", desc: "Drainer patterns before you sign approve()" },
  { name: "check_url", desc: "Phishing sites, before a wallet ever connects" },
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  };

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "56px 24px 96px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#d7e4dc",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <span style={{ fontSize: 34 }}>🛡</span>
        <h1 style={{ color: "#4ade80", fontSize: 32, margin: 0, letterSpacing: "-0.5px" }}>TxGuard</h1>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "5px 11px",
            borderRadius: 999,
            border: "1px solid #1d9e75",
            background: "#0f2e24",
            color: "#5dcaa5",
            whiteSpace: "nowrap",
          }}
        >
          ● Live on OKX.AI · ASP #4922
        </span>
      </div>

      <p style={{ fontSize: 19, lineHeight: 1.6, color: "#c3d6cb", marginTop: 20 }}>
        Pre-flight risk checks for AI agents. One call before you move money:{" "}
        <em style={{ color: "#8fbfa8" }}>is this token, address, approval, or URL dangerous?</em>
      </p>

      <p style={{ fontSize: 16, lineHeight: 1.9 }}>
        <strong style={{ color: "#4ade80" }}>safe</strong> ·{" "}
        <strong style={{ color: "#facc15" }}>caution</strong> ·{" "}
        <strong style={{ color: "#f87171" }}>danger</strong>
        <span style={{ color: "#7fa08f" }}>
          {" "}
          — plus a 0–100 risk score, the specific flags, and one line telling the agent what to do.
          Sub-second. Fail-closed.
        </span>
      </p>

      {/* how to use */}
      <h2 style={{ fontSize: 15, color: "#5dcaa5", marginTop: 44, marginBottom: 10, letterSpacing: "1px" }}>
        HOW TO USE
      </h2>
      <p style={{ fontSize: 14, color: "#8fbfa8", marginTop: 0, lineHeight: 1.7 }}>
        Paste this into your OpenClaw / Hermes / Claude Code / Codex session. Payment is handled by the
        OKX Agent Payments Protocol.
      </p>

      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "#0e2019",
            border: "1px solid #1f4a37",
            padding: "18px 16px",
            borderRadius: 10,
            overflow: "auto",
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {SNIPPET}
        </pre>
        <button
          onClick={copy}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 6,
            border: "1px solid #1d9e75",
            background: copied ? "#1d9e75" : "#0f2e24",
            color: copied ? "#04140e" : "#5dcaa5",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>

      <p style={{ fontSize: 13, color: "#6b8a7a", lineHeight: 1.7 }}>
        New to OKX.AI?{" "}
        <a href="https://www.okx.ai/tutorial/user" style={{ color: "#5dcaa5" }}>
          Read the user guide
        </a>
        .
      </p>

      {/* tools */}
      <h2 style={{ fontSize: 15, color: "#5dcaa5", marginTop: 44, marginBottom: 14, letterSpacing: "1px" }}>
        TOOLS
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TOOLS.map((t) => (
          <div
            key={t.name}
            style={{
              border: "1px solid #17352a",
              borderRadius: 8,
              padding: "12px 14px",
              background: "#0c1a13",
            }}
          >
            <div style={{ color: "#4ade80", fontSize: 14, marginBottom: 4 }}>{t.name}</div>
            <div style={{ color: "#7fa08f", fontSize: 13, lineHeight: 1.5 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* endpoint */}
      <h2 style={{ fontSize: 15, color: "#5dcaa5", marginTop: 44, marginBottom: 10, letterSpacing: "1px" }}>
        ENDPOINT
      </h2>
      <pre
        style={{
          background: "#0e2019",
          border: "1px solid #1f4a37",
          padding: "16px",
          borderRadius: 10,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        {`MCP (Streamable HTTP)   /api/mcp
Discovery               free — initialize, tools/list
Paid                    tools/call  ·  0.05 USDT
Settlement              x402 · exact · X Layer (eip155:196)`}
      </pre>
      <p style={{ fontSize: 13, color: "#6b8a7a", lineHeight: 1.7 }}>
        Connect an MCP client to browse the tools for free. Calling one returns HTTP 402 with payment
        terms — no accounts, no API keys.
      </p>

      <p style={{ opacity: 0.55, fontSize: 12, marginTop: 48 }}>
        Built for the OKX AI Genesis Hackathon · x402 pay-per-call · Risk data via GoPlus
      </p>
    </main>
  );
}
