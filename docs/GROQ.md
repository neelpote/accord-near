# Groq public-evidence explanations

Groq is an optional analysis mode for the five NEAR chain agents. It receives an already validated public-chain report, and returns a separate summary and manual next steps. Rules retain authority over status, findings and monetary values. The entire report, including explanation and provider/model attribution, is frozen before its digest is charged on NEAR.

Existing deterministic service offers are immutable and unchanged. Choose a chain-agent kind and “Live chain evidence + Groq explanation” when publishing a **new** offer. The provider must be configured before publication; the browser checks this before signing an offer transaction. Old reports are never regenerated or relabeled AI.

Local ignored backend/.env configuration:

```dotenv
GROQ_ENABLED=true
GROQ_API_KEY=<your own key>
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_REQUESTS=5
```

The lifetime request count persists in accord_groq_budget, independently of NEAR AI's cap. Each request is reserved atomically before inference; failed/opaque requests consume the reservation. Five requests is a request ceiling, not a dollar guarantee. Provider-side billing settings determine cost. No purchase, top-up, retry loop or provider fallback is performed. Missing key, exhausted cap, timeout, rate limit, HTTP error, truncated response or invalid schema prevents preparation and therefore prevents a new subscription charge. Such preparations enter NEEDS_REVIEW rather than automatically requesting again.

Public evidence is sent to Groq. This is not private inference and has no NEAR AI TEE signature. AI text can be inaccurate even if schema-valid. No tools, wallet keys or transaction authority are sent to the model. The frontend displays the disclosure and model alongside the separate explanation. API credentials remain server-side.

Checks:

```sh
cd backend
npm run typecheck
npm run near:test
npx tsx src/near/groq-proof.ts
# With the local API/provider and dedicated testnet fixtures running:
ACCORD_GROQ_DEMO=1 npm run near:demo:agents
```

The live inference check consumes one capped request; the paid demo consumes two more. Live inference evidence is docs/groq-live-proof.json; the separate paid-flow evidence is docs/groq-paid-proof.json. Neither constitutes an independent audit or an inference attestation. JSON mode is locally schema-validated; it does not itself guarantee factual accuracy. See https://console.groq.com/docs/structured-outputs.
