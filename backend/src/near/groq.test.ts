import { test } from "node:test";
import assert from "node:assert/strict";
import { explainWithGroq, parseExplanation, verifyGroqExplanation } from "./groq.js";
import type { ChainReport } from "./agents.js";
test("Groq preserves evidence and rejects failures without fallback", async () => {
 const previous={key:process.env.GROQ_API_KEY,enabled:process.env.GROQ_ENABLED};
 process.env.GROQ_API_KEY="test-placeholder";process.env.GROQ_ENABLED="true";
 const report:ChainReport={kind:"near-network-pulse-v1",title:"Network Pulse",method:"near-rpc-rules-v1",status:"attention",summary:"Stale block",findings:[],recommendations:[],metrics:[{label:"Age",value:"100"}],observed_at:new Date().toISOString(),source:{network:"testnet",block_height:123,block_hash:"1".repeat(32)},disclosure:"One snapshot"};
 const response=(content:string,finish_reason="stop")=>new Response(JSON.stringify({id:"test-completion",model:"test-model",choices:[{finish_reason,message:{content}}]}));
 try {
 const result=await explainWithGroq(report,async(url,init)=>{
 assert.equal(url,"https://api.groq.com/openai/v1/chat/completions");
 const body=JSON.parse(String(init?.body)); assert.deepEqual(JSON.parse(body.messages[1].content),report);
 assert(!String(init?.body).includes("test-placeholder"));
 return response(JSON.stringify({summary:"Review freshness",next_steps:["Check source block"]}));});
 assert.deepEqual({...result,explanation:undefined},{...report,explanation:undefined});verifyGroqExplanation(result.explanation);
 for(const status of [402,429,500]) await assert.rejects(explainWithGroq(report,async()=>new Response("detail",{status})),new RegExp(`HTTP ${status}`));
 await assert.rejects(explainWithGroq(report,async()=>response("{}")));
 await assert.rejects(explainWithGroq(report,async()=>response('{"summary":"ok","next_steps":[]}',"length")));
 await assert.rejects(explainWithGroq(report,async()=>{throw Error("timeout")}));
 assert.throws(()=>parseExplanation({summary:"x",next_steps:Array(6).fill("x")}));
 assert.throws(()=>verifyGroqExplanation({...result.explanation,provider:"near-ai"}));
 process.env.GROQ_ENABLED="false";await assert.rejects(explainWithGroq(report),/not configured/);
 } finally {
 if(previous.key===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=previous.key;
 if(previous.enabled===undefined)delete process.env.GROQ_ENABLED;else process.env.GROQ_ENABLED=previous.enabled;
 }
});
