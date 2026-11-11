import type {JsonRpcProvider} from "near-api-js";
import {rpc} from "./config.js";
import {digest} from "./core.js";
import {shortText} from "./pilot.js";
import {validateServiceInput} from "./agents.js";
export type AccountSnapshot={account_id:string;code_hash:string;keys:{public_key:string;permission:unknown}[]};
export type Snapshot={block_height:number;block_hash:string;observed_at:string;accounts:AccountSnapshot[]};
export function workspaceInput(value:unknown){
 const v=value as Record<string,unknown>;
 if(!v||!Array.isArray(v.accounts)||v.accounts.length<1||v.accounts.length>5)throw Error("Choose 1..5 testnet accounts");
 const accounts=v.accounts.map(a=>String(validateServiceInput("near-wallet-watch-v1",{account_id:a}).account_id));
 if(new Set(accounts).size!==accounts.length)throw Error("Remove duplicate accounts");
 return {name:shortText(v.name,"Application name",80),accounts:accounts.sort()};
}
export async function capture(accounts:string[],client:Pick<JsonRpcProvider,"viewBlock"|"viewAccount"|"sendJsonRpc">=rpc):Promise<Snapshot>{
 const block=await client.viewBlock({finality:"final"});
 const blockAge=Date.now()-Number(BigInt(block.header.timestamp_nanosec)/1000000n);
 if(!Number.isFinite(blockAge)||blockAge>120000||blockAge< -5000)throw Error("Finalized block is stale or clock is inconsistent");
 const result:AccountSnapshot[]=[];
 for(const account_id of accounts){
  const account=await client.viewAccount({accountId:account_id,blockQuery:{blockId:block.header.hash}});
  if((account as unknown as Record<string,unknown>).global_contract_hash || (account as unknown as Record<string,unknown>).global_contract_account_id)throw Error("Global contract reference needs manual review; local code baseline is unsupported");
  const keys=await client.sendJsonRpc("query",{request_type:"view_access_key_list",account_id,block_id:block.header.hash});
  // Canonicalize RPC bigint allowances to strings before storage/hashing.
  const clean=JSON.parse(JSON.stringify((keys as {keys:unknown[]}).keys,(_k,v)=>typeof v==="bigint"?v.toString():v));
  if(clean.length>100)throw Error("Pilot supports at most 100 keys per account");
  result.push({account_id,code_hash:account.code_hash,keys:clean.map((k:any)=>({public_key:k.public_key,permission:k.access_key.permission})).sort((a:any,b:any)=>a.public_key.localeCompare(b.public_key))});
 }
 if(Date.now()-Number(BigInt(block.header.timestamp_nanosec)/1000000n)>120000)throw Error("Observation became stale during capture");
 return {block_height:block.header.height,block_hash:block.header.hash,observed_at:new Date().toISOString(),accounts:result};
}
export const snapshotHash=(s:Snapshot)=>digest(s);
