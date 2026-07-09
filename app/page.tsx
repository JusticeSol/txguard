export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ color: "#4ade80", fontSize: 28 }}>🛡 TxGuard</h1>
      <p style={{ fontSize: 18, lineHeight: 1.6 }}>
        Pre-flight risk checks for AI agents. One call before you move money:
        is this token, address, approval, or URL dangerous?
      </p>
      <p style={{ lineHeight: 1.8 }}>
        <strong style={{ color: "#4ade80" }}>safe</strong> ·{" "}
        <strong style={{ color: "#facc15" }}>caution</strong> ·{" "}
        <strong style={{ color: "#f87171" }}>danger</strong> — risk score 0–100,
        flags, and a one-line recommendation. Sub-second. Fail-closed.
      </p>
      <pre style={{ background: "#111a16", padding: 16, borderRadius: 8, overflow: "auto" }}>
        MCP endpoint: /api/mcp{"\n"}Tools: check_token · check_address · check_approval · check_url
      </pre>
      <p style={{ opacity: 0.7 }}>Built for the OKX AI Genesis Hackathon · x402 pay-per-call</p>
    </main>
  );
}