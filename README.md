# Accord

Recurring purchases for agent services, with spending limits enforced on NEAR.

A customer approves a finite agreement, funds its budget, and installs a charge-only function-call key. An independent provider prepares a report. The worker purchases the exact prepared artifact when it is due. NEAR fixes the recipient, price, minimum interval, maximum cycles and expiry, even if the worker misbehaves. The customer can cancel future billing and withdraw the unspent remainder; providers withdraw earned funds separately.

**Status:** testnet prototype. The reference service is portfolio concentration analysis of a user-supplied snapshot. It uses deterministic analysis. NEAR AI Cloud integration is implemented and paused: TEE preflight authenticated successfully, but inference returned HTTP 402 because credits/spending limits were not configured. Live AI output is not claimed.

## What to try

1. Start the API, provider and frontend with the instructions below. Open `http://localhost:3000`.
2. Sign in with a NEAR **testnet** wallet. The API verifies a one-use NEP-413 signature against a full-access public key on that account. Connecting a wallet alone does not authenticate it.
3. Choose the portfolio report, inspect its fixed terms, and approve a finite prepaid agreement. Then separately enable the limited key. Its 0.05 test NEAR allowance covers gas only; the contract separately enforces the service budget.
4. See a verified provider credit and matching delivered report. Payment and delivery have distinct states. Subsequent purchases wait for the onchain interval.
5. Cancel future purchases, remove the limited key, and withdraw the available remainder. The provider signs into its own account to withdraw earnings.

Test tokens are free. Never import a real customer wallet into development scripts. Use a dedicated funded testnet wallet with enough balance for the budget, gas, key storage and disclosed retained contract storage fees.

## Run from a clean checkout

Requirements: Node **24.22.2**, npm, Docker for PostgreSQL. For contract development also install stable Rust, `wasm32-unknown-unknown`, and official [cargo-near 0.23.0](https://github.com/near/cargo-near/releases/tag/cargo-near-v0.23.0).

```sh
git clone https://github.com/neelpote/accord-near.git
cd accord-near
docker compose up -d postgres
npm ci --prefix backend
npm ci --prefix frontend
cp backend/.env.example backend/.env
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
```

Put the generated value in `DELEGATE_ENCRYPTION_KEY` in `backend/.env`. Keep this file local and preserve the encryption key across restarts. It encrypts limited delegate keys; customer full-access keys are never accepted by the API.

The example environment points to the public development contract and reference provider account. A fresh database starts with an empty catalog. For a complete independent reproduction, create your own dedicated fixture accounts and register the provider as described next. Existing public contract state does not automatically populate a new local database.

In separate terminals:

```sh
cd backend
npm run near:provider
```

```sh
cd backend
npm start
```

```sh
cd frontend
npm run build
npm start
```

The API is on `127.0.0.1:4000`, the independently running provider on `127.0.0.1:4001`, and the website on port 3000. The API runs the awaited scheduler loop; no separate queue or EVM signing worker starts. The schema migration is additive and idempotent. `npm run db:migrate` uses the new schema; original destructive migration commands are explicitly prefixed `legacy:`.

`PUBLIC_ORIGIN` must match the website origin exactly. Set `ACCORD_API_URL` **when building the frontend** if its API address differs. The default Compose file starts only a new local PostgreSQL database. Backend and frontend Dockerfiles are available separately; they do not launch the legacy stack.

## Deploy your own testnet fixtures

Use official `near-cli-rs` to create a dedicated faucet-funded parent. Choose a unique account name; the example below uses a shell variable that you must set to your own name:

```sh
export MASTER_ACCOUNT_ID=your-unique-accord-dev.testnet
near account create-account sponsor-by-faucet-service "$MASTER_ACCOUNT_ID" autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
cd contracts-near
cargo near build non-reproducible-wasm --locked --no-abi
cd ../backend
npm run near:setup:testnet
```

The setup script creates `contract.`, `buyer.` and `provider.` children of that parent, saves dedicated developer fixtures in the ignored root `.near-credentials/` directory, and deploys only if the contract account has no code. It will not replace an existing deployment. The parent needs at least 4.5 test NEAR plus gas. No prize-payout account is created or inferred.

Set `NEAR_CONTRACT_ID` and `PROVIDER_ACCOUNT_ID` in `backend/.env` to the generated accounts and restart the API/provider. `npm run near:proof:testnet` registers the reference service, verifies the complete API/worker journey, runs two real billing cycles, cancels, removes the key and checks both withdrawal recipients. It uses only the dedicated fixture keys. It also revokes unfinished agreements belonging to that fixture from interrupted previous runs. This is an explicit developer acceptance command, not an operation to run against a customer's account.

Alternatively, sign into the provider's testnet wallet in the app and choose **List a service**. The metadata hash, provider and fixed terms must match the service registered on NEAR. The reference provider must operate the configured `PROVIDER_ACCOUNT_ID`; arbitrary provider URLs are not accepted by this deployment.

## Verification commands

```sh
cd contracts-near
cargo test --locked --lib
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo near build non-reproducible-wasm --locked --no-abi
cargo test --locked --test test_basics
```

```sh
cd backend
npm run typecheck
npm run near:test
npm run db:migrate
npm audit --audit-level=moderate
```

```sh
cd frontend
npm run typecheck
npm run build
npx playwright install chromium
npm run test:browser
```

For the live browser acceptance run, keep all three processes running, provision the dedicated fixtures and catalog, then run `npm run test:testnet` in `frontend`. A fixture wallet uses NEAR Connect's standard injection interface; real keys stay in the Node test process, and real NEP-413 signatures and testnet transactions cross the actual UI/API boundary. This verifies the connector integration, not every third-party wallet's popup/redirect implementation.

For provider/worker fault recovery after a live proof:

```sh
docker compose exec postgres createdb -U accord accord_recovery
cd backend
npm run near:test:recovery
```

This fault-injection command uses a separate local database and an already-paid real receipt, with **no signing key**. It tests altered artifacts, invalid schema, outages and recovery from PREPARED/SUBMITTING/UNCERTAIN/SETTLED without creating another payment. See [VERIFICATION.md](VERIFICATION.md) for actual results and limits.

## NEAR's role and tradeoffs

- **Limited authority:** a dedicated function-call key may invoke only `charge` on the configured contract, with a finite gas allowance. It cannot transfer tokens or call cancellation/withdrawal methods requiring one yoctoNEAR.
- **Enforced commerce:** the contract obtains amount and recipient from an immutable service. The exact delegate key, next cycle, interval, expiry and finite reserve are checked onchain. Repeating the same cycle/hash returns its original receipt.
- **Cancellation and exit:** cancellation atomically revokes further billing and releases unspent reserve to an owner ledger. Withdrawals transfer only to that authenticated owner, deduct before sending, and restore the ledger if the private callback observes failure.
- **Settlement versus payout:** a charge creates a provider earnings credit inside the contract. An external native NEAR withdrawal is a separate operation. Reports are independently released against the actual contract receipt, never against browser-supplied success objects.

NEAR Intents and Agent API have no testnet. They are therefore absent from this active payment path. A native contract satisfies the requested testnet policy and enforces exact billing terms against a malicious dispatcher. The cost is prepaid contract custody, retained storage fees and native-NEAR pricing. No stablecoin, bridge or mainnet settlement is claimed.

This is different from per-request HTTP payment: the agreement authorizes a bounded recurring series in advance. The worker still buys one identified artifact per cycle; a subscription is not an unlimited allowance or a guarantee of useful work. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limits and direct exit

The prototype is not audited. The deployment account retains full-access development keys and can replace code; it is not immutable or trustless against the deployer. Provider quality and delivery remain service assumptions. A paid delivery failure blocks new purchases while the same artifact is recovered. No automatic quality refund or arbitration is implemented.

Reports analyze a supplied snapshot, not live wallet holdings or market prices. Repeating an unchanged snapshot has limited practical value. There is no customer-demand study or winning-probability claim. End-user portfolio data is visible to the application/provider; optional encrypted TEE inference would protect a narrower provider-to-model boundary, not the complete application.

A cancellation cannot reverse a cycle already charged before cancellation finalized. Remove the limited key to revoke its remaining gas authority as well. Paid retrieval remains available. Retained storage fees stay in the contract; they are disclosed before approval. A pending withdrawal must be reconciled before retrying.

You can exit without this API: use a full-access owner wallet to call `cancel` with `{ "subscription_id": "ID" }`, one yoctoNEAR and 30 TGas. Read `get_balance` for that account, then call `withdraw` with `{ "amount": "AVAILABLE_YOCTO", "earnings": false }`, one yoctoNEAR and at least 25 TGas (50 recommended). Providers use `earnings: true`. Wait for final callback and read `pending`, `available` and `earned`; a failed transfer restores its source ledger. The app also includes **Recover an agreement** for onchain agreements whose local activation reminder was lost.

## Provenance and hackathon scope

The existing Daemon marketplace, Express/PostgreSQL structure, independent provider model and risk-analysis fallback were the starting point. The Solidity/Arbitrum contracts and original frontend are retained as inactive baseline source (`contracts/`, original worker directories, `frontend/legacy/`, `legacy/`). They are not supported financial paths in this NEAR deployment.

`upstream-baseline` identifies the imported source. The NEAR contract, wallet authentication, limited-key integration, persistent worker/provider protocol, active Accord interface and verification work were implemented during the November 2026 hackathon. See [PROVENANCE.md](PROVENANCE.md), the [baseline-to-current diff](https://github.com/neelpote/accord-near/compare/upstream-baseline...main), and [LICENSE](LICENSE). Third-party tools/docs retain their own licenses.

Best-fit tracks are Agent Economy and AI Security & Defense. Final track selection, team details, payout account, consent and the exact submission payload remain the human's decisions. Loops reviews are agent-run reviews using fetched event prompts, not official judge scores. No hackathon application or social post has been sent. The live rules require rereading before submission; see [HACKATHON.md](HACKATHON.md).
