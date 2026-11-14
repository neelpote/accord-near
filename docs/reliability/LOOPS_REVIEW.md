# Loops-prompt review of the three reliability priorities

Method: ran the free `loops evaluate --event near-hackathon --sponsor ai-security-defense --format json` command and applied its returned evaluation rubric to the local code/proofs. The [installed skill](../../.agents/skills/loops-evaluate/SKILL.md) fetches a prompt for the coding agent to execute; it does **not** supply independent approval, a security audit or a human judge's verdict. No paid knowledge queries, public project updates or messages were made.

## Alignment summary

Explicit payment authority and the counterparty refusal/review gate closely match AI Security & Defense. The new work adds owner-approved execution identity, frozen acceptance criteria and accountable delivery to that existing path. The risk analyst's presence alone is not a differentiator: explanations must be more useful than the deterministic monitor, and the failed small-model runs show why that cannot be assumed.

## Verified strengths

- `contracts-near/src/lib.rs` enforces economic limits on chain; `backend/src/near/execution-policy.ts` adds explicit owner/build/input/provider checks before decryption/signing. `assertLimitedKey` verifies one receiver, exactly `charge`, finite allowance. Restricted keys cannot perform owner-only exits.
- `backend/src/near/counterparty.ts` / policy tests preserve BLOCK refusal and exact owner WARN approval. Prior causal clean/poisoned live-model artifacts remain separately available; a new local model does not retroactively change those proofs.
- `backend/src/near/service-delivery.ts` checks prepared reports and independently retrieves supported source evidence **before** new payment. HMAC covers provider requests and responses. Verification statuses and disputes are distinct from final receipts.
- `backend/src/near/risk-analyst.ts` cannot select a wallet tool or authorize a transaction. The paid previous baseline is independently bound in `worker.ts`; unsupported evidence and failed inference are not converted to deterministic work sold as AI.
- `SECURITY.md`, `DELIVERY.md` and their testnet/recovery proofs distinguish sandbox/controlled HTTP tests from actual testnet transactions. Frontend panels expose these distinctions and retain factual correctness as unverified.

## Gaps and feedback applied

1. **Small-model JSON success concealed semantic errors.** Rejected it, retained all three trial outputs, selected a stronger pinned local model, added a repeatable 22-case comparison and kept human precision/recall/value metrics unclaimed. This is the highest priority acceptance gate; model availability is not sufficient.
2. **Provider could otherwise choose its historical baseline.** Worker now requires the exact prior paid report and matching receipt/provider/amount/artifact hash, then independently retrieves both snapshots. Tests reject substitution.
3. **Credentials separated by environment are not an OS sandbox.** Operator guide explicitly requires independent runtime/network/database privileges for deployment. No claim that shared-host compromise or mutable public model prose is solved by a source digest.
4. **Money and delivery are different promises.** UI/specs distinguish receipts, supported evidence checks and unverified conclusions. Disputes cannot silently reverse finalized funds or be self-dismissed by a provider.
5. **Unreleased code must not be mistaken for hosted behavior.** Changes are local commits only. Existing deployed contracts/app remain unchanged; staging migration/rollback and deployment risks are documented.

## Per-criterion assessment

| Criterion from returned rubric | Evidence and remaining work |
| --- | --- |
| NEAR Tech Usage — 35% | Real scoped access keys, finalized RPC evidence, immutable NEAR billing receipts and testnet exits. No claim to Agent API/TEE integration for the local analyst. Custom escrow controls cadence, artifact-bound payment and owner exits on testnet; it is not presented as a superior generic Agent API replacement. |
| Real, Not Simulated — 25% | Separate actual signed testnet proofs from controlled model/RPC fault cases; preserve failures and transaction references. Local model inference must be identified as MLX, never NEAR AI Cloud. Human value remains untested. |
| Track Fit — 20% | Prevention before signing and auditable authority are the core security contribution. Monitoring explanations are advisory; no automatic exploit detection or recovery guarantee. |
| Execution & Completeness — 20% | Existing subscription/cancel/withdraw paths and new verification/recovery tests are exercised. AI semantic evaluation, operator isolation and an authorized hosted rollout remain release prerequisites. |

## Bounty fit and gate

The first/second/third-place bounties share the same track requirements; this review assigns no numeric project score, rank or win prediction. Track alignment is strong for constrained signing and delivery accountability, partial for a useful evaluated AI analyst, and unverified for actual customer demand. This prompt-based review permits continued **local testing**, but does not approve production release or mark human-reviewed AI acceptance complete.

Top next steps: finish the current model/testnet evidence, obtain real human labels and usefulness judgments for every evaluation case, then rehearse isolated staging deployment and paid artifact recovery before considering rollout. Public submission consent and the human-owned X post remain separate from implementation.
