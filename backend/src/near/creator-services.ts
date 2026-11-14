/** Hackathon scope: operator-approved hosted providers; no uploaded code or arbitrary URLs. */
import {config} from './config.js';
import {digest} from './core.js';
export const CREATOR_KIND='creator-report-v1';
type FieldType='string'|'integer'|'boolean';
export type CreatorSchema={type:'object';properties:Record<string,{type:FieldType}>;required:string[];additionalProperties:false};
export function creatorSchema(value:any):CreatorSchema{
 if(!value||value.type!=='object'||value.additionalProperties!==false||!value.properties||Array.isArray(value.properties)||!Array.isArray(value.required)||Object.keys(value).some(k=>!['type','properties','required','additionalProperties'].includes(k)))throw Error('Use the supported flat object schema');
 const fields=Object.keys(value.properties);
 if(fields.length<1||fields.length>8||new Set(value.required).size!==fields.length||value.required.length!==fields.length||!fields.every(k=>value.required.includes(k)))throw Error('Declare 1..8 required input fields');
 for(const name of fields){const p=value.properties[name];if(!/^[a-z][a-z0-9_]{0,31}$/.test(name)||['constructor','prototype','__proto__'].includes(name)||!p||!['string','integer','boolean'].includes(p.type)||Object.keys(p).length!==1)throw Error('Use string, integer or boolean fields only');}
 return value;
}
export function creatorInput(value:unknown,schema:unknown):Record<string,unknown>{
 const s=creatorSchema(schema);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Agent input must be an object');
 const v=value as Record<string,unknown>,keys=Object.keys(v);
 if(keys.length!==s.required.length||keys.some(k=>!Object.hasOwn(s.properties,k)))throw Error('Input must match the agreed creator schema');
 for(const k of s.required){const t=s.properties[k]!.type,x=v[k];if(t==='string'?(typeof x!=='string'||x.length>4000):t==='boolean'?typeof x!=='boolean':(!Number.isSafeInteger(x)||Math.abs(x as number)>1000000))throw Error('Invalid creator input field: '+k);}
 if(JSON.stringify(v).length>16000)throw Error('Creator input exceeds 16 KB');
 return v;
}
function endpoint(url:unknown){
 if(typeof url!=='string')throw Error('Provider endpoint missing');
 const u=new URL(url),loopback=['127.0.0.1','localhost','[::1]'].includes(u.hostname);
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||(loopback&&u.protocol==='http:'&&process.env.NODE_ENV!=='production')))throw Error('Approved endpoint must be an HTTPS origin; loopback HTTP is development-only');
 return u.origin;
}
export function providerRoute(provider:string,metadata?:any){
 if(provider===process.env.PROVIDER_ACCOUNT_ID&&metadata?.kind!==CREATOR_KIND)return {url:config.provider.replace(/\/$/,''),secret:process.env.ACCORD_PROVIDER_SECRET??'',external:false};
 const registry=JSON.parse(process.env.ACCORD_APPROVED_PROVIDERS??'{}'),entry=registry[provider];
 if(!entry||typeof entry.secret!=='string'||entry.secret.length<32)throw Error('Creator is not approved. Ask the operator to approve your wallet and hosted endpoint before registration');
 const url=endpoint(entry.url);
 if(metadata&&endpoint(metadata.provider_url)!==url)throw Error('Endpoint does not match this creator approval');
 return {url,secret:entry.secret as string,external:true};
}
export function creatorMetadata(value:any,provider:string){
 if(!value||value.kind!==CREATOR_KIND||value.analysis_mode!=='external'||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||typeof value.description!=='string'||!value.description.trim()||value.description.length>2000||typeof value.agent_version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.agent_version)||typeof value.build_digest!=='string'||!/^[a-f0-9]{64}$/.test(value.build_digest))throw Error('Complete the hosted agent identity and description');
 creatorSchema(value.input_schema);creatorInput(value.input_example,value.input_schema);providerRoute(provider,value);
 return value;
}
export const creatorOutputSchema={type:'object',required:['kind','schemaVersion','jobId','input_hash','generatedAt','summary','findings','recommendations'],additionalProperties:false,properties:{kind:{const:CREATOR_KIND},schemaVersion:{const:'1.0'},jobId:{type:'string'},input_hash:{type:'string'},generatedAt:{type:'string',format:'date-time'},summary:{type:'string',maxLength:2000},findings:{type:'array',maxItems:20},recommendations:{type:'array',maxItems:20}}};
export function creatorReport(value:any,job:string,input:unknown,at=Date.now()){
 if(!value||Object.keys(value).some(k=>!creatorOutputSchema.required.includes(k))||value.kind!==CREATOR_KIND||value.schemaVersion!=='1.0'||value.jobId!==job||value.input_hash!==digest(input)||typeof value.generatedAt!=='string'||!Number.isFinite(Date.parse(value.generatedAt))||Date.parse(value.generatedAt)>at+5000||at-Date.parse(value.generatedAt)>600000||typeof value.summary!=='string'||!value.summary.trim()||value.summary.length>2000)throw Error('Creator report identity/schema/freshness rejected');
 for(const k of ['findings','recommendations'])if(!Array.isArray(value[k])||value[k].length>20||value[k].some((v:unknown)=>typeof v!=='string'||v.length>2000))throw Error('Creator report fields rejected');
}
