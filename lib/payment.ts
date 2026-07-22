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
 * Result of gating a billable request.
 * Flat on purpose — no discriminated-union narrowing, so it compiles the same
 * whether or not the project has strictNullChecks enabled.
 */
export interface GateResult {
  /** true → proceed to the tool. false → return `response` to the caller. */
  paid: boolean;
  /** base64 PAYMENT-RESPONSE value. Set when paid. */
  receipt?: string | null;
  /** Short-circuit response (402 / 500 / 502). Set when not paid. */
  response?: Response;
}

const deny = (response: Response): GateResult => ({ paid: false, response });

/** base64(JSON) of the facilitator's settle response — the x402 PAYMENT-RESPONSE value. */
function encodeReceipt(settle: unknown): string | null {
  try {
    return Buffer.from(JSON.stringify(settle), "utf8").toString("base64");
  } catch {
    return null; // a receipt we can't encode must never block a paid call
  }
}

/**
 * Gate a billable request. On success returns the settlement receipt so the
 * caller can surface it as PAYMENT-RESPONSE; otherwise returns the Response
 * to short-circuit with.
 */
export async function enforcePayment(req: Request): Promise<GateResult> {
  if (FREE_MODE) return { paid: true, receipt: null };
  if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
    return deny(
      Response.json(
        { error: "server_misconfigured", detail: "OKX API credentials not set" },
        { status: 500 },
      ),
    );
  }
  if (!PAYTO) {
    return deny(
      Response.json(
        { error: "server_misconfigured", detail: "TXGUARD_PAYTO not set" },
        { status: 500 },
      ),
    );
  }

  const header = req.headers.get("X-PAYMENT") ?? req.headers.get("PAYMENT-SIGNATURE");
  if (!header) return deny(await paymentRequiredResponse());

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return deny(await paymentRequiredResponse("Malformed X-PAYMENT header (expected base64 JSON)"));
  }

  const server = await getPaymentServer();
  const requirements = payload?.accepted;
  if (!requirements)
    return deny(await paymentRequiredResponse("Payment payload missing accepted requirements"));

  // basic sanity: the buyer must be paying US, on OUR network
  if (
    String(requirements.payTo).toLowerCase() !== PAYTO.toLowerCase() ||
    requirements.network !== NETWORK
  ) {
    return deny(await paymentRequiredResponse("Payment requirements do not match this service"));
  }

  const verify = await server.verifyPayment(payload, requirements);
  if (!verify.isValid) {
    return deny(
      await paymentRequiredResponse(verify.invalidMessage ?? verify.invalidReason ?? "Invalid payment"),
    );
  }

  const settle = await server.settlePayment(payload, requirements);
  if (!settle.success) {
    // fail closed: no settlement, no verdict
    return deny(
      Response.json(
        {
          error: "settlement_failed",
          detail: settle.errorMessage ?? settle.errorReason ?? "unknown",
          receipt: encodeReceipt(settle),
        },
        { status: 502 },
      ),
    );
  }

  // Paid. The receipt carries transaction / payer / network / amount, and OKX's
  // status extension ("pending" = accepted but not yet confirmed on-chain).
  return { paid: true, receipt: encodeReceipt(settle) };
}
