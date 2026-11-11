import {db} from "./db.js";
import {ownedWorkspace} from "./workspaces.js";
import {numericId} from "./evidence.js";
import {digest} from "./core.js";
import {view,type Receipt,type Service} from "./config.js";
import {explainWithGroq} from "./groq.js";
import {reserveGroqRequest} from "./groq-budget.js";
import type {ChainReport} from "./agents.js";
export async function linkPaidReport(id:unknown,owner:string,subscriptionId:unknown,cycle:unknown,read:typeof view=view){
 const w=await ownedWorkspace(id,owner),subscription=numericId(subscriptionId);
 if(!Number.isInteger(cycle)||Number(cycle)<0||Number(cycle)>19)throw Error("Invalid paid cycle");
 const local=(await db.query("SELECT s.input,s.owner,c.* FROM accord_subscriptions s JOIN accord_cycles c ON c.subscription_id=s.id WHERE s.id=$1 AND c.cycle=$2 AND s.owner=$3 AND c.state='DELIVERED'",[subscription,cycle,owner])).rows[0];
 if(!local||!w.accounts.includes(local.input.account_id??local.input.signer_account_id))throw Error("Choose your delivered report for an account in this workspace");
 const receipt=await read<Receipt|null>("get_receipt",{subscription_id:subscription,cycle:Number(cycle)});
 const agreement=await read<{owner:string;service_id:string}>("get_subscription",{subscription_id:subscription});
 const service=await read<Service>("get_service",{service_id:agreement.service_id});
 if(!receipt||agreement.owner!==owner||digest(local.report)!==receipt.artifact_hash||receipt.artifact_hash!==local.artifact_hash||receipt.amount!==service.price||receipt.provider!==service.provider)throw Error("Live receipt does not match the delivered artifact and immutable offer");
 const inserted=await db.query("INSERT INTO accord_workspace_reports(workspace_id,subscription_id,cycle,report,receipt,artifact_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING subscription_id",[w.id,subscription,cycle,local.report,receipt,receipt.artifact_hash]);
 if(inserted.rowCount)await db.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'paid_report_linked',$2)",[w.id,{subscription_id:subscription,cycle,artifact_hash:receipt.artifact_hash,receipt}]);
 return {linked:true,artifact_hash:receipt.artifact_hash};
}
export async function explainIncident(id:unknown,owner:string,incidentId:unknown){
 const w=await ownedWorkspace(id,owner),incident=numericId(incidentId);
 const i=(await db.query("SELECT * FROM accord_incidents WHERE id=$1 AND workspace_id=$2",[incident,w.id])).rows[0];
 if(!i)throw Error("Incident not found");
 const existing=(await db.query("SELECT * FROM accord_incident_explanations WHERE incident_id=$1",[incident])).rows[0];
 if(existing){if(existing.state==='ready')return existing.report;throw Error("Explanation pending or requires review; no automatic retry");}
 const claim=await db.query("INSERT INTO accord_incident_explanations(incident_id,state) VALUES($1,'preparing') ON CONFLICT DO NOTHING RETURNING incident_id",[incident]);
 if(!claim.rowCount)throw Error("Explanation already claimed");
 try{
 const source=i.evidence.observation;
 const report:ChainReport={kind:i.type==='code_changed'?"near-contract-sentinel-v1":"near-access-guard-v1",title:"Incident review",method:"near-rpc-rules-v1",status:"attention",summary:`${i.type} observed for ${i.account_id}; this does not establish malicious activity.`,findings:[JSON.stringify(i.evidence.change)],recommendations:["Compare this change with your deployment records before acknowledging or approving a new baseline."],metrics:[{label:"Account",value:i.account_id},{label:"Approved baseline version",value:String(i.baseline_version)}],observed_at:source.observed_at,source:{network:"testnet",block_height:source.block_height,block_hash:source.block_hash},disclosure:"Public observations. AI commentary is not an audit and has no transaction authority."};
 await reserveGroqRequest();const explained=await explainWithGroq(report);
 await db.query("UPDATE accord_incident_explanations SET state='ready',report=$2 WHERE incident_id=$1",[incident,explained]);
 await db.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'explanation_created',$2)",[w.id,{incident_id:incident,report:explained,artifact_hash:digest(explained),billing:"Unbilled pilot explanation; uses capped server Groq requests"}]);
 return explained;
 }catch{await db.query("UPDATE accord_incident_explanations SET state='needs_review' WHERE incident_id=$1",[incident]);throw Error("Explanation unavailable; no payment requested and no automatic retry");}
}
