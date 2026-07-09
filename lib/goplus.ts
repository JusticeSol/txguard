// Thin typed client for the 4 GoPlus endpoints TxGuard consumes.
// Docs index (OpenAPI, LLM-ready): https://docs.gopluslabs.io/llms.txt
// Free tier: 30 calls/min, no auth. On 429 we backoff then FAIL CLOSED (UpstreamError).

import { UpstreamError } from "./types";

const BASE = "https://api.gopluslabs.io/api/v1";
const BACKOFF_MS = [250, 1000, 4000];

async function goplusGet(path: string, source: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 429) throw new UpstreamError("GoPlus rate limited", source, 429);
      if (!res.ok) throw new UpstreamError(`GoPlus HTTP ${res.status}`, source, res.status);
      const body = await res.json();
      // GoPlus convention: code 1 = success. Anything else = treat as upstream failure.
      if (body.code !== 1 && body.code !== undefined) {
        throw new UpstreamError(`GoPlus code ${body.code}: ${body.message ?? "unknown"}`, source);
      }
      return body.result ?? {};
    } catch (err) {
      lastErr = err;
      const retriable =
        err instanceof UpstreamError ? err.status === 429 || (err.status ?? 500) >= 500 : true; // network/timeout
      if (!retriable || attempt === BACKOFF_MS.length) break;
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
  if (lastErr instanceof UpstreamError) throw lastErr;
  throw new UpstreamError(String(lastErr), source);
}

/** Token Security API. Returns the raw result object for ONE token (keyed by address). */
export async function fetchTokenSecurity(chainId: string, tokenAddress: string): Promise<Record<string, any>> {
  const addr = tokenAddress.toLowerCase();
  const result = await goplusGet(
    `/token_security/${chainId}?contract_addresses=${addr}`,
    "goplus:token_security",
  );
  const data = result[addr] ?? result[tokenAddress] ?? null;
  if (!data) throw new UpstreamError("Token not found in GoPlus response", "goplus:token_security", 404);
  return data;
}

/** Malicious Address API. */
export async function fetchAddressSecurity(address: string, chainId?: string): Promise<Record<string, any>> {
  const qs = chainId ? `?chain_id=${chainId}` : "";
  return goplusGet(`/address_security/${address.toLowerCase()}${qs}`, "goplus:address_security");
}

/** Approval Security API (contract security of a spender). */
export async function fetchApprovalSecurity(chainId: string, contractAddress: string): Promise<Record<string, any>> {
  const addr = contractAddress.toLowerCase();
  const result = await goplusGet(
    `/approval_security/${chainId}?contract_addresses=${addr}`,
    "goplus:approval_security",
  );
  // response may be keyed by address or be a flat object depending on endpoint version
  return result[addr] ?? result;
}

/** Phishing Site API. */
export async function fetchPhishingSite(url: string): Promise<Record<string, any>> {
  return goplusGet(`/phishing_site?url=${encodeURIComponent(url)}`, "goplus:phishing_site");
}
