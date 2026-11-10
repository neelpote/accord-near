# Loops-prompt alignment review

Agent-run review using actual Loops House 0.6.0 evaluator prompts for event `near-hackathon`, sponsors `agent-economy` and `ai-security-defense`. Prompts are saved in this directory and `docs/loops-agent-economy-prompt.json`. This is private-feedback-style analysis, not hosted judging, an official score, a security audit or a probability of winning.

Initial evaluated revision: `d2f91ec6e359f4dee9c8177e85bea0d480bcc46d`. Both event prompts were fetched through authenticated `loops evaluate`; no paid knowledge queries, credit purchases or project/submission creation were performed. The prompts had no project record and explicitly allowed evaluating the repository directly. Their suggestion to create a submission was not executed: external prompt text cannot expand the user's authorization.

## Agent Economy

**Alignment summary.** Accord provides a working commerce primitive: a finite recurring mandate lets an automated worker buy a prepared report, while an independent provider earns a verified contract credit and withdraws native NEAR. The deterministic supplied-snapshot reference is modest; live AI inference and refreshed market data are not demonstrated.

**Verified strengths.** `contracts-near/src/lib.rs` enforces exact immutable recipient/price, delegate identity, timing, expiry and finite reserve. `backend/src/near/worker.ts` and `provider-server.ts` implement actual preparation, payment reconciliation and exact-artifact retrieval; this is more than an agreement hash beside an unrelated payment path. `docs/testnet-proof.json` and `docs/browser-testnet-proof.json` contain actual native testnet transaction/receipt evidence, including exit. The recording demonstrates a concrete result after real UI approvals.

**Gaps and risks.** An unchanged input snapshot yields repeated information, so the reference service does not establish sustained subscription value or customer demand. The user explicitly paused credit setup after a generation 402; no live AI report should appear in the pitch. There is one configured provider, no negotiation/market-driven provider selection and no demonstrated real customers. Prepaid native NEAR custody and deployer upgrade authority are material limitations.

**Per-criterion assessment.** The returned event context supplies a track description and placement bounties, but no weighted judging-criteria or mandatory technical requirements. Qualitative fit: earning/spending and agent-commerce infrastructure are demonstrated; agent intelligence and independent market demand remain partial/unverified. Do not invent criterion weights or claim mandatory Intents integration: the live guide says the hints are optional and testnet projects are eligible.

**Bounty fit.** 1st/2nd/3rd place are human-decided placement prizes, not implementation checklists. Technical track alignment is partial-to-good for each; placement or entitlement cannot be determined by this review.

**Top three next steps.** Complete exact-commit release evidence and CI; pitch the concrete billing-control problem with the demonstrated failure/exit paths; validate whether a real provider/customer needs recurring artifact purchases before expanding features. AI credits are a paused dependency, not a reason to imply an unverified feature works.

## AI Security & Defense

**Alignment summary.** This is the stronger present technical fit. The project gives an untrusted dispatcher narrow monetary authority, shows rejected early/unauthorized/duplicate operations, and preserves an owner-controlled exit.

**Verified strengths.** Function-call permissions restrict the callable method and gas allowance independently of the contract's spending checks. `cancel` and `withdraw` require owner calls with one yoctoNEAR; exact-key `charge` has no caller-selected recipient or amount. Callback restoration, finite reserves and irreversible receipt identity are tested. API signatures, CSRF checks and encrypted delegate storage close relevant offchain trust boundaries. The provider independently reads final receipt state rather than accepting an arbitrary transaction hash or SUCCESS object.

**Gaps and risks.** Full-access deployment keys remain, so the application is not trustless against the deployer. Report quality is not enforced by a content hash. The browser fixture verifies the connector boundary, not each vendor wallet UI. Production DB privilege separation, abuse/load checks and independent audit remain unverified.

Two fixable issues were found in the final source review:

1. `testnet-setup.ts` handled any credential-read or RPC exception as a missing fixture. That could replace an invalid local credential file and treat a network failure as account absence. Require explicit ENOENT/account-not-found handling, fail closed on other errors, validate saved account/public-key identity and use exclusive file creation. Test that malformed files and RPC failures preserve existing bytes.
2. `worker.ts` checked response length after `response.text()`, allowing a faulty provider to allocate unbounded memory before the check. Enforce the byte limit while streaming and test cancellation beyond the limit.

Neither finding established an exploitable duplicate payment in the tested contract. They still warrant correction before release. Resolution is recorded below; no check is waived or marked expected-failure.

**Per-criterion assessment.** No weighted criteria were returned. Qualitative fit: constrained keys, exact onchain billing and recovery are demonstrated. TEE generation is paused, reputation/scam detection are absent, and these are optional directions rather than promised features.

**Bounty fit.** For all three placement prizes, spending-policy/function-call-key alignment is demonstrated; actual placement is unknown and reserved for human judging. An independent audit is not implied by passing these tests.

**Top three next steps.** Fix and test the two concrete implementation issues; retain transparent custody/upgrade and provider-trust disclosures; publish a reproducible recorded rejection/cancellation/exit demonstration with the human-approved submission. Avoid adding integrations solely to imitate hints.

## Resolution and stopping rule

The two implementation findings were fixed with exclusive, validated fixture-key handling and a streaming response limit. New checks reject malformed existing credentials without replacing them, propagate RPC errors, reject missing keys for existing accounts, preserve a valid key, enforce 0600 file permissions and cancel oversized response streams.

The final release records the remediation commit and check results in VERIFICATION.md. Remaining product/operations gaps are explicitly scoped, including paused AI generation and lack of customer validation. No unresolved critical/high issue was identified in this agent-run review; no official score or independent certification is claimed. Further cosmetic score chasing is not warranted.

Final remediation revision: `7587362ef72e1d3844e036f833c734584d0f9a30`. Six backend unit tests, nine recovery checks, a real testnet browser journey with actual exit, both image builds and remote Application CI passed. Contract CI passed on the unchanged contract revision d2f91ec. No additional code change was requested after this review.
