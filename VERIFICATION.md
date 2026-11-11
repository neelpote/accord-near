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
- A fresh Wallet Watch UI purchase passed against real testnet (agreement 15), with actual sign-in, separate approvals, report delivery, cancellation, key removal and verified exit. See docs/browser-live-agent-proof.json and docs/demo/live-agent-wallet-demo.webm.
- Public examples are explicitly published synthetic fixture results. No customer-session report endpoint was made public. The running scheduler serves new customer-approved agreements; demonstration subscriptions are canceled after verification.
- The local Docker database was recovered after disk exhaustion. Regenerable build/package caches were cleared; existing database records were preserved. No volume or source-work deletion was performed.
- Initial recording capture collided with a parallel browser runner's temporary directory. Rerunning the recording alone passed; the failed capture is not counted as success.

[Application CI run 42835706811](https://github.com/neelpote/accord-near/actions/runs/42835706811) passed for expansion code `a1be98823be52efe53b99c4c435f711a0574da1e`, including 13 backend unit tests, types, repeat schema migration, production build, dependency audits, two browser presentation tests and the credential-format scan. See docs/AGENT_SERVICES.md for service descriptions, IDs, inputs, outputs and reproduction commands.

The final Wallet Watch UI run tested committed source `a1be98823be52efe53b99c4c435f711a0574da1e` with `application_source_dirty: false`; it passed the full flow in 1.5 minutes. The separate five-agent evidence retains its original working-tree provenance.

## Groq extension — 11 November 2026

14 backend tests, backend/frontend typechecks, production build and two presentation browser checks passed. Actual Groq inference on live testnet observations succeeded; see docs/groq-live-proof.json. A new Network Pulse Copilot offer (service 7, agreement 16) delivered two actual paid cycles with explanations bound into their artifact hashes. Cancellation, restricted-key deletion and buyer/provider withdrawals passed; see docs/groq-paid-proof.json. These live runs honestly record working-tree provenance. Existing five-agent evidence was preserved. Public fixture samples expose six distinct service examples, with kind derived from the report and internal publication keys separating service versions.

Groq calls use server-only credentials, a persistent atomic request ceiling, bounded JSON reads, timeouts and local schema validation. No model attestation is claimed; inference is explanatory and cannot change deterministic status or authorize transactions. Controlled-incident demo and account-focused operations screen are recommendations in docs/HACKATHON_DIFFERENTIATION.md, not completed features.

The live Copilot browser check passed and captured docs/demo/groq-copilot.png. Its first run used the metadata display name while the card correctly displayed the immutable onchain service name; the locator was corrected to select the Groq disclosure, and the rerun passed. Service 7 is named Network Pulse onchain, with Network Pulse Copilot in its pinned metadata. No onchain name was changed.

## Five-phase operations pilot — 11 November 2026

Application release code `b0449d89a9c1f1853071b99069600f5d669b7a1a` passed 17 backend unit tests, backend/frontend typechecks, the production build, three presentation browser checks, eight grouped HTTP/PostgreSQL integration checks and the existing nine financial recovery checks. The operations suite creates/drops only its own schema, uses explicit auth/receipt fixtures and an actual signed local HTTP notification receiver. It tests ownership, concurrent caps/acknowledgements, expired/hash-bound approval, meaningful changes, deduplication/reopening, failure retention, notification retries/lease exhaustion, export hashing/pagination, paid-link binding, disabled AI, demo-excluded metrics and pilot deletion boundaries.

The controlled testnet demo created `canary.buyer.accord-dev-261110.testnet`, deployed two no-op WASM marker versions, waited for the actual background worker and recorded a real code-identity incident. Escrow code hash was unchanged. Actual Groq commentary and a linked historical paid Wallet Watch report were verified. This run retains its working-tree source provenance; it is not a newly paid canary report or an exploit demonstration. See docs/operations-demo-proof.json.

Final browser acceptance against committed application code passed: actual NEP-413 fixture session reuse, real incident evidence, cached Groq explanation, historical paid receipt, verified evidence download, mobile width and no page errors. It is not third-party wallet UI certification. `/ready` reported a recent operations-worker completion. See docs/operations-release-proof.json and docs/demo/operations-workspace.webm.

Caught and corrected during implementation: NEAR SDK query argument mismatch; an accidental stylesheet write rejected by the build; inconsistent pre-serialization timestamp hashing rejected by the export test; missing mock timeline response in a presentation test; and a live browser label locator corrected to the accessible combobox role. Failed attempts are not counted as passes. No customer demand, revenue, public hosted availability, external customer receiver, hosted restore drill or independent security audit is claimed. Loops reviews are agent-run from fetched evaluator prompts; they are not platform approvals.

Final recording follow-up: the initial fast browser run did not await complete historical agreements. A slower capture revealed long source hashes in AI prose overflowing on mobile after that history loaded. Added wrapping, a fixture regression and an explicit full-history wait. The production build, three presentation checks and the broader live acceptance passed; the readable recording is approximately 14 seconds. Latest operations-release-proof.json records base commit 2347768 and the changed stylesheet SHA-256 with application_source_dirty=true. This supersedes the earlier mobile coverage claim; CI for the final follow-up is checked after push.

## Animated frontend — 11 November 2026

Application code ac0e339a7ab4b8da4eff9cd6f7c929350513a9e5 passed frontend types, production build, zero-vulnerability dependency audit, five browser checks (including 320/390 px, role selection, pause/reduced motion and WebGL fallback), plus five explicit no-GPU checks. Production browser capture confirmed actual WebGL rendering and no page errors. Real operations review/export passed; actual Wallet Watch testnet agreement 17 passed sign-in, funding, limited-key activation, delivered report, cancellation, key removal and withdrawal. See docs/redesign-proof.json and docs/redesign-wallet-proof.json. Earlier recordings/proofs were preserved.

A visual-capture script's initial exact link-name selector excluded the arrow decoration and was corrected; it is not counted as successful evidence. The initial hosted CI run was canceled during Ubuntu 26.04 apt-mirror DNS failures before browser tests started. CI is pinned to Ubuntu 24.04 with matching browser download and no-GPU fallback checks; real WebGL is separately verified locally. No application assertion or financial check was disabled.

[Redesign Application CI 43037940816](https://github.com/neelpote/accord-near/actions/runs/43037940816) passed on commit bbbb959 after pinning the runner. This includes all existing backend/unit/integration/schema checks, production build/audits, all five presentation checks and the credential-format scan. Hosted CI uses the explicit no-GPU fallback; the recorded local production scene used real WebGL.

## Artist model / native-scroll revision

User feedback rejected the prior procedural robot gallery. Current code 22653625c0a6e2c38e4cf53ef82d1b206c2d3508 uses the CC0 Robot Expressive asset, a native-scroll Observe/Inspect/Limit sequence and a row-based service directory. Six presentation checks, types/build/audit and actual WebGL/mobile capture passed. The real operations flow passed (7.2s) and an actual new testnet wallet flow passed (2.2m). [CI 43064815992](https://github.com/neelpote/accord-near/actions/runs/43064815992) passed. Model provenance/hash, scopes and receipts are in docs/editorial-proof.json and docs/editorial-wallet-proof.json.

The initial operations attempt timed out with a detached panel; it is not counted as a pass. A financial-history failure could incorrectly clear a still-valid sign-in and recreate the workspace. The failure case now has a regression test, the states are separated and the real flow passed on rerun. Canvas drawing-buffer resize was also separated from CSS sizing after the mobile test caught transient overflow. No test assertion or contract enforcement was removed.
