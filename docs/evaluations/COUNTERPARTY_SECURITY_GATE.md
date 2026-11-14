# Loops-guided counterparty review

Date: November 12, 2026. Source: `loops evaluate --event near-hackathon --sponsor ai-security-defense --format json`, using the Loops CLI evaluator workflow. Editor-local skill copies are not runtime dependencies and have since been removed from the repository.

This command supplies an evaluator prompt, not an independent approval or a judge verdict. The following is a repository-grounded engineering review using that prompt. No score, win probability or external endorsement is claimed.

## Alignment summary

Accord now includes a mandatory pre-signing counterparty decision service on its real testnet payment path. The original restricted escrow remains, with evidence-backed review and refusal added to the backend worker. The supplied counterparty example is implemented with explicitly bounded data coverage; broader sponsor integrations are not implied.

## Verified strengths

- `backend/src/near/worker.ts`: only financial worker signing call is inside `secureCharge`; key decryption happens inside its callback. RPC rejects full-access/broad/unlimited keys.
- `counterparty-policy.ts`: deterministic reasons, immutable intent binding, block refusal and one-payment warning authorization.
- `counterparty.ts`: shared evidence reports, RPC proof verification, explicit curator privileges, audit history, fresh evidence recheck and atomic one-use consumption.
- `CounterpartySecurity.tsx`: the owner can inspect actual payment details/evidence, approve/decline and submit evidence. Blocks have no approval button.
- `counterparty-check.ts`: actual database and HTTP boundaries tested. `counterparty-live-proof.json` records real funded warning → approval → payment → delivery and fixture cleanup. `counterparty-attack-proof.json` records actual finalized evidence and zero signing attempts under an injected proposal.

## Feedback applied before release

1. Missing finalized state must not be an approvable unknown: non-overridable refusal is enforced.
2. A public chain transaction must not suffice for approval identity: existing authenticated wallet session plus Origin checks are required; hashes and owner are checked atomically.
3. One report must not become a scam verdict: reports start pending; curated blocks require configured reviewers and an append-only explanation.
4. A first contract observation must not silently become trusted on the next poll: owner-reviewed code identities are separate from observations.
5. Finality delays can create another pending request before a receipt is visible: verified settlement resolves such requests with `resolution: receipt_confirmed`.
6. Historical data must not be overstated: latest-25 activity and observed code changes are labeled; no universal scam detection or full historical index is claimed.

## Per-criterion assessment

- **NEAR Tech Usage (35%)**: real finalized RPC, single-contract function-call key and deployed escrow. Agent API/OutLayer/TEE are not integrated. Existing code enforces billing cadence, exact provider/price/cycle and artifact binding; docs explain this behavior. All execution is testnet, per owner instruction.
- **Real, Not Simulated (25%)**: funded payment and source reads are real. The malicious model output is a deterministic adversarial fixture, disclosed as such. A live-model jailbreak is not claimed.
- **Track Fit (20%)**: clear pre-payment defense, evidence-backed shared reports, human review and constrained signer. Remaining trust boundaries are explicit.
- **Execution & Completeness (20%)**: backend gate, UI, migration, CI checks, reproducible demo and source documentation exist. Before final submission, confirm hosted deployment, human wallet-provider UX and the public demo artifact.

## Bounty fit

AI Security & Defense: implemented counterparty-check example with bounded history and a deterministic attack fixture. It is eligible for human judging; no first/second/third placement is predicted. The event's supplied integration preferences do not justify claiming absent Agent API or TEE functionality.

## Remaining priorities

1. Confirm the deployed version includes this backend and UI, not only a local build.
2. Record the owner review and blocked attack in the submission video; complete actual external wallet popup testing.
3. Obtain actual user feedback; synthetic pilot records and tests are not customer validation. Human demo post and submission details remain separate.

## Release verification completed

The backend and UI are deployed publicly. `counterparty-hosted-proof.json` records actual browser approval and final chain/backend readback for agreement 22, with successful delivery, owner isolation, curator authentication and cleanup. Application CI run 43243063010 passed. The hosted history timeout discovered during acceptance was fixed by batching local history reads and limiting parallel chain reads to four. The initial transport interruption remains disclosed in the proof. Public demo video, third-party wallet-device checks and genuine customer feedback remain submission/pilot tasks; they are not reclassified as implemented security requirements.

## Subsequent source-audit correction — 12 November 2026

The broader track fit and wrapper/approval evidence remain valid. The chosen prompt's attack-demo row is **partial**, rather than literally complete: the script constructs malicious output directly and does not run an agent over the injected document. The logged agreement is not a valid otherwise-executable control. Do not conflate signer refusal with demonstrated prompt-injection causality. Current status, documentation supersession and remaining submission tasks are consolidated in [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).

## Fresh Loops-prompt review — 13 November 2026

Fetched `loops evaluate --event near-hackathon --sponsor ai-security-defense --format json` again and applied its rubric locally to the current code/evidence. This is an agent-run alignment review using the Loops skill, **not external approval, an official score, or security certification**. No paid knowledge query or submission was made.

**Alignment:** the counterparty service and mandatory signing wrapper are genuinely wired into the existing payment worker. The earlier causal-demo gap is now closed for a deliberately vulnerable reference planner: `causal-agent.ts` constructs identical message envelopes around two different tool documents, `causal-agent-responses.json` contains both actual Groq outputs, and `causal-attack.ts` replays them through the real gate against fresh funded agreements. `causal-attack-proof.json` records a successful paid control and a valid-terms reputation refusal with zero signer calls. Current native/Ethereum journeys and independent readback are complete; see `security-journeys-readback.json`.

**NEAR Tech Usage (35%):** real single-contract charge-only keys, deployed native escrow, finalized RPC evidence, NEP-413 and NEP-518. The contract's price/provider, cadence, expiry, reserve and artifact checks are executable code, not a README-only rationale. Loops' sponsor prompt explicitly prefers Agent API for generic spending policies; Accord does not integrate it and should not claim maximum alignment with that preference. The owner's testnet-only constraint remains. No unsupported claim that every Agent API alternative is inferior is made; its current feature parity was not re-verified through the paid knowledge graph.

**Real, Not Simulated (25%):** actual independently captured clean/poisoned model completions plus funded control, exact evidence warning approvals and chain/backend delivery reconciliation. The intentionally weak planner, curated own-account deny fixtures and automated browser signers remain disclosed. One successful injected example does not establish attack coverage or a jailbreak rate.

**Track Fit (20%):** the expected allow/warn/block service, human warning decision, refusal before signing and shared evidence-backed reports exist. Data coverage remains bounded to the documented indexed history, observed code changes and local payment history. Missing finalized state is not approvable. The backend reputation policy is not hardware-isolated or enforced by the money contract against a compromised dispatcher.

**Execution & Completeness (20%):** 25 backend unit tests passed; local database/HTTP security integration and native/Ethereum funded journeys passed. The failed schema-isolation path was corrected with a lazy import and a regression assertion before writes. The film uses actual captures, enlarged evidence and explicit scopes. Third-party wallet extension/device UI, customer validation and human-owned submission fields remain open.

**Bounty fit:** the chosen counterparty example's engineering requirements are demonstrated with the stated data/authority boundaries. Placement in the track's three prizes remains the judges' decision; no numerical score or winning probability is assigned.

**Feedback applied:** enlarge decisive UI crops; keep expected and model-selected receiver visible together; distinguish the injected redirect case from the separate valid-terms reputation case; separate cancellation, absent-key readback and actual withdrawal result in the film. These changes address review feedback without adding unrelated functionality.

**Next three steps:** human external-wallet/device smoke check; owner review/post and exact final application approval; actual target-user interviews. The first two engineering tasks requested in this turn are complete. The review does not authorize posting or submission.
