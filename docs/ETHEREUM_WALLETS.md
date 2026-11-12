# Ethereum wallets on native NEAR

## What this adds

MetaMask/WalletConnect users can operate Accord using a NEAR `0x` implicit account. Their Ethereum wallet signs NEP-518 transactions, and NEAR executes them. Accord keeps the same native Rust escrow and NEAR spending terms. This is neither Solidity execution nor an asset bridge. Ethereum-chain ETH does not fund the account's NEAR testnet balance.

Official integration: https://evm-on-near.dev/how-it-works/ and https://github.com/gagdiez/eth-wallet. Source inspected for live verification: commit `d47756b52f2a8bdd4ac24d0fcf2fe4e496a22cd1`; served manifest version `0.1.4` at research time. The runtime sandbox executor/approval page is hosted by that external project and can be updated by its operator; this remains a wallet integration trust dependency.

The adapter supports testnet, single-action contract calls and ed25519 function-call key changes. It explicitly does **not** support NEP-413 messages. Merely registering the manifest in Accord's previous signature-only connector would leave private workspace login broken. We therefore add a separate transaction-authentication path rather than weakening NEP-413 verification.

## End-to-end flow

1. `NearConnector` remains on `testnet`. Compatible NEAR message-signing wallets stay available. When the backend config advertises a pinned login contract, the client loads the official Ethereum wallet manifest, checks its sandbox/URL/testnet/transaction capabilities and makes it selectable. If that external manifest fails, native wallets remain usable.
2. The Ethereum adapter connects to NEAR testnet chain ID **398**. Its first-connection setup may add a relayer key restricted to `rlp_execute` on the same `0x` account. That key is distinct from Accord's later charge-only key. Subsequent operations still need the Ethereum wallet's approval unless the customer separately grants Accord's bounded recurring-purchase authority.
3. For a `0x` account, Accord issues a random challenge, account/site binding, five-minute expiry and a random HttpOnly, SameSite=Strict pre-login cookie. Only the cookie hash is stored server-side. The cookie secret is never put on-chain or returned in JSON.
4. The wallet submits one zero-deposit `authenticate` call to the separate stateless login contract. The user pays testnet gas; account/site/login time become publicly observable. The contract derives its caller instead of accepting an account claim, requires a direct signer relationship, bounds input and emits one structured event. It holds no application funds and stores no sessions.
5. The backend requires the initiating browser's cookie, fetches the transaction from its fixed NEAR testnet RPC, requires final execution and a successful outer `rlp_execute` transaction from/to the claimed account, rejects any failed receipt, and finds exactly one matching event executed by the configured login contract. It checks that contract's code hash at the receipt's execution block, rather than relying only on its present code hash.
6. A challenge permits at most five proof attempts. A single atomic SQL statement consumes the unexpired, browser-bound challenge and creates the usual 12-hour hashed-token session. Concurrent redemption and replay cannot create extra sessions. Public transaction hashes or events alone cannot log an observer in.
7. Workspace/report/agreement routes continue to authorize the session owner. Existing NEAR wallets continue using one-use NEP-413 signatures. The client retains a completed transaction reference in session storage while retrying transient verification failures, avoiding an automatic second login transaction; expired/used challenges are cleared.
8. Report purchase, explicit charge-key grant, delivery, cancellation, charge-key deletion and withdrawal use the existing handlers. Each UI transaction contains one action and requests 50 Tgas, within the adapter's 270 Tgas call limit. Native yoctoNEAR values, including the one-yocto remainder on protected actions, are encoded by the upstream adapter.

The login contract deployment and unchanged escrow hash are recorded in `evm-auth-deployment.json`. The auth contract has an operator-held upgrade key in this prototype. The backend code pin fails closed on a different deployment; this is an engineering safeguard, not a claim of immutable administration or an independent audit.

## Monitoring Ethereum implicit accounts

Live testing found that the protocol wallet uses `global_contract_hash`, while `code_hash` is empty. Treating the empty local hash as the executable identity would be wrong. `code-identity.ts` handles immutable NEP-591 hash references for baseline capture and Contract Sentinel. Snapshots mark these as `code_source: global-hash`, and the UI labels them explicitly. Local contracts keep their existing hashes and schema. Mutable global account-ID references remain unresolved and do not receive matching-code assurance.

Reference: https://github.com/near/NEPs/blob/master/neps/nep-0591.md. Baseline approval remains an explicit user action; observing a known wallet implementation does not certify its permissions or safety.

## Trying it

Open the hosted Accord URL, choose **Sign in with NEAR → Ethereum Wallets**, and select MetaMask or WalletConnect in the external adapter. Allow its popup, verify NEAR testnet/398 and the displayed site, and complete first-use setup if requested. Fund the displayed `0x` account with **testnet NEAR** before paying login gas or buying a report. Approve the zero-deposit login separately from any later paid agreement or limited-key grant. Do not import a real-money wallet into developer fixtures.

A public/read-only wallet connection is not a private-workspace session. Canceling an agreement and deleting Accord's charge-only key does not delete the wallet adapter's separate relayer key. The latter belongs to the Ethereum-wallet connection setup.

## Reproduction and validation

Unit tests exercise forged/wrong-account/wrong-site/wrong-contract/unfinalized/failed/duplicate receipts and immutable global identities. `npm run near:test:evm-auth` uses an isolated PostgreSQL schema and fixture RPC outcomes to test browser binding, wrong origins, code pinning, expiry, one-use challenges and concurrent redemption. It does not substitute for a real signature.

The contract has five Rust tests plus Clippy and WASM build checks. The application now has 19 backend unit tests, isolated operations/auth HTTP checks and eight presentation/auth browser checks. `evm-login-proof.json` records a real Ethereum-signed, relayed transaction accepted through the browser and NEAR testnet. The fixture has no NEP-413 capability. It uses the official adapter's transaction engine with a local EIP-1193 signer and the ordinary NearConnector injection boundary. This verifies actual encoding, chain 398, relayer setup and NEAR execution; it does **not** certify a real MetaMask browser extension or the external popup's human UX.

For the opt-in live fixture, install both app package sets, clone the inspected official wallet source into ignored `.tools/eth-wallet-source`, and make its `node_modules` resolve the existing backend dependencies (or install its own pinned dependencies). Save the official public manifest as `.tools/evm-on-near-manifest.json`. Check out commit `d47756b52f2a8bdd4ac24d0fcf2fe4e496a22cd1`; the fixture refuses another revision or tracked source modifications. The fixture creates/preserves an ignored dedicated Ethereum test key and funds it once from the dedicated `accord-dev-261110.testnet` parent. That parent's local testnet credentials must already exist; no real funds or mainnet calls are used.

```sh
ACCORD_EVM_LIVE=1 ACCORD_BASE_URL=http://localhost:3100 \
  node --import ./backend/node_modules/tsx/dist/loader.mjs scripts/evm-wallet-proof.mts

# Explicit additional opt-in for real finite report purchases and exit transactions:
ACCORD_EVM_LIVE=1 ACCORD_EVM_FULL=1 ACCORD_BASE_URL=https://accord-near-ten.vercel.app \
  node --import ./backend/node_modules/tsx/dist/loader.mjs scripts/evm-wallet-proof.mts
```

Optional deployment settings are `EVM_AUTH_CONTRACT_ID` and `EVM_AUTH_CODE_HASH` in the backend environment. Without both, the client keeps native-only sign-in. Build the auth contract first; run `auth-deploy.ts` only with an explicit dedicated testnet parent and the matching WASM path. Its setup key is never uploaded to Vercel. Inference budgets and paid-agent prices are unchanged.

## Verified hosted outcome

`evm-wallet-proof.json` records the complete hosted flow for agreement **20**: Ethereum-signed login, explicit approval of a finalized global-code baseline, a finite Wallet Watch purchase for the `0x` account, real delivery, cancellation, charge-key removal and withdrawal. One report was delivered; its hash, six NEAR transaction hashes and corresponding Ethereum hashes are recorded. Onchain state confirms the agreement is inactive and its charge key is absent. The workspace is marked synthetic and monitoring is paused; it is not customer validation. Groq request usage remained four.

`evm-native-login-proof.json` separately verifies a real native NEP-413 signature on the hosted app, the Ethereum wallet's presence in the same selector and a secure HttpOnly session surviving reload. The new authentication contract's Rust CI and the application CI passed. Actual MetaMask/WalletConnect extension/mobile approval UX still needs a human device check; the protocol and spending flow were exercised with the dedicated EIP-1193 fixture described above.
