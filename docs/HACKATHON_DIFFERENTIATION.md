# Accord: a stronger submission

## Verdict

The current contract and paid-report delivery are substantial, but a catalog of five checks is an infrastructure demonstration rather than a compelling complete product. Adding Groq alone does not change that. There is no credible basis for a numerical winning probability: competitors, judge priorities and real customer demand are unknown.

Position Accord as **a NEAR operations copilot with a spending limit the dispatcher cannot override**. Initial user: a developer or small team operating a NEAR application, who needs recurring checks without giving a monitoring agent a full-access wallet key. The product combines public-chain observations, understandable explanations and inspectable paid receipts.

This is a product hypothesis, not validated demand. Interview three NEAR maintainers: what failures do they monitor today, what did a missed change cost, and would they pay for repeated checks? A useful answer needs an existing workaround or concrete incident, not merely enthusiasm for agents.

## Why this direction

The existing five services become tools for one workflow: operate a NEAR application. Contract identity, permissions, low reserves, transaction outcomes and RPC freshness are related operational questions. Groq explains a bounded observation; deterministic code owns measurements and status. NEAR enforces price, recipient, frequency, finite cycles and expiry; a model never decides how much it is allowed to charge. A report digest binds settlement to a frozen artifact, but does not prove subjective quality or make model claims true.

The primary fit is Agent Economy: recurring services earn NEAR from customer-authorized bounded agreements. Do not claim an autonomous hiring/negotiation swarm: the current worker dispatches agreed services, with a shared provider. The official example prompt proposes a general contractor; it is an example, not evidence that our implementation already has those features.

## The demo that would stand out

Recommended next implementation, not completed or represented as existing evidence:

1. Start with a disposable testnet application and a real approved contract-code baseline.
2. Show a healthy paid report, its source block, frozen artifact and payment receipt.
3. Deliberately upgrade **only that disposable contract**, clearly labeling the controlled scenario. Never modify Accord's escrow for a demo.
4. Contract Sentinel detects the changed hash. Groq explains that code identity changed, without inventing an exploit or declaring the upgrade malicious.
5. The user inspects before/after hashes and chooses the next action. Remediation stays manual.
6. Cancel future purchases, remove the restricted key and withdraw the unspent remainder. Show that a later attempted charge is rejected. Reuse contract test evidence only when labeled as tests; record the controlled scenario separately.

This ties problem → evidence → explanation → human decision → bounded payment together. A happy-path list of metrics makes the value harder to see. The working Network Pulse Copilot integration is a smaller end-to-end foundation, not the completed incident demo.

## Priority and acceptance criteria

| Priority | Improvement | Done when |
| --- | --- | --- |
| Now | Groq over real observations | Actual inference succeeds, schema checks pass, two paid cycles deliver the exact frozen explanation, no fallback on failure |
| Next | One account-focused operations screen | User identifies their application once and sees time-stamped observations and paid receipts together, without manually navigating five JSON forms |
| Next | Controlled code-change story | Real disposable deployment, before/after blocks and alert, recorded response and cancellation proof |
| Next | Evidence timeline | Each event links observation time, source block, report digest, credited amount and agreement state; recorded versus fresh data is explicit |
| Before submission | Judge-friendly access | Reproducible local demo and short video; public hosted read-only examples if feasible; third-party wallet flow manually checked |
| Before submission | External feedback | At least three maintainer conversations and honest unresolved objections in the pitch |

## Alternatives audited

- **More generic agents or a chat page:** quick visual expansion, but increases breadth without demonstrating operational value. Keep five tools; improve one story.
- **Autonomous trading:** larger financial risk, unvalidated trading advantage and a different product. Poor use of remaining time, especially under testnet-only authorization.
- **Agent hiring/negotiation marketplace:** stronger literal match to the contractor example, but requires discovery, independent providers and quality verification that are not implemented. Do not simulate them and claim commerce between independent parties.
- **Automatic key removal or rollback:** a wrong model decision can lock out a user or disrupt a service. Keep decisions manual; consider narrowly authorized remediation only after dedicated design and tests.
- **Private AI claim with Groq:** unsupported. Groq sees the public evidence sent to it; no model TEE attestation is claimed. Retain the paused NEAR AI adapter as a separate option.
- **Switch to x402:** useful for single HTTP purchases, but does not replace our fixed recurring spending agreement. Adding it now would split the payment story without solving the initial user's recurring-monitoring need.

The honest competitive claim is inspectable recurring agent work under contract-enforced terms. A polished incident story and evidence are more valuable than claiming the platform is unique, audited, trustless or guaranteed to win.

Sources checked 11 November 2026:
- https://nearhackathon.com/HACKATHON.md
- https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/07-agents.md
- https://console.groq.com/docs/structured-outputs
