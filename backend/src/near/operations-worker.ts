import {db} from "./db.js";
import {observeWorkspace} from "./incidents.js";
import {dispatchNotifications} from "./notifications.js";
export async function operationsTick(){
 const rows=(await db.query("SELECT id FROM accord_workspaces WHERE monitoring AND baseline IS NOT NULL AND (last_capture_at IS NULL OR last_capture_at<now()-interval '60 seconds') ORDER BY last_capture_at NULLS FIRST LIMIT 10")).rows;
 for(const w of rows)await observeWorkspace(w.id).catch(()=>{});
 await dispatchNotifications();
}
export async function runOperations(){
 // ponytail: one sequential pilot worker; shard by workspace if pilot volume requires it.
 for(;;){await operationsTick().catch(()=>console.error("Operations tick failed"));await new Promise(r=>setTimeout(r,5000));}
}
