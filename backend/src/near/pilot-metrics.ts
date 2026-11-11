import {db} from "./db.js";
export async function pilotMetrics(owner:string){
 const r=(await db.query(`SELECT
 (SELECT count(*) FROM accord_workspaces WHERE owner=$1 AND NOT is_demo) AS workspaces,
 (SELECT count(*) FROM accord_workspaces WHERE owner=$1 AND is_demo) AS excluded_demo_workspaces,
 (SELECT count(*) FROM accord_workspaces WHERE owner=$1 AND NOT is_demo AND monitoring) AS monitoring_enabled,
 (SELECT count(*) FROM accord_workspace_events e JOIN accord_workspaces w ON w.id=e.workspace_id WHERE w.owner=$1 AND NOT w.is_demo AND e.type='baseline_approved') AS baseline_approvals,
 (SELECT count(*) FROM accord_incidents i JOIN accord_workspaces w ON w.id=i.workspace_id WHERE w.owner=$1 AND NOT w.is_demo AND i.acknowledged_at IS NOT NULL) AS acknowledged_incidents,
 (SELECT count(DISTINCT e.created_at::date) FROM accord_workspace_events e JOIN accord_workspaces w ON w.id=e.workspace_id WHERE w.owner=$1 AND NOT w.is_demo AND e.type IN ('baseline_approved','incident_acknowledged')) AS review_days,
 (SELECT count(*) FROM accord_pilot_feedback WHERE owner=$1 AND body->>'stage'='accepted_terms') AS self_reported_acceptances`,[owner])).rows[0];
 return {...Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Number(v)])),customer_validation:"pending",revenue_verified:false,disclosure:"Your wallet's setup/review activity, excluding marked demos. Wallets are not distinct teams; events are not proof of retained customers or revenue."};
}
