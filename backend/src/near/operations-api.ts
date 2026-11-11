import type express from "express";
import {randomUUID} from "node:crypto";
import {db} from "./db.js";
import {pilotMetrics} from "./pilot-metrics.js";
import {linkPaidReport,explainIncident} from "./workspace-reports.js";
import {timeline,evidenceExport,numericId} from "./evidence.js";
import {observeWorkspace} from "./incidents.js";
import {notificationConfig} from "./notifications.js";
import {createWorkspace,ownedWorkspace,proposeBaseline,approveBaseline} from "./workspaces.js";
import {pilotFeedback, pilotSummary} from "./pilot.js";
export function mountOperations(app: express.Express, owner: (req: express.Request)=>Promise<string>) {
 app.get("/workspaces",async(req,res)=>res.json((await db.query("SELECT * FROM accord_workspaces WHERE owner=$1 ORDER BY created_at",[await owner(req)])).rows));
 app.post("/workspaces",async(req,res)=>res.json(await createWorkspace(await owner(req),req.body)));
 app.get("/workspaces/:id",async(req,res)=>res.json(await ownedWorkspace(req.params.id,await owner(req))));
 app.post("/workspaces/:id/capture",async(req,res)=>res.json(await proposeBaseline(req.params.id,await owner(req))));
 app.post("/workspaces/:id/approve",async(req,res)=>res.json(await approveBaseline(req.params.id,await owner(req),req.body.proposal_hash)));
 app.get("/workspaces/:id/events",async(req,res)=>res.json(await timeline(req.params.id,await owner(req),req.query.before)));
 app.get("/workspaces/:id/export",async(req,res)=>{res.setHeader("Content-Disposition","attachment; filename=accord-evidence.json");res.json(await evidenceExport(req.params.id,await owner(req)));});
 app.post("/workspaces/:id/reports",async(req,res)=>res.json(await linkPaidReport(req.params.id,await owner(req),req.body.subscription_id,req.body.cycle)));
 app.get("/workspaces/:id/reports",async(req,res)=>{const w=await ownedWorkspace(req.params.id,await owner(req));res.json((await db.query("SELECT * FROM accord_workspace_reports WHERE workspace_id=$1 ORDER BY subscription_id,cycle LIMIT 100",[w.id])).rows);});
 app.post("/workspaces/:id/incidents/:incident/explain",async(req,res)=>res.json(await explainIncident(req.params.id,await owner(req),req.params.incident)));
 app.get("/notification-config",async(req,res)=>{await owner(req);res.json({webhook_available:!!notificationConfig(),channel:"Operator-configured signed webhook; destination is not user-supplied"});});
 app.post("/workspaces/:id/monitoring",async(req,res)=>{
  const w=await ownedWorkspace(req.params.id,await owner(req));
  if(typeof req.body.enabled!=="boolean"||typeof req.body.webhook_enabled!=="boolean")throw Error("Choose monitoring and notification preferences");
  if(req.body.enabled&&!w.baseline)throw Error("Approve a baseline first");
  if(req.body.webhook_enabled&&!notificationConfig())throw Error("An operator must configure a signed webhook destination first");
  const c=await db.connect();try{await c.query("BEGIN");
  await c.query("UPDATE accord_workspaces SET monitoring=$2,webhook_enabled=$3 WHERE id=$1",[w.id,req.body.enabled,req.body.webhook_enabled]);
  await c.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'monitoring_changed',$2)",[w.id,{enabled:req.body.enabled,webhook_enabled:req.body.webhook_enabled}]);
  await c.query("COMMIT");res.json({saved:true});}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
 });
 app.post("/workspaces/:id/check",async(req,res)=>{const w=await ownedWorkspace(req.params.id,await owner(req));res.json(await observeWorkspace(w.id,undefined,true));});
 app.get("/workspaces/:id/incidents",async(req,res)=>{const w=await ownedWorkspace(req.params.id,await owner(req));res.json((await db.query("SELECT * FROM accord_incidents WHERE workspace_id=$1 ORDER BY first_seen DESC LIMIT 100",[w.id])).rows);});
 app.get("/workspaces/:id/notifications",async(req,res)=>{const w=await ownedWorkspace(req.params.id,await owner(req));res.json((await db.query("SELECT * FROM accord_notifications WHERE workspace_id=$1 ORDER BY id DESC LIMIT 100",[w.id])).rows);});
 app.post("/workspaces/:id/incidents/:incident/acknowledge",async(req,res)=>{
  const w=await ownedWorkspace(req.params.id,await owner(req));numericId(req.params.incident);
  const c=await db.connect();try{await c.query("BEGIN");
  const result=await c.query("UPDATE accord_incidents SET acknowledged_at=now() WHERE id=$1 AND workspace_id=$2 AND acknowledged_at IS NULL RETURNING id",[req.params.incident,w.id]);
  if(result.rowCount)await c.query("INSERT INTO accord_workspace_events(workspace_id,type,body) VALUES($1,'incident_acknowledged',$2)",[w.id,{incident_id:req.params.incident}]);
  else if(!(await c.query("SELECT id FROM accord_incidents WHERE id=$1 AND workspace_id=$2",[req.params.incident,w.id])).rowCount)throw Error("Incident not found");
  await c.query("COMMIT");res.json({acknowledged:true});}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
 });
 app.get("/pilot/metrics",async(req,res)=>res.json(await pilotMetrics(await owner(req))));
 app.post("/workspaces/:id/delete",async(req,res)=>{
  const w=await ownedWorkspace(req.params.id,await owner(req));
  if(req.body.confirm_name!==w.name)throw Error("Enter the exact application name to delete its pilot records");
  if(w.monitoring)throw Error("Pause monitoring before deleting its records");
  await db.query("DELETE FROM accord_workspaces WHERE id=$1 AND owner=$2",[w.id,w.owner]);
  res.json({deleted:true,paid_agreements_unchanged:true});
 });
 app.get("/pilot",async(req,res)=>{
  const account=await owner(req);
  const rows=(await db.query("SELECT id,body,created_at FROM accord_pilot_feedback WHERE owner=$1 ORDER BY created_at DESC",[account])).rows;
  res.json({records:rows,summary:pilotSummary(rows)});
 });
 app.post("/pilot",async(req,res)=>{
  const account=await owner(req), body=pilotFeedback(req.body);
  const c=await db.connect();try{await c.query("BEGIN");await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[account]);
  if(Number((await c.query("SELECT count(*) FROM accord_pilot_feedback WHERE owner=$1",[account])).rows[0].count)>=20)throw Error("Pilot feedback limit reached (20 per wallet)");
  const result=await c.query("INSERT INTO accord_pilot_feedback(id,owner,body) VALUES($1,$2,$3) RETURNING id",[randomUUID(),account,body]);
  await c.query("COMMIT");res.json(result.rows[0]);}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
 });
 app.delete("/pilot/:id",async(req,res)=>{
  const account=await owner(req);
  if(!/^[a-f0-9-]{36}$/.test(String(req.params.id)))throw Error("Invalid feedback ID");
  const result=await db.query("DELETE FROM accord_pilot_feedback WHERE id=$1 AND owner=$2 RETURNING id",[req.params.id,account]);
  if(!result.rowCount)throw Error("Feedback not found");
  res.json({deleted:true});
 });
}
