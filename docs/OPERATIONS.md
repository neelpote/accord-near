# Operating the Accord testnet pilot

## What a user does

1. Sign in with a testnet wallet on the home page (NEP-413; sign-in authorizes no payments).
2. Under Application workspace, add a name and 1–5 public testnet account IDs.
3. Capture a baseline, expand each account and compare its code hash and public-key permissions with deployment records. Approve only the reviewed snapshot. Proposals expire after ten minutes.
4. Start read-only monitoring. The pilot compares code identity and access-key permissions approximately every minute. It ignores normal allowance consumption, but flags increased/unlimited allowance, new/removed keys, changed receiver/method scope and changed code identity. A code change is not automatically an attack.
5. Review grouped incidents and before/after source evidence. Acknowledge review; separately capture/approve a replacement baseline only when justified. Reapproval retains previous incidents and timeline events.
6. Optionally request one cached Groq explanation. Public evidence leaves the application for Groq; it can be inaccurate. It has no wallet authority and consumes the capped server inference allowance. Failure enters review instead of automatically retrying.
7. Link an existing delivered account-specific paid report. The server rechecks the final receipt, exact artifact digest, provider and price on NEAR. This requests no new payment. Historical paid evidence is not a current observation.
8. Download a JSON evidence bundle. The browser verifies SHA-256 of its normalized body. Large exports explicitly report truncation; the timeline supports a before-ID cursor.
9. Pause monitoring before deleting pilot records. Separate paid agreements, transactions and escrow reserves remain: cancel, remove the limited key and withdraw under My agreements. Deleting a workspace does not perform those financial actions.

Current caps: three workspaces per wallet, five accounts each, 100 keys per account, 30-second capture/check cooldown. Worker observations are sequential, in batches of ten workspaces, and due at 60 seconds. This is a pilot capacity choice, not a latency SLA. Global-contract references are rejected for manual review rather than pretending to verify local code. RPC observations are not cryptographically authenticated chain proofs; timestamp checks depend on a reasonable server clock and RPC correctness.

## Notifications

In-app incidents persist; they do not alert a user while the application is closed. External delivery is optional and unconfigured by default. The operator sets `OPS_WEBHOOK_URL` to a receiver they control and `OPS_WEBHOOK_SECRET` to at least 32 random characters in ignored backend/.env. Only HTTPS without embedded credentials or fragments is accepted; redirects are rejected. A signed-in user explicitly selects the configured destination for a workspace. Users cannot submit arbitrary URLs. The operator is responsible for the receiver, network egress policy and recipient consent; do not configure a customer destination without that authorization.

Each webhook sends JSON with a stable event `id`, a notification ID and minimal incident context. Verify:

`HMAC_SHA256(secret, timestamp + "." + exactRawRequestBody)`

Headers: `x-accord-timestamp` (Unix seconds), `x-accord-signature` (hex). Use a constant-time comparison, reject old timestamps, and persist processed event IDs to deduplicate. Redact secrets and request headers from receiver logs. At-least-once delivery can duplicate after a crash; it is not exactly once.

Delivery has a 30-second lease, five attempts maximum, five-second request timeout and capped exponential backoff. A successful 2xx means receiver acceptance, not that a human read it. Failed delivery is visible in the workspace. Repeated observations of an open incident do not create repeated notifications; recurrence after resolution opens a new notification occurrence. Acknowledgement does not recall a queued/in-flight notification. Pausing monitoring stops new background observations, not already queued delivery; detach/disable the operator receiver when necessary. A stopped API process cannot notify about its own outage: an external uptime monitor must check `/ready`.

## Run and verify

Use Node 24.22.2 and the existing PostgreSQL/provider/frontend setup in README. Both workers run by default with `npm start` in backend. `RUN_OPERATIONS=false` disables the read-only worker; `RUN_WORKER=false` disables financial dispatch. Neither flag should be silently left disabled at handoff. `/health` identifies the process; `/ready` checks DB availability and a recent operations-worker completion, or explicitly reports a disabled worker.

Set `OPS_PILOT_OWNERS` to comma-separated testnet wallets before a remotely accessible pilot to restrict workspace creation. This is not proof that a wallet represents a distinct team. Use HTTPS, the correct `PUBLIC_ORIGIN`, a private DB, secure environment storage, receiver egress restrictions, service supervision and external uptime monitoring before wider exposure. No public hosting or mainnet deployment was performed by these phases.

```sh
cd backend
npm run typecheck
npm run near:test
npm run near:test:operations
npm run near:test:recovery
# Real testnet: creates/reuses a dedicated disposable canary, changes its marker,
# waits for the real worker, links historical paid evidence, then pauses it.
npm run near:demo:operations
# Optional OPS_DEMO_AI=1 consumes one server-capped Groq request.
```

The isolated operations check creates and drops its own PostgreSQL schema, stubs only the authentication boundary and receipt reader, and uses an actual local HTTP receiver for notification tests. It never certifies wallet-vendor UI or makes live payments. Production auth remains NEP-413. The separate controlled demo performs actual NEP-413 authentication and testnet deployment; the browser acceptance test reuses that real synthetic fixture session.

## Recovery and retention

Preserve PostgreSQL, ignored fixture keys and `DELEGATE_ENCRYPTION_KEY` separately. Changing the encryption key without migration makes existing restricted credentials unreadable. Never delete a production data volume to fix a startup problem. Provider artifacts, cycles, receipts, baselines, incidents, outbox leases and request caps are durable. Incident/notification writes are transactional; paid-but-undelivered recovery remains the existing worker responsibility.

Take encrypted database backups and rehearse restoration into an isolated instance before a public/customer deployment. This release tests schema migration, persisted retry/recovery states and financial paid-artifact recovery; it does **not** claim a hosted backup/restore drill, disaster-recovery SLA or independent audit. Workspace deletion removes its pilot records by cascading foreign keys; separately saved exports, underlying paid history and onchain transactions are not erased.
