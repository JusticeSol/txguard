// Live smoke test — hits the real GoPlus API. Run: npx tsx tests/smoke.ts
import { runTool } from "../lib/txguard";

const CASES = [
  { tool: "check_token",    subject: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", chain_id: "1", expect: "safe", label: "WETH" },
  { tool: "check_approval", subject: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", chain_id: "1", expect: "safe", label: "Uniswap V2 Router" },
  { tool: "check_url",      subject: "https://uniswap.org",                                        expect: "safe", label: "uniswap.org" },
  { tool: "check_token", subject: "0xecf429955109dE2C3bB4f4565488DD03a1eeaffe", chain_id: "1", expect: "danger", label: "Confirmed honeypot (GoPlus test case)" },
] as const;

async function main() {
  for (const c of CASES) {
    try {
      const r = await runTool(c.tool, { subject: c.subject, chain_id: (c as any).chain_id });
      const ok = r.verdict === c.expect ? "PASS" : "MISMATCH";
      console.log(`[${ok}] ${c.label}: verdict=${r.verdict} score=${r.risk_score} conf=${r.confidence} cache=${r.cache.hit} ${r.latency_ms}ms`);
      console.log(`       ${r.summary}`);
    } catch (err: any) {
      console.log(`[FAIL-CLOSED] ${c.label}: ${err.message} (upstream error, not a bug)`);
    }
  }
}

main();
