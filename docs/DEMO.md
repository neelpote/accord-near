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
