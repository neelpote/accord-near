import {createHmac} from "node:crypto";
import {db} from "./db.js";
export function notificationConfig(){
 const value=process.env.OPS_WEBHOOK_URL,secret=process.env.OPS_WEBHOOK_SECRET;
 if(!value||!secret||secret.length<32)return null;
 try{const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.hash) return null;return {url:url.toString(),secret};}catch{return null;}
}
export const webhookSignature=(timestamp:string,body:string,secret:string)=>createHmac("sha256",secret).update(`${timestamp}.${body}`).digest("hex");
export async function dispatchNotifications(request:typeof fetch=fetch){
 // Lease survives process crashes; stable event IDs let receivers deduplicate at-least-once delivery.
 const rows=(await db.query("UPDATE accord_notifications SET state='delivering',attempts=attempts+1,next_attempt_at=now()+interval '30 seconds' WHERE id IN (SELECT id FROM accord_notifications WHERE ((state='pending' AND next_attempt_at<=now()) OR (state='delivering' AND next_attempt_at<=now())) AND attempts<5 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *")).rows;
 for(const row of rows){
 try{
 if(row.channel==='webhook'){
 const target=notificationConfig();if(!target)throw Error("Webhook configuration unavailable");
 const timestamp=Math.floor(Date.now()/1000).toString(),body=JSON.stringify({id:row.event_id,notification_id:row.id,...row.payload});
 const response=await request(target.url,{method:"POST",redirect:"error",signal:AbortSignal.timeout(5000),headers:{"content-type":"application/json","x-accord-timestamp":timestamp,"x-accord-signature":webhookSignature(timestamp,body,target.secret)},body});
 await response.body?.cancel();if(!response.ok)throw Error("Webhook rejected delivery");
 }
 await db.query("UPDATE accord_notifications SET state='delivered',delivered_at=now(),last_error=NULL WHERE id=$1 AND state='delivering'",[row.id]);
 }catch{
 await db.query("UPDATE accord_notifications SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+($2 * interval '1 second'),last_error='Delivery failed; inspect configured receiver' WHERE id=$1 AND state='delivering'",[row.id,Math.min(3600,15*2**row.attempts)]);
 }
 }
 await db.query("UPDATE accord_notifications SET state='failed',last_error='Delivery lease expired after final attempt' WHERE state='delivering' AND attempts>=5 AND next_attempt_at<=now()");
}
