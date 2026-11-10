/** One bounded inference request, with TEE preflight and response verification. */
import "dotenv/config";
import { inferVerified } from "./ai.js";
import { digest } from "./core.js";
import { db, migrate } from "./db.js";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
await migrate();
const limit = Number(process.env["NEAR_AI_MAX_REQUESTS"] ?? 0);
if (!Number.isInteger(limit) || limit < 1 || limit > 20)
  throw Error("Explicit free-credit request limit required");
const budget = await db.query(
  "UPDATE accord_ai_budget SET requests=requests+1 WHERE id=1 AND requests<$1 RETURNING requests",
  [limit],
);
if (!budget.rowCount) throw Error("Inference request limit reached");
try {
  const report = await inferVerified({
    walletAddress: "example.testnet",
    holdings: [
      { symbol: "NEAR", balance: "10", value_usd: 80 },
      { symbol: "USDC", balance: "20", value_usd: 20 },
    ],
    totalValueUsd: 100,
  });
  await writeFile(
    resolve(import.meta.dirname, "../../../docs/near-ai-proof.json"),
    JSON.stringify(
      {
        provider: "NEAR AI Cloud",
        artifact_hash: digest(report),
        report,
        verified_at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Verified AI inference succeeded; public evidence saved");
} catch (error) {
  const code = error instanceof Error ? error.name : "UnknownError";
  let detail = error instanceof Error ? error.message : "Unknown error";
  const secret = process.env["NEARAI_API_KEY"];
  if (secret) detail = detail.split(secret).join("[REDACTED]");
  detail = detail
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[REDACTED]");
  console.error("AI verification failed:", code, detail.slice(0, 400));
  process.exitCode = 1;
} finally {
  await db.end();
}
