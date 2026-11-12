"use client";
import {useEffect,useState} from "react";
import WorkspaceEvidence from "./WorkspaceEvidence";
import WorkspaceIncidents from "./WorkspaceIncidents";
import {api,digest} from "@/lib/near";
type Snapshot={block_height:number;block_hash:string;observed_at:string;accounts:{account_id:string;code_hash:string;code_source?:"global-hash";keys:{public_key:string;permission:unknown}[]}[]};
type Workspace={id:string;name:string;accounts:string[];baseline:Snapshot|null;pending_baseline:Snapshot|null;baseline_version:number;monitoring:boolean;last_success_at:string|null;last_error:string|null};
function Baseline({snapshot}:{snapshot:Snapshot}){
 return <div className="baseline"><p className="caption">Finalized block {snapshot.block_height} · {snapshot.observed_at}</p><code>{snapshot.block_hash}</code>{snapshot.accounts.map(a=><details key={a.account_id}><summary>{a.account_id} · {a.keys.length} keys</summary><p>{a.code_source === "global-hash" ? "Immutable global code hash" : "Local code hash"} <code>{a.code_hash}</code></p>{a.keys.map(k=><div className="key-review" key={k.public_key}><code>{k.public_key}</code><pre>{JSON.stringify(k.permission,null,2)}</pre></div>)}</details>)}</div>;
}
export default function OperationsWorkspace({account,evmEnabled=false}:{account:string;evmEnabled?:boolean}){
 const [workspaces,setWorkspaces]=useState<Workspace[]>([]),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 async function load(){const rows=await api("/workspaces");setWorkspaces(rows);setSelected(current=>rows.some((w:Workspace)=>w.id===current)?current:(rows[0]?.id??""));}
 async function act(fn:()=>Promise<unknown>){setBusy(true);setNotice("");try{await fn();await load();}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{if(!account)return;let active=true;async function refresh(){try{const rows=await api("/workspaces");if(active){setWorkspaces(rows);setSelected(current=>rows.some((w:Workspace)=>w.id===current)?current:(rows[0]?.id??""));}}catch(e){if(active)setNotice((e as Error).message);}}void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>{active=false;clearInterval(timer);};},[account]);
 const w=workspaces.find(w=>w.id===selected);
 return <section id="operations" className="operations"><div className="section-title"><div><p className="eyebrow">APPLICATION OPERATIONS · TESTNET PILOT</p><h2>Know what changed.</h2></div><span className="caption">Code identity + access permissions</span></div>
 <p>Review your application’s baseline before monitoring changes. This read-only pilot is unbilled and has no wallet authority. Paid agent reports require separate agreements.</p>
 {!account?<div className="panel"><p>{evmEnabled ? "Sign in above using a NEAR wallet or MetaMask on NEAR testnet. MetaMask login requires a zero-deposit transaction plus testnet gas; it grants no spending authority." : "Sign in with NEAR above to create your application workspace. No payment is authorized by sign-in."}</p></div>:<>
 <details className="panel" open={!workspaces.length}><summary>Add an application</summary><form onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const d=new FormData(form);void act(async()=>{const row=await api("/workspaces",{name:d.get("name"),accounts:String(d.get("accounts")).split(/[\s,]+/).filter(Boolean)});setSelected(row.id);form.reset();setNotice("Workspace created. Capture and review its baseline next.");});}}>
 <label>Application name<input name="name" required maxLength={80} placeholder="My NEAR application"/></label>
 <label>Testnet account IDs<textarea name="accounts" required placeholder="app.example.testnet" aria-describedby="account-help"/></label><p id="account-help" className="caption">One per line. Up to five related accounts; three applications per wallet. All accounts must be yours to monitor or public accounts you are authorized to assess.</p>
 <button disabled={busy}>Create read-only workspace</button></form></details>
 {!!workspaces.length&&<label>Application<select value={selected} onChange={e=>setSelected(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
 {w&&<article className="panel workspace"><div className="section-title"><h3>{w.name}</h3><span className="caption">Baseline {w.baseline_version||"not approved"}</span></div><p>{w.accounts.join(" · ")}</p>
 <p className="caption">First capture is an observation, not evidence of safety. Compare code hashes and public-key permissions with your deployment records before approving.</p>
 <button className="quiet" disabled={busy} onClick={()=>void act(()=>api(`/workspaces/${w.id}/capture`,{}))}>{w.baseline?"Capture proposed replacement baseline":"Capture baseline for review"}</button>
 {w.pending_baseline&&<div className="baseline-proposal"><h4>Review proposed baseline</h4><Baseline snapshot={w.pending_baseline}/><p>Approval records this exact snapshot. It does not certify the code or permissions are safe.</p><button disabled={busy} onClick={()=>void act(async()=>{await api(`/workspaces/${w.id}/approve`,{proposal_hash:await digest(w.pending_baseline)});setNotice("Baseline approved. Existing evidence is retained.");})}>I reviewed this snapshot · approve baseline</button></div>}
 {w.baseline&&<details><summary>Approved baseline · version {w.baseline_version}</summary><Baseline snapshot={w.baseline}/></details>}
 <WorkspaceIncidents key={w.id} workspace={w} onChange={load}/>
 <WorkspaceEvidence key={"evidence-"+w.id} id={w.id} accounts={w.accounts}/>
 <details><summary>Delete application pilot records</summary><p>Pause monitoring and download evidence first. This removes the workspace, baselines, incidents and report links. Separate paid agreements and onchain history remain; manage them under My agreements.</p><form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void act(()=>api(`/workspaces/${w.id}/delete`,{confirm_name:d.get("confirm_name")}));}}><label>Enter the exact application name<input name="confirm_name" required maxLength={80}/></label><button className="quiet" disabled={busy||w.monitoring}>Delete pilot records</button></form></details>
 </article>}
 </>}
 <p role="status">{notice}</p>
 </section>;
}
