import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonical((value as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}
export const digest = (value: unknown): string =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function seal(text: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([
    iv,
    c.update(text),
    c.final(),
    c.getAuthTag(),
  ]).toString("base64");
}
export function unseal(text: string, key: Buffer): string {
  const data = Buffer.from(text, "base64");
  const c = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  c.setAuthTag(data.subarray(-16));
  return Buffer.concat([
    c.update(data.subarray(12, -16)),
    c.final(),
  ]).toString();
}
export function validateInput(value: unknown): {
  walletAddress: string;
  holdings: { symbol: string; balance: string; value_usd: number }[];
  totalValueUsd: number;
} {
  const v = value as ReturnType<typeof validateInput>;
  if (
    !v ||
    typeof v.walletAddress !== "string" ||
    v.walletAddress.length > 100 ||
    !Array.isArray(v.holdings) ||
    v.holdings.length < 1 ||
    v.holdings.length > 50
  )
    throw new Error("Provide a portfolio with 1..50 holdings");
  for (const h of v.holdings)
    if (
      typeof h.symbol !== "string" ||
      h.symbol.length > 20 ||
      typeof h.balance !== "string" ||
      h.balance.length > 80 ||
      !Number.isFinite(h.value_usd) ||
      h.value_usd < 0
    )
      throw new Error("Invalid holding");
  const total = v.holdings.reduce((s, h) => s + h.value_usd, 0);
  if (!Number.isFinite(total) || total <= 0 || v.totalValueUsd !== total)
    throw new Error("Total must equal the positive sum of holdings");
  return {
    walletAddress: v.walletAddress,
    holdings: v.holdings.map((h) => ({
      symbol: h.symbol,
      balance: h.balance,
      value_usd: h.value_usd,
    })),
    totalValueUsd: total,
  };
}
// Adapted from Daemon agents/agent_risk_analyzer/src/agent/riskAnalyzer.ts's deterministic fallback.
// Analysis values are measurements; monetary billing always uses integer yoctoNEAR elsewhere.
export function analyze(value: unknown) {
  const input = validateInput(value),
    top = Math.max(...input.holdings.map((h) => h.value_usd));
  const concentration = top / input.totalValueUsd,
    risk_score = Math.round(concentration * 100);
  return {
    risk_score,
    risk_level: risk_score >= 66 ? "high" : risk_score >= 33 ? "medium" : "low",
    summary: `Portfolio is ${(concentration * 100).toFixed(0)}% concentrated in its largest holding.`,
    findings: [
      `Largest holding accounts for ${(concentration * 100).toFixed(0)}% of portfolio value`,
    ],
    recommendations:
      concentration > 0.5
        ? ["Consider diversifying into additional assets"]
        : [],
    method: "deterministic-concentration-v1",
    disclosure:
      "User-supplied holdings; no live price feed, AI inference or financial advice.",
  };
}
export function verifyReport(report: unknown): void {
  const r = report as ReturnType<typeof analyze>;
  if (
    !r ||
    !Number.isInteger(r.risk_score) ||
    r.risk_score < 0 ||
    r.risk_score > 100 ||
    !["low", "medium", "high"].includes(r.risk_level) ||
    typeof r.summary !== "string" ||
    !Array.isArray(r.findings) ||
    !r.findings.every((x) => typeof x === "string") ||
    !Array.isArray(r.recommendations) ||
    !r.recommendations.every((x) => typeof x === "string") ||
    !["deterministic-concentration-v1", "near-ai-cloud-v1"].includes(r.method)
  )
    throw new Error("Artifact schema mismatch");
}

/** Bound the response while reading, before an untrusted provider can consume unbounded memory. */
export async function boundedJson(response: Response): Promise<any> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Provider returned no body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 131072) {
      await reader.cancel();
      throw new Error("Provider response too large");
    }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
