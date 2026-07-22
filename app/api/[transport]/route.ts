// TxGuard MCP server — payment-gated edition.
// Free: initialize, tools/list, notifications (agents must discover before paying).
// Paid: tools/call — x402 (OKX, X Layer, USDT) verify + settle before the tool runs.

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { runTool } from "../../../lib/txguard";
import { classifyRequest, enforcePayment } from "../../../lib/payment";
import { UpstreamError, type ToolName, type TxGuardResponse } from "../../../lib/types";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const evmAddress = z.string().regex(ADDR_RE, "Must be a 0x-prefixed 40-hex-char EVM address");
const chainId = z.string().regex(/^\d+$/, "Numeric chain id as string, e.g. '1', '56', '196'");

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
  { serverInfo: { name: "txguard", version: "0.2.0" } },
  { basePath: "/api", maxDuration: 60, verboseLogs: false },
);

/** POST: gate billable JSON-RPC methods (tools/call) behind x402 payment. */
async function gatedPost(req: Request): Promise<Response> {
  const { billable, body } = await classifyRequest(req);

  let receipt: string | null = null;
  if (billable) {
    const gate = await enforcePayment(req);
    if (!gate.paid) return gate.response;
    receipt = gate.receipt;
  }

  // body was consumed by classifyRequest — rebuild the request for the handler
  const forwarded = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body,
  });
  const res = await handler(forwarded);

  if (!receipt) return res;

  // Attach the settlement receipt (x402 PAYMENT-RESPONSE). Response headers are
  // immutable, so rebuild — passing res.body through keeps SSE streaming intact.
  const headers = new Headers(res.headers);
  headers.set("PAYMENT-RESPONSE", receipt);
  headers.set("Access-Control-Expose-Headers", "PAYMENT-RESPONSE");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export { handler as GET, handler as DELETE, gatedPost as POST };
