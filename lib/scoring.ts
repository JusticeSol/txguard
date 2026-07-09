// TxGuard scoring engine — spec section 3.
// Pure functions: raw GoPlus fields in → { score, verdict, flags, summary } out.
// Rules:
//   - any CRITICAL flag  => verdict "danger", score floored at 70 (95+ for honeypot/phishing/sanctioned)
//   - warning weights summed otherwise; 0-24 safe, 25-59 caution, 60+ danger
//   - trust_list caps approvals at 10 unless critical present
//   - missing/unknown fields lower confidence, never raise safety

import type { Confidence, RiskFlag, Verdict } from "./types";

export interface ScoreResult {
  score: number;
  verdict: Verdict;
  confidence: Confidence;
  critical: RiskFlag[];
  warnings: RiskFlag[];
  summary: string;
}

const is1 = (v: unknown) => v === "1" || v === 1 || v === true;
const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function verdictFor(score: number): Verdict {
  if (score >= 60) return "danger";
  if (score >= 25) return "caution";
  return "safe";
}

// ---------------------------------------------------------------- check_token

export function scoreToken(d: Record<string, any>): ScoreResult {
  const critical: RiskFlag[] = [];
  const warnings: RiskFlag[] = [];
  let unknowns = 0;

  const sellTax = num(d.sell_tax);
  const buyTax = num(d.buy_tax);

  // --- critical
  if (is1(d.is_honeypot)) critical.push({ code: "HONEYPOT", detail: "Token cannot be sold after purchase" });
  if (is1(d.selfdestruct)) critical.push({ code: "SELFDESTRUCT", detail: "Contract can self-destruct, wiping the token" });
  if (is1(d.owner_change_balance)) critical.push({ code: "OWNER_CHANGE_BALANCE", detail: "Owner can modify holder balances" });
  if (is1(d.can_take_back_ownership)) critical.push({ code: "RECLAIMABLE_OWNERSHIP", detail: "Renounced ownership can be taken back" });
  if (is1(d.hidden_owner)) critical.push({ code: "HIDDEN_OWNER", detail: "Contract has a hidden owner" });
  if (sellTax !== null && sellTax >= 0.5) critical.push({ code: "EXTREME_SELL_TAX", detail: `Sell tax is ${(sellTax * 100).toFixed(0)}%` });

  // --- warnings
  if (is1(d.is_mintable)) warnings.push({ code: "MINTABLE", detail: "Owner can mint new supply" });
  if (is1(d.transfer_pausable)) warnings.push({ code: "PAUSABLE", detail: "Transfers can be paused by owner" });
  if (is1(d.trading_cooldown)) warnings.push({ code: "TRADING_COOLDOWN", detail: "Trading cooldown mechanism present" });
  if (is1(d.is_blacklisted)) warnings.push({ code: "BLACKLIST_FUNCTION", detail: "Contract can blacklist addresses" });
  if (is1(d.slippage_modifiable)) warnings.push({ code: "TAX_MODIFIABLE", detail: "Owner can change buy/sell taxes" });
  if (is1(d.is_proxy)) warnings.push({ code: "PROXY", detail: "Upgradeable proxy — logic can change" });
  if (d.is_open_source !== undefined && !is1(d.is_open_source))
    warnings.push({ code: "UNVERIFIED_SOURCE", detail: "Contract source not verified" });
  if (sellTax !== null && sellTax >= 0.1 && sellTax < 0.5)
    warnings.push({ code: "HIGH_SELL_TAX", detail: `Sell tax is ${(sellTax * 100).toFixed(0)}%` });
  if (buyTax !== null && buyTax >= 0.1)
    warnings.push({ code: "HIGH_BUY_TAX", detail: `Buy tax is ${(buyTax * 100).toFixed(0)}%` });

  // --- unknowns lower confidence
  for (const k of ["is_honeypot", "is_open_source", "is_mintable"]) {
    if (d[k] === undefined || d[k] === "") unknowns++;
  }

  const WEIGHTS: Record<string, number> = {
    MINTABLE: 12, PAUSABLE: 10, TRADING_COOLDOWN: 6, BLACKLIST_FUNCTION: 10,
    TAX_MODIFIABLE: 12, PROXY: 8, UNVERIFIED_SOURCE: 15, HIGH_SELL_TAX: 18, HIGH_BUY_TAX: 10,
  };

  return finalize("token", critical, warnings, WEIGHTS, unknowns, {
    dangerNoun: "token",
    safeAction: "Token passes all checks",
    cautionAction: "Review flags before transacting with this token",
    hardDangerCodes: ["HONEYPOT", "SELFDESTRUCT", "OWNER_CHANGE_BALANCE"],
  });
}

// -------------------------------------------------------------- check_address

export function scoreAddress(d: Record<string, any>): ScoreResult {
  const critical: RiskFlag[] = [];
  const warnings: RiskFlag[] = [];

  const CRIT: Array<[string, string, string]> = [
    ["honeypot_related_address", "HONEYPOT_RELATED", "Address is linked to honeypot scams"],
    ["phishing_activities", "PHISHING", "Address has phishing activity history"],
    ["stealing_attack", "THEFT", "Address linked to theft attacks"],
    ["blacklist_doubt", "BLACKLISTED", "Address appears on blacklists"],
    ["sanctioned", "SANCTIONED", "Address is sanctioned"],
    ["cybercrime", "CYBERCRIME", "Address linked to cybercrime"],
    ["money_laundering", "MONEY_LAUNDERING", "Address linked to money laundering"],
  ];
  const WARN: Array<[string, string, string]> = [
    ["mixer", "MIXER", "Address interacts with mixers"],
    ["darkweb_transactions", "DARKWEB", "Address linked to darkweb transactions"],
    ["fake_kyc", "FAKE_KYC", "Address linked to fake KYC"],
    ["financial_crime", "FINANCIAL_CRIME", "Address linked to financial crime"],
  ];

  for (const [field, code, detail] of CRIT) if (is1(d[field])) critical.push({ code, detail });
  for (const [field, code, detail] of WARN) if (is1(d[field])) warnings.push({ code, detail });

  const WEIGHTS: Record<string, number> = { MIXER: 20, DARKWEB: 25, FAKE_KYC: 15, FINANCIAL_CRIME: 25 };

  return finalize("address", critical, warnings, WEIGHTS, 0, {
    dangerNoun: "address",
    safeAction: "No malicious history found for this address",
    cautionAction: "Address has risk indicators — proceed carefully",
    hardDangerCodes: ["PHISHING", "SANCTIONED", "THEFT"],
  });
}

// ------------------------------------------------------------- check_approval

export function scoreApproval(d: Record<string, any>): ScoreResult {
  const critical: RiskFlag[] = [];
  const warnings: RiskFlag[] = [];

  if (is1(d.doubt_list)) critical.push({ code: "FLAGGED_CONTRACT", detail: "Spender is on GoPlus doubt list" });
  if (is1(d.malicious_behavior) || (Array.isArray(d.malicious_behavior) && d.malicious_behavior.length > 0))
    critical.push({ code: "MALICIOUS_BEHAVIOR", detail: "Spender has recorded malicious behavior" });
  if (d.is_contract !== undefined && !is1(d.is_contract))
    critical.push({ code: "EOA_SPENDER", detail: "Spender is a wallet, not a contract — classic drainer pattern" });

  if (d.is_open_source !== undefined && !is1(d.is_open_source))
    warnings.push({ code: "UNVERIFIED_SOURCE", detail: "Spender contract source not verified" });
  if (is1(d.creator_address_malicious))
    warnings.push({ code: "RISKY_CREATOR", detail: "Contract creator has malicious history" });

  const WEIGHTS: Record<string, number> = { UNVERIFIED_SOURCE: 20, RISKY_CREATOR: 25 };

  const result = finalize("approval", critical, warnings, WEIGHTS, 0, {
    dangerNoun: "approval",
    safeAction: "Spender contract passes all checks",
    cautionAction: "Review spender flags before approving",
    hardDangerCodes: ["EOA_SPENDER", "MALICIOUS_BEHAVIOR"],
  });

  // trust_list cap — spec section 3
  if (is1(d.trust_list) && critical.length === 0) {
    return {
      ...result,
      score: Math.min(result.score, 10),
      verdict: "safe",
      summary: "Spender is on the GoPlus trust list. Safe to approve.",
    };
  }
  return result;
}

// ------------------------------------------------------------------ check_url

export function scoreUrl(d: Record<string, any>): ScoreResult {
  if (is1(d.phishing_site)) {
    return {
      score: 100,
      verdict: "danger",
      confidence: "high",
      critical: [{ code: "PHISHING_SITE", detail: "URL is a confirmed phishing site" }],
      warnings: [],
      summary: "Confirmed phishing site. Do not visit, connect a wallet, or sign anything.",
    };
  }
  const known = d.phishing_site !== undefined;
  return {
    score: 0,
    verdict: "safe",
    confidence: known ? "high" : "low",
    critical: [],
    warnings: [],
    summary: known
      ? "URL is not in the phishing database."
      : "URL not found in database — absence of a flag is not proof of safety.",
  };
}

// ------------------------------------------------------------------ internals

function finalize(
  _kind: string,
  critical: RiskFlag[],
  warnings: RiskFlag[],
  weights: Record<string, number>,
  unknowns: number,
  copy: { dangerNoun: string; safeAction: string; cautionAction: string; hardDangerCodes: string[] },
): ScoreResult {
  let score: number;
  if (critical.length > 0) {
    const hard = critical.some((f) => copy.hardDangerCodes.includes(f.code));
    score = clamp((hard ? 95 : 70) + (critical.length - 1) * 5);
  } else {
    score = clamp(warnings.reduce((s, f) => s + (weights[f.code] ?? 8), 0));
  }

  const verdict = critical.length > 0 ? "danger" : verdictFor(score);
  const confidence: Confidence = unknowns >= 2 ? "low" : unknowns === 1 ? "medium" : "high";

  let summary: string;
  if (verdict === "danger") {
    const top = critical[0] ?? warnings[0];
    summary = `${top.detail}. Do not proceed with this ${copy.dangerNoun}.`;
  } else if (verdict === "caution") {
    summary = `${copy.cautionAction} (${warnings.map((w) => w.code).join(", ")}).`;
  } else {
    summary =
      confidence === "low"
        ? `${copy.safeAction}, but key security fields were unavailable — treat as unverified, not proven safe.`
        : `${copy.safeAction}.`;
  }

  return { score, verdict, confidence, critical, warnings, summary };
}
