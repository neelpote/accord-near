# Accord native subscription contract

Official cargo-near scaffold, rewritten for finite prepaid agreements. See root README for checks. `new` has no administrator. Deployment account full-access keys can still replace code: testnet deployment retains that development authority and must not be advertised as immutable or audited.

All amounts are decimal-string yoctoNEAR. All timestamps are decimal-string nanoseconds. Price and recipient come from an immutable service record; delegates cannot supply either. `subscribe` attaches `price * max_cycles + storage_quote(max_cycles)`. Maximum 20 cycles; interval 60 seconds to 30 days; expiry at most 30 days. No catch-up burst: next due is the successful charge timestamp plus interval.

`register_service` retains 0.02048 NEAR for storage. Each subscription retains `(2048 + 512 * max_cycles) * 10^19` yoctoNEAR for bounded agreement/receipt storage. These are conservative fixed storage fees, not refundable deposits. Gas is additional. Function-call key allowance only limits gas; the contract separately restricts subscription spending.

`charge` requires the exact owner's signer account AND designated public key, direct predecessor, next cycle, due time, active state and unexpired approval. A receipt is an internal provider credit, distinct from a native withdrawal. Same cycle/hash retry returns the original receipt even after cancellation, while a different hash is rejected.

`cancel` and `withdraw` require direct owner calls with one yoctoNEAR, preventing charge-only keys from invoking them. `withdraw` requires at least 25 TGas, deducts before transfer, permits one pending withdrawal per account, and restores the source ledger on a failed private callback. Do not manually retry a pending withdrawal. A contract/storage or callback failure requires investigation; no arbitrary admin recovery exists.

The contract binds the artifact hash, not work quality. Providers may fail to deliver; the application records settlement separately, retries the same artifact, and stops buying new cycles while unresolved.
