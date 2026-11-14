# Local development and independent testnet setup

The [README quick start](../README.md#local-setup) starts the frontend, API/purchase worker, independent reference provider and PostgreSQL. This guide explains configuration and the extra steps required for a working catalog on a clean database.

## Configure the four processes

| Component | Command / address | Notes |
| --- | --- | --- |
| PostgreSQL 17 | `docker compose up -d postgres` · `127.0.0.1:55432` | Local-only Compose credentials are in `docker-compose.yml`; durable named volume. |
| API and scheduler | `cd backend && npm start` · `127.0.0.1:4000` | Runs additive/idempotent migrations. Set `RUN_WORKER=false` to inspect without automatic purchases. |
| Reference provider | `cd backend && npm run near:provider` · `127.0.0.1:4001` | Shares the private HMAC secret with the API/worker; releases artifacts against independently read receipts. |
| Frontend | `cd frontend && npm run build && npm start` · `localhost:3000` | The default API rewrite points to loopback port 4000. Set `ACCORD_API_URL` at build time for a different upstream. |

Copy `backend/.env.example` to `backend/.env`, then set **two different** 32-byte random hex values for `DELEGATE_ENCRYPTION_KEY` and `ACCORD_PROVIDER_SECRET`. The API encrypts restricted delegate material with the first; the second authenticates provider requests/responses. Do not regenerate either while existing agreements/artifacts need them. Never provide a customer full-access key to the API.

Keep `NEAR_NETWORK=testnet`. `PUBLIC_ORIGIN` must exactly match the frontend origin, including port. Leave Groq/NEAR AI/local-risk generation disabled for a deterministic run. Test caps and optional providers are documented in [GROQ.md](GROQ.md), [the AI evaluation](reliability/AI.md) and [operator architecture](reliability/OPERATIONS.md).

The example environment's public contract/provider IDs do not grant ownership. New PostgreSQL databases contain no offchain catalog metadata or prepared artifacts. Do not expect chain state to seed them automatically, or copy another operator's database/secrets.

## Create your own dedicated testnet fixtures

For a self-contained deployment, install Rust with the `wasm32-unknown-unknown` target, [cargo-near 0.23.0](https://github.com/near/cargo-near/releases/tag/cargo-near-v0.23.0) and official [near-cli-rs](https://github.com/near/near-cli-rs). Choose your own unused parent account and fund it with at least **4.5 test NEAR plus gas** for the fixture allocations. Faucet availability/rate limits are external to Accord.

```sh
# Replace this example name with the dedicated testnet parent you control.
export MASTER_ACCOUNT_ID=your-unique-accord-dev.testnet
near account create-account sponsor-by-faucet-service "$MASTER_ACCOUNT_ID" autogenerate-new-keypair save-to-legacy-keychain network-config testnet create

cd contracts-near
cargo near build non-reproducible-wasm --locked --no-abi
cd ../backend
npm run near:setup:testnet
```

The setup script reads that parent's locally saved credentials, creates `contract.`, `buyer.` and `provider.` children, and writes developer fixtures under ignored `.near-credentials/`. It deploys only when the contract account has no code; it does not replace an existing deployment. These are developer fixtures, not judge login credentials or a prize-payout account.

Update `NEAR_CONTRACT_ID` and `PROVIDER_ACCOUNT_ID` in `backend/.env` to the generated contract/provider IDs and restart the API/provider. Import your own provider fixture into a **testnet** wallet locally, sign in and choose **List a service**. The configured reference provider supports the built-in deterministic service kinds. Choose fixed terms, complete preflight and register the exact metadata on NEAR; the API checks the signed-in provider and onchain hash before listing it.

Use a separate customer testnet wallet to follow the [judge purchase flow](../README.md#judge-access-and-testing). Current source requires explicit execution-identity and delivery-specification approval after limited-key installation. A warning requires one exact-payment review; a block cannot be bypassed. Reference agents read live finalized RPC data, so results can differ from dated screenshots.

To list a creator-owned external service, use [CREATOR_SERVICES.md](CREATOR_SERVICES.md). Operator approval, a distinct provider secret and durable provider state are required. No arbitrary code upload or automatic public approval is implemented.

## Contract and integration checks

From `contracts-near`:

```sh
cargo test --locked --lib
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo near build non-reproducible-wasm --locked --no-abi
cargo test --locked --test test_basics
```

The README lists backend/frontend checks. Isolated HTTP/DB suites create disposable PostgreSQL schemas and use controlled chain/session fixtures; they do not sign blockchain transactions or call paid inference. The real testnet JSON/video evidence is separately dated and scoped in [VERIFICATION.md](../VERIFICATION.md) and [the security walkthrough](SECURITY_WALKTHROUGH.md).

Live proof scripts are **opt-in developer tools**, not part of the quick start. Read each script's fixture, origin, worker and cleanup requirements before use; some older harnesses target earlier execution-approval flows. Do not run them against customer accounts or assume the unfinished latest wallet rehearsal is a completed acceptance run. The active CI checks are the supported nonfinancial regression path.

## Recovery and exit

Keep the database, delegate-encryption key, provider secret and prepared artifacts together. Reopening the browser restores no signing key that has been deleted. Use **Recover an agreement** for an interrupted activation reminder and inspect chain finality before resubmitting a transaction.

Cancellation prevents future finalized charges and releases unspent reserve; remove the restricted key as well. A paid report is not refunded automatically. Withdrawing a remainder or provider earnings is a separate owner-signed action. Storage fees are retained, and a failed withdrawal restores the ledger after its callback. See [financial architecture](ARCHITECTURE.md) and [recovery verification](../VERIFICATION.md).
