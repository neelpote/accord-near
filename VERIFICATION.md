# Verification

Verified application source: **7587362ef72e1d3844e036f833c734584d0f9a30**. Testnet only. Optional AI generation is paused at the user's request.

## Results

| Check | Actual result / evidence |
| --- | --- |
| Contract unit tests | 11 passed: budget conservation, duplicates, early cycles, wrong owner/key, expiry, cancellation, artifact replacement, exhaustion, underfunding, overflow and failed/successful withdrawal callbacks. |
| Contract formatting / strict Clippy | Passed, including all test targets with `-D warnings`. |
| Optimized WASM | Built using cargo-near 0.23.0 / near-sdk 5.30.1. Deployed binary 193,114 bytes; SHA256 `bc308e9d63274f6ea64db7b24869d55145739b7c63635c16ec685f4921299ff6`. This is a host build, not a reproducible-build claim. |
| Real NEAR Sandbox | Passed actual WASM deployment, two billing cycles, rejected invalid calls, cancellation, paid retrieval, actual transfers and callback readback. Time was fast-forwarded locally. |
| Backend unit suite | 6 passed: canonical input/artifact hashes, report/input bounds, authenticated encryption, AI schema rejection, streaming response cap/cancellation and fixture credential preservation. |
| Backend types and schema | Passed. Additive migration ran twice successfully; one-unresolved-cycle index verified. |
| Frontend types and production build | Passed using Node 24.22.2 / Next.js 16.4.6. |
| Browser presentation | Passed desktop/mobile layout and no horizontal overflow at 390px. Presentation fixtures are not monetary evidence. |
| Real testnet API/worker | Passed against committed application d2f91ec, subscription 7, `working_tree_dirty: false`. Actual NEP-413 authentication/replay rejection, owner/session/CSRF checks, provider ownership, finite funding, restricted key, false-receipt rejection, concurrent workers, duplicate/early-cycle checks, second real due cycle, cancellation/key deletion and both recipient wallet increases. See [testnet-proof.json](docs/testnet-proof.json). |
| Real testnet browser journey | Passed against **7587362**, subscription 8, `application_source_dirty: false`. Actual UI sign-in, separate funding/key approvals, paid artifact, cancellation, key deletion and finalized withdrawal. The test checks the receiving wallet increase and records the withdrawal transaction. See [browser-testnet-proof.json](docs/browser-testnet-proof.json). |
| Recovery fault injection | 9 checks passed against an already-paid real testnet receipt in a separate PostgreSQL database, with no signing key. Covers a second unresolved cycle, altered artifact, invalid schema, outage and PREPARED/SUBMITTING/UNCERTAIN/SETTLED recovery. Receipt cycle and reserved funds remained unchanged. See [recovery-proof.json](docs/recovery-proof.json). |
| Docker | Backend and frontend images built from clean package installs. Final backend image passed typecheck and 6 tests; final frontend image passed production build. Default Compose schema validated; it starts PostgreSQL only. |
| Dependencies | Frontend npm audit: zero findings. Backend: 3 low findings through optional inference SDK / DCAP / elliptic; no moderate/high/critical findings. No upstream fix reported; see [security review](docs/SECURITY_REVIEW.md). |
| Credentials | Recognizable format scanner passed tracked files and all 289 reachable historical blobs at the hardening checkpoint. Actual environment/key/trace files are ignored; no credentials were found in the published history. This is not a guarantee against every possible secret format. |
| Loops | Authenticated loopshouse 0.6.0; actual Agent Economy and AI Security & Defense prompts fetched and executed as agent-run source reviews. Both concrete robustness findings were fixed and tested. No hosted-judge score, paid query, credit purchase or submission record. See [review](docs/evaluations/LOOPS_REVIEW.md). |
| Hackathon guide | Live HACKATHON.md reread and compared with the saved guide on 10 November 2026: unchanged at that check. No application/social post sent. |

## Remote CI

- [Application — 7587362, run 42822354854](https://github.com/neelpote/accord-near/actions/runs/42822354854): **passed** clean backend/frontend installs, types, six unit tests, repeated additive migration, audit thresholds, production build, browser presentation and credential scan.
- [NEAR contract — d2f91ec, run 42821060620](https://github.com/neelpote/accord-near/actions/runs/42821060620): **passed** formatting, unit tests, strict Clippy, official checked tool install, WASM build and real Sandbox test. Contract source/lockfile are unchanged in 7587362; the workflow is path-scoped.
- [Application — d2f91ec, run 42821060716](https://github.com/neelpote/accord-near/actions/runs/42821060716): passed the initial complete application checkpoint.

Earlier contract CI run 42774553164 failed in a tool installer that searched runner-owned `/tmp` directories. It was fixed by scoping the extraction directory; no contract assertion/check was weakened. The successful reruns are linked above.

## Evidence boundaries

The browser uses a developer fixture implementing the standard NEAR Connect injected-wallet API. Keys stay in the Node test process; actual signatures and testnet transactions pass through the UI/API boundary. Individual third-party wallets' popup/redirect/hardware workflows are not certified by that fixture.

The 63-second [demo recording](docs/demo/accord-testnet-demo.webm) shows the real testnet browser acceptance run. Public portfolio values are illustrative supplied snapshots. The deterministic report is not live market intelligence. The contract credit is distinct from a provider's external withdrawal.

NEAR AI Cloud authenticated TEE preflight passed. Generation returned HTTP 402 (spending limit/credits missing), and the user requested pausing it. No successful AI completion or end-to-end private application is claimed. The optional adapter and schema checks remain available for later credit-enabled verification.

The review is agent-run, not an independent audit. Development deployment keys retain upgrade authority, subjective service quality is not enforced, and customer demand is unvalidated. See [SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md), [NEAR_AI_STATUS.md](docs/NEAR_AI_STATUS.md), and [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Five-agent expansion — 10 November 2026

Added Wallet Watch, Access Guard, Contract Sentinel, Receipt Inspector and Network Pulse as live RPC-backed rule services. Existing contract source and monetary rules are unchanged.

- Backend typecheck and 13 unit tests passed, including all five kinds, invalid inputs, currency arithmetic, permission flags, code changes/global-reference handling, receipt failures, stale/wrong-network data and RPC errors.
- Frontend typecheck and production build passed. Two offline browser tests passed: responsive presentation and correct input schema/defaults for each of the five services. These fixtures are presentation tests, not monetary proof.
- Recovery regression suite passed all 9 checks with service metadata populated in its isolated database.
- Live five-agent demonstration passed: services 2–6, agreements 9–13, two actual paid cycles each, exact artifact/receipt checks, cancellation, key deletion and actual customer/provider wallet increases. See docs/agents-demo-proof.json. This first expansion run occurred against a working tree and records `source_dirty: true` explicitly.
- Public paid-example browser check passed for all five, including rendered metrics, source blocks, hashes, recorded-snapshot labeling and mobile width. The five-agent walkthrough is recorded in docs/demo/five-agents-showcase.webm.
- A fresh Wallet Watch UI purchase passed against real testnet (agreement 14), with actual sign-in, separate approvals, report delivery, cancellation, key removal and verified exit. See docs/browser-live-agent-proof.json and docs/demo/live-agent-wallet-demo.webm.
- Public examples are explicitly published synthetic fixture results. No customer-session report endpoint was made public. The running scheduler serves new customer-approved agreements; demonstration subscriptions are canceled after verification.
- The local Docker database was recovered after disk exhaustion. Regenerable build/package caches were cleared; existing database records were preserved. No volume or source-work deletion was performed.
- Initial recording capture collided with a parallel browser runner's temporary directory. Rerunning the recording alone passed; the failed capture is not counted as success.

Remote CI for the expansion is checked after the tested source is pushed. See docs/AGENT_SERVICES.md for service descriptions, IDs, inputs, outputs and reproduction commands.
