# Phase 2 delivery gap analysis and design

Phase 1 acceptance is recorded in SECURITY.md before this phase begins. Baseline for Phase 2: local `1f31bd6`.

| Requirement | Existing implementation | Missing functionality | Proposed change |
| --- | --- | --- | --- |
| Unique job | `(subscription_id,cycle)` primary key, one unresolved cycle | Explicit display/API job ID | Derive `agreement:cycle`; preserve existing queue |
| Provider task binding | immutable metadata/input hashes, authenticated protocol, identity approval | Full prepared-output envelope identity | Bind job/customer/provider/service/input and preparation timestamp |
| Service terms | on-chain price/provider/metadata | Visible output/evidence/deadline/retry criteria | Versioned specification, consent hash and immutable agreement snapshot |
| Output schema | existing chain/portfolio/Groq validators | Validation before payment | Prepare returns its already-frozen report to authenticated control plane; validate before signing |
| Evidence | source blocks/metrics, actual provider RPC reads | Independent target/source retrieval in worker | Re-fetch exact source block/target/transaction, cross-check supported deterministic observations |
| Integrity | digest matches paid receipt after retrieval | Prepayment digest check | Check frozen report at preparation and delivery |
| Payment recovery | PREPARED/SUBMITTING/UNCERTAIN/SETTLED/DELIVERED | Verification stage and failure diagnosis | Preserve money states; store separate validation stages/history |
| Deadline/freshness | agent-specific freshness rules | Explicit acceptance window | Freeze windows and compare observation to preparation/payment time; historical retrieval stays available |
| Delivery identity/time | cycle/receipt/report | explicit verified completion timestamp | Persist `delivered_at` and validation metadata |
| Customer acceptance/dispute | none | owner acknowledgement and auditable claims | Append-only owner/provider dispute statements; no automatic money movement |
| UI | paid report, hash, source block | verification panel and prior specification | Clear checks and missing-evidence warnings, no factual-correctness badge |

No refund mechanism is added: the deployed contract credits providers when charge finalizes and does not support clawback/refunds. Prepayment malformed/stale/unsupported evidence means no new charge. Postpayment failures preserve the receipt and SETTLED recovery; no replacement charge or silent refund. A customer quality dispute marks the delivery DISPUTED while retaining all original payment/report evidence. Provider responses are statements, not self-approved resolution. Manual financial resolution remains outside this contract.

Specification policy: existing metadata remains immutable. New activations explicitly approve and snapshot a derived versioned specification before execution; the frontend shows it before funding. New offers can bind that specification within their on-chain metadata. Legacy records with no consent snapshot remain labeled legacy/unverified; they do not gain a retroactive verification badge. Changing requirements requires a new offer/explicit new consent, never rewriting an existing snapshot.

States: PENDING → STRUCTURE_VALID → EVIDENCE_VALID → DELIVERY_VERIFIED, or REJECTED before/after payment as appropriate; DISPUTED is a separate owner action and never reverses settlement. Stored verification facts carry their check time and limitations. A source retrieved from RPC does not establish that every narrative conclusion is correct. A valid hash binds bytes only.

Failure policy: provider/preparation failure, malformed schema, wrong identity, absent/invalid/stale required evidence prevent new signing. Frozen preparation is not regenerated silently. A paid-but-undelivered cycle retries retrieval of its exact artifact, never inference or another payment. Frontend failure retries read-only retrieval. Cancellation/pause prevents new unpaid work but preserves already-paid retrieval; a charge that finalized first remains paid. Unresolved/invalid cycles stay visible for review and block later cycles. Disputes and provider responses are append-only and owner-scoped.

## Implemented pipeline and API

`service-delivery.ts` declares service/provider/input/output fields, required evidence, 120-second chain freshness, 600-second preparation window, five private-provider attempts and one inference preparation per job. Customer-supplied portfolio snapshots remain explicitly unverified as holdings/prices. All accepted report types retain their existing parsers; schema, metadata, target, source block and known deterministic measurements are checked independently before a restricted signer can run. An expiring verification window is checked again immediately before signing.

Preparation returns a frozen versioned envelope to the authenticated control plane, not publicly to unpaid customers. It binds `agreement:cycle`, customer, provider, service, input hash, consent hash, preparation time, report and artifact hash. The private protocol now authenticates both request and response; a response MAC binds its originating request and exact returned bytes. Credential-bearing provider URLs are rejected; remote endpoints require HTTPS, while loopback HTTP supports the private supervisor topology.

New activations must supply the exact specification hash shown before funding. The snapshot is stored once per agreement and cannot be rewritten through execution reapproval. Existing records without consent keep legacy status; paid artifacts remain recoverable without retroactive consent claims. A specification change requires a new offer/agreement. No contract/state migration was made.

`delivery-store.ts` records separate verification stages and append-only stage history. Successful payment transaction hashes and completion timestamps are recorded where available. Recovery uses the finalized contract receipt if a transaction hash was lost, and the UI explicitly reports that limitation. Historical reports are assessed against their purchase/reference time; the actual check time is recorded separately.

Customer routes, all authenticated and owner-scoped:

- `GET /subscriptions/:id/cycles/:cycle/verification`: financial state, verification, job ID, receipt/hash, delivery/acknowledgement time, stage and dispute history.
- `POST /subscriptions/:id/cycles/:cycle/feedback`: `action: accept` acknowledges receipt; `action: dispute, reason` appends a bounded issue and marks DISPUTED. Neither changes money.
- `action: respond, reason` on the same route requires the registered provider and an existing customer dispute. A provider cannot dismiss its own dispute, and an acknowledgement cannot silently erase one.

Frontend terms show the delivery specification before funding and prevent funding until it loads. Execution approval also displays the criteria and freezes their consent hash. Paid reports expose job/provider, payment reference, report digest, schema/evidence/freshness results, completion time and manual dispute controls. `STRUCTURE_VALID` is not displayed as factual verification.

## Phase 2 acceptance results

- 47 backend unit tests passed, including wrong/missing structure, wrong customer/agreement/provider/service/job/consent/target, fabricated balance, unknown/stale source, altered hash, mismatched receipt and provider-response tampering. Tests assert factual correctness stays UNVERIFIED.
- Isolated PostgreSQL/HTTP acceptance passed: distinct idempotent stages, owner isolation, authenticated request/response preparation/delivery, immutable payment on dispute and provider response, no self-resolution.
- Actual testnet agreement **34** paid two report cycles across the actual minimum interval, with DELIVERY_VERIFIED records, real transaction hashes and completion timestamps; cancellation, restricted key deletion and customer/provider withdrawals passed. See [phase2-testnet.json](phase2-testnet.json). The extra response-MAC hardening was subsequently verified through the real HTTP integration and recovery checks, not represented as a new funded run.
- Nine recovery checks passed using agreement 34's real paid artifact: changed/schema-invalid/unavailable delivery preserved SETTLED payment evidence; PREPARED/SUBMITTING/UNCERTAIN/SETTLED recovery retrieved the exact artifact without a signing key or another charge. Chain cycle/reserve values stayed unchanged. See [phase2-recovery.json](phase2-recovery.json).
- All **11 frontend browser checks**, backend/frontend types and production frontend build passed. Existing counterparty HTTP/database tests also passed.

This is not an independent audit. Structure and supported evidence can be verified while narrative conclusions remain wrong. Indexed/historical RPC availability, compromised hosting/database administration and provider quality remain trust/availability limits.

## Failure outcomes

| Scenario | Payment/provider credit | Retry and final state | Refund/manual handling |
| --- | --- | --- | --- |
| Provider fails, invalid JSON/schema, incomplete or stale required evidence before charge | No new payment or credit | PENDING/REJECTED verification, bounded same-job provider attempts; opaque inference stays NEEDS_REVIEW | No paid amount to refund; owner/operator review or cancel |
| Duplicate preparation/delivery | Existing cycle/artifact only | Idempotent database key, fixed receipt/hash; no second completed purchase | None |
| Crash after charge before delivery commit | Finalized payment remains credited | SETTLED/uncertain states reconcile the same receipt, retrieve exact artifact | No duplicate charge or silent refund |
| Frontend display/network failure | Original settlement unchanged | Read-only refresh of stored report/verification | No re-purchase required |
| Provider disputes rejection / customer disputes conclusions | Prior finalized settlement remains | Append-only statements, DISPUTED when customer raises issue | Manual review; contract has no clawback/refund operation |
| Cancellation during execution | Finalized-before-cancel charge remains; later unpaid charge rejected | New work stops; already-paid artifact remains retrievable | Unspent reserves released through existing owner cancellation/withdrawal |

## Rollout and rollback

Local development only; do not push this connected branch or change production config without explicit deployment approval. Back up the database, run additive migration, provide the separate private-protocol secret to both roles, deploy the coordinated pair, and require explicit identity/specification approval for new unpaid work. On rollback, stop scheduling first; preserve extra columns, frozen artifacts, receipts and dispute/event history. Restore the coordinated prior API/provider protocol, never reset budgets or replace a paid artifact. The old money contract is unchanged.
