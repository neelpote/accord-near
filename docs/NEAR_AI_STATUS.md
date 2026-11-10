# Optional NEAR AI Cloud adapter — paused

Official `@nearai/inference-sdk` 0.3.0, Node 24.22.2. Model discovery confirmed `z-ai/glm-5.3-flash` is available. Authenticated non-billable `verify(model)` preflight passed with gateway/model TEE verification and an UpToDate policy.

Two capped acceptance attempts failed at generation; the final diagnostic was HTTP 402: "No spending limit configured. Please contact support to set up credits." No successful model output or verified completion is claimed. The user asked to skip credit setup for now. The provider remains deterministic and AI offers/inference are disabled by default.

The implemented optional path uses the official Node SDK with E2EE, Ed25519 signing, gateway TLS binding and model verification. It verifies the response before freezing an artifact and requires `provider_tee` evidence. It never silently substitutes a deterministic report for an AI agreement. Schema bounds reject malformed output. Persistent preparation claims and a global request cap prevent automatic duplicate generation after a crash or opaque error.

No credit purchase, automatic top-up or mainnet transaction is performed. The API key stays in the ignored backend environment file. To enable later: configure free-credit availability, choose an explicit small `NEAR_AI_MAX_REQUESTS`, successfully run `npm run near:proof:ai`, then set `NEAR_AI_ENABLED=true` and register a new immutable AI-mode offer. The account's existing lifetime request count remains in PostgreSQL; do not silently reset it to evade the cap.

The adapter's live completion and failure-recovery path remain unverified until credits are available. Unit schema checks and authenticated TEE preflight are narrower evidence.
