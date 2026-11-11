"use client";
import {useEffect,useState} from "react";
import {api} from "@/lib/near";
type Entry={id:string;body:{role:string;stage:string;problem:string;workaround:string;outcome:string;terms:string}};
export default function PilotFeedback({account}:{account:string}) {
 const [records,setRecords]=useState<Entry[]>([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function load(){const r=await api("/pilot");setRecords(r.records);}
 useEffect(()=>{setRecords([]);if(account)void load().catch(e=>setNotice(e.message));},[account]);
 if(!account)return <p>Sign in on the home page to record your pilot feedback. Customer validation is still pending.</p>;
 return <section className="panel"><h3>Pilot feedback</h3><p>Tell us about an actual monitoring need. Do not include keys, contact details or confidential logs. Feedback stays visible to this wallet. Accepting proposed terms does not authorize payment.</p>
 <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const body=Object.fromEntries(new FormData(form));setBusy(true);try{await api("/pilot",body);await load();form.reset();setNotice("Feedback saved. Customer validation still requires human review.");}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}}>
 <label>Your role<select name="role"><option value="developer">Application developer</option><option value="operator">Bot / relayer operator</option><option value="agency">Application maintenance agency</option></select></label>
 <label>Pilot stage<select name="stage"><option value="interested">Considering a pilot</option><option value="used">Used the pilot</option><option value="declined">Would not continue</option><option value="accepted_terms">Accept proposed continuation terms</option></select></label>
 <label>Actual monitoring need<textarea name="problem" required maxLength={1000}/></label>
 <label>Current workaround<textarea name="workaround" required maxLength={1000}/></label>
 <label>What happened during the pilot?<textarea name="outcome" required maxLength={1000}/></label>
 <label>Proposed price, currency and period, if accepted<input name="terms" maxLength={200}/></label>
 <button disabled={busy}>Save feedback</button></form>
 <p role="status">{notice}</p><p>Recorded entries: {records.length}. No verified customer or revenue claim is inferred.</p>
 {records.map(r=><details key={r.id}><summary>{r.body.stage} · {r.body.role}</summary><p>{r.body.problem}</p><p>Workaround: {r.body.workaround}</p><p>{r.body.outcome}</p>{r.body.terms&&<p>Self-reported terms: {r.body.terms}</p>}<button className="quiet" onClick={async()=>{try{await api(`/pilot/${r.id}`,undefined,"DELETE");await load();}catch(e){setNotice((e as Error).message);}}}>Delete my feedback</button></details>)}
 </section>;
}
