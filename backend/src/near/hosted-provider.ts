/** Creators run this adapter on THEIR host. It holds no customer signing key or platform DB credentials. */
import express from 'express';
import 'express-async-errors';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {providerHeaders,verifyProviderRequest} from './execution.js';
import {creatorInput,creatorReport,CREATOR_KIND} from './creator-services.js';
import {digest} from './core.js';
import {view as chainView,type Subscription,type Service,type Receipt} from './config.js';
type Runner=(input:Record<string,unknown>)=>Promise<{summary:string;findings:string[];recommendations:string[]}>;
export function hostedProvider(options:{provider:string;endpoint:string;secret:string;stateDir:string;run:Runner;view?:typeof chainView}){
 const app=express(),view=options.view??chainView;
 options.endpoint=new URL(options.endpoint).origin;
 if(options.secret.length<32)throw Error('Use a unique provider secret of at least 32 characters');
 app.disable('x-powered-by');app.use(express.json({limit:'64kb'}));
 app.get('/health',(_q,r)=>r.json({ok:true,protocol:'accord-provider-v1',provider:options.provider}));
 app.use((req,res,next)=>{try{
  verifyProviderRequest(req.path,req.body,req.headers['x-accord-time'],req.headers['x-accord-auth'],options.secret);
  const json=res.json.bind(res);res.json=(payload:any)=>{for(const [k,v]of Object.entries(providerHeaders(req.path+'/response',{request_hash:digest(req.body),response:payload},Date.now(),options.secret)))res.setHeader(k,v);return json(payload);};next();
 }catch{res.status(401).json({error:'Provider authentication required'});}});
 app.post('/handshake',(req,res)=>{
  if(req.body.provider!==options.provider||!/^[a-f0-9]{64}$/.test(req.body.challenge))throw Error('Invalid ownership challenge');
  res.json({challenge:req.body.challenge,provider:options.provider,protocol:'accord-provider-v1'});
 });
 const args=(b:any)=>{if(!/^\d{1,20}$/.test(b.subscription_id)||!Number.isInteger(b.cycle)||b.cycle<0||b.cycle>19)throw Error('Invalid job');return {subscription_id:b.subscription_id as string,cycle:b.cycle as number};};
 const file=(a:{subscription_id:string;cycle:number})=>join(options.stateDir,a.subscription_id+'-'+a.cycle+'.json');
 app.post('/prepare',async(req,res)=>{
  const a=args(req.body),sub=await view<Subscription>('get_subscription',{subscription_id:a.subscription_id}),service=await view<Service>('get_service',{service_id:sub.service_id}),m=req.body.metadata,spec=req.body.specification;
  if(service.provider!==options.provider||m?.kind!==CREATOR_KIND||m.provider_url!==options.endpoint||digest(m)!==service.metadata_hash||spec?.provider_id!==options.provider||spec?.service_id!==sub.service_id||spec?.metadata_hash!==service.metadata_hash||digest(spec)!==req.body.spec_hash)throw Error('Provider/offer/specification mismatch');
  const input=creatorInput(req.body.input,m.input_schema);
  if(digest(input)!==sub.input_hash)throw Error('Input differs from approved agreement');
  const context=digest({owner:sub.owner,service:sub.service_id,input:sub.input_hash,metadata:service.metadata_hash,identity:req.body.identity_hash,spec:req.body.spec_hash});
  await mkdir(options.stateDir,{recursive:true,mode:0o700});
  let old:any;try{old=JSON.parse(await readFile(file(a),'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;}
  if(old){if(old.context!==context||old.state!=='READY')throw Error('Preparation requires review; no duplicate execution');res.json(old.envelope);return;}
  const now=BigInt(Date.now())*1000000n;
  if(!sub.active||sub.cycles!==a.cycle||a.cycle>=sub.max_cycles||now<BigInt(sub.next_due_ns)||now>=BigInt(sub.expires_at_ns))throw Error('Agreement not active and due');
  // ponytail: exclusive disk claim supports one host/shared durable directory; use a transactional store for multi-host scale.
  await writeFile(file(a),JSON.stringify({state:'PREPARING',context}),{flag:'wx',mode:0o600});
  const save=async(value:unknown)=>{const tmp=file(a)+'.'+randomUUID();await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,file(a));};
  try{
   const output=await Promise.race([options.run(input),new Promise<never>((_r,reject)=>{const timer=setTimeout(()=>reject(Error('Creator execution timeout')),45000);timer.unref();})]);
   const report={...output,kind:CREATOR_KIND,schemaVersion:'1.0',jobId:a.subscription_id+':'+a.cycle,input_hash:sub.input_hash,generatedAt:new Date().toISOString()};
   creatorReport(report,report.jobId,input);
   const envelope={...a,identity_hash:req.body.identity_hash,spec_hash:req.body.spec_hash,schema_version:'accord-prepared-v1',job_id:report.jobId,owner:sub.owner,service_id:sub.service_id,prepared_at:new Date().toISOString(),prepare_id:randomUUID(),report,artifact_hash:digest(report),provider:options.provider,amount:service.price,input_hash:sub.input_hash};
   await save({state:'READY',context,envelope});res.json(envelope);
  }catch{await save({state:'NEEDS_REVIEW',context});throw Error('Creator execution failed; no completed fallback or automatic retry');}
 });
 app.post('/deliver',async(req,res)=>{
  const a=args(req.body),item=JSON.parse(await readFile(file(a),'utf8')),e=item.envelope;
  const receipt=await view<Receipt|null>('get_receipt',a);
  if(item.state!=='READY'||!receipt||receipt.subscription_id!==a.subscription_id||receipt.cycle!==a.cycle||receipt.provider!==options.provider||receipt.artifact_hash!==digest(e.report)||receipt.artifact_hash!==e.artifact_hash||receipt.amount!==e.amount||req.body.prepare_id!==e.prepare_id)throw Error('Independent payment receipt required for this exact artifact');
  res.json({report:e.report,artifact_hash:e.artifact_hash,receipt});
 });
 app.use((error:Error,_q:express.Request,r:express.Response,_n:express.NextFunction)=>r.status(400).json({error:error.message.length<180?error.message:'Provider request rejected'}));
 return app;
}
