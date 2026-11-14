import {test,expect} from '@playwright/test';
for(const approved of [false,true])test(approved?'approved creator edits a hosted offer and preflight rejects before wallet payment':'unapproved wallet cannot request registration payment',async({page})=>{
 let preflights=0;
 await page.route('**/api/near/**',async r=>{
  const path=new URL(r.request().url()).pathname.split('/api/near')[1];let json:any=[],status=200;
  if(path==='/config')json={network:'testnet',contract:'escrow.testnet',rpc:'http://unused.invalid',provider_url:'http://127.0.0.1:4001',recipient:'localhost:3100'};
  if(path==='/me')json={accountId:'creator.testnet'};
  if(path==='/balances')json={available:'0',earned:'0',pending:'0'};
  if(path==='/security')json={decisions:[],reports:[],reviewer:false};
  if(path==='/pilot')json={records:[],summary:{demand_validated:false}};
  if(path==='/creators/me')json={approved,external:true,provider_url:'https://creator.example',message:'Operator approval is required before registration.'};
  if(path==='/services/preflight'){preflights++;const m=r.request().postDataJSON().metadata;expect(m.kind).toBe('creator-report-v1');expect(m.input_example).toEqual({text:'Breaking release'});expect(m.provider_url).toBe('https://creator.example');status=400;json={error:'Endpoint ownership proof rejected; no payment requested'};}
  await r.fulfill({status,json});
 });
 await page.goto('http://localhost:3100');await page.getByRole('button',{name:'List a service',exact:true}).click();
 const button=page.getByRole('button',{name:'Approve service registration',exact:true});
 if(!approved){await expect(button).toBeDisabled();await expect(page.getByText('Operator approval is required before registration.',{exact:true})).toBeVisible();expect(preflights).toBe(0);return;}
 await expect(page.getByLabel('Agent version')).toBeVisible();await page.getByLabel('Declared build SHA-256').fill('a'.repeat(64));await page.getByLabel('Example input · JSON').fill('{"text":"Breaking release"}');
 await button.click();await expect(page.getByText('Endpoint ownership proof rejected; no payment requested',{exact:true})).toBeVisible();expect(preflights).toBe(1);
});
