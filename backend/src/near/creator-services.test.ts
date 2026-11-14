import type {AddressInfo} from 'node:net';
/** Two real HTTP provider adapters; chain views controlled, no signing/inference. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.ACCORD_ENV_ISOLATED='true';
process.env.NEAR_NETWORK='testnet';
process.env.NEAR_CONTRACT_ID='escrow.testnet';
process.env.NODE_ENV='test';
const {creatorSchema,creatorInput,creatorMetadata,creatorReport,providerRoute,CREATOR_KIND}=await import('./creator-services.js');
const {digest}=await import('./core.js');
const {hostedProvider}=await import('./hosted-provider.js');
const {callProvider,providerHeaders,agentIdentity}=await import('./execution.js');
const {deliverySpecification,validatePrepared,validateDeliveryEvidence}=await import('./service-delivery.js');
const schema={type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false};
test('creator input has explicit bounded schema; malformed/extra fields fail closed',()=>{
 assert.equal(creatorSchema(schema),schema);assert.deepEqual(creatorInput({text:'release'},schema),{text:'release'});
 for(const v of [null,[],{}, {text:12},{text:'x',extra:true},{text:'x'.repeat(4001)}])assert.throws(()=>creatorInput(v,schema));
 for(const s of [{...schema,additionalProperties:true},{...schema,required:[]},{...schema,properties:{text:{type:'object'}}},{...schema,$ref:'file:///etc/passwd'}])assert.throws(()=>creatorSchema(s));
 const ints={type:'object',properties:{n:{type:'integer'},ok:{type:'boolean'}},required:['n','ok'],additionalProperties:false};
 assert.deepEqual(creatorInput({n:3,ok:true},ints),{n:3,ok:true});assert.throws(()=>creatorInput({n:1.5,ok:true},ints));assert.throws(()=>creatorInput({n:1000001,ok:true},ints));
});
test('two independent creators prepare once, require exact payment and recover exact reports',async()=>{
 const root=await mkdtemp(join(tmpdir(),'accord-creators-')),servers:any[]=[],records:any[]=[];
 try{
  for(let i=0;i<2;i++){
   const provider='creator'+i+'.testnet',secret='fixture-provider-'+i+'-unique-secret-32-characters',input={text:'Breaking release '+i},id=String(80+i);
   let receipt:any=null,runs=0;
   const metadata:any={kind:CREATOR_KIND,name:'Release reviewer '+i,description:'Creator-hosted release review',analysis_mode:'external',agent_version:'1.0.0',build_digest:digest('build'+i),input_schema:schema,input_example:input};
   const service={provider,name:metadata.name,price:'100',interval_ns:'60000000000',metadata_hash:''};
   const sub={owner:'customer.testnet',service_id:id,delegate_key:'test-fixture',input_hash:digest(input),active:true,cycles:0,max_cycles:2,reserved:'200',next_due_ns:'0',expires_at_ns:((BigInt(Date.now())+600000n)*1000000n).toString()};
   const options={provider,endpoint:'http://127.0.0.1',secret,stateDir:join(root,provider),run:async()=>{runs++;return {summary:'Review '+i,findings:['Breaking change'],recommendations:['Check consumers']};},view:(async(method:string)=>method==='get_service'?service:method==='get_subscription'?sub:receipt) as any};
   const app=hostedProvider(options);
   // Bind first, then assign the actual origin used by the independently hosted adapter.
   const server=app.listen(0,'127.0.0.1');servers.push(server);await new Promise<void>(r=>server.once('listening',r));
   const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
   options.endpoint=url;
   metadata.provider_url=url;service.metadata_hash=digest(metadata);
   const registry=JSON.parse(process.env.ACCORD_APPROVED_PROVIDERS??'{}');registry[provider]={url,secret};process.env.ACCORD_APPROVED_PROVIDERS=JSON.stringify(registry);
   const routeMetadata={...metadata,provider_url:url};creatorMetadata(routeMetadata,provider);
   const identity=agentIdentity(id,service,routeMetadata),spec=deliverySpecification(id,service,metadata);
   const body={subscription_id:id,cycle:0,input,identity_hash:identity.hash,spec_hash:digest(spec),metadata,specification:spec};
   const challenge='a'.repeat(64);assert.deepEqual(await callProvider(provider,routeMetadata,'/handshake',{provider,challenge}),{provider,challenge,protocol:'accord-provider-v1'});
   const prepared=await callProvider(provider,routeMetadata,'/prepare',body);
   const context={id,cycle:0,owner:sub.owner,input,sub,service,metadata,spec};
   validatePrepared(prepared,context);
   const evidence=await validateDeliveryEvidence(prepared,context);assert.equal(evidence.factual_correctness,'UNVERIFIED');
   assert.deepEqual(await callProvider(provider,routeMetadata,'/prepare',body),prepared);assert.equal(runs,1);
   await assert.rejects(callProvider(provider,routeMetadata,'/deliver',{subscription_id:id,cycle:0,prepare_id:prepared.prepare_id}));
   receipt={subscription_id:id,cycle:0,provider,amount:'100',artifact_hash:prepared.artifact_hash,paid_at_ns:(BigInt(Date.now())*1000000n).toString()};
   const paid=await callProvider(provider,routeMetadata,'/deliver',{subscription_id:id,cycle:0,prepare_id:prepared.prepare_id});assert.deepEqual(paid.report,prepared.report);
   assert.deepEqual((await callProvider(provider,routeMetadata,'/deliver',{subscription_id:id,cycle:0,prepare_id:prepared.prepare_id})).report,paid.report);assert.equal(runs,1);
   receipt={...receipt,cycle:1};await assert.rejects(callProvider(provider,routeMetadata,'/deliver',{subscription_id:id,cycle:0,prepare_id:prepared.prepare_id}));
   await assert.rejects(callProvider(provider,routeMetadata,'/prepare',{...body,input:{text:'different'}}));
   assert.throws(()=>creatorReport({...prepared.report,input_hash:digest('other')},id+':0',input));
   assert.throws(()=>creatorReport({...prepared.report,summary:42},id+':0',input));
   assert.throws(()=>creatorReport({...prepared.report,generatedAt:new Date(Date.now()-700000).toISOString()},id+':0',input));
   records.push({provider,url,secret,metadata:routeMetadata});
  }
  const a=records[0],b=records[1],body={provider:a.provider,challenge:'b'.repeat(64)};
  const cross=await fetch(a.url+'/handshake',{method:'POST',headers:{'content-type':'application/json',...providerHeaders('/handshake',body,Date.now(),b.secret)},body:JSON.stringify(body)});assert.equal(cross.status,401);
  assert.throws(()=>providerRoute('outsider.testnet',a.metadata));
  assert.throws(()=>creatorMetadata({...a.metadata,provider_url:'https://unapproved.example'},a.provider));
  assert.throws(()=>creatorMetadata({...a.metadata,build_digest:'invalid'},a.provider));
  assert.throws(()=>creatorMetadata({...a.metadata,agent_version:'latest'},a.provider));
  const reg=JSON.parse(process.env.ACCORD_APPROVED_PROVIDERS!);reg['unsafe.testnet']={url:'http://192.168.1.1',secret:a.secret};process.env.ACCORD_APPROVED_PROVIDERS=JSON.stringify(reg);assert.throws(()=>providerRoute('unsafe.testnet'));
 }finally{await Promise.all(servers.map(s=>new Promise<void>(r=>s.close(()=>r()))));await rm(root,{recursive:true,force:true});delete process.env.ACCORD_APPROVED_PROVIDERS;}
});
