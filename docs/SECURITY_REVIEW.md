# Implementation security review

Agent-run review using the installed official NEAR contract-audit guidance, strict Clippy, unit tests, real Sandbox, testnet/API/browser checks and fault injection. This is not an independent audit or a guarantee of no defects.

## Checks and resolved findings

- Contract charges obtain price/recipient from immutable service storage; require exact direct owner signer and delegate public key. Tests cover wrong account/key, early billing, expiry, exhaustion, duplicate cycle and artifact replacement.
- Exact prepaid budget and bounded cycles use checked integer math. Underpayment and multiplication overflow fail. Account/service and receipt growth are bounded and funded by conservative fixed storage fees.
- Native transfers deduct first, permit one pending withdrawal, require positive amount and adequate callback gas, and use a private callback. Unit tests cover restoration on failed transfers; Sandbox and testnet check actual recipient balance increases.
- Cancellation revokes future contract spending even if the worker has not seen the cancellation. Already-paid artifact retrieval remains valid. Removing the key also revokes gas authority.
- API ownership comes from NEP-413 and full-access public-key verification, not a browser account field. Replay, wrong session, missing session and cross-origin mutation checks passed.
- Encrypted delegate material is never returned to the browser or included in logs. Customer full-access keys are absent from production handlers. Development fixture keys are separate, ignored local files.
- Advisory locks, a one-unresolved-cycle partial unique index, frozen artifact hashes and contract idempotency prevent replacement purchases. Late worker writes cannot regress DELIVERED. Provider proof comes from a final onchain receipt; fabricated browser SUCCESS objects cannot release reports.
- Browser tests exposed optimistic-versus-final transaction activation. API now independently confirms FINAL transaction status and checks receiver/signer/receipt failures before the UI advances.
- The public rpc.testnet.near.org endpoint returned an explicit deprecation/rate-limit error. The active default now uses the FastNEAR testnet endpoint listed by official NEAR docs and verifies network identity at process startup.
- Fault tests altered reports, returned invalid schemas and simulated provider outages. Each retained a paid-but-undelivered cycle and blocked new purchases. PREPARED/SUBMITTING/UNCERTAIN/SETTLED recovered the existing receipt/artifact without a signing key or changes to onchain balances/cycle count.
- Optional AI inference verifies TEE preflight and response signatures through the official Node SDK, requires a model-TEE signature, and cannot silently substitute deterministic output. Credits are unavailable; offers/inference are paused and no live output is claimed.

## Remaining limits

| Item | Impact / treatment |
| --- | --- |
| Development deployment keys | Deployer can replace code or transfer funds. Testnet only; disclosed. Mainnet requires an independently reviewed custody/upgrade policy. |
| Subjective service quality | Hashes bind content, not correctness. No automated refund/arbitration. |
| Data sources | The portfolio service uses supplied values; five added monitors query live NEAR RPC data. No market-price feed or market-demand validation is claimed. |
| Provider preparation interruption | Review required before a new inference attempt after an opaque failure; availability can pause safely. |
| Third-party wallet variants | Standard connector boundary tested with a real-signing fixture; individual vendors' redirects/hardware-wallet UI remain manual verification. |
| Backend dependency advisory | Three low npm findings trace to the official inference SDK's @phala/dcap-qvl → elliptic dependency. No upstream fix reported. It is used for public attestation/certificate verification, not customer NEAR signing. AI is paused. No moderate/high/critical npm findings remain in active backend; frontend reports zero. |
| Production operations | No independent audit, production key manager, backup/recovery rehearsal, hosted-service SLA, abuse/load test or production DB privilege separation is claimed. |

No unresolved critical/high issue was identified in this scoped agent review. That statement is bounded by the checks above and is not independent certification.

## Five-agent expansion review

The contract and spending authority are unchanged. New inputs accept testnet account IDs, bounded hashes and explicit thresholds, not caller-selected RPC URLs. Unexpected input fields are rejected. Public metadata is checked against its immutable hash before preparation/payment; delivered kinds cannot substitute for a different service. Agent schemas bound metrics and textual output, and numeric currency calculations use BigInt.

Unit checks cover low/negative-headroom handling, broad/unlimited permissions, code mismatch, failed receipts, stale blocks, wrong chain, RPC failure and report-kind substitution. The agents only read public data and never modify keys or deploy code. Demonstration publishing is an explicit developer script operating dedicated synthetic fixtures; no generic customer-report publication endpoint was added.

## Operations pilot review

Agent-run review, not independent audit. Wallet-private workspace, incident, report-link, export, feedback and deletion routes reuse existing NEP-413 sessions and origin checks. SQL parameters, UUID/numeric validation, scoped ownership queries, account limits, observation cooldown and owner-level transaction locks constrain abuse. Optional creation allowlist is recommended before public pilot exposure. No arbitrary user webhook URL is accepted; operator configuration remains trusted and should be constrained by deployment egress policy.

Baseline approval locks the row, matches the reviewed proposal digest and rejects expired proposals. RPC code/key reads are pinned to the same finalized block; stale clocks/blocks fail closed. RPC correctness remains a trust dependency. Unknown/global-contract identity is not treated as a safe local-code match. Change detection is polling, not complete event indexing or exploit detection.

Grouped incidents and outbox insertions are atomic. Acknowledgement, monitoring changes and paid-link events are transactional. Delivery is at least once, signed, timeout/redirect bounded and retried up to five times; receiver replay protection and event-ID deduplication are required. A paused worker cannot send outage alerts about itself. Queued delivery is not recalled by acknowledgement or monitoring pause.

Exports normalize dates before hashing; the browser verifies the downloaded body. Large exports explicitly mark truncation. Linking paid reports verifies final receipt hash, exact price/provider, owner and account association; a digest does not guarantee quality. Free pilot observations and cached AI commentary are not charged through escrow. AI receives public evidence only and has no tools or wallet keys. No hosted backups, public deployment, independent audit, mainnet launch or customer-demand validation is claimed.
