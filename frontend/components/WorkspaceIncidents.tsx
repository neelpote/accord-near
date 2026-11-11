"use client";
import {useEffect,useState} from "react";
import {api} from "@/lib/near";
type Incident={id:string;type:string;account_id:string;state:string;observations:number;occurrences:number;acknowledged_at:string|null;first_seen:string;evidence:{change:{before:unknown;after:unknown;key?:string};baseline_block:string;observation:{block_height:number;block_hash:string;observed_at:string}}};
type Notification={id:string;channel:string;state:string;attempts:number;last_error:string|null};
export default function WorkspaceIncidents({workspace,onChange}:{workspace:{id:string;baseline:unknown;monitoring:boolean;webhook_enabled?:boolean;last_success_at:string|null;last_error:string|null};onChange:()=>Promise<void>}){
 const [incidents,setIncidents]=useState<Incident[]>([]),[notifications,setNotifications]=useState<Notification[]>([]),[webhook,setWebhook]=useState(false),[available,setAvailable]=useState(false),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function refresh(){const [i,n]=await Promise.all([api(`/workspaces/${workspace.id}/incidents`),api(`/workspaces/${workspace.id}/notifications`)]);setIncidents(i);setNotifications(n);}
 useEffect(()=>{let active=true;async function update(){try{const [i,n,c]=await Promise.all([api(`/workspaces/${workspace.id}/incidents`),api(`/workspaces/${workspace.id}/notifications`),api("/notification-config")]);if(active){setIncidents(i);setNotifications(n);setAvailable(c.webhook_available);}}catch(e){if(active)setNotice((e as Error).message);}}void update();const timer=setInterval(()=>void update(),15000);return()=>{active=false;clearInterval(timer);};},[workspace.id]);
 useEffect(()=>setWebhook(!!workspace.webhook_enabled),[workspace.webhook_enabled]);
 async function act(fn:()=>Promise<unknown>){setBusy(true);setNotice("");try{await fn();await refresh();await onChange();}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 const stale=workspace.monitoring&&(!workspace.last_success_at||Date.now()-Date.parse(workspace.last_success_at)>180000);
 return <div className="incident-console"><h4>Change monitoring</h4>
 <p className={`monitor-health ${workspace.last_error||stale?"attention":""}`}>{workspace.monitoring?(stale?"Waiting for fresh evidence":"Monitoring enabled"):"Monitoring paused"}{workspace.last_success_at&&` · Last success ${workspace.last_success_at}`}</p>
 {workspace.last_error&&<p role="alert">{workspace.last_error}. Previous evidence is retained; absence of a new incident is not an all-clear.</p>}
 <p className="caption">Polls approximately once a minute while the API worker runs. It can miss changes between polls. No exploit detection or uptime guarantee is claimed.</p>
 <label><input type="checkbox" checked={webhook} disabled={!available||busy} onChange={e=>setWebhook(e.target.checked)}/> Also notify the operator-configured destination</label>
 {!available&&<p className="caption">External delivery is not configured. In-app incidents are available; they do not notify you while the app is closed.</p>}
 <div className="action-row"><button disabled={!workspace.baseline||busy} onClick={()=>void act(()=>api(`/workspaces/${workspace.id}/monitoring`,{enabled:!workspace.monitoring,webhook_enabled:webhook}))}>{workspace.monitoring?"Pause monitoring":"Start read-only monitoring"}</button>
 <button className="quiet" disabled={!workspace.baseline||busy} onClick={()=>void act(()=>api(`/workspaces/${workspace.id}/check`,{}))}>Check now</button></div>
 <p role="status">{notice}</p><h4>Incidents · latest 100</h4>
 {!incidents.length&&<p>No incidents recorded. This does not certify the application is safe.</p>}
 {incidents.map(i=><details className={`incident ${i.state}`} key={i.id}><summary>{i.type.replaceAll("_"," ")} · {i.account_id} · {i.state}{i.acknowledged_at?" · acknowledged":""}</summary>
 <p>First seen {i.first_seen} · {i.observations} observations · {i.occurrences} occurrence(s)</p>
 {i.evidence.change.key&&<p><code>{i.evidence.change.key}</code></p>}
 <div className="evidence-diff"><div><h5>Approved value</h5><pre>{JSON.stringify(i.evidence.change.before,null,2)}</pre></div><div><h5>Observed value</h5><pre>{JSON.stringify(i.evidence.change.after,null,2)}</pre></div></div>
 <p className="caption">Baseline block <code>{i.evidence.baseline_block}</code><br/>Observed block {i.evidence.observation.block_height} · <code>{i.evidence.observation.block_hash}</code></p>
 {!i.acknowledged_at&&<button className="quiet" disabled={busy} onClick={()=>void act(()=>api(`/workspaces/${workspace.id}/incidents/${i.id}/acknowledge`,{}))}>Acknowledge incident</button>}
 <p className="caption">Acknowledgement records human review; it does not approve a new baseline or modify the account.</p>
 </details>)}
 <details><summary>Notification delivery · latest 100</summary>{!notifications.length&&<p>No deliveries queued.</p>}{notifications.map(n=><p key={n.id}>#{n.id} · {n.channel==="in_app"?"in app":"configured destination"} · {n.state} · attempts {n.attempts}{n.last_error&&` · ${n.last_error}`}</p>)}</details>
 </div>;
}
