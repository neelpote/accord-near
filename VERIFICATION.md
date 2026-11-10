# Verification log

## Baseline — 10 November 2026

- Backend and both existing workers: TypeScript check passed using Node 24.22.2.
- Existing frontend lockfile missing; repair required before a reproducible container build.
- Docker Desktop started; server version 29.4.3 reachable.
- All eight near/agent-skills packages installed in the user skill directory.
- Loops 0.6.0 CLI executed; near-hackathon event discovered; generic project skills installed. No authenticated evaluation yet.
- Nothing is deployed; no financial test has passed yet.

## Native contract checkpoint — 10 November 2026

- `cargo +stable test --lib`: 11 passed, zero failures.
- `cargo +stable fmt --check`: passed.
- `cargo +stable clippy --all-targets -- -D warnings`: passed after fixing one numeric-format lint.
- `cargo-near 0.23.0 ... build non-reproducible-wasm --locked --no-abi`: passed; optimized WASM 193,114 bytes, SHA256 `bc308e9d63274f6ea64db7b24869d55145739b7c63635c16ec685f4921299ff6`.
- `cargo +stable test --test test_basics`: passed against NEAR Sandbox 2.14.0. Real WASM, receipts, transfers and callbacks; recurrence time fast-forwarded locally.
- Loops House 0.6.0 authenticated; actual `near-hackathon` / `agent-economy` evaluator prompt fetched to `docs/loops-agent-economy-prompt.json`. No project/submission created and no credits purchased/spent. Prompt execution/review is pending.
- Public testnet deployment is in progress; it is not yet claimed as verified. API/frontend work is not included in this contract checkpoint.

CI run 42774553164 passed formatting, unit tests and strict Clippy, then failed because the installer searched all of `/tmp` and encountered runner-owned directories. Scoped extraction/search to `/tmp/accord-cargo-near`; no contract checks were weakened. Remote WASM/Sandbox checks await the rerun.

## Application integration — 10 November 2026

- Real testnet API/worker proof passed: NEP-413 ownership and nonce replay protection, wrong/missing session, CSRF origin check, provider ownership, finite funding and restricted key, false-receipt rejection, simultaneous workers, duplicate retry, early billing, two actual due cycles, cancellation/key removal and both recipient wallet increases. Initial application source was still uncommitted; evidence records this explicitly.
- Browser acceptance reached real testnet report delivery/cancellation/key removal. Its first withdrawal assertion was too weak (button could be disabled during loading), so this is not yet counted as full browser exit evidence. A stronger finality, transaction-hash and wallet-balance assertion is being run before the application push.
- TypeScript checks, four Node unit tests, production Next.js build and mobile-width presentation check passed. Additive database migration passed twice.
- Provider fault injection passed eight checks against an already-paid receipt without a signing key. Added a ninth check for the one-unresolved-cycle DB constraint; final rerun pending.
- Both application Docker images built using Node 24.22.2. Final code/container gate and remote application CI remain pending at this entry.
- npm audit: frontend zero findings. Backend has three low findings via optional inference SDK / DCAP verification / elliptic; no moderate/high/critical findings. Details in docs/SECURITY_REVIEW.md.
- AI preflight authenticated and verified the TEE. Generation returned HTTP 402 (spending limit/credits missing); user asked to pause. No successful AI completion claimed.
- Recognizable secret scanning now also checks API-key formats. Runtime credentials remain ignored local files.

### Final local application gate

- Repeated live API/worker proof passed for subscription 5 after switching to the current FastNEAR testnet endpoint. Actual second due cycle, cancellation, key removal and customer/provider wallet increases verified.
- Stronger live browser run passed for subscription 6 (55.1 seconds). It waits for final withdrawal status, records the withdrawal transaction and checks an actual receiving-wallet increase, in addition to sign-in, separate approvals, paid report, cancellation and key deletion.
- Recorded the real browser testnet journey at docs/demo/accord-testnet-demo.webm. It uses the explicitly disclosed standard-interface fixture wallet; no private key enters the page. No trace/cookie files are published.
- Recovery fault suite: 9 passed, including the partial unique index rejecting a second unresolved cycle. No signing key or new monetary transaction is used in that suite.
- Awaited UI polling and immutable-service caching reduce overlapping public-RPC requests.
- Application Docker images built from clean package installs; backend typecheck and four unit tests also passed inside its image. Local host checks passed on Node 24.22.2. Remote application CI will verify the committed revision independently.
- Live hackathon guide reread and compared: no change to the saved guide at this check. No application or social post sent.
