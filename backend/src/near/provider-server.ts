import "express-async-errors";
import express from "express";
import { randomUUID } from "node:crypto";
import { db, migrate } from "./db.js";
import {
  config,
  networkCheck,
  view,
  type Subscription,
  type Service,
  type Receipt,
} from "./config.js";
import { isAgentKind, validateServiceInput, runChainAgent } from "./agents.js";
import { reserveGroqRequest } from "./groq-budget.js";
import { explainWithGroq } from "./groq.js";
import { inferVerified } from "./ai.js";
import { analyze, digest } from "./core.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
function cycleArgs(body: Record<string, unknown>) {
  const id = String(body["subscription_id"]);
  const cycle = body["cycle"];
  if (
    !/^\d{1,20}$/.test(id) ||
    !Number.isInteger(cycle) ||
    Number(cycle) < 0 ||
    Number(cycle) > 19
  )
    throw new Error("Invalid subscription/cycle");
  return { subscription_id: id, cycle: Number(cycle) };
}
app.get("/health", (_req, res) =>
  res.json({ ok: true, network: config.network, role: "independent-provider" }),
);
app.post("/prepare", async (req, res) => {
  const args = cycleArgs(req.body);
  const sub = await view<Subscription | null>("get_subscription", {
    subscription_id: args.subscription_id,
  });
  if (!sub || args.cycle >= sub.max_cycles)
    throw new Error("Agreement mismatch");
  const service = await view<Service>("get_service", {
    service_id: sub.service_id,
  });
  if (service.provider !== process.env["PROVIDER_ACCOUNT_ID"])
    throw new Error("Not this provider");
  const metadata = (
    await db.query("SELECT metadata FROM accord_services WHERE id=$1", [
      sub.service_id,
    ])
  ).rows[0]?.metadata;
  if (!metadata || digest(metadata) !== service.metadata_hash)
    throw new Error("Provider metadata does not match immutable onchain offer");
  const input = validateServiceInput(metadata.kind, req.body.input);
  if (digest(input) !== sub.input_hash)
    throw new Error("Agreement/input mismatch");
  const existing = (
    await db.query(
      "SELECT * FROM accord_provider_artifacts WHERE subscription_id=$1 AND cycle=$2",
      [args.subscription_id, args.cycle],
    )
  ).rows[0];
  function prepared(item: any) {
    return {
      ...args,
      prepare_id: item.prepare_id,
      artifact_hash: item.artifact_hash,
      provider: service.provider,
      amount: service.price,
      input_hash: sub!.input_hash,
    };
  }
  if (existing) {
    if (existing.state !== "READY")
      throw new Error(
        "Preparation pending or needs review; no duplicate inference will be started",
      );
    res.json(prepared(existing));
    return;
  }
  if (
    !sub.active ||
    args.cycle !== sub.cycles ||
    BigInt(sub.expires_at_ns) <= BigInt(Date.now()) * 1000000n ||
    BigInt(sub.next_due_ns) > BigInt(Date.now()) * 1000000n
  )
    throw new Error("This cycle is not currently authorized and due");
  const prepare_id = randomUUID();
  const inserted = await db.query(
    "INSERT INTO accord_provider_artifacts(subscription_id,cycle,prepare_id,artifact_hash,report,state) VALUES($1,$2,$3,$4,'null'::jsonb,'PREPARING') ON CONFLICT DO NOTHING RETURNING prepare_id",
    [args.subscription_id, args.cycle, prepare_id, "0".repeat(64)],
  );
  if (!inserted.rowCount)
    throw new Error(
      "Preparation already claimed; retry to retrieve the same artifact",
    );
  try {
    let report: unknown;
    if (metadata.analysis_mode === "near-ai-cloud") {
      if (process.env["NEAR_AI_ENABLED"] !== "true")
        throw new Error("AI inference is paused");
      const limit = Number(process.env["NEAR_AI_MAX_REQUESTS"] ?? "0");
      if (!Number.isInteger(limit) || limit < 1 || limit > 20)
        throw new Error("Set an explicit inference request limit (1..20)");
      const budget = await db.query(
        "UPDATE accord_ai_budget SET requests=requests+1 WHERE id=1 AND requests<$1 RETURNING requests",
        [limit],
      );
      if (!budget.rowCount)
        throw new Error(
          "Free-credit request limit reached; no top-up or paid fallback",
        );
      report = await inferVerified(input);
    } else
      report = isAgentKind(metadata.kind)
        ? await runChainAgent(metadata.kind, input)
        : analyze(input);
    if (metadata.analysis_mode === "groq") {
      if (!isAgentKind(metadata.kind)) throw Error("Groq requires chain evidence");
      await reserveGroqRequest();
      report = await explainWithGroq(report as Parameters<typeof explainWithGroq>[0]);
    }
    const artifact_hash = digest(report);
    await db.query(
      "UPDATE accord_provider_artifacts SET artifact_hash=$3,report=$4,state='READY' WHERE subscription_id=$1 AND cycle=$2 AND prepare_id=$5",
      [args.subscription_id, args.cycle, artifact_hash, report, prepare_id],
    );
    res.json(prepared({ prepare_id, artifact_hash }));
  } catch {
    // An opaque inference timeout may have consumed credits. Never automatically request it again.
    await db.query(
      "UPDATE accord_provider_artifacts SET state='NEEDS_REVIEW' WHERE subscription_id=$1 AND cycle=$2",
      [args.subscription_id, args.cycle],
    );
    throw new Error(
      "Preparation requires review; no subscription charge was requested and no AI fallback will be substituted",
    );
  }
});
app.post("/deliver", async (req, res) => {
  const args = cycleArgs(req.body);
  // Receipt is queried directly from NEAR, never accepted from the caller.
  const receipt = await view<Receipt | null>("get_receipt", args);
  const sub = await view<Subscription | null>("get_subscription", {
    subscription_id: args.subscription_id,
  });
  if (
    !receipt ||
    !sub ||
    receipt.provider !== process.env["PROVIDER_ACCOUNT_ID"]
  ) {
    res.status(402).json({ error: "Verified payment required" });
    return;
  }
  const service = await view<Service>("get_service", {
    service_id: sub.service_id,
  });
  const item = (
    await db.query(
      "SELECT * FROM accord_provider_artifacts WHERE subscription_id=$1 AND cycle=$2",
      [args.subscription_id, args.cycle],
    )
  ).rows[0];
  if (
    !item ||
    item.prepare_id !== req.body.prepare_id ||
    receipt.artifact_hash !== item.artifact_hash ||
    receipt.amount !== service.price
  )
    throw new Error("Proof/artifact mismatch");
  // A paid report is intentionally retrievable repeatedly by capability; it cannot buy a different artifact.
  res.json({ report: item.report, artifact_hash: item.artifact_hash, receipt });
});
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(400).json({ error: error.message });
  },
);
await migrate();
await networkCheck();
app.listen(config.providerPort, process.env["BIND_HOST"] ?? "127.0.0.1", () =>
  console.log(`Accord provider :${config.providerPort}`),
);
