import type express from "express";
import {randomUUID} from "node:crypto";
import {db} from "./db.js";
import {pilotFeedback, pilotSummary} from "./pilot.js";
export function mountOperations(app: express.Express, owner: (req: express.Request)=>Promise<string>) {
 app.get("/pilot",async(req,res)=>{
  const account=await owner(req);
  const rows=(await db.query("SELECT id,body,created_at FROM accord_pilot_feedback WHERE owner=$1 ORDER BY created_at DESC",[account])).rows;
  res.json({records:rows,summary:pilotSummary(rows)});
 });
 app.post("/pilot",async(req,res)=>{
  const account=await owner(req), body=pilotFeedback(req.body);
  const result=await db.query("INSERT INTO accord_pilot_feedback(id,owner,body) SELECT $1,$2,$3 WHERE (SELECT count(*) FROM accord_pilot_feedback WHERE owner=$2)<20 RETURNING id",[randomUUID(),account,body]);
  if(!result.rowCount) throw Error("Pilot feedback limit reached (20 per wallet)");
  res.json(result.rows[0]);
 });
 app.delete("/pilot/:id",async(req,res)=>{
  const account=await owner(req);
  if(!/^[a-f0-9-]{36}$/.test(String(req.params.id)))throw Error("Invalid feedback ID");
  const result=await db.query("DELETE FROM accord_pilot_feedback WHERE id=$1 AND owner=$2 RETURNING id",[req.params.id,account]);
  if(!result.rowCount)throw Error("Feedback not found");
  res.json({deleted:true});
 });
}
