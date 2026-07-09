// In-memory TTL cache with LRU eviction.
// Protects the GoPlus free tier (30 calls/min). Swap for Vercel KV later if needed.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private map = new Map<string, Entry<T>>();

  constructor(private maxEntries = 2000) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // LRU touch: re-insert at the end
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    if (this.map.size >= this.maxEntries) {
      // evict oldest (first) entry
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

// TTLs per tool (seconds) — spec section 4
export const TTL: Record<string, number> = {
  check_token: 300,      // 5 min — token state changes (taxes, lp) move fast
  check_address: 1800,   // 30 min
  check_approval: 1800,  // 30 min
  check_url: 86400,      // 24 h — phishing domains rarely un-flag
};

export const cacheKey = (tool: string, chainId: string | null, subject: string) =>
  `${tool}:${chainId ?? "-"}:${subject.toLowerCase()}`;
