/** Free working reference service. Replace only run() with your own agent on your own host. */
process.env.ACCORD_ENV_ISOLATED='true';
const {hostedProvider}=await import('./hosted-provider.js');
const {networkCheck}=await import('./config.js');
const {resolve}=await import('node:path');
const provider=process.env.PROVIDER_ACCOUNT_ID,endpoint=process.env.CREATOR_PUBLIC_URL,secret=process.env.ACCORD_PROVIDER_SECRET;
if(!provider||!endpoint||!secret)throw Error('Set PROVIDER_ACCOUNT_ID, CREATOR_PUBLIC_URL and a provider-only ACCORD_PROVIDER_SECRET');
await networkCheck();
const app=hostedProvider({provider,endpoint,secret,stateDir:process.env.CREATOR_STATE_DIR??resolve('../.tools/creator-state',provider),run:async(input)=>{
 const text=String(input.text??'');const findings:string[]=[];
 if(/\b(breaking|deprecated|removed)\b/i.test(text))findings.push('A compatibility change is mentioned; check affected consumers before release.');
 if(/\b(todo|fixme)\b/i.test(text))findings.push('An unfinished item is mentioned; resolve or explicitly defer it.');
 if(/\b(private key|seed phrase)\b/i.test(text))findings.push('Sensitive wallet material is mentioned; never include actual credentials in an agent request.');
 return {summary:findings.length?'Release review found '+findings.length+' item(s) requiring attention.':'No configured release-review markers were found.',findings,recommendations:['Review these rule-based observations against the actual release. This reference example does not use AI inference.']};
}});
app.listen(Number(process.env.PORT??4003),process.env.BIND_HOST??'127.0.0.1',()=>console.log('Independent creator provider ready'));
