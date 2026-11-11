import {randomUUID} from "node:crypto";
import {db} from "./db.js";
import {capture,snapshotHash,workspaceInput,type Snapshot} from "./operations.js";
export function uuid(v:unknown):string {if(typeof v!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v))throw Error("Invalid workspace ID");return v;}
export async function ownedWorkspace(id:unknown,owner:string){
 const r=(await db.query("SELECT * FROM accord_workspaces WHERE id=$1 AND owner=$2",[uuid(id),owner])).rows[0];
 if(!r)throw Error("Workspace not found");return r;
}
export async function createWorkspace(owner:string,value:unknown){
 const v=workspaceInput(value), c=await db.connect();
 try{await c.query("BEGIN");await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[owner]);
 if(Number((await c.query("SELECT count(*) FROM accord_workspaces WHERE owner=$1",[owner])).rows[0].count)>=3)throw Error("Pilot limit: three workspaces per wallet");
 const r=(await c.query("INSERT INTO accord_workspaces(id,owner,name,accounts) VALUES($1,$2,$3,$4) RETURNING *",[randomUUID(),owner,v.name,JSON.stringify(v.accounts)])).rows[0];
 await c.query("COMMIT");return r;
 }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}
export async function proposeBaseline(id:unknown,owner:string,observe= capture){
 const w=await ownedWorkspace(id,owner);
 const claim=await db.query("UPDATE accord_workspaces SET last_capture_at=now() WHERE id=$1 AND (last_capture_at IS NULL OR last_capture_at<now()-interval '30 seconds') RETURNING id",[w.id]);
 if(!claim.rowCount)throw Error("Wait 30 seconds before another chain capture");
 const snapshot=await observe(w.accounts);
 await db.query("UPDATE accord_workspaces SET pending_baseline=$2 WHERE id=$1",[w.id,snapshot]);
 return {snapshot,proposal_hash:snapshotHash(snapshot)};
}
export async function approveBaseline(id:unknown,owner:string,hash:unknown){
 const c=await db.connect();
 try{await c.query("BEGIN");
 const w=(await c.query("SELECT * FROM accord_workspaces WHERE id=$1 AND owner=$2 FOR UPDATE",[uuid(id),owner])).rows[0];
 if(!w||!w.pending_baseline)throw Error("Capture a baseline first");
 const s=w.pending_baseline as Snapshot;
 if(typeof hash!=="string"||hash!==snapshotHash(s))throw Error("Baseline changed; review it again");
 const age=Date.now()-Date.parse(s.observed_at);
 if(!Number.isFinite(age)||age>600000||age<0)throw Error("Baseline proposal expired; capture and review again");
 await c.query("UPDATE accord_workspaces SET baseline=pending_baseline,pending_baseline=NULL,baseline_version=baseline_version+1,approved_at=now() WHERE id=$1",[w.id]);
 await c.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'baseline_approved',$2)",[w.id,{proposal_hash:hash,version:w.baseline_version+1,snapshot:s}]);
 await c.query("COMMIT");return {approved:true,version:w.baseline_version+1};
 }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}
