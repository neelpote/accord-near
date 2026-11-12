import { runOperations } from "./operations-worker.js";
import { mountOperations } from "./operations-api.js";
import { groqConfigured } from "./groq-budget.js";
import "express-async-errors";
import express from "express";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { KeyPair } from "near-api-js";
import { verifyMessage } from "near-api-js/nep413";
import { db, migrate, migrateProvisioning } from "./db.js";
import {
  config,
  rpc,
  view,
  networkCheck,
  type Service,
  type Subscription,
} from "./config.js";
import { digest, seal } from "./core.js";
import {
  agentDefinitions,
  isAgentKind,
  validateServiceInput,
} from "./agents.js";
import { tick, encryptionKey } from "./worker.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.headers.origin !== config.origin) {
    res.status(403).json({ error: "Origin mismatch" });
    return;
  }
  next();
});
app.get("/inference/status", (_req,res) => res.json({groq_configured: groqConfigured()}));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const id = (s: unknown) => {
  if (
    typeof s !== "string" ||
    !/^\d{1,20}$/.test(s) ||
    BigInt(s) > 18446744073709551615n
  )
    throw new Error("Invalid ID");
  return s;
};
async function owner(req: express.Request): Promise<string> {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("accord_session="))
    ?.slice(15);
  if (!token) throw new Error("Sign in with your NEAR wallet");
  const row = (
    await db.query(
      "SELECT account_id FROM accord_sessions WHERE token_hash=$1 AND expires_at>now()",
      [sha(token)],
    )
  ).rows[0];
  if (!row) throw new Error("Session expired; sign in again");
  return row.account_id;
}
mountOperations(app, owner);
const limits = new Map<string, { at: number; count: number }>();
app.get("/health", (_req, res) =>
  res.json({ ok: true, network: config.network, contract: config.contract }),
);
app.get("/ready",async(_req,res)=>{
 try{await db.query("SELECT 1");const h=(await db.query("SELECT last_completed FROM accord_worker_health WHERE name='operations'")).rows[0];
 const enabled=process.env.RUN_OPERATIONS!=="false"||process.env.HOSTED_API==="true",fresh=!!h?.last_completed&&Date.now()-new Date(h.last_completed).getTime()<180000;
 res.status(!enabled||fresh?200:503).json({database:"ready",operations_worker:enabled?(fresh?"recent completion":"stale or starting"):"disabled",network:config.network});
 }catch{res.status(503).json({database:"unavailable"});}
});
app.get("/config", (_req, res) =>
  res.json({
    network: config.network,
    contract: config.contract,
    rpc: config.rpc,
    recipient: new URL(config.origin).host,
    provider_url: config.provider,
  }),
);
app.post("/auth/challenge", async (req, res) => {
  const key = req.ip ?? "unknown";
  const entry = limits.get(key);
  const now = Date.now();
  if (entry && now - entry.at < 300000 && entry.count >= 20) {
    res.status(429).json({ error: "Try again in five minutes" });
    return;
  }
  limits.set(
    key,
    entry && now - entry.at < 300000
      ? { ...entry, count: entry.count + 1 }
      : { at: now, count: 1 },
  );
  if (limits.size > 10000) limits.clear();
  const challenge_id = randomUUID(),
    nonce = randomBytes(32).toString("base64");
  await db.query("DELETE FROM accord_challenges WHERE expires_at<now()");
  await db.query(
    "INSERT INTO accord_challenges VALUES($1,$2,now()+interval '5 minutes')",
    [challenge_id, nonce],
  );
  res.json({
    challenge_id,
    nonce,
    message: `Sign in to Accord on ${config.network}. Challenge ${challenge_id}. This does not authorize payments.`,
    recipient: new URL(config.origin).host,
  });
});
app.post("/auth/verify", async (req, res) => {
  const { challenge_id, accountId, publicKey, signature } = req.body;
  if (
    [challenge_id, accountId, publicKey, signature].some(
      (x) => typeof x !== "string" || x.length > 200,
    )
  )
    throw new Error("Invalid sign-in response");
  const challenge = (
    await db.query(
      "DELETE FROM accord_challenges WHERE id=$1 AND expires_at>now() RETURNING nonce",
      [challenge_id],
    )
  ).rows[0];
  if (!challenge) throw new Error("Challenge expired or already used");
  await verifyMessage({
    signerAccountId: accountId,
    signerPublicKey: publicKey,
    signature: Buffer.from(signature, "base64"),
    provider: rpc,
    payload: {
      message: `Sign in to Accord on ${config.network}. Challenge ${challenge_id}. This does not authorize payments.`,
      nonce: Buffer.from(challenge.nonce, "base64"),
      recipient: new URL(config.origin).host,
    },
  });
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO accord_sessions VALUES($1,$2,now()+interval '12 hours')",
    [sha(token), accountId],
  );
  res.cookie("accord_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.origin.startsWith("https:"),
    maxAge: 43200000,
    path: "/",
  });
  res.json({ accountId });
});
app.get("/me", async (req, res) => {
  res.json({ accountId: await owner(req) });
});
app.post("/auth/logout", async (req, res) => {
  const account = await owner(req);
  await db.query("DELETE FROM accord_sessions WHERE account_id=$1", [account]);
  res.clearCookie("accord_session");
  res.json({ ok: true });
});
app.get("/agent-examples", async (_req, res) =>
  res.json(
    (await db.query("SELECT * FROM accord_agent_demos ORDER BY service_id"))
      .rows.map(row => ({...row, kind: row.report.kind})),
  ),
);
app.get("/agent-types", (_req, res) => res.json(agentDefinitions()));
app.get("/services", async (_req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id,metadata FROM accord_services WHERE listed ORDER BY id",
      )
    ).rows,
  ),
);
app.post("/services/:id/unlist", async (req, res) => {
  const account = await owner(req),
    serviceId = id(req.params["id"]);
  const service = await view<Service>("get_service", { service_id: serviceId });
  if (service.provider !== account) throw new Error("Not provider");
  await db.query("UPDATE accord_services SET listed=false WHERE id=$1", [
    serviceId,
  ]);
  res.json({ unlisted: true });
});
app.post("/services", async (req, res) => {
  const account = await owner(req),
    serviceId = id(req.body.service_id),
    metadata = req.body.metadata;
  if (
    metadata?.analysis_mode === "near-ai-cloud" &&
    process.env["NEAR_AI_ENABLED"] !== "true"
  )
    throw new Error(
      "AI offers are paused until inference credits are verified",
    );
  if (
    !metadata ||
    (metadata.kind !== "portfolio-concentration-v1" &&
      !isAgentKind(metadata.kind)) ||
    typeof metadata.description !== "string" ||
    metadata.description.length > 2000 ||
    metadata.provider_url !== config.provider ||
    !["deterministic", "near-ai-cloud", "groq", undefined].includes(
      metadata.analysis_mode,
    )
  )
    throw new Error("Use the approved risk-provider endpoint and schema");
  if (isAgentKind(metadata.kind)) {
    if (!["deterministic", "groq"].includes(metadata.analysis_mode))
      throw new Error("Live RPC agents use deterministic rules");
    validateServiceInput(metadata.kind, metadata.input_example);
  }
  if (metadata.analysis_mode === "groq" && (!isAgentKind(metadata.kind) || !groqConfigured()))
    throw Error("Groq chain explanations require an enabled provider and key");
  const service = await view<Service | null>("get_service", {
    service_id: serviceId,
  });
  if (
    !service ||
    service.provider !== account ||
    service.metadata_hash !== digest(metadata)
  )
    throw new Error("Register these exact service terms on NEAR first");
  if (service.provider !== process.env["PROVIDER_ACCOUNT_ID"])
    throw new Error(
      "This deployment only lists the account operated by its configured provider",
    );
  await db.query(
    "INSERT INTO accord_services(id,metadata) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [serviceId, metadata],
  );
  res.json({ service_id: serviceId, service, metadata });
});
app.post("/transactions/confirm", async (req, res) => {
  const account = await owner(req),
    hash = req.body.hash;
  if (typeof hash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(hash))
    throw new Error("Invalid transaction hash");
  const tx = await rpc.viewTransactionStatus({
    txHash: hash,
    accountId: account,
    waitUntil: "FINAL",
  });
  if (
    tx.final_execution_status !== "FINAL" ||
    tx.transaction.signer_id !== account ||
    ![account, config.contract].includes(tx.transaction.receiver_id) ||
    typeof tx.status !== "object" ||
    !("SuccessValue" in tx.status)
  )
    throw new Error("Transaction did not finalize successfully");
  if (
    tx.receipts_outcome.some(
      (r) =>
        typeof r.outcome.status === "object" && "Failure" in r.outcome.status,
    )
  )
    throw new Error(
      "A transaction receipt failed; inspect the withdrawal balance before retrying",
    );
  res.json({ hash, confirmed: true, result: tx.status.SuccessValue });
});
app.post("/inputs/validate", async (req, res) => {
  await owner(req);
  let kind = "portfolio-concentration-v1";
  if (req.body.service_id !== undefined) {
    const row = (
      await db.query("SELECT metadata FROM accord_services WHERE id=$1", [
        id(req.body.service_id),
      ])
    ).rows[0];
    if (!row) throw new Error("Unknown service");
    kind = row.metadata.kind;
  }
  const input = validateServiceInput(kind, req.body.input);
  res.json({ input, input_hash: digest(input) });
});
app.post("/delegates", async (req, res) => {
  const account = await owner(req),
    key = KeyPair.fromRandom("ed25519"),
    provision_id = randomUUID();
  await db.query("DELETE FROM accord_provisioning WHERE expires_at<now()");
  const count = (
    await db.query(
      "SELECT count(*) FROM accord_provisioning p WHERE p.owner=$1 AND NOT EXISTS (SELECT 1 FROM accord_subscriptions s WHERE s.owner=p.owner AND s.delegate_cipher=p.delegate_cipher)",
      [account],
    )
  ).rows[0].count;
  if (Number(count) >= 10) throw new Error("Too many unfinished approvals");
  await db.query(
    "INSERT INTO accord_provisioning VALUES($1,$2,$3,$4,now()+interval '1 hour')",
    [
      provision_id,
      account,
      key.getPublicKey().toString(),
      seal(key.toString(), encryptionKey()),
    ],
  );
  res.json({
    provision_id,
    public_key: key.getPublicKey().toString(),
    receiver_id: config.contract,
    method_names: ["charge"],
    allowance: "50000000000000000000000",
  });
});
app.post("/subscriptions/recover", async (req, res) => {
  const account = await owner(req);
  const provision = (
    await db.query(
      "SELECT public_key FROM accord_provisioning WHERE id=$1 AND owner=$2",
      [req.body.provision_id, account],
    )
  ).rows[0];
  if (!provision) throw new Error("No pending approval for this wallet");
  const counters = await view<[string, string]>("counters", {});
  const end = BigInt(counters[1]);
  for (let n = end - 1n; n >= 0n && n >= end - 100n; n--) {
    const sub = await view<Subscription>("get_subscription", {
      subscription_id: n.toString(),
    });
    if (sub.owner === account && sub.delegate_key === provision.public_key) {
      res.json({ subscription_id: n.toString(), active: sub.active });
      return;
    }
  }
  throw new Error(
    "No confirmed agreement found. Wait for finality and retry; check your wallet transaction before funding again.",
  );
});
app.post("/subscriptions", async (req, res) => {
  const account = await owner(req),
    subscriptionId = id(req.body.subscription_id);
  const provision = (
    await db.query(
      "SELECT * FROM accord_provisioning WHERE id=$1 AND owner=$2 AND expires_at>now()",
      [req.body.provision_id, account],
    )
  ).rows[0];
  if (!provision) throw new Error("Delegate approval expired");
  const sub = await view<Subscription | null>("get_subscription", {
    subscription_id: subscriptionId,
  });
  if (!sub) throw new Error("Unknown onchain agreement");
  const metadata = (
    await db.query("SELECT metadata FROM accord_services WHERE id=$1", [
      sub.service_id,
    ])
  ).rows[0]?.metadata;
  if (!metadata) throw new Error("Unknown service metadata");
  const input = validateServiceInput(metadata.kind, req.body.input);
  if (
    !sub ||
    sub.owner !== account ||
    sub.delegate_key !== provision.public_key ||
    sub.input_hash !== digest(input) ||
    !sub.active
  )
    throw new Error("Onchain agreement differs from submitted input/authority");
  const service = await view<Service>("get_service", {
    service_id: sub.service_id,
  });
  if (
    !(
      await db.query("SELECT 1 FROM accord_services WHERE id=$1", [
        sub.service_id,
      ])
    ).rowCount
  )
    throw new Error("Service is not in this marketplace");
  const access = await rpc.viewAccessKey({
    accountId: account,
    publicKey: provision.public_key,
    finalityQuery: { finality: "final" },
  });
  const p = access.permission;
  if (
    typeof p !== "object" ||
    !("FunctionCall" in p) ||
    p.FunctionCall.receiver_id !== config.contract ||
    p.FunctionCall.method_names.length !== 1 ||
    p.FunctionCall.method_names[0] !== "charge" ||
    p.FunctionCall.allowance === null ||
    BigInt(p.FunctionCall.allowance ?? "0") > 50000000000000000000000n
  )
    throw new Error("Use a finite 0.05 NEAR allowance for charge only");
  await db.query(
    "INSERT INTO accord_subscriptions(id,owner,input,delegate_cipher) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [subscriptionId, account, input, provision.delegate_cipher],
  );
  res.json({ subscription_id: subscriptionId, agreement: sub, service });
});
app.get("/subscriptions", async (req, res) => {
  const account = await owner(req),
    rows = (
      await db.query(
        "SELECT id,owner,input,state,last_error FROM accord_subscriptions WHERE owner=$1 ORDER BY id",
        [account],
      )
    ).rows;
  for (const row of rows) {
    row.agreement = await view<Subscription>("get_subscription", {
      subscription_id: row.id,
    });
    const metadata = (
      await db.query("SELECT metadata FROM accord_services WHERE id=$1", [
        row.agreement.service_id,
      ])
    ).rows[0]?.metadata;
    row.service_name = metadata?.name ?? "Portfolio concentration report";
    row.service_kind = metadata?.kind ?? "portfolio-concentration-v1";
    row.cycles = (
      await db.query(
        "SELECT cycle,state,artifact_hash,receipt,report,error FROM accord_cycles WHERE subscription_id=$1 ORDER BY cycle",
        [row.id],
      )
    ).rows;
  }
  res.json(rows);
});
app.post("/subscriptions/:id/cancel", async (req, res) => {
  const account = await owner(req),
    subscription_id = id(req.params["id"]);
  const sub = await view<Subscription | null>("get_subscription", {
    subscription_id,
  });
  if (!sub || sub.owner !== account || sub.active)
    throw new Error("Owner must cancel on NEAR first");
  // Keep worker recovery enabled: paid-but-undelivered reports remain retrievable.
  res.json({ authority_revoked: true, reserved: sub.reserved });
});
app.get("/balances", async (req, res) => {
  res.json(await view("get_balance", { account_id: await owner(req) }));
});
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = error.message;
    res
      .status(
        message.includes("Sign in") || message.includes("Session expired")
          ? 401
          : 400,
      )
      .json({
        error:
          message.length < 250
            ? message
            : "Request failed; check network and signed terms",
      });
  },
);
await migrate();
await migrateProvisioning();
await networkCheck();
encryptionKey();
(process.env["HOSTED_API"] === "true" ? express().use("/api/near", app) : app).listen(config.port, process.env["BIND_HOST"] ?? "127.0.0.1", () =>
  console.log(`Accord API :${config.port} (${config.network})`),
);
// Await each tick before starting the next; no overlapping setInterval callbacks.
async function run() {
  for (;;) {
    await tick().catch(() => console.error("Worker tick failed"));
    await new Promise((r) => setTimeout(r, 5000));
  }
}
if (process.env["RUN_WORKER"] !== "false") void run();

if (process.env["RUN_OPERATIONS"] !== "false") void runOperations();
