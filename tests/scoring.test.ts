// Unit tests for the scoring engine using realistic GoPlus response shapes.
// Run: npx tsx --test tests/scoring.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreToken, scoreAddress, scoreApproval, scoreUrl } from "../lib/scoring";

// --- check_token -------------------------------------------------------------

test("honeypot token => danger, score >= 95", () => {
  const r = scoreToken({
    is_honeypot: "1", is_open_source: "1", is_mintable: "0",
    sell_tax: "0.12", buy_tax: "0",
  });
  assert.equal(r.verdict, "danger");
  assert.ok(r.score >= 95);
  assert.ok(r.critical.some((f) => f.code === "HONEYPOT"));
  assert.match(r.summary, /Do not proceed/);
});

test("clean blue-chip (WETH-like) => safe, score 0", () => {
  const r = scoreToken({
    is_honeypot: "0", is_open_source: "1", is_mintable: "0",
    transfer_pausable: "0", is_proxy: "0", sell_tax: "0", buy_tax: "0",
  });
  assert.equal(r.verdict, "safe");
  assert.equal(r.score, 0);
  assert.equal(r.confidence, "high");
});

test("mintable + pausable + unverified => caution/danger by weights, never safe", () => {
  const r = scoreToken({
    is_honeypot: "0", is_open_source: "0", is_mintable: "1", transfer_pausable: "1",
  });
  // 15 (UNVERIFIED) + 12 (MINTABLE) + 10 (PAUSABLE) = 37 => caution
  assert.equal(r.score, 37);
  assert.equal(r.verdict, "caution");
});

test("extreme sell tax (60%) is critical", () => {
  const r = scoreToken({ is_honeypot: "0", is_open_source: "1", is_mintable: "0", sell_tax: "0.6" });
  assert.equal(r.verdict, "danger");
  assert.ok(r.critical.some((f) => f.code === "EXTREME_SELL_TAX"));
});

test("missing key fields lower confidence, do not raise safety", () => {
  const r = scoreToken({}); // GoPlus returned an empty object
  assert.equal(r.confidence, "low");
});

// --- check_address -----------------------------------------------------------

test("phishing address => danger, score >= 95", () => {
  const r = scoreAddress({ phishing_activities: "1", cybercrime: "0" });
  assert.equal(r.verdict, "danger");
  assert.ok(r.score >= 95);
});

test("clean address => safe", () => {
  const r = scoreAddress({ phishing_activities: "0", cybercrime: "0", mixer: "0" });
  assert.equal(r.verdict, "safe");
});

test("mixer + darkweb => caution", () => {
  const r = scoreAddress({ mixer: "1", darkweb_transactions: "1" });
  assert.equal(r.score, 45); // 20 + 25
  assert.equal(r.verdict, "caution");
});

// --- check_approval ----------------------------------------------------------

test("EOA spender => danger (drainer pattern)", () => {
  const r = scoreApproval({ is_contract: "0" });
  assert.equal(r.verdict, "danger");
  assert.ok(r.critical.some((f) => f.code === "EOA_SPENDER"));
});

test("trusted spender (Uniswap-router-like) => safe, capped at 10", () => {
  const r = scoreApproval({ is_contract: "1", is_open_source: "0", trust_list: "1" });
  assert.equal(r.verdict, "safe");
  assert.ok(r.score <= 10);
  assert.match(r.summary, /trust list/i);
});

test("trust_list does NOT override critical flags", () => {
  const r = scoreApproval({ is_contract: "0", trust_list: "1" });
  assert.equal(r.verdict, "danger");
});

// --- check_url ---------------------------------------------------------------

test("confirmed phishing URL => danger 100", () => {
  const r = scoreUrl({ phishing_site: 1 });
  assert.equal(r.verdict, "danger");
  assert.equal(r.score, 100);
});

test("unknown URL => safe but LOW confidence, honest summary", () => {
  const r = scoreUrl({});
  assert.equal(r.verdict, "safe");
  assert.equal(r.confidence, "low");
  assert.match(r.summary, /not proof of safety/);
});
