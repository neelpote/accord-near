# Phase 1 security result

Implemented on top of the existing contract, worker, provider and security gate. No money-contract code/state layout changed; only four contract tests were added. This is local development, not a production rollout or independent audit.

## Changes

`execution-policy.ts` checks owner/input, immutable metadata, current cycle/due time/expiry/reserve, service enablement, owner pause and approved execution identity. Worker checks before preparation and immediately before decryption/signing; the existing counterparty gate remains mandatory. Paid receipt recovery is deliberately exempt from new-work pause/expiry checks, while its existing exact receipt checks remain mandatory.

`execution.ts` binds service/provider/version/metadata, declared read-only capabilities, configured endpoint, public model configuration and available source build digest. Identity approval is wallet-owner scoped, persisted with timestamp, and cannot be copied across agreements by an unauthenticated caller. It identifies an advertised build, not a running-process attestation. Required build inputs fail closed if missing; only the not-yet-added analyst module may be absent. Future code/model/endpoint changes require reapproval.

Owner controls expose pause/reapproval and current jobs/events. Provider disablement requires the provider's authenticated wallet. Key-revocation events require finalized absent-key RPC readback, not a browser claim. A pause cannot undo a charge that finalized first. On-chain cancellation and actual key deletion remain the final independent financial fences.

Private `/prepare` and `/deliver` requests require a 30-second HMAC over operation, timestamp and canonical body. Replay of an identical preparation is idempotent under its database key; no new model request is made. Redirects are rejected. Both processes require the same separately generated `ACCORD_PROVIDER_SECRET`; no unauthenticated compatibility fallback exists.

The supervisor now passes role-specific environment variables and prevents automatic `.env` loading in those children. Provider orchestration receives inference credentials, not the delegate encryption key; the scheduler receives the delegate encryption key, not inference keys. No unrestricted customer wallet key is needed by either role. Developer fixture full-access keys exist only in explicit opt-in acceptance scripts.

## Verification

| Test / scenario | Expected | Actual |
| --- | --- | --- |
| Rust immutable price/provider | Receipt must use registered service | PASS |
| Rust early, expired, exhausted and canceled billing | Reject | PASS |
| Rust wrong owner/key and cross-owner cancellation | Reject | PASS |
| Rust same-cycle/same-artifact retry | No second credit | PASS |
| Rust changed artifact for old cycle | Reject | PASS |
| Rust zero-deposit delegate cancel/withdraw | Reject payable owner operation | PASS |
| Existing WASM sandbox billing/revocation/exits | Real local chain execution | PASS, 1 integration test |
| Backend central policy matrix | Reject owner/input/metadata/amount reserve/cadence/cycle/expiry/pause/version violations | PASS |
| Scoped key matrix | Reject full access, arbitrary receiver/methods, unlimited/excessive gas allowance | PASS |
| Provider HMAC matrix | Reject wrong operation/body/time/missing token | PASS |
| Isolated PostgreSQL/HTTP execution acceptance | Owner approval, wrong-owner rejection, duplicate prepare, pause, provider disable, key readback and tenant isolation | PASS |
| Existing database/HTTP counterparty acceptance | WARN approval, BLOCK refusal, evidence drift, one-use consumption | PASS |
| Role environment test | No unrelated secrets or cross-role signing/model credentials | PASS |
| Frontend existing suite | Existing presentation/auth/security behavior preserved | PASS, 9 tests |
| Frontend new execution controls | Explicit identity review, pause, honest outstanding-payment state | PASS, 1 test |
| Actual testnet agreement 33 | Unapproved/paused refusal, two timed paid reports, duplicate protection, delegate cancellation rejected, owner cancellation, DeleteKey and withdrawals | PASS, [actual proof](phase1-testnet.json) |
| Types/build/static checks | Backend/frontend types, frontend build, Rust fmt/clippy | PASS |
| Dependency audit | Configured thresholds | Backend: 3 low advisories, no moderate-or-higher; frontend: 0 advisories |

Backend suite: 28 tests passed at the phase checkpoint. New execution integration re-ran after the absent-key check. No model inference was requested. The new local Docker database was empty; its Groq request ledger was advanced to at least the six previously consumed requests instead of treating database replacement as renewed authorization.

## Deployment, compatibility and rollback

Keep API/provider releases coordinated. Generate a separate 32+ character provider protocol secret and supply it to both roles. New nullable approval columns are additive. Existing paid records remain recoverable; legacy unpaid agreements intentionally wait for explicit owner identity approval. Unlisting an offer remains distinct from disabling existing execution. Owner pause does not replace cancellation or remove a key by itself.

No production configuration or deployed code was changed; changes remain local commits. Apply the additive migration with the normal migrate command, back up first, update both roles together, then have owners approve identities. To roll back, stop scheduling, retain the added columns/events/artifacts, restore the prior code and coordinated provider protocol. Do not delete receipts, reset inference counters or replay a different cycle/hash.

## Unresolved boundaries

A compromised application/database/OS administrator can read the shared database and defeat backend identity/reputation controls. Environment allowlists are not filesystem, container, database-role or TEE isolation. The AI model receives bounded public evidence and no signing authority, but this does not make the hosting process immune to compromise. The deployed escrow's full-access operator remains an upgrade/custody trust. Source digests cannot prove running code is honest. Third-party wallet extension/mobile UI is not certified by automated fixtures. Low dependency advisories in the paused NEAR AI SDK remain documented, not silently fixed by an unrelated package upgrade.

Loops: fetched the AI Security & Defense evaluator again and applied its criteria locally. Feedback: keep contract guarantees separate from backend/host boundaries; prove real pause/refusal and exit; avoid claiming attestation. Applied in the code/tests and this report. This is an agent-run Loops-prompt review, not official judge approval.
