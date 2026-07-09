# TxGuard

Pre-flight risk checks for AI agents. One pay-per-call question: **"is this token / wallet / approval / URL dangerous?"** → one verdict: `safe | caution | danger` + 0-100 score.

Built for the OKX AI Genesis Hackathon (A2MCP, x402 pay-per-call, X Layer settlement).

## Status
- [x] Scoring engine + GoPlus client + cache (13/13 unit tests passing)
- [x] Free HTTP API routes (Next.js App Router)
- [ ] Live GoPlus smoke test (test vectors in TXGUARD_SPEC.md §7)
- [ ] MCP wrapper (Streamable HTTP)
- [ ] x402 payment gating (OKX facilitator, X Layer, USDT/USDG)
- [ ] ASP listing on OKX.AI

## Quick start (Windows / PowerShell)
```powershell
npm install
npm test                       # scoring engine unit tests, no network needed
# to run the API you need a Next.js app shell:
npm install next react react-dom
npm run dev
```

## Try it (once dev server is running)
```powershell
# WETH on Ethereum - should be "safe"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tools/check_token `
  -ContentType "application/json" `
  -Body '{"subject":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","chain_id":"1"}'

# Uniswap V2 Router as spender - should be "safe" (trust list)
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tools/check_approval `
  -ContentType "application/json" `
  -Body '{"subject":"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D","chain_id":"1"}'
```

## Layout
```
lib/types.ts     unified response schema + UpstreamError (fail-closed)
lib/goplus.ts    typed GoPlus client, backoff, 8s timeout
lib/cache.ts     TTL+LRU cache (free tier = 30 calls/min)
lib/scoring.ts   THE PRODUCT: flags -> score -> verdict -> one-line summary
lib/txguard.ts   orchestrator
app/api/tools/[tool]/route.ts   HTTP layer, payment stub marked
tests/           unit tests with realistic GoPlus fixtures
TXGUARD_SPEC.md  full blueprint (endpoints, weights, build order)
```

## Design rules (do not break)
1. Upstream failure NEVER returns "safe" - fail closed (HTTP 502 + "treat as unverified").
2. `summary` is one imperative sentence - LLM agents act on it directly.
3. Flag codes are a stable enum - programmatic callers branch on codes, not text.
4. `cache.hit` is reported honestly - paying agents deserve to know freshness.
