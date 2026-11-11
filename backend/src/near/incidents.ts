import {digest} from "./core.js";
import {capture,type Snapshot} from "./operations.js";
import {db} from "./db.js";
export type Change={account_id:string;type:string;key?:string;before:unknown;after:unknown;fingerprint:string};
function permission(p:any){
 if(p==="FullAccess")return p;
 if(!p?.FunctionCall||typeof p.FunctionCall.receiver_id!=="string"||!Array.isArray(p.FunctionCall.method_names))throw Error("Unrecognized key permission; manual review required");
 return {receiver_id:p.FunctionCall.receiver_id,method_names:[...p.FunctionCall.method_names].sort(),allowance:p.FunctionCall.allowance==null?"unlimited":"limited"};
}
export function changes(baseline:Snapshot,current:Snapshot):Change[]{
 if(digest(baseline.accounts.map(a=>a.account_id).sort())!==digest(current.accounts.map(a=>a.account_id).sort()))throw Error("Observation account set mismatch");
 const result:Change[]=[];
 for(const before of baseline.accounts){
 const after=current.accounts.find(a=>a.account_id===before.account_id)!;
 const add=(type:string,old:unknown,next:unknown,key?:string,shape?:unknown)=>result.push({account_id:before.account_id,type,...(key?{key}:{}),before:old,after:next,fingerprint:digest({account:before.account_id,type,key:key??null,shape:shape??next})});
 if(before.code_hash!==after.code_hash)add("code_changed",before.code_hash,after.code_hash);
 const oldKeys=new Map(before.keys.map(k=>[k.public_key,k.permission]));
 const newKeys=new Map(after.keys.map(k=>[k.public_key,k.permission]));
 for(const [key,p] of newKeys){
 if(!oldKeys.has(key)){add("key_added",null,p,key,permission(p));continue;}
 const old:any=oldKeys.get(key), next:any=p;
 const increased=old?.FunctionCall?.allowance!=null && next?.FunctionCall?.allowance!=null && BigInt(next.FunctionCall.allowance)>BigInt(old.FunctionCall.allowance);
 if(digest(permission(old))!==digest(permission(next))||increased)add("key_permission_changed",old,p,key,{permission:permission(p),allowance_increased:increased});
 }
 for(const [key,p] of oldKeys)if(!newKeys.has(key))add("key_removed",p,null,key);
 }
 return result;
}
export async function observeWorkspace(id:string,observe=capture,manual=false){
 const w=(await db.query("UPDATE accord_workspaces SET last_capture_at=now() WHERE id=$1 AND baseline IS NOT NULL AND ($2 OR monitoring) AND (last_capture_at IS NULL OR last_capture_at<now()-interval '30 seconds') RETURNING *",[id,manual])).rows[0];
 if(!w)throw Error("Approve a baseline and wait 30 seconds between observations");
 try{
 const snapshot=await observe(w.accounts), differences=changes(w.baseline,snapshot),c=await db.connect();
 try{await c.query("BEGIN");
 const locked=(await c.query("SELECT * FROM accord_workspaces WHERE id=$1 FOR UPDATE",[id])).rows[0];
 if(!locked||locked.baseline_version!==w.baseline_version||(!manual&&!locked.monitoring))throw Error("Workspace changed during observation; retry with current baseline");
 const active:string[]=[];
 for(const diff of differences){
 const old=(await c.query("SELECT * FROM accord_incidents WHERE workspace_id=$1 AND baseline_version=$2 AND fingerprint=$3",[id,w.baseline_version,diff.fingerprint])).rows[0];
 let incident;
 if(old){incident=(await c.query("UPDATE accord_incidents SET observations=observations+1,last_seen=now(),state='open',occurrences=occurrences+CASE WHEN state='resolved' THEN 1 ELSE 0 END,acknowledged_at=CASE WHEN state='resolved' THEN NULL ELSE acknowledged_at END WHERE id=$1 RETURNING *",[old.id])).rows[0];}
 else incident=(await c.query("INSERT INTO accord_incidents(workspace_id,baseline_version,fingerprint,type,account_id,evidence) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[id,w.baseline_version,diff.fingerprint,diff.type,diff.account_id,{change:diff,baseline_block:w.baseline.block_hash,observation:snapshot}])).rows[0];
 active.push(incident.id);
 if(!old||old.state==='resolved'){
 const event=(await c.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,$2,$3) RETURNING id",[id,old?'incident_reopened':'incident_opened',{incident_id:incident.id,change:diff,baseline_version:w.baseline_version,source:{block_height:snapshot.block_height,block_hash:snapshot.block_hash,observed_at:snapshot.observed_at}}])).rows[0];
 await c.query("INSERT INTO accord_notifications(workspace_id,event_id,payload,channel) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",[id,event.id,{workspace:w.name,incident_id:incident.id,type:diff.type,account_id:diff.account_id,source_block:snapshot.block_hash},w.webhook_enabled?"webhook":"in_app"]);
 }
 }
 const resolved=await c.query("UPDATE accord_incidents SET state='resolved',resolved_at=now() WHERE workspace_id=$1 AND state='open' AND NOT(id=ANY($2::bigint[])) RETURNING id",[id,active]);
 for(const r of resolved.rows)await c.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'incident_resolved',$2)",[id,{incident_id:r.id,source_block:snapshot.block_hash}]);
 await c.query("UPDATE accord_workspaces SET last_success_at=now(),last_error=NULL,last_observation=$2 WHERE id=$1",[id,snapshot]);
 await c.query("COMMIT");return {snapshot,changes:differences.length};
 }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
 }catch{
 await db.query("UPDATE accord_workspaces SET last_error='Observation failed; last successful evidence was retained' WHERE id=$1",[id]);
 throw Error("Observation failed; last successful evidence was retained");
 }
}
