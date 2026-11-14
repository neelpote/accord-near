/** Explain renewal changes without creating an authorization or touching a signing key. */
import { digest } from './core.js';
import { validateIntent, type Intent, type Evidence } from './counterparty-policy.js';
import type { Service, Subscription } from './config.js';
export type ReviewRecord = {intent:Intent; evidence:Evidence; policy:string};
export function renewalReview(current:ReviewRecord, previous:ReviewRecord|null, sub:Subscription, service:Service, now=Date.now()) {
  const intent=validateIntent(current.intent);
  if(sub.owner!==intent.agent)throw Error('Agreement owner mismatch');
  const amount=(v:string)=>{if(!/^\d{1,40}$/.test(v))throw Error('Invalid onchain amount');return BigInt(v);};
  const price=amount(service.price), reserve=amount(sub.reserved),expiry=amount(sub.expires_at_ns);
  if(!Number.isSafeInteger(sub.cycles)||!Number.isSafeInteger(sub.max_cycles)||sub.cycles<0||sub.max_cycles<sub.cycles||sub.max_cycles>10000)throw Error('Invalid onchain cycle count');
  if(typeof sub.active!=='boolean')throw Error('Invalid onchain agreement state');
  const remaining=sub.max_cycles-sub.cycles;
  const possible=price*BigInt(remaining),active=sub.active&&expiry>BigInt(now)*1000000n;
  const changes:{kind:string;subject:string;before:string|null;after:string|null}[]=[];
  const add=(kind:string,subject:string,before:string|null,after:string|null)=>{if(before!==after)changes.push({kind,subject,before,after});};
  if(previous){
    const old=validateIntent(previous.intent);
    if(old.agent!==intent.agent||old.network!==intent.network||old.args.subscription_id!==intent.args.subscription_id)throw Error('Unrelated authorization cannot be a renewal baseline');
    for(const key of ['contract','receiver','amount'] as const)add('payment_terms',key,old[key],intent[key]);
    add('policy','policy version',previous.policy,current.policy);
    for(const account of new Set([old.contract,old.receiver,intent.contract,intent.receiver])){
      add('code',account,previous.evidence.accounts.find(a=>a.account===account)?.code??null,current.evidence.accounts.find(a=>a.account===account)?.code??null);
    }
    const relevant=(e:Evidence)=>e.reports.filter(r=>[intent.contract,intent.receiver,old.contract,old.receiver].includes(r.account));
    const before=new Map(relevant(previous.evidence).map(r=>[r.id,r])),after=new Map(relevant(current.evidence).map(r=>[r.id,r]));
    for(const id of new Set([...before.keys(),...after.keys()])){
      const a=before.get(id),b=after.get(id);
      // Include evidence digest: an edited allegation must not look like the same report.
      add('report',id,a?`${a.account} · ${a.status} · ${a.evidence_hash}`:null,b?`${b.account} · ${b.status} · ${b.evidence_hash}`:null);
    }
  }
  const canonicalChanges=changes.sort((a,b)=>(a.kind+':'+a.subject).localeCompare(b.kind+':'+b.subject));
  return { baseline:previous?'previous authorization':'first review',changes:canonicalChanges,changes_hash:digest(canonicalChanges),
    evidence_observed_at:current.evidence.observed_at,
    budget:{active,remaining_reports:remaining,reserve_yocto:reserve.toString(),price_yocto:price.toString(),
      maximum_scheduled_yocto:active?(reserve<possible?reserve:possible).toString():'0',
      recipient:service.provider,next_due_ns:sub.next_due_ns,expires_at_ns:sub.expires_at_ns},
    terms_match:intent.receiver===service.provider&&intent.amount===service.price,
    limits:'Recorded evidence comparison plus current onchain terms. Not a new security decision, payment approval, guarantee of maximum loss or report quality. The signing gate rechecks evidence independently.'};
}
