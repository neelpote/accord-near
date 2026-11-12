/** Opt-in real testnet EIP-1193 fixture; not certification of the MetaMask extension UI. */
import{chromium}from'../frontend/node_modules/playwright-core/index.mjs';
import{readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{setup,wallet,address,submitted}from'./evm-wallet-fixture.mts';
if(process.env.ACCORD_EVM_LIVE!=='1')throw Error('Explicit ACCORD_EVM_LIVE=1 required');
const origin=process.env.ACCORD_BASE_URL||'http://localhost:3100',full=process.env.ACCORD_EVM_FULL==='1';
await setup();
const config=await(await fetch(origin+'/api/near/config')).json();assert.equal(config.network,'testnet');assert(config.evm_auth?.contract?.endsWith('.testnet'));
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),transactions:any[]=[];let subscriptionId:string|null=null,workspaceId:string|null=null;const network:any[]=[];page.on("response",r=>{if(r.url().includes("/api/near/"))network.push({path:new URL(r.url()).pathname,status:r.status()})});page.on("requestfailed",r=>network.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
try{
 await page.exposeFunction('__accordEvmSend',async(params:any)=>{
  if(params.network!=='testnet'||params.signerId!==address||![address,config.contract,config.evm_auth.contract].includes(params.receiverId)||params.actions.length!==1)throw Error('EVM fixture signer/recipient boundary');
  const a=params.actions[0];
  if(a.type==='FunctionCall'){
   if(!['authenticate','subscribe','cancel','withdraw'].includes(a.params.methodName)||BigInt(a.params.deposit)>50000000000000000000000n)throw Error('EVM fixture method/budget boundary');
  }else if(a.type==='AddKey'){
   const p=a.params.accessKey.permission;if(p.receiverId!==config.contract||JSON.stringify(p.methodNames)!=='["charge"]'||BigInt(p.allowance)>50000000000000000000000n)throw Error('Unsafe limited key');
  }else if(a.type!=='DeleteKey')throw Error('Unsupported fixture action');
  const result=(await wallet.sendTransactions([params],address))[0] as any;
  transactions.push({method:a.params.methodName||a.type,hash:result.transaction.hash});
  return result;
 });
 await page.route('**/manifest.json',async r=>{
  if(new URL(r.request().url()).hostname==='evm-on-near.dev')await r.fulfill({contentType:'application/json',body:await readFile('.tools/evm-on-near-manifest.json','utf8')});
  else await r.fulfill({json:{wallets:[],version:'fixture'}});
 });
 await page.addInitScript({content: `(()=>{
  const accountId=${JSON.stringify(address)},w=window;
  window.addEventListener('near-selector-ready',()=>window.dispatchEvent(new CustomEvent('near-wallet-injected',{detail:{manifest:{id:'ethereum-wallets',name:'Accord EVM testnet fixture',description:'EIP-1193 fixture using the upstream NEP-518 transaction engine',platform:[],website:'https://evm-on-near.dev/',version:'fixture',executor:'',type:'injected',permissions:{},icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',features:{testnet:true,mainnet:false,signMessage:false,signAndSendTransaction:true,signInWithoutAddKey:true}},getAccounts:async()=>[{accountId}],signIn:async()=>[{accountId}],signOut:async()=>{},signMessage:async()=>{throw Error('NEP-413 must not be used for EVM wallet')},signAndSendTransaction:p=>w.__accordEvmSend(p)}})));
 })()`});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 const signIn=page.getByRole('button',{name:'Sign in with NEAR'});await signIn.waitFor();await signIn.click();
 await page.getByText('Accord EVM testnet fixture',{exact:true}).click({timeout:30000});
 await page.getByRole('button',{name:address,exact:true}).waitFor({timeout:120000});
 const cookies=await context.cookies();assert(cookies.some(c=>c.name==='accord_session'&&c.httpOnly));
 await page.reload();await page.getByRole('button',{name:address,exact:true}).waitFor();
 if(full){
  const existing=await page.evaluate(async()=>await(await fetch('/api/near/workspaces')).json());
  if(!existing.some((w:any)=>w.name==='Ethereum wallet acceptance fixture')){
   await page.getByLabel('Application name',{exact:true}).fill('Ethereum wallet acceptance fixture');
   await page.getByLabel('Testnet account IDs',{exact:true}).fill(address);
   await page.getByRole('button',{name:'Create read-only workspace',exact:true}).click();
  }
  const capture=page.getByRole('button',{name:'Capture baseline for review',exact:true});await capture.waitFor({timeout:90000});await capture.click();
  await page.getByRole('heading',{name:'Review proposed baseline',exact:true}).waitFor({timeout:60000});
  const workspaces=await page.evaluate(async()=>await(await fetch('/api/near/workspaces')).json());
  const workspace=workspaces.find((w:any)=>w.name==='Ethereum wallet acceptance fixture');assert(workspace);workspaceId=workspace.id;
  assert.equal(workspace.pending_baseline.accounts[0].code_source,'global-hash');
  assert.notEqual(workspace.pending_baseline.accounts[0].code_hash,'11111111111111111111111111111111');
  await page.getByRole('button',{name:'I reviewed this snapshot · approve baseline',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Baseline approved.'}).waitFor();
  const service=page.locator('article.service').filter({has:page.getByRole('heading',{name:'Wallet Watch',exact:true})});
  await service.getByRole('button',{name:'Choose terms →'}).click();
  const input=page.locator('#service-terms textarea');await input.fill(JSON.stringify({account_id:address,minimum_available_yocto:'50000000000000000000000'}));
  await page.getByRole('button',{name:'Approve and fund agreement'}).click();
  const enable=page.getByRole('button',{name:'Enable automatic purchases'});await enable.waitFor({timeout:120000});
  const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('accord_pending')!));subscriptionId=pending.subscription_id;
  await enable.click();
  const agreement=page.locator('article.panel').filter({has:page.getByRole('heading',{name:`Agreement #${pending.subscription_id}`,exact:true})});
  const approval=page.locator('#security article').filter({hasText:`Agreement ${pending.subscription_id} · cycle 0`}).first().getByRole('button',{name:'Approve this exact payment once',exact:true});
  await Promise.race([approval.waitFor({state:'visible',timeout:180000}),agreement.getByText('Paid · delivered',{exact:true}).waitFor({timeout:180000})]);
  if(await approval.isVisible())await approval.click();
  await agreement.getByText('Paid · delivered',{exact:true}).waitFor({timeout:180000});
  await agreement.scrollIntoViewIfNeeded();
  await page.waitForFunction(el=>getComputedStyle(el).opacity==='1',await agreement.elementHandle(),{timeout:10000});
  await agreement.screenshot({path:'docs/demo/evm-paid-report.png',animations:'disabled'});
  await agreement.getByRole('button',{name:'Cancel future purchases'}).click();await agreement.getByText('Canceled',{exact:true}).waitFor({timeout:120000});
  await agreement.getByRole('button',{name:'Remove limited key'}).click();await page.getByRole('status').filter({hasText:'Limited key removed'}).waitFor({timeout:120000});
  await page.getByRole('button',{name:'Withdraw remainder',exact:true}).click();await page.getByRole('status').filter({hasText:'Withdrawal submitted'}).waitFor({timeout:120000});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.includes('Withdraw remainder')&&b.disabled),undefined,{timeout:120000});
  console.log('Completed Ethereum-wallet agreement',pending.subscription_id);
 }
 assert.deepEqual(errors,[]);
 await writeFile(full?'docs/evm-wallet-proof.json':'docs/evm-login-proof.json',JSON.stringify({network:'testnet',origin,account:address,scope:'EIP-1193 test signer + upstream EthereumNearWallet engine + real relayer and NEAR; standard NearConnector injected fixture. MetaMask extension/popup UI not certified.',full_payment_journey:full,subscription_id:subscriptionId,workspace_id:workspaceId,transactions,ethereum_hashes:submitted,completed_at:new Date().toISOString()},null,2)+'\n');
 console.log('EVM browser acceptance passed:',full?'full payment flow':'transaction login');
}catch(error){await page.screenshot({path:".tools/evm-proof-failure.png"});await writeFile(".tools/evm-proof-failure.txt",await page.locator("body").innerText());await writeFile(".tools/evm-proof-network.json",JSON.stringify(network,null,2));throw error}finally{await browser.close()}
