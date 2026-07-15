"use client";

import { useState } from "react";

const SNIPPET = `I'd like to use the service provided by Agent 4922:

Service title: Pre-flight risk checks
Service type: A2MCP
Endpoint: https://txguards.vercel.app/api/mcp
Please use OKX Agent Payments Protocol to send a request to this endpoint`;

const CHECKS = [
  ["check_token", "Honeypots, hidden owners, tax traps, mintable supply, pausable transfers"],
  ["check_address", "Phishing, sanctions, theft history, mixer and darkweb links"],
  ["check_approval", "Drainer patterns, before you sign approve()"],
  ["check_url", "Phishing sites, before a wallet ever connects"],
];

const SPEC = [
  ["Endpoint", "/api/mcp — MCP over Streamable HTTP"],
  ["Free", "initialize, tools/list"],
  ["Billed", "tools/call — 0.05 USDT per call"],
  ["Settlement", "x402 · exact · X Layer (eip155:196)"],
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is selectable */
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />
      <style>{CSS}</style>

      <main className="wrap">
        <header className="masthead">
          <div>
            <h1 className="wordmark">TxGuard</h1>
            <p className="lede">Pre-flight risk checks for AI agents.</p>
          </div>
          <a className="reg" href="https://www.okx.ai/agents/4922" target="_blank" rel="noopener noreferrer">
            <span className="reg__label">Listed on OKX.AI</span>
            <span className="reg__id">ASP #4922</span>
          </a>
        </header>

        {/* ── hero: the artifact the product actually produces ── */}
        <figure className="tag">
          <div className="tag__head">
            <span>TxGuard</span>
            <span>Inspection record</span>
          </div>

          <div className="tag__body">
            <dl className="rows">
              <div className="row">
                <dt>Subject</dt>
                <dd className="mono">0xecf429955109dE2C3bB4f4565488DD03a1eeaffe</dd>
              </div>
              <div className="row">
                <dt>Token</dt>
                <dd>HARRY — “Harry Bolz”</dd>
              </div>
              <div className="row">
                <dt>Chain</dt>
                <dd>Ethereum · 1</dd>
              </div>
            </dl>

            <div className="stamp" aria-hidden="true">
              <span>Danger</span>
            </div>
          </div>

          <div className="score">
            <div className="score__head">
              <span>Risk</span>
              <span className="mono score__num">100 / 100</span>
            </div>
            <div className="meter" role="img" aria-label="Risk score: 100 out of 100">
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} className="meter__seg" />
              ))}
            </div>
          </div>

          <ul className="flags">
            <li>
              <span className="mono flags__code">HONEYPOT</span>
              Cannot be sold after purchase
            </li>
            <li>
              <span className="mono flags__code">OWNER_CHANGE_BALANCE</span>
              Owner can modify holder balances
            </li>
          </ul>

          <p className="verdictline">Do not proceed with this token.</p>

          <figcaption className="tag__foot mono">
            Issued by TxGuard · ASP #4922 · 339 ms · 0.05 USDT
          </figcaption>
        </figure>

        <p className="legend">
          <span className="sw sw--pass" /> safe
          <span className="sw sw--caution" /> caution
          <span className="sw sw--danger" /> danger
          <span className="legend__note">— every check returns exactly one, plus the reasons.</span>
        </p>

        {/* ── prose ── */}
        <section className="sect">
          <p className="body">
            An agent about to buy a token, approve a contract, or pay a stranger has no way to know it
            is walking into a trap. TxGuard is the check that runs first. Ask about a token, an
            address, an approval, or a URL, and get back a verdict, a score, and the specific reasons —
            in under a second.
          </p>
          <p className="body">
            No model in the loop. The same input returns the same verdict, every time. When the
            underlying data can’t be reached, TxGuard returns <em>unverified</em> — never <em>safe</em>.
          </p>
        </section>

        {/* ── snippet ── */}
        <section className="sect">
          <div className="rule">
            <h2>Request an inspection</h2>
            <button className="copy" onClick={copy} type="button">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="body body--tight">
            Paste this into OpenClaw, Hermes, Claude Code, or Codex. Payment is handled by the OKX
            Agent Payments Protocol.
          </p>
          <pre className="snippet mono">{SNIPPET}</pre>
          <p className="fine">
            New to OKX.AI?{" "}
            <a href="https://www.okx.ai/tutorial/user" target="_blank" rel="noopener noreferrer">
              Read the user guide
            </a>{" "}
            or{" "}
            <a href="https://www.okx.ai/agents/4922" target="_blank" rel="noopener noreferrer">
              view the listing
            </a>
            .
          </p>
        </section>

        {/* ── checks ── */}
        <section className="sect">
          <div className="rule">
            <h2>What gets checked</h2>
          </div>
          <ul className="checks">
            {CHECKS.map(([name, desc]) => (
              <li key={name}>
                <span className="mono checks__name">{name}</span>
                <span className="checks__desc">{desc}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── spec ── */}
        <section className="sect">
          <div className="rule">
            <h2>Spec</h2>
          </div>
          <dl className="spec">
            {SPEC.map(([k, v]) => (
              <div className="spec__row" key={k}>
                <dt>{k}</dt>
                <dd className="mono">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="fine">
            Connect any MCP client to browse the tools for free. Calling one returns HTTP 402 with the
            payment terms — no accounts, no API keys.
          </p>
        </section>

        <footer className="foot">
          Built for the OKX AI Genesis Hackathon · Risk data via GoPlus
        </footer>
      </main>
    </>
  );
}

const CSS = `
:root {
  --page: #c6c0af;
  --tag: #ece7d9;
  --ink: #211f1a;
  --ink-soft: #4a4740;
  --rule: #a9a392;
  --danger: #b32217;
  --caution: #c0780a;
  --pass: #46662f;
}

* { box-sizing: border-box; }

html { background: var(--page); }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--page);
  color: var(--ink);
  font-family: "IBM Plex Sans Condensed", "Arial Narrow", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }

.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 22px 80px;
}

/* masthead */
.masthead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1.5px solid var(--ink);
  padding-bottom: 14px;
}
.wordmark {
  margin: 0;
  color: var(--ink);
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1;
}
.lede {
  margin: 6px 0 0;
  font-size: 16px;
  color: var(--ink-soft);
}
.reg {
  display: block;
  text-align: right;
  text-decoration: none;
  color: var(--ink);
  border: 1.5px solid var(--ink);
  padding: 6px 10px;
  white-space: nowrap;
}
.reg:hover { background: var(--ink); color: var(--tag); }
.reg:focus-visible { outline: 2px solid var(--danger); outline-offset: 2px; }
.reg__label {
  display: block;
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.reg:hover .reg__label { color: var(--rule); }
.reg__id {
  display: block;
  font-family: "IBM Plex Mono", monospace;
  font-size: 14px;
  font-weight: 600;
}

/* the tag */
.tag {
  position: relative;
  margin: 34px 0 0;
  background: var(--tag);
  border: 1.5px solid var(--ink);
  padding: 0 0 14px;
  clip-path: polygon(26px 0, 100% 0, 100% 100%, 0 100%, 0 26px);
}
.tag::before {
  content: "";
  position: absolute;
  top: 26px;
  left: 0;
  width: 37px;
  height: 1.5px;
  background: var(--ink);
  transform-origin: 0 0;
  transform: rotate(-45deg);
}
.tag__head {
  color: var(--ink);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1.5px solid var(--ink);
  padding: 8px 16px 7px 42px;
  font-size: 11px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  font-weight: 600;
}
.tag__head span:last-child { color: var(--ink-soft); }
.tag__body { position: relative; padding: 16px 16px 0; }

.rows { margin: 0; }
.row {
  display: flex;
  gap: 14px;
  align-items: baseline;
  padding: 4px 0;
}
.row dt {
  flex: 0 0 74px;
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.row dd {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  overflow-wrap: anywhere;
}

/* stamp */
.stamp {
  position: absolute;
  top: 6px;
  right: 14px;
  border: 3px solid var(--danger);
  padding: 5px 14px 4px;
  color: var(--danger);
  transform: rotate(-7deg);
  animation: land 420ms cubic-bezier(.2,1.5,.4,1) both;
}
.stamp span {
  display: block;
  font-size: 27px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  line-height: 1.05;
}
@keyframes land {
  from { transform: rotate(-14deg) scale(1.7); opacity: 0; }
  to   { transform: rotate(-7deg) scale(1); opacity: 1; }
}

/* score */
.score { padding: 14px 16px 0; }
.score__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.score__num { font-size: 13px; font-weight: 600; color: var(--danger); letter-spacing: 0; }
.meter { display: flex; gap: 3px; margin-top: 6px; }
.meter__seg { flex: 1; height: 11px; background: var(--danger); }

/* flags */
.flags {
  list-style: none;
  margin: 16px 0 0;
  padding: 0 16px;
  border-top: 1px dashed var(--rule);
  padding-top: 12px;
}
.flags li {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 3px 0;
  font-size: 14px;
  color: var(--ink-soft);
}
.flags__code {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--danger);
  border: 1px solid var(--danger);
  padding: 1px 5px;
  letter-spacing: 0.5px;
}
.verdictline {
  margin: 12px 16px 0;
  color: var(--ink);
  font-size: 19px;
  font-weight: 600;
}
.tag__foot {
  margin: 14px 16px 0;
  padding-top: 9px;
  border-top: 1.5px solid var(--ink);
  font-size: 11px;
  color: var(--ink-soft);
}

/* legend */
.legend {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--ink-soft);
}
.sw { width: 11px; height: 11px; display: inline-block; }
.sw--pass { background: var(--pass); }
.sw--caution { background: var(--caution); margin-left: 8px; }
.sw--danger { background: var(--danger); margin-left: 8px; }
.legend__note { margin-left: 4px; }

/* sections */
.sect { margin-top: 46px; }
.rule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1.5px solid var(--ink);
  padding-bottom: 6px;
  margin-bottom: 14px;
}
.rule h2 {
  margin: 0;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.body {
  color: var(--ink);
  font-size: 16.5px;
  line-height: 1.62;
  margin: 0 0 12px;
  max-width: 62ch;
}
.body--tight { font-size: 14.5px; color: var(--ink-soft); margin-bottom: 12px; }
.body em { font-style: normal; font-weight: 600; color: var(--ink); }

.copy {
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--ink);
  background: transparent;
  border: 1.5px solid var(--ink);
  padding: 3px 11px;
  cursor: pointer;
}
.copy:hover { background: var(--ink); color: var(--tag); }
.copy:focus-visible { outline: 2px solid var(--danger); outline-offset: 2px; }

.snippet {
  background: var(--tag);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  padding: 15px 16px;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.fine {
  font-size: 13px;
  color: var(--ink-soft);
  margin: 10px 0 0;
}
.fine a { color: var(--ink); text-decoration-thickness: 1px; text-underline-offset: 2px; }

/* checks */
.checks { list-style: none; margin: 0; padding: 0; }
.checks li {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px dashed var(--rule);
}
.checks li:last-child { border-bottom: 0; }
.checks__name { color: var(--ink); flex: 0 0 132px; font-size: 13.5px; font-weight: 600; }
.checks__desc { font-size: 14.5px; color: var(--ink-soft); }

/* spec */
.spec { margin: 0; }
.spec__row {
  display: flex;
  gap: 16px;
  align-items: baseline;
  padding: 6px 0;
}
.spec__row dt {
  flex: 0 0 92px;
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.spec__row dd { margin: 0; color: var(--ink); font-size: 13.5px; overflow-wrap: anywhere; }

.foot {
  margin-top: 54px;
  padding-top: 12px;
  border-top: 1.5px solid var(--ink);
  font-size: 12px;
  letter-spacing: 0.4px;
  color: var(--ink-soft);
}

@media (max-width: 560px) {
  .wrap { padding: 34px 16px 60px; }
  .masthead { flex-direction: column; gap: 14px; }
  .reg { text-align: left; align-self: flex-start; }
  .wordmark { font-size: 33px; }
  .stamp { position: static; display: inline-block; margin: 12px 0 4px; }
  .stamp span { font-size: 22px; }
  .row { flex-direction: column; gap: 1px; }
  .row dt { flex: none; }
  .checks li { flex-direction: column; gap: 3px; }
  .checks__name { flex: none; }
  .spec__row { flex-direction: column; gap: 1px; }
  .spec__row dt { flex: none; }
  .legend { flex-wrap: wrap; }
}

@media (prefers-reduced-motion: reduce) {
  .stamp { animation: none; }
}
`;
