// TxGuard MCP server — exposes the 4 risk-check tools to any MCP client.
// Served at /api/mcp (Streamable HTTP) via mcp-handler on Vercel/Next.js.
//
// ── x402 PAYMENT LAYER ───────────────────────────────────────────────────────
// Day-3 task: gate tool calls with OKX x402 (X Layer, USDT/USDG, OKX
// facilitator). Until gated, this endpoint is FREE. Do NOT list on OKX.AI
// before payment gating is live.
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { runTool } from "../../../lib/txguard";
import { UpstreamError, type ToolName, type TxGuardResponse } from "../../../lib/types";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

const evmAddress = z
  .string()
  .regex(ADDR_RE, "Must be a 0x-prefixed 40-hex-char EVM address");

const chainId = z
  .string()
  .regex(/^\d+$/, "Numeric chain id as string, e.g. '1' (Ethereum), '56' (BSC), '196' (X Layer)");

/** Format a TxGuardResponse for MCP: human-readable line + full JSON payload. */
function ok(result: TxGuardResponse) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          `VERDICT: ${result.verdict.toUpperCase()} (risk ${result.risk_score}/100, confidence ${result.confidence})\n` +
          `${result.summary}\n\n` +
          JSON.stringify(result, null, 2),
      },
    ],
  };
}

/** FAIL CLOSED: upstream failure is an error, never a "safe" answer. */
function failClosed(err: unknown) {
  const detail = err instanceof UpstreamError ? `${err.source}: ${err.message}` : String(err);
  return {
    content: [
      {
        type: "text" as const,
        text: `VERIFICATION UNAVAILABLE — could not check (${detail}). Treat the subject as UNVERIFIED, not as safe. Retry shortly.`,
      },
    ],
    isError: true,
  };
}

async function call(tool: ToolName, subject: string, chain_id?: string) {
  try {
    return ok(await runTool(tool, { subject, chain_id }));
  } catch (err) {
    return failClosed(err);
  }
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "check_token",
      "Pre-flight safety check for an ERC-20 token BEFORE buying, receiving, or holding it. Detects honeypots (unsellable tokens), extreme buy/sell taxes, hidden owners, mintable supply, pausable transfers, balance-modification backdoors, and unverified contracts. Returns verdict (safe/caution/danger), risk score 0-100, flags, and a one-line recommendation. Call this before ANY token transaction.",
      {
        token_address: evmAddress.describe("Token contract address to check"),
        chain_id: chainId.describe("Chain the token lives on"),
      },
      async ({ token_address, chain_id }) => call("check_token", token_address, chain_id),
    );

    server.tool(
      "check_address",
      "Reputation check for a wallet or contract address BEFORE sending funds to it or transacting with it as a counterparty. Detects phishing history, theft attacks, sanctions, blacklists, cybercrime, money laundering, mixer and darkweb links. Returns verdict (safe/caution/danger), risk score 0-100, flags, and a one-line recommendation. Call this before paying any unknown counterparty.",
      {
        address: evmAddress.describe("Wallet or contract address to check"),
        chain_id: chainId.optional().describe("Optional chain id to scope the check"),
      },
      async ({ address, chain_id }) => call("check_address", address, chain_id),
    );

    server.tool(
      "check_approval",
      "Safety check for a spender contract BEFORE signing an ERC-20 approve() for it. Detects drainer patterns (EOA spenders), flagged/malicious contracts, unverified source, and risky creators; recognizes trusted spenders (e.g. major DEX routers). Returns verdict (safe/caution/danger), risk score 0-100, flags, and a one-line recommendation. Call this before granting ANY token allowance.",
      {
        spender_address: evmAddress.describe("The contract being granted the allowance"),
        chain_id: chainId.describe("Chain where the approval will happen"),
      },
      async ({ spender_address, chain_id }) => call("check_approval", spender_address, chain_id),
    );

    server.tool(
      "check_url",
      "Phishing check for a website URL BEFORE visiting it, connecting a wallet to it, or signing anything it requests. Checks against a continuously updated phishing-site database. Returns verdict (safe/danger), risk score, and a one-line recommendation. Call this before interacting with any unfamiliar dApp or link.",
      {
        url: z.string().url().describe("Full http(s) URL to check"),
      },
      async ({ url }) => call("check_url", url),
    );
  },
  {
    serverInfo: { name: "txguard", version: "0.1.0" },
  },
  {
    basePath: "/api",       // tools served at /api/mcp
    maxDuration: 60,
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
