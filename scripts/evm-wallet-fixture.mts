import {createWalletClient,http,defineChain} from '../backend/node_modules/viem/_esm/index.js';
import {generatePrivateKey,privateKeyToAccount} from '../backend/node_modules/viem/_esm/accounts/index.js';
import {execFileSync} from 'node:child_process';
import {Account,JsonRpcProvider,actions} from '../backend/node_modules/near-api-js/lib/index.js';
import {AccountDoesNotExistError} from '../backend/node_modules/near-api-js/lib/rpc-errors/index.js';
import {readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';import{homedir}from'node:os';
if(process.env.ACCORD_EVM_LIVE!=='1')throw Error('Explicit ACCORD_EVM_LIVE=1 required before loading a test signer');
const root=resolve(import.meta.dirname,'..'),path=resolve(root,'.near-credentials/evm-buyer.json');
const source=resolve(root,'.tools/eth-wallet-source');
if(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='d47756b52f2a8bdd4ac24d0fcf2fe4e496a22cd1')throw Error('Checkout the reviewed upstream wallet commit before testing');
execFileSync('git',['-C',source,'diff','--exit-code'],{stdio:'ignore'});
const {EthereumNearWallet}=await import('../.tools/eth-wallet-source/src/wallet.ts');
let saved:any;try{saved=JSON.parse(await readFile(path,'utf8'))}catch(e:any){if(e.code!=='ENOENT')throw e;const private_key=generatePrivateKey();saved={account_id:privateKeyToAccount(private_key).address.toLowerCase(),private_key};await writeFile(path,JSON.stringify(saved),{mode:0o600,flag:'wx'})}
export const account=privateKeyToAccount(saved.private_key),address=account.address.toLowerCase();if(saved.account_id!==address)throw Error('Fixture mismatch');
const chain=defineChain({id:398,name:'NEAR Testnet',nativeCurrency:{name:'NEAR',symbol:'NEAR',decimals:18},rpcUrls:{default:{http:['https://eth-rpc.testnet.near.org']}}});
const client=createWalletClient({account,chain,transport:http('https://eth-rpc.testnet.near.org')});
export const submitted:string[]=[];
const provider={async request({method,params=[]}:any):Promise<any>{
 if(method==='eth_accounts'||method==='eth_requestAccounts')return[address];if(method==='eth_chainId')return'0x18e';
 if(method==='wallet_switchEthereumChain'||method==='wallet_addEthereumChain'){if(BigInt(params[0].chainId)!==398n)throw Error('Testnet only');return null}
 if(method==='eth_sendTransaction'){const tx=params[0];if(tx.from.toLowerCase()!==address||BigInt(tx.chainId)!==398n)throw Error('Testnet fixture boundary');const hash=await client.sendTransaction({to:tx.to,data:tx.data,value:BigInt(tx.value||'0x0'),type:'legacy',...(tx.gasPrice?{gasPrice:BigInt(tx.gasPrice)}:{})});submitted.push(hash);return hash}
 throw Error('Unsupported fixture request '+method);
}};
export const wallet=new EthereumNearWallet(provider,'testnet',message=>console.log(message));
export async function setup(){
 const rpc=new JsonRpcProvider({url:'https://test.rpc.fastnear.com'},{retries:3,wait:500,backoff:1.5});if(await rpc.getNetworkId()!=='testnet')throw Error('Testnet only');
 let exists=true;try{await rpc.viewAccount({accountId:address})}catch(e){if(e instanceof AccountDoesNotExistError)exists=false;else throw e}
 if(!exists){const parent='accord-dev-261110.testnet',key=JSON.parse(await readFile(resolve(homedir(),'.near-credentials/testnet',parent+'.json'),'utf8'));const payer=new Account(parent,rpc,key.private_key);await payer.signAndSendTransaction({receiverId:address,actions:[actions.transfer(200000000000000000000000n)]});console.log('Funded dedicated Ethereum implicit testnet fixture',address)}
 await wallet.signIn();console.log('Ethereum testnet fixture onboarded',address);
}
