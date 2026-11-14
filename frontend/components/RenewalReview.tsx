"use client";
import {useState} from 'react';
import {api,near} from '@/lib/near';
type Review={baseline:string;baseline_decision:{id:string;state:string;acted_at:string}|null;changes:{kind:string;subject:string;before:string|null;after:string|null}[];changes_hash:string;evidence_observed_at:string;block_height:number;block_hash:string;terms_match:boolean;budget:{active:boolean;remaining_reports:number;reserve_yocto:string;price_yocto:string;maximum_scheduled_yocto:string;recipient:string};limits:string};
export default function RenewalReview({id}:{id:string}){
  const [review,setReview]=useState<Review>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function inspect(){
    setBusy(true);setError('');setReview(undefined);
    try{
      const data=await api(`/security/decisions/${encodeURIComponent(id)}/renewal`);
      if(!data?.budget||!Array.isArray(data.changes)||!Number.isSafeInteger(data.block_height)||
        !['reserve_yocto','price_yocto','maximum_scheduled_yocto'].every(key=>typeof data.budget[key]==='string'&&/^\d{1,40}$/.test(data.budget[key]))||
        !Number.isSafeInteger(data.budget.remaining_reports)||data.budget.remaining_reports<0||typeof data.budget.active!=='boolean'||
        !data.changes.every((c:any)=>c&&typeof c.kind==='string'&&typeof c.subject==='string'&&(c.before===null||typeof c.before==='string')&&(c.after===null||typeof c.after==='string')))throw Error('Renewal review unavailable');
      setReview(data);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="renewal-review">
    <button className="quiet" disabled={busy} onClick={()=>void inspect()}>{busy?'Reading finalized agreement…':'Review renewal changes & remaining budget'}</button>
    {error&&<p role="alert">Could not verify renewal context: {error}. No approval was created.</p>}
    {review&&<div aria-live="polite">
      <h5>What changed since your previous authorization?</h5>
      {!review.baseline_decision?<p>First review: no earlier authorization exists for this agreement. An empty comparison does not mean the receiver is safe.</p>:<>
        <p>Compared with your {review.baseline_decision.state} authorization from {new Date(review.baseline_decision.acted_at).toLocaleString()}. A consumed authorization is not proof of successful payment.</p>
        {!review.changes.length?<p>No code, report, policy or commercial-term changes in these recorded decisions. Check the current reasons above; unchanged evidence is not an automatic approval.</p>:<ul>{review.changes.map((c,i)=><li key={i}><strong>{c.kind} · {c.subject}</strong><br/>Before: <code>{c.before??'Not present'}</code><br/>Now: <code>{c.after??'Not present'}</code></li>)}</ul>}
      </>}
      <h5>If all remaining reports run</h5>
      <p><strong>Up to {near(review.budget.maximum_scheduled_yocto)} test NEAR</strong> under the current contract terms · {review.budget.remaining_reports} reports left at {near(review.budget.price_yocto)} test NEAR each.</p>
      <p>Contract reserve: {near(review.budget.reserve_yocto)} test NEAR. Recipient: <code>{review.budget.recipient}</code>. {!review.budget.active&&'The agreement is canceled or expired, so scheduled spending is zero; reserves can still require owner recovery.'}</p>
      {!review.terms_match&&<p role="alert">This recorded proposal differs from the current service terms. Do not approve it; the signing gate must recheck it.</p>}
      <p>Agreement and service read at finalized block {review.block_height}. Comparison evidence recorded {new Date(review.evidence_observed_at).toLocaleString()}. This snapshot is not a fresh reputation check.</p>
      <details><summary>Inspect renewal evidence</summary><pre>{JSON.stringify(review,null,2)}</pre></details>
      <p>{review.limits}</p>
    </div>}
  </div>;
}
