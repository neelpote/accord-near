import {db} from "./db.js";
import {ownedWorkspace} from "./workspaces.js";
import {digest} from "./core.js";
export function numericId(v:unknown):string {if(typeof v!=="string"||!/^\d{1,19}$/.test(v)||BigInt(v)>9223372036854775807n)throw Error("Invalid evidence ID");return v;}
export async function timeline(id:unknown,owner:string,before?:unknown){
 const w=await ownedWorkspace(id,owner), cursor=before===undefined?"9223372036854775807":numericId(before);
 const rows=(await db.query("SELECT * FROM accord_workspace_events WHERE workspace_id=$1 AND id<$2 ORDER BY id DESC LIMIT 51",[w.id,cursor])).rows;
 return {events:rows.slice(0,50),next_cursor:rows.length>50?rows[49].id:null};
}
export async function evidenceExport(id:unknown,owner:string){
 const w=await ownedWorkspace(id,owner);
 const c=await db.connect();
 try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const workspace=(await c.query("SELECT * FROM accord_workspaces WHERE id=$1 AND owner=$2",[w.id,owner])).rows[0];
 const events=(await c.query("SELECT * FROM accord_workspace_events WHERE workspace_id=$1 ORDER BY id LIMIT 1001",[w.id])).rows;
 const incidents=(await c.query("SELECT * FROM accord_incidents WHERE workspace_id=$1 ORDER BY id LIMIT 1001",[w.id])).rows;
 const notifications=(await c.query("SELECT * FROM accord_notifications WHERE workspace_id=$1 ORDER BY id LIMIT 1001",[w.id])).rows;
 const body=JSON.parse(JSON.stringify({format:"accord-operations-evidence-v1",network:"testnet",exported_at:new Date().toISOString(),workspace,events:events.slice(0,1000),incidents:incidents.slice(0,1000),notifications:notifications.slice(0,1000),truncated:[events,incidents,notifications].some(r=>r.length>1000),disclosure:"RPC observations and application records, not an independent audit or proof of report quality. Pilot observations are unbilled; linked paid reports are separately identified."}));
 await c.query("COMMIT");return {body,sha256:digest(body)};
 }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}
