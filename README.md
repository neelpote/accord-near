# Accord

**Give agents a budget, not a blank cheque.**

Accord checks who an agent is about to pay, requires human review for warnings, and blocks denied payments before signing. Bounded purchase agreements on **NEAR testnet** enforce the provider, price, interval, cycle limit and expiry.

[Live demo](https://accord-near-ten.vercel.app) · [Security video](docs/demo/accord-security-demo.mp4) · [Verify the security proof](#verify-the-security-proof) · [Working proof](#security-acceptance--13-november-2026) · [Judge testing](#judge-access-and-testing) · [Local setup](#local-setup) · [Architecture](docs/ARCHITECTURE.md)

![Accord application with its animated agent interface](docs/demo/editorial-desktop.png)

## What is Accord?

A payment-control and monitoring workspace for teams running agents on NEAR. A customer approves fixed service terms and a finite budget; the agent receives a restricted signing key. Each purchase checks the counterparty, pays for one identified report, and records a receipt. The customer can stop future purchases and withdraw the unused budget.

### The problem we solve

Agent operators face a bad choice: manually approve every payment, or trust instructions and external tool output with spending authority. An injected instruction, changed receiver or unexpected contract identity can turn a useful agent into an expensive mistake.

Accord separates an agent's proposed action from its payment authority. The **backend policy gate** checks the receiver; the **NEAR contract** enforces the commercial limits. The intended users are NEAR application teams, agent operators and maintenance agencies. Customer demand is still unvalidated; the project is a working testnet prototype.

## Functionality

**Availability:** **Live** means the restored hosted release; **Repository** means implemented in the current source and pending coordinated deployment; **Paused** means the integration exists but should not be used for a new purchase.

| Area | What users can do | Availability |
| --- | --- | --- |
| Wallets and sessions | Connect a NEAR wallet, authenticate with a one-use NEP-413 signature, retain an HTTP-only session and sign out. Ethereum wallets use the official EVM-on-NEAR adapter and a transaction-verified testnet login. | Live |
| Public service directory | Browse providers, fixed report prices and minimum intervals; open recorded paid examples without a wallet; inspect each service's input. | Live |
| Finite purchases | Validate input, choose a report limit, review budget/storage/expiry, fund an agreement and install a finite-gas `charge`-only key. | Live |
| Counterparty checks | Inspect account age/activity signals, finalized contract identity, observed code changes, prior Accord payments and shared evidence. Receive **allow**, **warn** or **block** with reasons. Unknown/unavailable history is disclosed. | Live |
| Human payment review | Approve or decline one exact warned payment. Approval binds its intent and evidence; a blocked payment has no override. | Live |
| Renewal review | Compare code, reports, policy and terms with a prior authorization; inspect remaining reports and reserve-capped scheduled spending at one finalized block. Previewing cannot approve or sign. | Repository; [guide](docs/RENEWAL_REVIEW.md) |
| Shared evidence reports | Submit account/transaction evidence; inspect review history. Only configured reviewers can curate a report into a blocklist decision. | Live |
| Reports and settlement | Read purchased reports, source blocks, artifact hashes and finalized provider credits. Interrupted paid delivery retries retrieve the same artifact instead of buying it again. | Live |
| Cancellation and recovery | Cancel future billing, remove the limited key, recover an interrupted agreement by onchain ID, inspect balances/pending withdrawals, withdraw unused funds or provider earnings. | Live |
| Application workspaces | Group public testnet accounts; capture, inspect and explicitly approve code/access-key baselines; propose a replacement baseline. The read-only pilot is unbilled. | Live |
| Change monitoring | Start/pause monitoring, check now, inspect grouped incidents and before/after evidence, acknowledge review, and inspect notification attempts. Signed external webhooks require operator configuration. | Live; webhooks optional |
| Evidence and pilot feedback | Browse/paginate the evidence timeline, download a SHA-256-checked JSON export, link matching paid reports after receipt verification, submit/delete personal pilot feedback, and delete paused workspace records by exact-name confirmation. | Live |
| Execution controls | Inspect the advertised agent version/build/endpoint, approve its exact identity and delivery specification, pause/reapprove new work, and inspect outstanding jobs/events. Providers can disable their offers. | Repository |
| Delivery criteria and disputes | Distinguish structure/evidence validation from settlement and delivery; inspect verification history; acknowledge receipt or record a dispute; providers can respond. These are manual-review records, not automatic refunds. | Repository |
| Independent creator listings | Approved creator wallets publish their own hosted report service with a bounded input schema, version/build declaration, signed endpoint preflight and per-provider credentials; unlist owned services and reuse the existing purchase/delivery path. No arbitrary code uploads. | Repository |
| Interface and access | Animated agent roles and Observe → Inspect → Limit scroll chapters; pause/reduced-motion controls, mobile layouts, keyboard navigation and a static fallback when WebGL is unavailable. | Live |
| Security evidence lab | Compare the clean and injected billing document without a wallet, inspect captured model outputs and separate payment controls, and download the original evidence. Independent read-only verifier checks finalized testnet receipts. | Repository (`/proof`); CLI usable now |
| Optional AI | Groq explanations of public chain evidence, NEAR AI Cloud adapter/preflight, and an experimental local contract-risk analyst. No current semantic-accuracy or TEE-inference claim. | Paused; see [AI limits](docs/reliability/AI.md) |

### Included services

| Service | Actual work |
| --- | --- |
| **Wallet Watch** | Reads account balance, protocol storage cost and available gas headroom. Recommended judge flow: service **2**, **0.001 test NEAR/report**. |
| **Access Guard** | Reviews public access-key permissions, allowances and broad contract access. |
| **Contract Sentinel** | Compares deployed code identity with an approved hash. |
| **Receipt Inspector** | Inspects a finalized transaction, receipt failures and gas burn. |
| **Network Pulse** | Checks configured RPC network identity, finalized-block freshness, gas price and reported synchronization/validators. |
| Portfolio concentration | Analyzes a supplied portfolio snapshot; it does not fetch live market prices. |

The five chain-monitoring services use deterministic rules and need no AI credits. [Service inputs and purchased examples](docs/AGENT_SERVICES.md) · [Creator hosting guide](docs/CREATOR_SERVICES.md) · [Operations guide](docs/OPERATIONS.md).

## Security acceptance — 13 November 2026

| Acceptance check | Recorded result | Working proof |
| --- | --- | --- |
| Causal prompt-injection comparison | Same system/task, clean versus poisoned tool document; two genuine Groq calls changed the proposed receiver. | [Prompts and completions](docs/causal-agent-responses.json) |
| Otherwise-valid funded control | Agreement **31** paid **0.001 test NEAR** through its scoped key. | [Receipt and attack log](docs/causal-attack-proof.json) |
| Attack refusal | Agreement **32**: the poisoned proposal and a separate valid-terms reputation case each produced **zero signer calls** and no attack payment. | [Preflight, refusal reasons and cleanup](docs/causal-attack-proof.json) |
| Native wallet journey | Agreement **23**: authentication → funding → warning approval → report → cancellation → key removal → withdrawal. | [Native proof](docs/security-native-wallet-proof.json) |
| Ethereum wallet journey | Agreement **28**: the same path through the official adapter and real testnet relayer. | [Ethereum proof](docs/security-evm-wallet-proof.json) |
| Independent finalized readback | One paid cycle each; matching report/receipt hashes; inactive agreements; absent delegates; successful exit receipts. | [Readback verification](docs/security-journeys-readback.json) |

These are dated testnet results, not a claim that every later feature is deployed. Wallet runs use dedicated automated developer signers with real signatures/transactions; they do not certify every extension, popup or mobile wallet. The intentionally vulnerable reference planner and denylisted accounts are controlled demo fixtures, not real-world scam allegations. The six approved Groq requests are exhausted; captured-response replay makes no new inference call.

<details>
<summary><strong>See the security review, paid report and monitoring screenshots</strong></summary>

Actual browser captures from 11–14 November. Values and states reflect capture time; the purchased agreement was subsequently canceled and its key removed.

**Review one exact payment and its reasons.**

![Payment warning with one-payment approval controls](docs/demo/counterparty-warning.png)

**Inspect the paid report and owner exit controls.**

![Wallet Watch paid report and canceled finite agreement](docs/demo/readme-paid-report.png)

**Browse service capabilities and review the quoted terms.**

![Directory of NEAR monitoring services](docs/demo/readme-services.png)

![Finite purchase terms showing price, report limit and budget](docs/demo/readme-service-terms.png)

**Review application changes and evidence.**

![Application operations workspace overview](docs/demo/readme-workspace.png)

[Full monitoring/evidence capture](docs/demo/editorial-workspace.png).

</details>

[Security walkthrough and reproduction](docs/SECURITY_WALKTHROUGH.md) · [Counterparty data sources and threat boundaries](docs/COUNTERPARTY_SECURITY.md) · [Verification record](VERIFICATION.md).

## NEAR Protocol integration

```mermaid
flowchart LR
    Owner[Owner wallet] -->|Approve fixed terms and budget| Escrow[NEAR testnet escrow]
    Agent[Agent / worker] --> Gate{Counterparty check}
    Gate -->|Warn| Review[One-payment owner review]
    Gate -->|Block| Stop[No signature]
    Gate -->|Allow / approved warning| Key[Scoped charge-only key]
    Review --> Gate
    Key -->|Request one cycle| Escrow
    Escrow --> Receipt[Provider credit + artifact receipt]
    Receipt --> Provider[Independent provider releases exact report]
    Owner -->|Cancel / withdraw| Escrow
```

| NEAR primitive | Why it matters here |
| --- | --- |
| **Function-call access keys** | The automated signer can call only `charge` on one contract with a finite gas allowance. It cannot transfer native NEAR, add keys, cancel agreements or withdraw owner funds. The key's gas allowance is separate from the service budget. |
| **Rust escrow contract** | Fixes the provider/price and checks the delegate, due cycle, interval, expiry and reserved budget. Repeated settlement of the same cycle/artifact is idempotent. |
| **Finalized RPC and receipts** | Security checks read finalized state; delivery binds a report's SHA-256 to the actual payment receipt. A charge credits provider earnings; withdrawal is a separate owner-signed transfer. |
| **Wallet authentication** | NEP-413 proves native wallet ownership. Ethereum-wallet login verifies the challenge emitted by the dedicated testnet authentication contract. |
| **Owner exit** | Cancellation releases the unspent reserve. Withdrawals go to the authenticated owner; a failed transfer restores its source ledger through a private callback. |

**Escrow:** [`contract.accord-dev-261110.testnet`](https://testnet.nearblocks.io/address/contract.accord-dev-261110.testnet) · **Authentication:** `login.accord-dev-261110.testnet` · **Network:** testnet only.

The active payment path uses native NEAR escrow, not Agent API, Intents, a stablecoin bridge or TEE inference. The exact recurring terms and artifact-bound settlement are the contract's job; the reputation gate remains backend-enforced. [Contract source](contracts-near/src/lib.rs) · [Ethereum integration](docs/ETHEREUM_WALLETS.md) · [Design decisions](DECISIONS.md).

## Verify the security proof

Judges can check the experiment **without a wallet, database, npm install or AI credits**. From a checkout with Node 24:

```sh
node scripts/verify-security-proof.mjs             # Recorded evidence consistency
node scripts/verify-security-proof.mjs --chain     # Also read finalized testnet state
node --test scripts/security-proof.test.mjs        # Includes tampering and RPC-failure cases
```

The chain check compares **every control receipt field**, confirms no cycle-zero receipt exists for the attack agreement, and checks both canceled agreements have the expected paid-cycle counts. It exits nonzero on mismatches or RPC failure. For another HTTPS testnet RPC, set `ACCORD_PROOF_RPC`.

The wallet-free **`/proof` evidence lab** in the current frontend source lets judges switch between the clean and poisoned tool document, inspect the changed receiver and compare the separate reputation-only control. Run `npm ci --prefix frontend` then `npm run dev --prefix frontend` and open **http://localhost:3000/proof**. It needs no running backend. **This new route is pending deployment; the existing hosted release is unchanged.**

![Wallet-free security evidence lab showing recorded inputs and payment boundaries](docs/demo/security-proof-lab.png)

**Proof boundary:** the logs are operator-produced records, not independent attestations. Hashes establish consistency, not model-provider authenticity. Current chain reads verify receipt/state facts; they cannot prove that signing was never attempted, reconstruct historical key permissions, or establish general detection accuracy. The controlled demo planner is intentionally vulnerable; it is not the production worker.

## Judge access and testing

Open **[accord-near-ten.vercel.app](https://accord-near-ten.vercel.app)** with your **own dedicated NEAR testnet wallet**. There is no shared account, password, private key or required AI credential. Obtain test NEAR using the [NEAR testnet wallet/faucet guidance](https://docs.near.org/). About **0.2 test NEAR** gives room for a small purchase, retained storage and gas; the application quotes exact costs before approval.

1. **Preview without signing in:** open Services and expand **View paid example** on a deterministic agent. This is recorded evidence, not a new check or purchase.
2. **Authenticate:** choose **Sign in with NEAR**, select your wallet, and sign the authentication message. Confirm your account appears in the header. Ethereum users must fund the displayed NEAR `0x` account with test NEAR; Sepolia ETH does not fund it.
3. **Choose Wallet Watch:** select **Choose terms →** on service 2. Inspect a public testnet account using the input below.
4. **Limit the test:** set **Maximum reports = 1**, inspect price/storage/expiry, then **Approve and fund agreement**. Storage is retained separately from the report price.
5. **Enable the scoped key:** approve **Enable automatic purchases**. The **0.05 test NEAR gas allowance** is a ceiling on delegated gas, not another deposit or the report budget. When testing current local source, also approve the displayed execution identity and frozen delivery specification.
6. **Review security:** inspect **Payment security**. Approve a warned payment only if you accept its receiver, amount and reasons. A changed intent/evidence pair needs new review; **BLOCK** has no override.
7. **Verify and exit:** wait for **Paid · delivered**, inspect the source block/artifact/receipt, cancel future purchases and remove the limited key. Withdraw any available remainder. With a one-report limit already consumed, no report budget may remain; use three reports and cancel after the first only if you also want to test a nonzero remainder.

```json
{
  "account_id": "provider.accord-dev-261110.testnet",
  "minimum_available_yocto": "50000000000000000000000"
}
```

Allow a few minutes for wallet/RPC/provider finalization. Complete authentication if controls are disabled; inspect warnings if a purchase pauses; check the explorer before resubmitting a transaction. Use deterministic service 2 if optional AI is unavailable. Never install a broader key to bypass a block. [Troubleshooting and hosting status](docs/HOSTING_AND_SUBMISSION.md).

## Local setup

**Requirements:** Node **24.22.2** ([`.nvmrc`](.nvmrc)), npm and Docker. Rust/cargo-near are needed only to build or deploy your own contracts.

```sh
git clone https://github.com/neelpote/accord-near.git
cd accord-near
docker compose up -d postgres
npm ci --prefix backend
npm ci --prefix frontend
cp backend/.env.example backend/.env
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
```

Set that generated value as `DELEGATE_ENCRYPTION_KEY` in `backend/.env`. Generate a **second, different** value for `ACCORD_PROVIDER_SECRET`, shared only by your local API/worker and provider. Preserve both across restarts. Keep `NEAR_NETWORK=testnet`, `PUBLIC_ORIGIN=http://localhost:3000`, and the optional AI providers disabled.

Run these in three terminals:

```sh
# Terminal 1: independent reference provider
cd backend && npm run near:provider
```

```sh
# Terminal 2: API, additive migrations and purchase worker
cd backend && npm start
```

```sh
# Terminal 3: web application
cd frontend && npm run build && npm start
```

Open **[localhost:3000](http://localhost:3000)**. API: `127.0.0.1:4000`; provider: `127.0.0.1:4001`; PostgreSQL: `127.0.0.1:55432`.

**A fresh database has an empty catalog.** The example contract/provider IDs are public development fixtures, not accounts you can sign for. To reproduce paid flows independently, create/deploy your own dedicated testnet fixtures and publish a service using the [local operator and fixture guide](docs/LOCAL_SETUP.md). To add your own hosted agent, use [creator onboarding](docs/CREATOR_SERVICES.md). Chain state alone does not recreate offchain metadata or prepared reports.

### Run the checks

```sh
# Backend types, unit and isolated integration checks (PostgreSQL running)
npm run typecheck --prefix backend
npm run near:test --prefix backend
npm run near:test:security --prefix backend
npm run near:test:execution --prefix backend
npm run near:test:creators --prefix backend

# Frontend types, production build and browser fixtures
npm run typecheck --prefix frontend
npm run build --prefix frontend
cd frontend && npx playwright install chromium && npm run test:browser
```

[Application CI](https://github.com/neelpote/accord-near/actions/workflows/application.yml) runs these alongside operations/authentication checks and credential scanning. [Contract CI](https://github.com/neelpote/accord-near/actions/workflows/contract.yml) covers Rust/WASM/sandbox checks. Browser fixtures and controlled-chain integration checks are distinct from the dated live acceptance evidence above; no new AI credits are needed for this test suite.

## Status and security boundaries

- **Hosted versus source:** the public app runs the restored release. Execution identities, expanded delivery/dispute controls and independent creator onboarding in the current repository are pending coordinated rollout. See [release status](docs/reliability/PUBLISHING.md) and [creator test coverage](docs/CREATOR_SERVICES.md).
- **Authority:** commercial limits are onchain; reputation decisions are enforced by the backend. The development deployment account retains upgrade authority. This is not an audited, immutable or production-safe system.
- **Delivery and privacy:** receipt/hash checks do not establish factual correctness or provider quality. No automatic quality refunds/arbitration are implemented. Application/provider input is not end-to-end private.
- **AI:** the approved Groq cap of six requests is exhausted; NEAR AI Cloud inference is paused after a credit/spending-limit error. The experimental local risk analyst is disabled and has not passed human quality review.
- **Costs and exit:** retained storage fees are not refundable; cancellation cannot reverse an already-finalized charge. Wait for withdrawal callbacks and read pending/available balances before retrying. Direct wallet exit instructions are in the [architecture guide](docs/ARCHITECTURE.md).

## Repository and hackathon scope

| Location | Purpose |
| --- | --- |
| [`frontend/`](frontend/) | Active Next.js app, NEAR wallet integration and browser tests. |
| [`backend/src/near/`](backend/src/near/) | Active API, purchase worker, security policy, providers and evidence storage. |
| [`contracts-near/`](contracts-near/) / [`contracts-auth/`](contracts-auth/) | Rust escrow and separate testnet Ethereum-login contract. |
| [`docs/`](docs/) | Architecture, setup, dated proof, screenshots and acceptance records. |
| [`video/`](video/) | Editable security-demo source. The narrated replacement is being produced separately. |
| [`legacy/`](legacy/), [`contracts/`](contracts/), [`agents/`](agents/) | Retained inherited EVM examples/baseline; not the active NEAR payment path. |

Accord builds on an existing marketplace/backend baseline. The new NEAR contracts, scoped-key payments, authentication, counterparty policy, interface and verification work are the hackathon contribution. See [source provenance and license](PROVENANCE.md), [`upstream-baseline…main`](https://github.com/neelpote/accord-near/compare/upstream-baseline...main), and [historical planning](docs/archive/README.md). Built with Next.js/React, near-api-js, NEAR Connect, Express/PostgreSQL and near-sdk; the interface uses Quaternius' credited CC0 Robot Expressive model. [MIT license](LICENSE).

Primary fit: **AI Security & Defense (`security`)**. Agent Economy is a secondary fit, not an automatically selected submission track. Public demo posting, final team/contact/payout details, consent and approval of the exact application remain the owner's steps. The [official hackathon guide](https://nearhackathon.com/HACKATHON.md) requires the public repository/demo-post links and disclosure of reused work; no application or social post is sent by this README update.

[Architecture](docs/ARCHITECTURE.md) · [Local/operator guide](docs/LOCAL_SETUP.md) · [Operations](docs/OPERATIONS.md) · [Creator services](docs/CREATOR_SERVICES.md) · [Current handoff](docs/PROJECT_HANDOFF.md) · [Submission checklist](docs/HOSTING_AND_SUBMISSION.md)
