import { writeFile } from "node:fs/promises";
import { db, migrate } from "./db.js";
import { networkCheck } from "./config.js";
import { runChainAgent } from "./agents.js";
import { explainWithGroq } from "./groq.js";
import { reserveGroqRequest } from "./groq-budget.js";
import { digest } from "./core.js";
try {
 await networkCheck(); await migrate();
 const evidence=await runChainAgent("near-network-pulse-v1",{max_block_age_seconds:60});
 await reserveGroqRequest();
 const report=await explainWithGroq(evidence);
 await writeFile("../docs/groq-live-proof.json",JSON.stringify({scope:"Live RPC + Groq inference; not a paid subscription proof",artifact_hash:digest(report),report},null,2)+"\n");
 console.log("Live Groq explanation verified and recorded; no keys included.");
} finally {await db.end();}
