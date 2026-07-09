// TxGuard core types — matches TXGUARD_SPEC.md section 2

export type Verdict = "safe" | "caution" | "danger";
export type Confidence = "high" | "medium" | "low";
export type ToolName = "check_token" | "check_address" | "check_approval" | "check_url";

export interface RiskFlag {
  code: string;   // stable enum, e.g. "HONEYPOT", "MINTABLE"
  detail: string; // human/agent readable one-liner
}

export interface TxGuardResponse {
  service: string;            // "txguard/0.1.0"
  tool: ToolName;
  chain_id: string | null;    // null for chain-agnostic tools (check_url)
  subject: string;            // address or url checked
  verdict: Verdict;
  risk_score: number;         // 0-100
  confidence: Confidence;
  critical_flags: RiskFlag[];
  warning_flags: RiskFlag[];
  summary: string;            // ONE imperative sentence — agents act on this
  evidence: Record<string, unknown>; // raw upstream fields for audit
  sources: string[];          // e.g. ["goplus:token_security"]
  checked_at: string;         // ISO timestamp
  cache: { hit: boolean; ttl_seconds: number };
  latency_ms: number;
}

/** Thrown when upstream data is unavailable — NEVER map to a "safe" verdict. */
export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export const SERVICE_VERSION = "txguard/0.1.0";
