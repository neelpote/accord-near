# Counterparty security — AI Security & Defense

Accord checks both the escrow contract and the economic receiver before an automated charge. The final verdict is deterministic: `allow`, `warn`, or `block`, with evidence and reason codes. An LLM cannot declare a receiver safe or bypass the gate.

```mermaid
sequenceDiagram
  participant A as Payment worker
  participant S as Security service
  participant N as Finalized NEAR RPC + history indexer
  participant H as Wallet owner
  participant K as Scoped signing key
  participant C as NEAR escrow
  A->>S: Exact contract, provider, amount, cycle and artifact hash
  S->>N: Account state, code identity and activity
  S->>S: Check prior receipts and shared evidence reports
  alt block
    S-->>A: Block + reasons; no signing
  else warn
    S-->>H: Exact payment + evidence + five-minute expiry
    H->>S: Approve once or decline, authenticated session
    A->>S: Recheck all current evidence
    S-->>A: Consume matching approval once
  else allow
    S-->>A: Current policy checks passed
  end
  A->>K: Decrypt restricted key only inside authorized callback
  K->>C: Zero-deposit charge with frozen cycle and artifact hash
  C->>C: Enforce fixed provider, price, expiry, cycle and reserve
```

## Data sources and scope

| Signal | Implementation / acquisition | Honest coverage |
| --- | --- | --- |
| Account creation age | Nearblocks testnet `GET https://api-testnet.nearblocks.io/v3/accounts/{account}`, `data.created.block_timestamp` | Indexer-reported creation time; not an RPC cryptographic proof. Unknown/invalid times warn. |
| Activity | Same API, `/txns?limit=25`; timestamps, successful/failed action history, pagination indicator | Latest 25 transactions, not lifetime counts. `activity_has_more` explicitly reports truncation. |
| Contract identity | NEAR RPC `view_account` for every target at the same finalized block | Local code hash and immutable global hash references supported. Mutable global account references are unresolved and cannot be approved past missing RPC evidence. |
| Recent code change | Compare stored finalized observations; retain changed-at warning for 24 hours. Also inspect deployments in the recent transaction window | Observation time is not exact deployment time. Recent deployment outside the 25-row window may be missed. Unknown first contract identity requires human review. |
| Prior interaction | Count Accord's confirmed on-chain payment receipts for `(owner, provider)` | Accord history only; no invented complete cross-app reputation. Economic provider, not the outer EVM adapter receiver. |
| Shared blocklist | Authenticated reports in PostgreSQL, evidence transaction fetched from trusted RPC and verified FINAL, matching hash/signer and receiver involvement | Evidence proves involvement/outcomes, not scam intent. A curator must assess the allegation. No claim of decentralized consensus or universal NEAR blocklist. |
| Authorization | Expected provider/price from on-chain agreement; exact contract/method/arguments; RPC key-permission check | Contract separately enforces the financial terms. A function-call key alone is not a spending budget. |

Primary sources: [NEAR RPC](https://docs.near.org/api/rpc/contracts), [Nearblocks API](https://api.nearblocks.io/api-docs/ui/), [NEAR access keys](https://near.github.io/nearcore/DataStructures/AccessKey.html). The old Nearblocks v1 testnet account route returned HTTP 410 during implementation; v3 account and transaction routes were tested successfully. No paid data subscription or full-chain indexer is required for this bounded implementation. For comprehensive historical backfill, [Neardata](https://github.com/fastnear/neardata-server) supplies finalized blocks and receipts; that backfill is not implemented or claimed here.

## Policy

- `block`: curated blocklist entry, incorrect economic receiver/amount/contract, or missing code on the authorized payment contract.
- `warn`: first payment, unknown or less-than-seven-day age, unavailable history, no indexed activity, unreviewed contract code, observed code change, recent indexed deployment or pending evidence report.
- `allow`: none of the above policy conditions applies. This means checks passed, not that the receiver is guaranteed honest.
- Unavailable/stale finalized RPC evidence never signs, even with a human approval. Database failure also stops the worker. Indexer outages warn; the owner may explicitly accept the missing history for one exact payment.

Each decision binds network, owner, contract, economic receiver, method, amount, subscription, cycle, report hash, code identities, report evidence/status and policy version. Volatile block numbers and activity counters are displayed but excluded from the approval fingerprint. The worker refreshes evidence before consuming approval. New code, report status or risk reasons invalidates it. Approvals last five minutes and are atomically consumed once. Declines prevent the identical intent/evidence combination from signing. Code identities reviewed by the owner are remembered; new identities require review again. A young testnet account can continue to generate age warnings on later payments.

The service stores decisions independently of the UI. Paused agreements expose `last_error`; open **Payment security** to inspect and approve or decline. Cancel future purchases and revoke the key under **My agreements** as before. Already-paid report delivery can recover without authorizing a second payment.

## Shared evidence reporting and moderation

1. Sign in with your wallet; an authorized agent client can use its owner-authorized session.
2. Submit the target account, evidence transaction hash, transaction signer and explanation. No user-supplied evidence URLs are fetched.
3. The backend fetches finalized transaction/receipt data through its configured RPC, checks involvement and stores an evidence digest. Duplicate evidence from the same reporter is rejected. Each wallet can submit at most 10 reports/day.
4. Other agents see the report. Pending reports warn; they do not automatically block.
5. A wallet in the operator-configured `SECURITY_REVIEWERS` list can mark the report `block`, `dismissed`, or `pending`. Every review appends an audit record, including curator and reason. Dismissal removes enforcement but preserves evidence/history.

An empty reviewer list means nobody can curate blocks. Configure explicit account IDs, never an arbitrary request field. Reporter identity is authenticated using the existing wallet sign-in; this does not mean each report carries an independent wallet signature. Sybil reporting and curator abuse remain trust risks: many wallet identities are not independent evidence. A malicious report may cause a review burden; moderation is deliberately explicit. Shared report allegations and chain evidence are visible to signed-in wallets; do not include private personal data.

## API

All routes use the existing wallet-authenticated session; mutations also require the configured same-site Origin.

- `GET /api/near/security`: owner decisions, shared reports, append-only review history and curator eligibility.
- `POST /api/near/security/check`: `{intent}`; verifies authenticated ownership against the on-chain agreement and returns `{id,state,expires_at,verdict,intent}`. `verdict` contains decision, reasons, evidence and hashes. Checks do not authorize payment.
- `POST /api/near/security/decisions/:id`: `{approve:boolean,intent_hash,evidence_hash}`. Owner-only exact-payment approval/decline.
- `POST /api/near/security/reports`: `{account,transaction_hash,signer,reason}`.
- `POST /api/near/security/reports/:id/review`: `{status,reason}`. Curator-only.

The worker calls the same internal service and mandatory `secureCharge`/`guardedSign` boundary. There is no switch to skip it in production.

## Key limits and threat boundary

The agent receives only an ED25519 function-call access key scoped to `charge` on `contract.accord-dev-261110.testnet`, with a finite 0.05 NEAR gas allowance. Immediately before signing, the worker verifies receiver, exactly one allowed method and finite allowance against RPC. A full-access key is rejected. The key cannot add/delete keys, transfer native NEAR directly, attach a deposit, cancel or withdraw. The owner wallet retains those separate capabilities. Gas allowance exhaustion pauses execution; owner action is required to replace the key. Never remove all owner recovery keys.

The contract, rather than the gas allowance, fixes provider, price, billing interval, max cycles, expiry and reserve. The agent cannot choose a different downstream recipient through `charge` arguments. The deployer retains contract upgrade authority in this prototype.

The security gate protects the honest worker from malicious model/tool output. It is not a cryptographic guarantee against a compromised backend that steals the scoped key and bypasses the wrapper. Existing contract financial restrictions still apply, but the new reputation verdict is not checked on chain. There is a time-of-check/time-of-execution window for upgrades and report changes after the final read. Stronger guarantees require contract-enforced attestations or immutable/upgrade-delayed execution, with a separate contract deployment and security review. No TEE or Agent API integration is claimed. The present contract additionally binds exact billing cycles and artifact hashes, and the entire deployment remains testnet-only.

## Run the checks and attack demo

Use Node 24.22.2 and the existing backend `.env` with local PostgreSQL. No mainnet or real-money transaction is made by these checks.

```sh
cd backend
npm run typecheck
npm run near:test
npm run near:test:security
npm run near:demo:attack
```

The security integration test creates an isolated schema, checks HTTP ownership/moderation, approval expiry/replay/concurrency/code-change handling and production gate refusal, then drops only its own schema.

The attack demo uses actual finalized testnet account/history reads and a real deployment transaction as evidence. It creates an isolated demo blocklist for our controlled login-contract address. A deterministic injected-agent-output fixture proposes redirecting the provider payment there. This is an adversarial signing-boundary test, not a claim that a particular live LLM was successfully prompt-injected. The demo loads no key, asserts zero signing callbacks and broadcasts, checks unchanged buyer balance and saves [the full captured log](counterparty-attack-proof.json). The controlled receiver is not accused of actual wrongdoing.

Browser check: `cd frontend && npm run test:browser`. It verifies exact-payment review controls, absence of block override, and mobile overflow in addition to the existing wallet/UI checks. [The funded acceptance proof](counterparty-live-proof.json) records agreement 21: unpaid warning, owner approval, one 0.001 testNEAR charge, delivered artifact, cancellation and key removal. Reproduce with an API on port 4400 (`RUN_WORKER=false RUN_OPERATIONS=false PORT=4400 npm run near:start`), the independent provider on 4001, and `ACCORD_SECURITY_LIVE=1 npm run near:proof:security`. This opt-in script uses only the dedicated buyer fixture and creates a new single-cycle agreement; it never approves another agreement.

## Hosted verification

The public release at https://accord-near-ten.vercel.app includes the security service and UI. [Hosted acceptance evidence](counterparty-hosted-proof.json) records agreement 22: a real NEP-413 owner session, actual Chromium review-button approval, one 0.001 testNEAR payment, exact receipt/report hash, consumed authorization, finalized cancellation and removed delegate. The first history-read request timed out after the payment had succeeded; its transport failure is preserved in the proof. After batched history loading, fresh API and on-chain readback completed successfully (2.8 seconds for the history request). No second payment was created to recover the report.

[The recorded warning screen](demo/counterparty-warning.png) shows the actual approval before signing. The current UI additionally displays the exact human-readable testNEAR amount. The public service requires login for personal decisions and verifies configured curator identity; the project operator and the owner's supplied funded testnet account are configured as reviewers. No demo accusation was inserted into the production blocklist.

Application CI passed for commit `5cf6aa4fa3746e29b6f78f83f6c7ccba41f3f9b3`: https://github.com/neelpote/accord-near/actions/runs/43243063010. The earlier wallet retry test timed out; its polling side effects were replaced with explicit verification waiting and one chooser selection, then passed repeated CI-mode checks and GitHub CI.
