// TxGuard payment gate — x402 (OKX flavor) in front of MCP tool calls.
//
// Design:
//   - MCP protocol calls (initialize, tools/list, notifications) stay FREE —
//     agents must be able to discover tools before paying.
//   - tools/call requires payment: no X-PAYMENT header → HTTP 402 with
//     PaymentRequired body; with header → verify via OKX facilitator,
//     settle, then forward to the MCP handler.
//   - Settlement is synchronous for v1 (X Layer ~200ms finality). If settle
//     fails, the tool does NOT run — no free verdicts, fail closed.
//
// Env:
//   TXGUARD_PAYTO           seller wallet address (Agentic Wallet) — REQUIRED
//   TXGUARD_PRICE           default "$0.05"
//   TXGUARD_FACILITATOR     default https://web3.okx.com/facilitator
//   TXGUARD_NETWORK         default eip155:196 (X Layer)
//   TXGUARD_FREE_MODE       "true" disables gating (local dev only)

import { x402ResourceServer } from "@okxweb3/x402-core/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core/facilitator";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";

const PAYTO = process.env.TXGUARD_PAYTO ?? "";
const PRICE = process.env.TXGUARD_PRICE ?? "$0.05";
const OKX_API_KEY = process.env.OKX_API_KEY ?? "";
const OKX_SECRET_KEY = process.env.OKX_SECRET_KEY ?? "";
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE ?? "";
const NETWORK = (process.env.TXGUARD_NETWORK ?? "eip155:196") as `${string}:${string}`;
const FREE_MODE = process.env.TXGUARD_FREE_MODE === "true";

let serverPromise: Promise<x402ResourceServer> | null = null;

function getPaymentServer(): Promise<x402ResourceServer> {
  if (!serverPromise) {
    serverPromise = (async () => {
      const s = new x402ResourceServer(
        new OKXFacilitatorClient({
          apiKey: OKX_API_KEY,
          secretKey: OKX_SECRET_KEY,
          passphrase: OKX_PASSPHRASE,
        }) as any,
      );
      s.register(NETWORK, new ExactEvmScheme());
      await s.initialize(); // fetch supported kinds from facilitator once per cold start
      return s;
    })();
  }
  return serverPromise;
}

/** Extract the JSON-RPC body if this request is a paid MCP method. */
export async function classifyRequest(req: Request): Promise<{
  billable: boolean;
  body: string;
}> {
  const body = await req.text();
  let billable = false;
  try {
    const rpc = JSON.parse(body);
    const methods = Array.isArray(rpc) ? rpc.map((r) => r?.method) : [rpc?.method];
    billable = methods.includes("tools/call");
  } catch {
    // non-JSON bodies fall through unbilled; the MCP handler will reject them
  }
  return { billable, body };
}

function paymentRequiredResponse(error?: string) {
  return (async () => {
    const server = await getPaymentServer();
    const accepts = await server.buildPaymentRequirements({
      scheme: "exact",
      payTo: PAYTO,
      price: PRICE,
      network: NETWORK,
    });
    return Response.json(
      {
        x402Version: 2,
        ...(error ? { error } : {}),
        resource: {
          url: "/api/mcp",
          description: "TxGuard risk verdict (per tools/call)",
          mimeType: "application/json",
        },
        accepts,
      },
      { status: 402 },
    );
  })();
}

/**
 * Gate a billable request. Returns null if payment is valid & settled
 * (caller should proceed), or a Response (402/502) to short-circuit with.
 */
export async function enforcePayment(req: Request): Promise<Response | null> {
  if (FREE_MODE) return null;
  if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
    return Response.json(
      { error: "server_misconfigured", detail: "OKX API credentials not set" },
      { status: 500 },
    );
  }
  if (!PAYTO) {
    return Response.json(
      { error: "server_misconfigured", detail: "TXGUARD_PAYTO not set" },
      { status: 500 },
    );
  }

  const header = req.headers.get("X-PAYMENT") ?? req.headers.get("PAYMENT-SIGNATURE");
  if (!header) return paymentRequiredResponse();

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return paymentRequiredResponse("Malformed X-PAYMENT header (expected base64 JSON)");
  }

  const server = await getPaymentServer();
  const requirements = payload?.accepted;
  if (!requirements) return paymentRequiredResponse("Payment payload missing accepted requirements");

  // basic sanity: the buyer must be paying US, on OUR network
  if (
    String(requirements.payTo).toLowerCase() !== PAYTO.toLowerCase() ||
    requirements.network !== NETWORK
  ) {
    return paymentRequiredResponse("Payment requirements do not match this service");
  }

  const verify = await server.verifyPayment(payload, requirements);
  if (!verify.isValid) {
    return paymentRequiredResponse(verify.invalidMessage ?? verify.invalidReason ?? "Invalid payment");
  }

  const settle = await server.settlePayment(payload, requirements);
  if (!settle.success) {
    // fail closed: no settlement, no verdict
    return Response.json(
      {
        error: "settlement_failed",
        detail: settle.errorMessage ?? settle.errorReason ?? "unknown",
      },
      { status: 502 },
    );
  }

  return null; // paid — proceed to MCP handler
}
