# Demo and submission preparation

Recorded real acceptance journey: [accord-testnet-demo.webm](demo/accord-testnet-demo.webm), about 63 seconds. [Transaction evidence](browser-testnet-proof.json) identifies the exact tested source commit and actual testnet operations.

Show a real user action leading to a paid report, then cancel and exit. Use testnet and label the developer fixture wallet when showing automated footage.

1. Start all processes and register the supplied-portfolio report with a dedicated provider account.
2. Show the marketplace's fixed provider, price and minimum interval.
3. Sign in, choose a maximum of three reports, and inspect the exact prepaid budget and retained storage fee.
4. Approve funding, then separately install the charge-only key.
5. Show Paid · delivered, the report, its artifact hash and verified provider credit.
6. Cancel future billing, remove the key and withdraw the remainder. Show the finalized transaction and actual receiving balance.
7. Show the provider's separate earnings withdrawal and the reproducible repository checks.

The automated live browser test uses a fixture wallet implementing NEAR Connect's standard injection API. Signing happens in the Node test process with dedicated testnet keys; transactions are real. This is not a recording of a third-party wallet's approval interface. Browser smoke tests use a presentation fixture; they are not money proofs.

NEAR AI Cloud is not part of the working demo: attestation preflight succeeded, but generation is paused after HTTP 402 (no spending limit/credits). The report is clearly labeled deterministic and based on illustrative supplied holdings. Do not describe it as live market intelligence or private end-user inference.

Before submission, reread https://nearhackathon.com/HACKATHON.md. The current saved guide's deadline is 2026-11-14T23:59:00Z. The human must provide team lead, contact, team size, final tracks, mainnet prize-payout account, consent and public demo-post URL. The agent must present the exact JSON payload and receive confirmation before submitting once. No application or social post has been sent.

Possible demo-post draft for human review only:

> I built Accord at NEAR HACKATHON: finite recurring purchases for agent services. A NEAR contract limits each charge by provider, price, interval and expiry; a limited key automates purchases, while the owner can cancel and withdraw the remainder. Testnet demo and reproducible source: https://github.com/neelpote/accord-near @NEARProtocol #NEARHackathon

Attach the actual demo video. Explain in the README/demo that the financial integration is new hackathon work built on an existing marketplace baseline. Do not invent usage or customer validation.

## Current security-focused storyboard — 12 November 2026

The older 63-second portfolio demo above is historical. A new recording should lead with the current user problem: an agent operator needs to control who gets paid and how much authority the worker holds.

1. Show a finite report agreement and its provider, price, cycle limit and retained storage fee.
2. Enable the contract-scoped key; show the pending warning in **Payment security** and that no receipt/payment exists yet.
3. Inspect the exact recipient, method, amount, reason codes and evidence. Approve once through the owner's session.
4. Show the consumed authorization, one on-chain receipt and matching delivered artifact. Agreement 22 is existing evidence, not a request to fund another demo automatically.
5. Show the adversarial-output fixture and its zero-signing log. Label it exactly; do not claim the current script ran a prompt-injected agent. Complete the causal attack/control demonstration before making that stronger claim.
6. Show cancellation and removed key; explain that full-access owner/admin authority is separate and the reputation gate is off chain.

Before publishing, confirm the public demo is reachable and capture the current security UI. The human posts the final recording/screenshots to X with the required tags, supplies the link and approves the exact application payload. See [the current handoff and readiness audit](PROJECT_HANDOFF.md). No new demo post or application has been sent by this audit.

## Current security acceptance — 13 November 2026

The causal-demo and current-wallet-rerun gaps in earlier dated notes are now closed. Actual live clean/poisoned model completions, funded agreement 31, blocked agreement 32, native agreement 23 and Ethereum agreement 28 are documented in [SECURITY_WALKTHROUGH.md](SECURITY_WALKTHROUGH.md), with raw footage and independent finalized readbacks. The security film uses those actual captures; no stronger third-party wallet UI or production-security certification is claimed. Human social posting and final submission remain outside this engineering delivery.
