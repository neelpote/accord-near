# Accord

Bounded recurring purchases for independently hosted agent services on NEAR. Built from the Daemon marketplace baseline; see [PROVENANCE.md](PROVENANCE.md).

**Development checkpoint:** the native-NEAR contract passes unit tests and a real local NEAR Sandbox integration test. Marketplace/API integration is in progress. This checkpoint is not a complete application release.

The owner prepays a finite agreement. A charge-only function-call key lets a scheduler purchase each due report. The contract fixes the provider, amount, minimum interval, maximum cycles and expiry. Duplicate cycle requests cannot create another provider credit. Cancellation atomically revokes future billing and releases unspent reserve; customers and providers withdraw through callback-checked native NEAR transfers.

Reference service: Daemon's portfolio concentration analysis. This does not prove report quality or guarantee delivery; payments buy an identified prepared artifact. NEAR holds the prepaid funds. Storage fees are disclosed and retained; there is no platform fee. Testnet only. Agent API/Intents are not used because they have no testnet.

## Verify the contract

Install stable Rust, its `wasm32-unknown-unknown` target, and official [cargo-near 0.23.0](https://github.com/near/cargo-near/releases/tag/cargo-near-v0.23.0). From `contracts-near`:

```sh
cargo test --locked --lib
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo near build non-reproducible-wasm --locked --no-abi
cargo test --locked --test test_basics -- --nocapture
```

The integration test downloads and runs NEAR Sandbox, deploys the real WASM, executes two cycles with local fast-forward, checks duplicate/early/unauthorized billing, cancels, and verifies actual customer/provider balance increases after withdrawal. Fast-forward is local simulation, not evidence that a live interval elapsed.

## Existing work and hackathon scope

`upstream-baseline` marks imported pre-hackathon Daemon source. The new `contracts-near/` implementation and following application integration are November 2026 hackathon work. Historical architecture proposals in `docs/` describe alternatives; current approved decisions are in [DECISIONS.md](DECISIONS.md).

The original Solidity/Arbitrum application and workers are retained as baseline source. Their financial paths are not supported in the NEAR deployment. No audit or standard x402 compatibility is claimed. Intended tracks: Agent Economy and AI Security & Defense; final track selection and submission remain the human's decision.

See [VERIFICATION.md](VERIFICATION.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and the saved official [hackathon guide](HACKATHON.md). No hackathon submission or social post has been made.
