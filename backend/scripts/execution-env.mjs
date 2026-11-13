// A process allowlist reduces accidental secret inheritance; it is not an OS sandbox.
export function executionEnv(source,role){
 const names=['PATH','TMPDIR','NODE_ENV','NODE_EXTRA_CA_CERTS','DATABASE_URL','NEAR_NETWORK','NEAR_RPC_URL','NEAR_CONTRACT_ID','PROVIDER_URL','PROVIDER_ACCOUNT_ID','ACCORD_PROVIDER_SECRET','GROQ_MODEL'];
 if(role==='provider')names.push('GROQ_ENABLED','GROQ_API_KEY','GROQ_MODEL','GROQ_MAX_REQUESTS','NEAR_AI_ENABLED','NEARAI_API_KEY','NEAR_AI_MAX_REQUESTS');
 else names.push('DELEGATE_ENCRYPTION_KEY','PUBLIC_ORIGIN','EVM_AUTH_CONTRACT_ID','EVM_AUTH_CODE_HASH','SECURITY_REVIEWERS','OPS_PILOT_OWNERS','OPS_WEBHOOK_URL','OPS_WEBHOOK_SECRET');
 return {...Object.fromEntries(names.filter(k=>source[k]!==undefined).map(k=>[k,source[k]])),ACCORD_ENV_ISOLATED:'true'};
}
