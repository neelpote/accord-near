# Loops-guided counterparty review

Date: November 12, 2026. Source: `loops evaluate --event near-hackathon --sponsor ai-security-defense --format json`, using the installed [Loops evaluation skill](../../.agents/skills/loops-evaluate/SKILL.md).

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
