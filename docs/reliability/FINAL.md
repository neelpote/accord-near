# Three-priority reliability report

**Later publication:** the code was subsequently pushed at the owner’s request. See [PUBLISHING.md](PUBLISHING.md) for ordered pushes and the clean-runner fixture correction. The report below records the pre-publication engineering checkpoint; no deployment was performed.

Scope: local implementation on top of `24ead06044a946087213190c8722879771f70565`. No push or production deployment. This is an engineering evidence report, not independent certification.

## Acceptance status

| Priority | Status and evidence |
| --- | --- |
| 0: inspect and plan | Completed before implementation: [audit, threat matrix and gates](IMPLEMENTATION.md) |
| 1: authority/security | Accepted within documented application/contract trust boundaries: [security report](SECURITY.md), actual [testnet agreement 33](phase1-testnet.json) |
| 2: payment-to-delivery | Accepted locally and on testnet: [delivery report and failure matrix](DELIVERY.md), actual [agreement 34](phase2-testnet.json), [nine paid-receipt recovery cases](phase2-recovery.json) |
| 3: single AI analyst | Implementation, local safety checks and actual [testnet agreement 35](phase3-testnet.json), [finalized readback](phase3-readback.json) and [paid-artifact recovery](phase3-recovery.json) completed. The 22-case evaluation accepted 11/12 model outputs mechanically but exposed semantic errors. **Human-reviewed labels, factual accuracy and measurable customer value remain unverified. Do not mark the full phase accepted.** [AI report](AI.md), [review worksheet](ai-human-review.json) |
| Production/hackathon application | Not performed by this task. Existing deployed app remains the prior version. No social post or application sent. |

## Deliverable map

| Requested item | Location |
| --- | --- |
| Updated architecture diagram and trust boundaries | [OPERATIONS.md](OPERATIONS.md) |
| Files created/modified | [CHANGES.md](CHANGES.md) and local Git commits |
| Database migrations | `backend/src/near/db.ts:migrateExecution`, additive and tested twice; detailed operating guide |
| Contract changes | Tests only in Rust; no financial logic/WASM deployment change |
| API documentation | [route/access/payload table](OPERATIONS.md#api-additions) |
| Test results | Phase reports and [individual test/check inventory](test-results.json) |
| Actual testnet references | `phase1-testnet.json`, `phase2-testnet.json`, `phase3-testnet.json`, `phase3-wallet.json`, `phase3-readback.json` |
| Known limitations/security risks | Security, AI and operating reports; no factual accuracy/OS sandbox/TEE/independent audit claim |
| Deployment instructions | Staging-only, coordinated role/schema/protocol/owner-consent procedure in operating guide |
| Rollback instructions | Pause first; retain paid artifacts/receipts/history/counters; compatible code/protocol only, no financial reversal |

## Adversarial integration coverage

All negative cases below are distinguished from actual testnet transactions. Controlled transports are not described as attacks against a live external provider.

| Scenario | Exercised boundary |
| --- | --- |
| Compromised worker | Rust economic limits and restricted-key tests; real duplicate/delegate-owner-method refusals in testnet proof. Fully compromised app/DB can bypass off-chain quality checks; not claimed prevented. |
| Malicious task input | Shared input validators and AI provider HTTP input-hash binding; injection case in controlled live-model evaluation; model has no signing/tools |
| Fabricated evidence | Risk deterministic reconstruction and independent block/code/key RPC comparison, including altered target/code; prior-paid-baseline substitution rejection |
| Malformed provider/model output | Strict schemas, hash binding, authenticated responses, refusal/truncation/invalid JSON tests; no completed fallback |
| AI outage | Isolated actual provider HTTP route with controlled 503 model response: NEEDS_REVIEW, one attempted inference, retry makes no second request, no payment |
| Duplicate job | PostgreSQL unique preparation claim plus concurrent provider HTTP requests: one inference and exact cached artifact; worker/contract duplicate economic protections |
| Crash after payment | Real finalized paid receipt recovery from PREPARED/SUBMITTING/UNCERTAIN/SETTLED without a usable signing key, unchanged cycles/reserve |
| Revoked key | Finalized absent-key readback required; testnet DeleteKey and canceled charge refusal; key permission assertion before signing |
| Blocked counterparty | Existing signing-gate integration with zero signer calls for BLOCK; WARN needs exact, unexpired owner approval; prior causal live-model demo retained |
| Customer cancellation in flight | Immediate pre-sign owner/identity/key recheck and contract active fence; already-finalized payment remains recoverable and is never silently refunded |

## Claims that remain deliberately separate

- **Unit-tested:** policies, report/evidence normalization, schemas, prompt/output limits and failure propagation.
- **Integration-tested:** PostgreSQL, private protocol HTTP, owner/provider isolation, distinct delivery/dispute stages, controlled AI fault/duplicate paths and frontend browser states.
- **Testnet-tested:** actual fixture signatures, finite funding, timed settlement, revocation and customer/provider withdrawals; proof files list transactions and source state.
- **Human/manually reviewed:** no signed-off human evaluation. Coding-agent source/output inspection only.
- **Independently audited:** no.
- **Not yet verified:** human expected labels, precision/recall/false-positive/false-negative and unsupported-prose rates against those labels, customer usefulness, third-party extension/mobile UI certification, production isolation, service uptime and deployment acceptance.

A structurally correct report can be false. A receipt plus matching report hash proves a particular paid artifact, not that its advice is correct. The initial model's rejected semantic results are retained as evidence of this distinction.

## Final engineering checkpoint

- 78 backend unit tests; role-environment test; controlled PostgreSQL/HTTP execution, delivery, AI-failure and counterparty suites; operations and EVM-auth checks passed.
- 13 browser regressions, one clean full native testnet wallet journey and one separate read-only retained-report capture passed. The capture makes zero transaction calls.
- Backend/frontend types, production frontend build and deployment-router checks passed. Rust financial logic is unchanged; 15 Rust unit tests, the actual WASM sandbox journey and clippy passed at Phase 1, and the final Rust format check passed. Remote CI was not run for these unpushed changes.
- Actual agreements 33/34/35 covered timed payments and exits. Agreement 35 adds real local inference and exact paid-baseline comparison; agreement 38 verifies the current UI. Nine real-risk-artifact recovery cases made no new payment/inference. Independent finalized readback checks API artifacts, UI settlements, inactive agreements, absent delegates and zero-charge failed-run cleanup.
- Latest npm audits: backend 3 low advisories in the paused NEAR AI dependency chain, none moderate/high/critical; frontend 0. Optional local Python/model runtime has not been independently security audited.
- Experimental offer 9 disabled through provider authentication; local model and automatic scheduling stopped. Ledger preserved at 59/64 local reservations and 6/6 authorized Groq requests. No purchase, mainnet call, push or production rollout.

**Remaining acceptance work is substantive:** obtain actual human labels and usefulness judgments, correct/evaluate semantic AI errors, and validate an isolated hosted runtime before enabling AI for customers. The full AI phase and production readiness are not approved merely because the engineering journeys pass. No X post, submission payload or independent audit was performed.
