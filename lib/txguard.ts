// Orchestrator: tool call in → cached/fresh GoPlus data → scored → unified TxGuardResponse out.

import { TTLCache, TTL, cacheKey } from "./cache";
import { fetchTokenSecurity, fetchAddressSecurity, fetchApprovalSecurity, fetchPhishingSite } from "./goplus";
import { scoreToken, scoreAddress, scoreApproval, scoreUrl, type ScoreResult } from "./scoring";
import { SERVICE_VERSION, type ToolName, type TxGuardResponse } from "./types";

const cache = new TTLCache<{ raw: Record<string, any>; source: string }>();

type Runner = (params: Record<string, string>) => Promise<{ raw: Record<string, any>; source: string }>;

const runners: Record<ToolName, Runner> = {
  check_token: async (p) => ({ raw: await fetchTokenSecurity(p.chain_id, p.subject), source: "goplus:token_security" }),
  check_address: async (p) => ({ raw: await fetchAddressSecurity(p.subject, p.chain_id || undefined), source: "goplus:address_security" }),
  check_approval: async (p) => ({ raw: await fetchApprovalSecurity(p.chain_id, p.subject), source: "goplus:approval_security" }),
  check_url: async (p) => ({ raw: await fetchPhishingSite(p.subject), source: "goplus:phishing_site" }),
};

const scorers: Record<ToolName, (d: Record<string, any>) => ScoreResult> = {
  check_token: scoreToken,
  check_address: scoreAddress,
  check_approval: scoreApproval,
  check_url: scoreUrl,
};

export async function runTool(
  tool: ToolName,
  params: { subject: string; chain_id?: string },
): Promise<TxGuardResponse> {
  const started = Date.now();
  const chainId = params.chain_id ?? null;
  const key = cacheKey(tool, chainId, params.subject);

  let hit = true;
  let entry = cache.get(key);
  if (!entry) {
    hit = false;
    entry = await runners[tool]({ subject: params.subject, chain_id: chainId ?? "" });
    cache.set(key, entry, TTL[tool]);
  }

  const s = scorers[tool](entry.raw);

  return {
    service: SERVICE_VERSION,
    tool,
    chain_id: tool === "check_url" ? null : chainId,
    subject: params.subject,
    verdict: s.verdict,
    risk_score: s.score,
    confidence: s.confidence,
    critical_flags: s.critical,
    warning_flags: s.warnings,
    summary: s.summary,
    evidence: pickEvidence(entry.raw),
    sources: [entry.source],
    checked_at: new Date().toISOString(),
    cache: { hit, ttl_seconds: TTL[tool] },
    latency_ms: Date.now() - started,
  };
}

// Keep evidence compact: only defined scalar fields, drop giant arrays (holders etc.)
function pickEvidence(raw: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") continue;
    out[k] = v;
  }
  return out;
}
