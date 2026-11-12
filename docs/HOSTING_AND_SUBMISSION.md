# Hosting and submission handoff

Checked 2026-11-12. Public URL: **https://accord-near-ten.vercel.app**. The hosted testnet wallet journey passed, including report delivery, cancellation, limited-key removal and withdrawal (agreement #19; `hosted-wallet-proof.json`). Vercel authentication is restored, project `accord-near` is created, and the Neon `free_v3` database `accord-near-db` is provisioned in `iad1`. The public browser/API checks are recorded in `hosting-proof.json`; initial deployment tests ran against an uncommitted working tree, explicitly recorded as such.

## Deployment layout

The root `vercel.json` uses Vercel's current Services and Daemons products:

- `web`: Next.js from `frontend/`, Node 24.x. `ACCORD_VERCEL_SERVICES=true` disables the local API rewrite; the top-level Vercel router owns `/api/near/*`.
- `api`: backend Docker image running `hosted-api.ts`. HTTP instances mount the existing Express app under `/api/near` and disable their local background loops. Auth, CSRF and financial handlers are shared with local development. `/ready` still checks the persistent worker's database heartbeat.
- `dispatch`: one 1-GiB persistent container in `iad1`, running the existing provider and API/worker entry points together. The provider stays private on `127.0.0.1:4001`, preserving the immutable offers' existing provider URL. The supervisor terminates both children if either exits, and forwards shutdown signals. There is no public ingress to this worker container.
- PostgreSQL: Neon free plan, durable state shared by API and worker. No container filesystem is treated as durable storage.

This avoids another hosting account and avoids rewriting the tested financial dispatch loop into cron jobs. It does introduce a beta hosting dependency. [Vercel Services](https://vercel.com/docs/services), [container runtime](https://vercel.com/docs/functions/runtimes/container), [persistent workers](https://vercel.com/docs/daemons).

The Vercel account is Hobby. [Its worker quotas](https://vercel.com/docs/daemons/limits) are 420 GB-hours of provisioned memory and 5 active CPU-hours per month, shared across the team. One 1-GiB container uses about 24 GB-hours/day; reaching a quota stops workers. This is suitable for a bounded hackathon pilot, not an uptime promise. Check actual team usage and keep the demo running through November 18, ideally November 25. No paid plan or credit purchase is authorized or configured by this rollout.

Production environment:

- `NEAR_NETWORK=testnet`, existing contract/provider IDs, RPC and `PROVIDER_URL=http://127.0.0.1:4001`.
- `PUBLIC_ORIGIN` must match the stable production Vercel origin exactly. Wallet recipient, CSRF and secure cookies depend on it. Arbitrary preview origins are not authorized.
- `DATABASE_URL` is integration-managed. The persistent supervisor switches both children to `DATABASE_URL_UNPOOLED` because financial dispatch uses session advisory locks; a transaction pooler cannot preserve those locks. Backend secrets are stored in Vercel production environment variables; never use `NEXT_PUBLIC_` for secrets. Only the backend reads signing/inference settings. `.vercelignore` excludes local credentials, environment files and tool directories from uploads; the backend Dockerfile copies only explicit source/package/script files.
- Preserve `DELEGATE_ENCRYPTION_KEY` with the database. Retain catalog metadata, prepared reports, receipts and durable inference counters; chain state alone cannot recreate them.
- NEAR AI stays disabled. Existing Groq counter/cap are preserved. No inference is needed to verify hosting. Optional webhooks remain unconfigured.

The local source database is retained. A private custom-format backup is saved under ignored `.tools/backups/`; backup data can contain encrypted restricted credentials and must stay private. The old local workers are stopped for cutover. Compare all table row counts and content digests after restoration, before clearing inherited sessions/challenges. New hosted logins must use a fresh signature. Never run two independently restored databases against the same active agreements.

The supervisor forwards SIGTERM but does not promise completion of in-flight RPC work before exit. Existing idempotency and receipt/artifact recovery remain essential. Test container restart and interrupted-cycle recovery; do not claim an independent audit or production disaster-recovery SLA.

Deploy from the repository root with Vercel CLI 65.14.0 or later. The tracked `frontend/vercel.json` is only the standalone frontend preset; root config owns the hosted multi-service deployment. For a standalone frontend project instead, set `ACCORD_API_URL` to a public HTTPS API origin at build time; the Next config rejects missing/local/insecure upstreams on Vercel.

## Hosted acceptance gate

1. Open the public URL in an ordinary browser and on mobile. Check robot asset loading, scroll chapters, reduced motion and keyboard navigation.
2. Confirm `/api/near/health` and `/api/near/ready` return testnet state. Verify no request is sent to a visitor's localhost. Read `/api/near/config` and confirm the stable public wallet recipient.
3. Connect a dedicated testnet wallet, sign the one-use NEP-413 message, refresh and verify the secure session persists. Reject another origin and another wallet's workspace access.
4. Capture a finalized baseline for a disposable account, induce a benign known change, inspect before/after evidence and verify the exported digest. Keep demo data labeled.
5. Purchase one finite deterministic report with test tokens, observe the receipt/report hash, cancel, remove the charge key and withdraw. Do not run a Groq purchase just to test hosting. Record the actual transaction IDs.
6. Demonstrate contract rejection of early, duplicate, over-budget and post-cancellation charges using the existing contract tests/recovery checks. Distinguish recorded test evidence from a live browser demonstration.
7. Restart the backend and verify persisted monitoring, reports and request caps. Check logs without leaking cookies, delegate material or API keys.

## Before submission, in order

1. Complete the hosting acceptance gate above, or use the explicitly allowed reproducible local demo/video path if hosting cannot be finished. A frontend alone is not a working hosted application.
2. Ask 3–5 actual NEAR maintainers to try the specific workflow. Use [INTERVIEWS.md](pilot/INTERVIEWS.md); record real failures and objections. MiroFish simulation is hypothesis generation, not customer validation or traction.
3. Record a short complete product demo: real change → evidence → optional bounded report purchase → cancellation and remaining-budget control. The existing scroll video demonstrates presentation only, not the complete product.
4. Run CI, review README reproduction steps from a clean checkout, retain baseline/upstream attribution and identify the new NEAR work. Freeze the reviewed commit and link verifiable testnet evidence. No mainnet deployment is required for eligibility.
5. The human publishes the demo on X, states it was built at NEAR HACKATHON, includes `@NEARProtocol` and `#NEARHackathon`, and gives us the public post link. If judges cannot open a hosted demo, provide video rather than screenshots alone.
6. Collect lead name, contact email, team size, final track selection (recommend `security`, and `agents` if the final pitch demonstrates it), mainnet **prize payout account**, demo-post URL and explicit contact consent. A prize payout address does not authorize mainnet transactions. Never invent these fields.
7. Prepare the exact JSON for human review; submit once only after confirmation. Do not publish social posts or submit automatically as part of hosting.

**Deadline:** November 14, 2026 at 23:59 UTC = **November 15 at 05:29 IST**. Official requirements, including local-demo eligibility and the suggested hosting lifetime: [live HACKATHON.md](https://nearhackathon.com/HACKATHON.md). Recheck it at submission time.
