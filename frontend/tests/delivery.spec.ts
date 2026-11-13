import {test,expect} from '@playwright/test';
test('report panel distinguishes structure, evidence, settlement and disputes without a factual verification badge',async({page})=>{
 let status='STRUCTURE_VALID';
 await page.route('**/api/near/**',async r=>{const p=new URL(r.request().url()).pathname.split('/api/near')[1];let json:any=[];
 if(p==='/config')json={network:'testnet',contract:'escrow.testnet',rpc:'http://unused.invalid',recipient:'localhost:3100'};
 if(p==='/me')json={accountId:'buyer.testnet'};
 if(p==='/balances')json={available:'0',earned:'0',pending:'0'};
 if(p==='/security')json={decisions:[],reports:[],reviewer:false};
 if(p==='/pilot')json={records:[],summary:{demand_validated:false}};
 const verification={status,schema_valid:true,evidence_valid:false,factual_correctness:'UNVERIFIED',warnings:['Source evidence has not passed independent validation.']};
 if(p==='/subscriptions')json=[{id:'42',service_name:'Wallet Watch',state:'ACTIVE',agreement:{service_id:'2',active:true,max_cycles:2,cycles:1,reserved:'100',next_due_ns:'0',expires_at_ns:String(BigInt(Date.now()+1000000)*1000000n)},cycles:[{cycle:0,state:'DELIVERED',artifact_hash:'a'.repeat(64),receipt:{provider:'provider.testnet',amount:'100'},verification}]}];
 if(p==='/services/2/execution')json={identity:{hash:'identity',agent_id:'watch',version:'1',provider_id:'provider.testnet'},enabled:true};
 if(p==='/execution/jobs')json={jobs:[],events:[]};
 if(p==='/subscriptions/42/cycles/0/feedback'){expect(r.request().postDataJSON().action).toBe('dispute');status='DISPUTED';json={recorded:true,financial_change:false};}
 if(p==='/subscriptions/42/cycles/0/verification')json={verification,history:[],disputes:status==='DISPUTED'?[{reason:'Please review the conclusion'}]:[]};
 await r.fulfill({json});});
 await page.goto('http://localhost:3100');const panel=page.getByRole('region',{name:'Delivery verification for 42:0'});
 await expect(panel.getByText('STRUCTURE_VALID',{exact:true})).toBeVisible();await expect(panel.getByText('Not independently validated',{exact:true})).toBeVisible();await expect(panel.getByText(/do not prove factual correctness/)).toBeVisible();await expect(panel.getByText(/Finalized contract receipt/)).toBeVisible();
 await panel.getByRole('textbox',{name:'Report a delivery or quality issue'}).fill('Please review the conclusion');await panel.getByRole('button',{name:'Record dispute'}).click();await expect(panel.getByText('DISPUTED',{exact:true})).toBeVisible();await expect(panel.getByText(/does not automatically refund/)).toBeVisible();
});
