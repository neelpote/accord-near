# Accord reliability implementation — 13 November 2026

Baseline: `24ead06044a946087213190c8722879771f70565`, `neelpote/accord-near`, local main. This work follows the attached three-priority instructions. The owner's current instruction authorizes proceeding through the analyses and implementation without intermediate approval stops. No production deployment/configuration change, mainnet activity, inference-budget increase or purchase is authorized. Commits stay local because pushing this connected repository can deploy production.

## Phase 0 — repository audit and plan (before feature changes)

Architecture: existing `contracts-near/src/lib.rs` holds immutable services, finite owner agreements, reserved balances and artifact-bound receipts. `server.ts` verifies wallet-owned sessions and finalized setup; `worker.ts` serializes agreement cycles and reconciles uncertain payment before retrieving a frozen artifact from `provider-server.ts`. `counterparty.ts` independently gates the restricted signer. PostgreSQL in `db.ts` stores durable jobs, ciphertext keys, artifacts, observations, human approvals and operational evidence. `frontend/app/page.tsx`, `CounterpartySecurity.tsx` and `ReportView.tsx` expose those flows. Existing detailed architecture is [ARCHITECTURE.md](../ARCHITECTURE.md); historical project decisions are [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).

| Requested capability | Baseline classification | Evidence / exact gap |
| --- | --- | --- |
| Customer/agreement ownership | Already implemented | server wallet sessions, finalized owner/input/key verification; worker lacks one explicit reusable execution-policy check |
| Fixed amount/provider, prepaid cumulative cap, interval/expiry/cycles | Already implemented | contract `charge` accepts neither amount nor provider; obtains both from immutable service |
| Function-call keys, creation/revocation | Already implemented | server provisioning; frontend AddKey/DeleteKey; worker checks receiver/method/finite allowance |
| Duplicate settlement/recovery | Already implemented | contract receipt per agreement/cycle/hash, database primary/partial unique indexes, advisory lock; recovery tests |
| Counterparty ALLOW/WARN/BLOCK | Already implemented | production worker calls `secureCharge`; exact hash-bound owner warning approval |
| Hostile input cannot rewrite payment policy | Already implemented | canonical validated task input, immutable service/input hash, deterministic intent whitelist |
| Per-service agent identity/version approval | Missing | metadata is hash-bound but runtime/build version is not tracked or reapproved |
| Customer pause/disable and outstanding job view | Partially implemented | chain cancel + key removal exist; backend has no owner pause/resume control or dedicated job audit view |
| Provider request identity | Partially implemented | fixed configured endpoint and provider/input/metadata checks; prepare is unauthenticated and can spend capped inference if exposed |
| Environment isolation | Partially implemented | no user full-access wallet key needed by worker; supervisor passes every env var to provider and API, shared database trust remains |
| Structured security events | Partially implemented | counterparty/workspace events exist; no unified job authorization/version/provider/retry log |
| Report schema/hash/receipt validation | Already implemented | `verifyChainReport`, `verifyReport`, Groq explanation validation, canonical SHA-256 and finalized receipt checks |
| Output validation before payment | Missing | prepare returns a hash only; report schema is checked after payment |
| Formal delivery specification before consent | Missing | human metadata/input examples exist; no explicit frozen freshness/deadline/retry/acceptance specification |
| Separate delivery verification stages | Missing | financial job states exist; structure/evidence/freshness/dispute status is not independently modeled |
| Independent evidence/target checks | Partially implemented | deterministic agents pin RPC reads; worker report validator does not independently check target/source against agreed input |
| Disputes | Missing | no acknowledgement/dispute records; contract does not implement refunds |
| NEAR AI Cloud | Partially implemented, paused | authenticated earlier; inference blocked by missing credit limit; no new live check made |
| Groq | Already implemented, exhausted | actual prior inference proofs; persistent approved six-request ceiling exhausted; no new call authorized |
| Recurring AI contract-change analyst | Missing | deterministic snapshots/baselines and generic Groq explanations can be reused; versioned change/evidence analysis not implemented |
| Human-reviewed 20-case AI evaluation | Cannot be verified | no such human-reviewed labels exist; agent-created cases must not be relabeled human-reviewed |

### Planned changes and compatibility

No money-contract/state migration is planned. Additive PostgreSQL migrations only: identity/owner approval and events, per-agreement pause flag/approved identity, delivery specification snapshot and verification/dispute records. Reuse `(subscription_id,cycle)` as stable job identity and existing cycle table; do not build another queue/payment system. Existing receipts remain retrievable and cannot be labeled newly verified without checks.

Phase 1: reusable pure authorization checks; approved immutable metadata/endpoint plus runtime version identity; per-owner pause/resume and identity reapproval; strict provider protocol authentication; credential environment allowlists; append-only security events. Recheck cancellation/pause/key/identity before signing. Resume after material version change requires explicit owner approval. New jobs fail closed on absent configuration; paid recovery continues independently of new-work permission.

Phase 2: derive versioned service specifications from known handlers; snapshot before activation, show before funding; include frozen output at preparation so schema/target/source/freshness checks run before charging; independently verify supported source references; preserve settlement recovery and separate verification states from payment state. Add owner-only disputes and acknowledgements, without automatic refunds or any change to finalized financial history.

Phase 3: one contract risk analyst on existing provider/worker path. Reuse finalized account/key capture and deterministic permission comparison; model receives bounded public evidence only. Validate model finding references against exact tool evidence, bound requests/time/tokens, no retries after opaque failure, no deterministic substitute sold as completed AI. Existing inference cap remains binding. Controlled mocked tests and evaluation can run without credits; live inference/value claims require actual successful authorized inference and human-reviewed labels.

Exact primary files: `backend/src/near/{worker,provider-server,server,db,agents,groq}.ts`, focused authorization/identity, delivery, analyst modules and tests, `backend/scripts/hosted-worker.mjs`, frontend page/report panel and browser tests, contract test module only, existing CI and env examples. New modules will be added only where they express a distinct shared boundary.

Risks: requiring provider authentication changes the private protocol and needs coordinated local/API/provider configuration; no silent unauthenticated fallback. Legacy agreements receive explicit legacy specification status, not retroactive new owner consent. New identity approval does not attest to running binary integrity. A compromised host/database/deployment administrator can defeat backend policy and read process files; this work cannot claim OS/TEE isolation. AI factual correctness is never inferred from schema, valid citations or a paid receipt.

### Security matrix — Phase 1A

| Attack | Severity | Existing protection | Missing protection / fix | Test |
| --- | --- | --- | --- | --- |
| Above agreed price | High | contract gets exact price internally | explicit preflight parity check | pure policy + Rust fixed-price receipt |
| Too frequent | High | contract due timestamp | backend fresh due check | Rust early-cycle + pure policy |
| Duplicate/crash retry | High | cycle/hash fence and persisted recovery | unified audit references | idempotent worker recovery + receipt replay |
| Recipient substitution | Critical | immutable service and counterparty terms | centralized provider/endpoint binding | wrong provider/endpoint rejection |
| Key escalation | Critical | charge-only finite function-call key, payable owner methods | reusable key assertion and extra tests | cancel/withdraw/transfer denial and runtime permission fixture |
| Compromised execution | Critical | limited keys and immutable financial contract | reduce inherited env, role separation; shared DB/host remains trust | env allowlist, cross-owner HTTP and key checks |
| Malicious task/prompt | High | validated input and deterministic signer | analyst evidence allowlist/output validation | injected metadata cannot grant tools/signing |
| Provider impersonation | High | configured URL, provider/input/metadata hashes | authenticate private protocol, bind identity/version | missing/wrong token, redirect/provider mismatch |
| Agent code/config change | High | service metadata immutable; observed contract code changes | version/build/endpoint digest and owner approval | version drift rejects new work; paid recovery allowed |
| Revocation race | High | cancellation/key deletion final chain fences | backend pause and immediate pre-sign recheck | canceled/paused after prepare rejects signing; paid delivery recovers |

Contract protections remain on-chain; customer sessions, job scheduling, output evidence and agent identity approvals are backend controls; env/network/filesystem secrecy beyond a process allowlist belongs to deployment/OS controls. A code digest is evidence of an advertised build identity, not attestation of the running service.

### Test strategy and gates

For each priority: unit tests for pure policies/parsers, isolated PostgreSQL + HTTP boundary checks, existing Rust unit and sandbox tests, frontend types/build and browser states, configured static/dependency checks. Testnet uses dedicated faucet fixtures only; never overwrite historical proofs with new claims. Full live AI end-to-end and human-label evaluation are explicitly unverified until their external prerequisites exist. A failed acceptance gate blocks progression; implement and verify available prerequisites without claiming the next phase passed.

## Execution log

- Phase 0 / 1A: source inspection and plan recorded before feature edits. Pending implementation and acceptance checks.

- Phase 1 accepted within the documented application/contract trust model: 28 backend unit checks, role environment check, isolated HTTP/database acceptance, existing counterparty acceptance, 15 Rust unit tests, actual WASM sandbox test, 9 existing + 1 new frontend browser checks, types/build/fmt/clippy passed. Dedicated testnet agreement 33 paid twice across the real interval, rejected unapproved/paused work, and completed owner/key/fund exit. Low SDK advisories and host/database compromise limits remain in [SECURITY.md](SECURITY.md). No production rollout. Next: complete delivery gap analysis before Phase 2 code.

- Phase 2 accepted: frozen delivery specification/consent; pre-sign schema, target/source/integrity/freshness checks; separate verification stages; authenticated provider responses; payment transaction references; owner acknowledgement/disputes and provider responses with no fabricated refund. 47 backend tests, signed HTTP/DB checks, 9 real-receipt recovery checks, 11 browser checks, types/build passed. Testnet agreement 34 verified both deliveries and owner/provider exits. See [DELIVERY.md](DELIVERY.md). Next: audit inference availability before the single AI risk analyst.
