# Independent creator services — hackathon MVP

Accord now supports an operator-approved creator who runs an agent on their own server, lists its fixed terms, and earns through the existing NEAR testnet escrow. This closes the earlier configured-provider-only listing restriction. It is a curated marketplace, not public arbitrary-code hosting. No new payment contract, dependency, paid model or infrastructure purchase was added.

**Release status:** implemented and tested in this repository. This change has not been deployed to the hosted app. Existing financial contract proofs remain separate from the new controlled-chain creator tests; do not describe the creator tests as live payments.

## Creator setup

1. Use Node 24 and run `npm ci` in `backend`. Keep your own testnet wallet; never give Accord your full-access key.
2. Implement your agent as the `run(input)` callback in `src/near/creator-example.ts`, or call your existing agent from that callback. Return `{summary, findings, recommendations}`. The included release reviewer is a working **rule-based** example, not AI inference. An actual AI provider must supply its own model and comply with its own budget; no model credits are included.
3. Generate a unique shared secret with `node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'`. Share it privately with the Accord operator. It authenticates the provider protocol; it is not a wallet key. Do not reuse another provider's secret.
4. Run the adapter with explicit environment variables. For a local demonstration:

```sh
cd backend
export NEAR_NETWORK=testnet
export NEAR_CONTRACT_ID=contract.accord-dev-261110.testnet
export PROVIDER_ACCOUNT_ID=your-creator.testnet
export CREATOR_PUBLIC_URL=http://127.0.0.1:4003
export PORT=4003
export CREATOR_STATE_DIR=/absolute/private/durable/accord-creator-state
# Set ACCORD_PROVIDER_SECRET privately in your shell; never paste it into source.
npm run near:creator:example
```

The adapter deliberately does not load the platform `.env`. It needs public testnet RPC access, its own secret and private durable storage, not platform database or customer signing credentials. `GET /health` checks readiness. For a remote deployment use an HTTPS origin and your own hosting; `BIND_HOST=0.0.0.0` belongs behind your HTTPS proxy. Keep the durable state volume across restarts.

5. The operator approves your wallet and endpoint in the API/worker's **private** environment and restarts them. Example shape (replace the placeholder with the privately generated secret):

```json
{"your-creator.testnet":{"url":"https://your-agent.example","secret":"REPLACE_WITH_A_UNIQUE_RANDOM_SECRET"}}
```

Set this JSON as `ACCORD_APPROVED_PROVIDERS`; leave it `{}` to reject all external creators. The endpoint must be an origin without paths, queries or embedded credentials. Only development allows HTTP on loopback. Operator approval is intentional: this is not a general SSRF sandbox or automatic trust/reputation system. Use a creator wallet distinct from the configured reference-provider wallet in this MVP.

6. Sign in with that wallet, choose **List a service**, then supply name/description, price/interval, version, build SHA-256, input schema and example input. For the included reviewer use:

```json
{"type":"object","properties":{"text":{"type":"string"}},"required":["text"],"additionalProperties":false}
```

Example input: `{"text":"Breaking release: removed an old endpoint; TODO migration guide."}`. Inputs support 1–8 required string, integer or boolean fields. Strings are limited to 4,000 characters, integers to ±1,000,000, and the whole input to 16 KB. Nested schemas and arbitrary schema keywords are deliberately unsupported. Compute a build digest from your deployed source (for example `shasum -a 256 your-agent-source.ts`). It is a creator declaration, not remote code attestation.

7. **Approve service registration** first runs server preflight and a fresh HMAC-signed endpoint challenge. Only after success does it request the testnet registration transaction (0.02048 test NEAR storage plus gas). Registration is then matched to the signed-in provider and exact onchain metadata hash. An endpoint outage after preflight can still interrupt final listing; recover using the exact registered terms rather than blindly paying again.

## Customer/judge journey

There are no shared passwords or shared private keys. Judges use their own free testnet wallet. A creator endpoint and operator approval must be running on the environment under test; the public production site does not yet contain this release.

1. Open a listed creator service. Inspect its declared provider, endpoint, input schema and fixed terms. Submit an input matching that schema.
2. Use Accord's existing bounded agreement flow: approve the fixed recipient/price/interval/cycle cap/expiry, reserve test funds, and provision the finite-gas **charge-only** function-call key for the one escrow contract.
3. Approve the displayed execution identity and frozen delivery specification. Any warning in the counterparty check requires the owner's approval; a block prevents charging.
4. The worker routes preparation to that provider using its own secret. Before payment, Accord validates input binding, job identity, freshness, output structure and report hash. This confirms protocol integrity, not the truth or usefulness of arbitrary creator claims.
5. The escrow pays the registered provider under the existing terms. The provider independently reads the matching receipt before `/deliver` releases the saved artifact. Paid delivery retries reuse that exact artifact; they do not run the agent or charge again.
6. Inspect the report, payment receipt and unverified-quality disclosure. Pause/cancel future work, remove the scoped key, and withdraw unused funds through the existing wallet flow. Creators withdraw their earnings with their own wallet.

## Provider protocol and limits

All POST requests and responses use the existing path/timestamp/body-hash HMAC protocol with a **different key per creator**, a 30-second authentication window and bounded response parsing. `/handshake` echoes the fresh challenge and wallet ID. `/prepare` receives the agreed input, immutable service metadata, identity hash and specification; `/deliver` receives the job and preparation ID. Customers cannot supply arbitrary endpoint URLs.

The included adapter checks the onchain provider, metadata/input hashes, due cycle and expiry. An exclusive disk claim allows one preparation per job. Duplicate requests return the saved ready artifact. An error leaves `NEEDS_REVIEW`; it does not invent a fallback or automatically rerun the model. Delivery requires the receipt's subscription, cycle, provider, amount and artifact hash to match.

The disk adapter is for one host with durable shared state, not a multi-host execution cluster. Its specification limits adapter preparation to one callback per job; inference calls inside creator-owned code cannot be independently metered and the inference-request cap is explicitly unspecified. Its 45-second callback timeout stops acceptance but cannot forcibly stop arbitrary callback computation; creators must control their own process/resources. Deleting its state destroys the preparation/recovery guarantee. Removing an approval or rotating its secret can also stop retrieval: preserve approved providers and old paid artifacts while draining agreements. Private input goes to the selected creator; there is no TEE/privacy guarantee, factual oracle or proof that deployed code matches the declared digest. No uploaded code, automatic public onboarding, automatic refunds or reputation claims are included.

## Reproduce the checks

From `backend`, with a disposable PostgreSQL `DATABASE_URL` configured:

```sh
npm run typecheck
npm run near:test
npm run near:test:creators
npm run near:test:execution
```

`near:test` includes two real local HTTP provider adapters with separate secrets: successful preparation, exact receipt delivery, duplicate execution prevention, recovery, cross-provider authentication rejection, input/schema/report tampering and stale report rejection. `near:test:creators` imports the actual API, creates a disposable PostgreSQL schema and verifies session/approval/preflight, endpoint ownership, exact listing ownership/hash, schema validation, secret redaction and endpoint outage. Chain views and sessions are controlled fixtures; **these tests perform no blockchain signing or AI inference**.

From `frontend`:

```sh
npm run typecheck
npm run build
npm run test:browser -- tests/creators.spec.ts
```

Browser fixtures check the approved creator form, custom input fields, preflight failure before a wallet request, and rejection for an unapproved wallet. Existing payment/WASM/testnet evidence is documented separately in `docs/reliability/FINAL.md`. A live external-creator wallet-to-payment walkthrough remains a separate rollout check; this patch makes no claim to have recorded it.

Verified on 14 November 2026: 80 backend unit tests, actual API/PG creator checks, existing execution integration, process credential allowlist, frontend typecheck/production build, 15 browser checks, five deployment guards and recognizable credential scanning passed locally. The final creator form was also rerun against the final production build. [Backend checkpoint CI passed](https://github.com/neelpote/accord-near/actions/runs/43560203549); [UI checkpoint CI passed](https://github.com/neelpote/accord-near/actions/runs/43560377715); the final documentation/specification checkpoint is available in [GitHub Actions](https://github.com/neelpote/accord-near/actions). Git deployment remains disabled and disconnected; these pushes do not authorize rollout.
