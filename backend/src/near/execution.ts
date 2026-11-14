import {CREATOR_KIND,providerRoute} from './creator-services.js';
import {boundedJson} from './core.js';
import {RISK_KIND,LOCAL_MODEL,LOCAL_MODEL_REVISION} from "./risk-analyst.js";
import { readFileSync } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Service } from "./config.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { digest } from "./core.js";
const codeFiles = [
  "ai.ts",
  "agents.ts",
  "provider-server.ts",
  "service-delivery.ts",
  "groq.ts",
  "risk-analyst.ts",
  "operations.ts",
  "incidents.ts",
  "../../risk-model.json",
  "../../local-risk-requirements.txt",
  "../../scripts/local-risk-model.py",
];
export function agentIdentity(id: string, service: Service, metadata: any) {
  const build = metadata.kind===CREATOR_KIND ? metadata.build_digest : digest(
    codeFiles.map((name) => {
      try {
        return [name, readFileSync(new URL(name, import.meta.url), "utf8")];
      } catch {
        if (name !== "risk-analyst.ts")
          throw Error("Agent build inputs unavailable");
        return [name, "absent"];
      }
    }),
  );
  const body = {
    agent_id: metadata.kind,
    provider_id: service.provider,
    service_id: id,
    version: metadata.agent_version ?? "1.0.0",
    model:
      metadata.kind===RISK_KIND ? `${LOCAL_MODEL}@${LOCAL_MODEL_REVISION}` : metadata.analysis_mode === "groq"
        ? process.env.GROQ_MODEL || "openai/gpt-oss-20b"
        : null,
    capabilities: metadata.kind===CREATOR_KIND?["receive_approved_input","produce_report"]:["read_public_testnet", "produce_report"],
    endpoint: metadata.kind===CREATOR_KIND?providerRoute(service.provider,metadata).url:config.provider,
    build_digest: build,
    metadata_hash: service.metadata_hash,
    registration_status: "registered",
  };
  return { hash: digest(body), ...body };
}
export async function securityEvent(
  owner: string,
  subscription: string | null,
  event: string,
  body: Record<string, unknown> = {},
) {
  // Callers pass bounded public IDs/status only; never serialize SDK errors, keys or request objects.
  await db.query(
    "INSERT INTO accord_execution_events(owner,subscription_id,event,body) VALUES($1,$2,$3,$4)",
    [owner, subscription, event, body],
  );
}
export function providerHeaders(path: string, body: unknown, now = Date.now(), key = process.env.ACCORD_PROVIDER_SECRET) {
  if (!key || key.length < 32)
    throw Error("Configure ACCORD_PROVIDER_SECRET (at least 32 characters)");
  const stamp = String(now),
    signature = createHmac("sha256", key)
      .update(path + "\n" + stamp + "\n" + digest(body))
      .digest("hex");
  return { "x-accord-time": stamp, "x-accord-auth": signature };
}
export function verifyProviderRequest(
  path: string,
  body: unknown,
  stamp: unknown,
  signature: unknown,
  key = process.env.ACCORD_PROVIDER_SECRET,
) {
  if (
    typeof stamp !== "string" ||
    !/^\d{13}$/.test(stamp) ||
    Math.abs(Date.now() - Number(stamp)) > 30000 ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw Error("Provider authentication rejected");
  const expected = providerHeaders(path, body, Number(stamp),key)["x-accord-auth"];
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    throw Error("Provider authentication rejected");
}

export async function callProvider(provider:string,metadata:any,path:string,body:unknown,timeout=90000){
 const route=providerRoute(provider,metadata);
 const response=await fetch(route.url+path,{method:'POST',headers:{'content-type':'application/json',...providerHeaders(path,body,Date.now(),route.secret)},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout),redirect:'error'});
 if(!response.ok)throw Error('Provider '+path+': HTTP '+response.status);
 const payload=await boundedJson(response);
 verifyProviderRequest(path+'/response',{request_hash:digest(body),response:payload},response.headers.get('x-accord-time'),response.headers.get('x-accord-auth'),route.secret);
 return payload;
}
