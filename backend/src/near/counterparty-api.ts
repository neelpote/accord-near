import type express from "express";
import { db } from "./db.js";
import { config, rpc, view, type Subscription, type Service } from "./config.js";
import { renewalReview } from "./renewal-review.js";
import { validateIntent } from "./counterparty-policy.js";
import {
  checkCounterparty,
  approveDecision,
  submitReport,
  reviewReport,
  isReviewer,
} from "./counterparty.js";
export async function readRenewalTerms(id:string) {
  const block=await rpc.viewBlock({finality:'final'});
  const timestamp=Number(BigInt(block.header.timestamp_nanosec)/1000000n);
  if(Date.now()-timestamp>60000||timestamp>Date.now()+5000)throw Error('Fresh finalized state required');
  const read=async<T>(method:string,args:Record<string,unknown>)=>await rpc.callFunction({contractId:config.contract,method,args,blockQuery:{blockId:block.header.hash}}) as T;
  const sub=await read<Subscription|null>('get_subscription',{subscription_id:id});
  if(!sub)throw Error('Agreement not found');
  const service=await read<Service|null>('get_service',{service_id:sub.service_id});
  if(!service)throw Error('Service not found');
  return {sub,service,block_height:block.header.height,block_hash:block.header.hash};
}
export function mountCounterparty(
  app: express.Express,
  owner: (req: express.Request) => Promise<string>,
  readTerms = readRenewalTerms,
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
  app.get("/security/decisions/:id/renewal", async(req,res)=>{
    const account=await owner(req);
    const row=(await db.query("SELECT id,body,created_at FROM accord_security_decisions WHERE id=$1 AND owner=$2",[req.params.id,account])).rows[0];
    if(!row)throw Error('Decision not found for this wallet');
    const intent=validateIntent(row.body.intent);
    if(intent.agent!==account||intent.network!==config.network||intent.contract!==config.contract)throw Error('Decision network or contract mismatch');
    const previous=(await db.query(`SELECT id,body,state,acted_at FROM accord_security_decisions
      WHERE owner=$1 AND id<>$2 AND state IN ('approved','consumed') AND acted_at<=$3
      AND body->'intent'->'args'->>'subscription_id'=$4
      ORDER BY acted_at DESC,id DESC LIMIT 1`,[account,row.id,row.created_at,intent.args.subscription_id])).rows[0];
    const terms=await readTerms(intent.args.subscription_id);
    res.json({...renewalReview(row.body,previous?.body??null,terms.sub,terms.service),
      baseline_decision:previous?{id:previous.id,state:previous.state,acted_at:previous.acted_at}:null,
      block_height:terms.block_height,block_hash:terms.block_hash,network:config.network});
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
