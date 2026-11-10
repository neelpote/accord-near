# Source provenance

Accord builds on https://github.com/web3cook/Daemon at commit `2eeed81fc3cec1dafbd277f2dccea8909247455d` (15 June 2026). The source was exported without Git metadata into a fresh repository. The original checkout remains unchanged. The project owner confirmed rights to reuse and republish the source on 10 November 2026.

The inherited Arbitrum contracts, marketplace, Express/Postgres backend and two agent workers are baseline work, not new NEAR hackathon contributions. Existing copyright/SPDX notices remain. New work will be identified by the `upstream-baseline` tag and the subsequent diff.

## Scope decision — 10 November 2026

The owner requires testnet only and delegated the security choice. Accord will use a native NEAR Rust subscription contract with exact billing constraints, restricted delegates and contract-held prepaid test NEAR. NEAR Intents/Agent API are mainnet-only and are excluded from the active payment path. This supersedes the Agent API-first proposal in the historical design documents. No mainnet operations are authorized.
