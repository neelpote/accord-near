import type { Express, Request } from "express";
import { db } from "./db.js";
import { rpc, view, type Service, type Subscription } from "./config.js";
import { agentIdentity, securityEvent } from "./execution.js";
export function mountExecution(
  app: Express,
  owner: (req: Request) => Promise<string>,
) {
  app.get("/services/:id/execution", async (req, res) => {
    const id = req.params.id;
    const service = await view<Service>("get_service", { service_id: id });
    const row = (
      await db.query(
        "SELECT metadata,execution_enabled FROM accord_services WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!row || !service) throw Error("Unknown service");
    res.json({
      identity: agentIdentity(id, service, row.metadata),
      enabled: row.execution_enabled,
      limitations: "Advertised source build identity, not runtime attestation.",
    });
  });
  app.get("/execution/jobs", async (req, res) => {
    const account = await owner(req);
    const jobs = (
      await db.query(
        `SELECT s.id,s.state,s.execution_paused,s.approved_identity,s.identity_approved_at,c.cycle,c.state AS payment_state,c.artifact_hash,c.receipt,c.error FROM accord_subscriptions s LEFT JOIN accord_cycles c ON c.subscription_id=s.id WHERE s.owner=$1 ORDER BY s.id,c.cycle`,
        [account],
      )
    ).rows;
    const events = (
      await db.query(
        "SELECT id,subscription_id,event,body,created_at FROM accord_execution_events WHERE owner=$1 ORDER BY id DESC LIMIT 100",
        [account],
      )
    ).rows;
    res.json({ jobs, events });
  });
  app.post("/subscriptions/:id/execution", async (req, res) => {
    const account = await owner(req),
      id = req.params.id;
    const local = (
      await db.query(
        "SELECT * FROM accord_subscriptions WHERE id=$1 AND owner=$2",
        [id, account],
      )
    ).rows[0];
    const sub = await view<Subscription>("get_subscription", {
      subscription_id: id,
    });
    if (!local || !sub || sub.owner !== account)
      throw Error("Not agreement owner");
    if (req.body.revoked === true) {
      const keys = await rpc.viewAccessKeyList({
        accountId: account,
        finalityQuery: { finality: "final" },
      });
      if (keys.keys.some((k) => k.public_key === sub.delegate_key))
        throw Error("Delegate still exists on chain");
      await db.query(
        "UPDATE accord_subscriptions SET execution_paused=true WHERE id=$1",
        [id],
      );
      await securityEvent(account, id, "key_revoked", {
        public_key: sub.delegate_key,
      });
      res.json({ revoked: true });
      return;
    }
    if (req.body.paused === true) {
      await db.query(
        "UPDATE accord_subscriptions SET execution_paused=true WHERE id=$1",
        [id],
      );
      await securityEvent(account, id, "execution_paused");
      res.json({ paused: true });
      return;
    }
    if (req.body.approve !== true || !sub.active)
      throw Error("Explicit approval of active agreement required");
    const service = await view<Service>("get_service", {
        service_id: sub.service_id,
      }),
      row = (
        await db.query("SELECT * FROM accord_services WHERE id=$1", [
          sub.service_id,
        ])
      ).rows[0];
    if (!row?.execution_enabled) throw Error("Provider execution disabled");
    const identity = agentIdentity(sub.service_id, service, row.metadata);
    if (req.body.identity_hash !== identity.hash)
      throw Error("Execution identity changed; review again");
    await db.query(
      "INSERT INTO accord_agent_identities(hash,body) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [identity.hash, identity],
    );
    await db.query(
      "UPDATE accord_subscriptions SET approved_identity=$2,identity_approved_at=now(),execution_paused=false WHERE id=$1 AND owner=$3",
      [id, identity.hash, account],
    );
    await securityEvent(account, id, "execution_identity_approved", {
      identity_hash: identity.hash,
    });
    res.json({ approved: true, identity_hash: identity.hash });
  });
  app.post("/services/:id/execution", async (req, res) => {
    const account = await owner(req),
      id = req.params.id,
      service = await view<Service>("get_service", { service_id: id });
    if (!service || service.provider !== account) throw Error("Not provider");
    if (typeof req.body.enabled !== "boolean")
      throw Error("Explicit enabled boolean required");
    await db.query(
      "UPDATE accord_services SET execution_enabled=$2 WHERE id=$1",
      [id, req.body.enabled],
    );
    await securityEvent(account, null, "provider_execution_changed", {
      service_id: id,
      enabled: req.body.enabled,
    });
    res.json({ enabled: req.body.enabled });
  });
}
