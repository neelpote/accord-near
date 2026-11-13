import {test,expect} from '@playwright/test';
test('AI risk output exposes evidence and uncertainty without claiming factual verification',async({page})=>{
 const report={kind:'near-contract-risk-analyst-v1',target:{network:'testnet',accountId:'target.testnet'},riskLevel:'HIGH',summary:'Code identity changed; implications require review.',analysis:{model:'Pinned local development model'},findings:[{id:'change-1',title:'code_changed',severity:'HIGH',description:'Different code may change behavior.',manual_check:'Compare the approved release.',evidence:['block:controlled','change:change-1']}],investigation:{current:{block_hash:'controlled'},baseline:{block_hash:'previous'}},generatedAt:'2026-11-13T10:00:00Z',jobId:'42:0',limitations:['No source-code audit is claimed.']};
 await page.route('**/api/near/**',async r=>{const p=new URL(r.request().url()).pathname.split('/api/near')[1];let json:any=[];
 if(p==='/config')json={network:'testnet',contract:'escrow.testnet',rpc:'http://unused.invalid',recipient:'localhost:3100'};
 if(p==='/me')json={accountId:'buyer.testnet'};if(p==='/balances')json={available:'0',earned:'0',pending:'0'};
 if(p==='/security')json={decisions:[],reports:[],reviewer:false};if(p==='/pilot')json={records:[],summary:{demand_validated:false}};
 if(p==='/subscriptions')json=[{id:'42',service_name:'Smart Contract Risk Analyst',state:'ACTIVE',agreement:{service_id:'9',active:true,max_cycles:2,cycles:1,reserved:'100',next_due_ns:'0',expires_at_ns:String(BigInt(Date.now()+1000000)*1000000n)},cycles:[{cycle:0,state:'DELIVERED',artifact_hash:'a'.repeat(64),report,receipt:{provider:'provider.testnet',amount:'100'}}]}];
 if(p==='/services/9/execution')json={identity:{hash:'identity',agent_id:report.kind,provider_id:'provider.testnet',version:'1'},enabled:true};if(p==='/execution/jobs')json={jobs:[],events:[]};
 await r.fulfill({json});});
 await page.goto('http://localhost:3100');const view=page.getByRole('region',{name:'Smart Contract Risk Analyst report'});
 await expect(view.getByText(/Rule-based change severity: HIGH/)).toBeVisible();await expect(view.getByText(/Factual correctness is unverified/)).toBeVisible();await view.getByText('Inspect baseline, finalized observations and evidence').click();await expect(view.locator('pre')).toContainText('previous');await expect(view.getByText(/Evidence: block:controlled/)).toBeVisible();
});

test('a provider-paused offer cannot open a funding form',async({page})=>{
 await page.route('**/api/near/**',async r=>{const p=new URL(r.request().url()).pathname.split('/api/near')[1];let json:any=[];
 if(p==='/config')json={network:'testnet',contract:'escrow.testnet',rpc:'http://unused.invalid',recipient:'localhost:3100'};
 if(p==='/me')json={accountId:'buyer.testnet'};if(p==='/services')json=[{id:'9',execution_enabled:false,metadata:{kind:'near-contract-risk-analyst-v1',description:'Local development AI risk monitoring',analysis_mode:'local-llm'}}];
 if(p==='/balances')json={available:'0',earned:'0',pending:'0'};if(p==='/security')json={decisions:[],reports:[],reviewer:false};if(p==='/pilot')json={records:[],summary:{demand_validated:false}};await r.fulfill({json});});
 await page.route('http://unused.invalid/',r=>r.fulfill({json:{result:{result:Array.from(new TextEncoder().encode(JSON.stringify({name:'Smart Contract Risk Analyst',provider:'provider.testnet',price:'100',interval_ns:'60000000000',metadata_hash:'a'.repeat(64)})))}}}));
 await page.goto('http://localhost:3100');await expect(page.getByRole('button',{name:'Provider paused this offer'})).toBeDisabled();await expect(page.getByRole('button',{name:'Approve and fund agreement'})).not.toBeVisible();
});
