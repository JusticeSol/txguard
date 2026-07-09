// POST /api/tools/{check_token|check_address|check_approval|check_url}
// Body: { "subject": "0x... or url", "chain_id": "1" }  (chain_id required except check_url)
//
// ── x402 PAYMENT LAYER GOES HERE ─────────────────────────────────────────────
// Day-3 task: wrap this handler with OKX x402 middleware (X Layer, USDT/USDG,
// OKX facilitator + auth, protocol v2, async settlement). Until then this
// endpoint is FREE for local testing. Do NOT list on OKX.AI before gating.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { runTool } from "../../../../lib/txguard";
import { UpstreamError, type ToolName } from "../../../../lib/types";

const TOOLS: ToolName[] = ["check_token", "check_address", "check_approval", "check_url"];
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest, ctx: { params: Promise<{ tool: string }> }) {
  const { tool } = await ctx.params;
  if (!TOOLS.includes(tool as ToolName)) {
    return NextResponse.json({ error: `Unknown tool. Available: ${TOOLS.join(", ")}` }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = String(body?.subject ?? "").trim();
  const chainId = body?.chain_id ? String(body.chain_id) : undefined;

  // input validation — reject early, never burn a GoPlus call on garbage
  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (tool !== "check_url" && !ADDR_RE.test(subject))
    return NextResponse.json({ error: "subject must be a 0x-prefixed EVM address" }, { status: 400 });
  if ((tool === "check_token" || tool === "check_approval") && !chainId)
    return NextResponse.json({ error: "chain_id is required for this tool" }, { status: 400 });
  if (tool === "check_url" && !/^https?:\/\//.test(subject))
    return NextResponse.json({ error: "subject must be an http(s) URL" }, { status: 400 });

  try {
    const result = await runTool(tool as ToolName, { subject, chain_id: chainId });
    return NextResponse.json(result);
  } catch (err) {
    // FAIL CLOSED: upstream failure is never a "safe" answer.
    if (err instanceof UpstreamError) {
      return NextResponse.json(
        { error: "verification_unavailable", detail: err.message, source: err.source,
          note: "Could not verify. Treat as unverified, not as safe." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
