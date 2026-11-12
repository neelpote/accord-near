# Accord testnet login receipts

A separate, stateless contract for Ethereum-wallet authentication through NEP-518. The existing escrow contract is unchanged.

`authenticate({ challenge, audience })` accepts a zero-deposit call from a lowercase `0x` implicit account whose predecessor and transaction signer agree. It emits one `accord_auth` v1 login event with the derived caller, challenge and audience. It stores no sessions, nonces or balances and creates no promises. It rejects deployment account names outside `.testnet`/`.sandbox`. The backend currently enables this flow only on testnet.

A receipt alone is **not** a login credential. Accord also requires the initiating browser's secret HttpOnly cookie, an unexpired server-issued challenge, finalized execution, the exact contract/event/account/audience and the expected code hash at the receipt's execution block. See [the integration and review](../docs/ETHEREUM_WALLETS.md).

Scaffolded with `cargo near new contracts-auth` using the official template. Build/test:

```sh
cargo test --locked --lib
cargo clippy --locked --all-targets -- -D warnings
cargo near build non-reproducible-wasm --locked --no-abi
```

The optional testnet deploy script is `backend/src/near/auth-deploy.ts`. It creates a dedicated `login.<parent>.testnet` account and never overwrites an existing deployment with different code. Keep its fixture key private; it retains upgrade authority in this prototype. No mainnet deployment or independent audit is claimed.
