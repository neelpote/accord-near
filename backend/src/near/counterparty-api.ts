import type express from "express";
import { db } from "./db.js";
import { config, view, type Subscription, type Service } from "./config.js";
import { validateIntent } from "./counterparty-policy.js";
import {
  checkCounterparty,
  approveDecision,
  submitReport,
  reviewReport,
  isReviewer,
} from "./counterparty.js";
export function mountCounterparty(
  app: express.Express,
  owner: (req: express.Request) => Promise<string>,
) {
  app.get("/security", async (req, res) => {
    const account = await owner(req);
    const decisions = (
      await db.query(
        "SELECT id,body,state,created_at,expires_at FROM accord_security_decisions WHERE owner=$1 ORDER BY created_at DESC LIMIT 50",
        [account],
      )
    ).rows;
    const reports = (
      await db.query(
        "SELECT r.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('reviewer',v.reviewer,'status',v.status,'reason',v.reason,'created_at',v.created_at) ORDER BY v.id) FROM accord_security_reviews v WHERE v.report_id=r.id),'[]'::jsonb) AS reviews FROM accord_security_reports r ORDER BY created_at DESC LIMIT 100",
      )
    ).rows;
    res.json({
      network: config.network,
      reviewer: isReviewer(account),
      decisions,
      reports,
    });
  });
  app.post("/security/check", async (req, res) => {
    const account = await owner(req),
      intent = validateIntent(req.body.intent);
    if (intent.agent !== account)
      throw Error("Only your wallet's payment intents can be checked");
    const sub = await view<Subscription>("get_subscription", {
      subscription_id: intent.args.subscription_id,
    });
    if (sub.owner !== account)
      throw Error("Agreement belongs to another wallet");
    const service = await view<Service>("get_service", {
      service_id: sub.service_id,
    });
    res.json(
      await checkCounterparty(intent, {
        contract: config.contract,
        receiver: service.provider,
        amount: service.price,
      }),
    );
  });
  app.post("/security/decisions/:id", async (req, res) =>
    res.json(await approveDecision(req.params.id, await owner(req), req.body)),
  );
  app.post("/security/reports", async (req, res) =>
    res.json(await submitReport(await owner(req), req.body)),
  );
  app.post("/security/reports/:id/review", async (req, res) =>
    res.json(await reviewReport(req.params.id, await owner(req), req.body)),
  );
}
