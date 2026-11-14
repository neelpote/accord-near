import type {AddressInfo} from 'node:net';
/** Actual API/PG + independent HTTP provider. Controlled chain/session fixture, no live-wallet claim. */
import 'dotenv/config';
import pg from 'pg';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const original=process.env.DATABASE_URL;if(!original)throw Error('DATABASE_URL required');
const admin=new pg.Pool({connectionString:original}),schema='accord_creator_'+randomUUID().replaceAll('-','');
await admin.query('CREATE SCHEMA '+schema);
const u=new URL(original);u.searchParams.set('options','-csearch_path='+schema);
Object.assign(process.env,{DATABASE_URL:u.toString(),ACCORD_ENV_ISOLATED:'true',ACCORD_API_TEST:'1',NEAR_NETWORK:'testnet',NEAR_CONTRACT_ID:'escrow.testnet',NEAR_RPC_URL:'http://127.0.0.1:9',PROVIDER_ACCOUNT_ID:'reference.testnet',PROVIDER_URL:'http://127.0.0.1:4001',PUBLIC_ORIGIN:'http://localhost:3000',NODE_ENV:'test'});
const {db,migrate}=await import('./db.js'),{rpc}=await import('./config.js'),{digest}=await import('./core.js'),{hostedProvider}=await import('./hosted-provider.js'),{app}=await import('./server.js');
const state=await mkdtemp(join(tmpdir(),'accord-creator-api-')),servers:any[]=[];
try{
 await migrate();await migrate();
 const provider='creator.testnet',secret='fixture-creator-api-distinct-secret-32-characters';
 const options={provider,endpoint:'http://127.0.0.1',secret,stateDir:state,run:async()=>({summary:'Example',findings:[],recommendations:[]})};
 const adapter=hostedProvider(options).listen(0,'127.0.0.1');servers.push(adapter);await new Promise<void>(r=>adapter.once('listening',r));
 options.endpoint='http://127.0.0.1:'+(adapter.address() as AddressInfo).port;
 process.env.ACCORD_APPROVED_PROVIDERS=JSON.stringify({[provider]:{url:options.endpoint,secret}});
 const metadata={kind:'creator-report-v1',name:'Creator release reviewer',description:'Independent release notes check',analysis_mode:'external',provider_url:options.endpoint,agent_version:'1.0.0',build_digest:digest('fixture-build'),input_schema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},input_example:{text:'breaking release'}};
 const service={provider,name:metadata.name,metadata_hash:digest(metadata),price:'100',interval_ns:'60000000000'};
 (rpc as any).callFunction=async({method}:any)=>method==='get_service'?service:null;
 const api=app.listen(0,'127.0.0.1');servers.push(api);await new Promise<void>(r=>api.once('listening',r));const base='http://127.0.0.1:'+(api.address() as AddressInfo).port;
 const tokens:Record<string,string>={};for(const account of [provider,'outsider.testnet']){const token=randomUUID();tokens[account]=token;await db.query("INSERT INTO accord_sessions VALUES($1,$2,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),account]);}
 const request=async(path:string,account:string,body?:unknown)=>{const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{cookie:'accord_session='+tokens[account],origin:'http://localhost:3000','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json() as any};};
 assert.equal((await fetch(base+'/creators/me')).status,401);
 const approved=await request('/creators/me',provider);assert.equal(approved.body.approved,true);assert.equal(approved.body.provider_url,options.endpoint);assert.ok(!JSON.stringify(approved).includes(secret));
 assert.equal((await request('/creators/me','outsider.testnet')).body.approved,false);
 assert.equal((await request('/services/preflight','outsider.testnet',{metadata})).status,400);
 const preflight=await request('/services/preflight',provider,{metadata});assert.equal(preflight.status,200);assert.equal(preflight.body.metadata_hash,service.metadata_hash);
 assert.equal((await request('/services/preflight',provider,{metadata:{...metadata,provider_url:'https://other.example'}})).status,400);
 assert.equal((await request('/services',provider,{service_id:'1',metadata})).status,200);
 assert.equal((await request('/services','outsider.testnet',{service_id:'1',metadata})).status,400);
 assert.equal((await request('/services',provider,{service_id:'2',metadata:{...metadata,name:'Changed'}})).status,400);
 const listed=(await db.query('SELECT metadata FROM accord_services WHERE id=$1',['1'])).rows[0];assert.deepEqual(listed.metadata,metadata);
 assert.equal((await request('/inputs/validate',provider,{service_id:'1',input:{text:'release'}})).status,200);
 assert.equal((await request('/inputs/validate',provider,{service_id:'1',input:{text:42}})).status,400);
 await new Promise<void>(r=>adapter.close(()=>r()));servers.splice(servers.indexOf(adapter),1);
 assert.equal((await request('/services/preflight',provider,{metadata})).status,400);
 console.log('Creator API checks passed: session/approval/handshake/preflight/listing/ownership/hash/schema/outage; controlled chain, no live transactions.');
}finally{
 await Promise.all(servers.map(s=>new Promise<void>(r=>s.close(()=>r()))));await db.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();await rm(state,{recursive:true,force:true});
}
