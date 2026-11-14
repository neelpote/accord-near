# Renewal review

Accord's recurring-service owner needs to answer two questions before authorizing another payment: **what changed since my last authorization, and what remains committed?** Renewal review adds that context to Payment security. It is implemented in source and pending deployment; it does not change contracts or signing permissions.

## Why this feature

A previously authorized provider can have different code or evidence by the next charge. Renewal review turns existing security evidence into a before/after comparison and shows the remaining agreement budget next to it, helping owners decide whether another payment is appropriate.

The feature extends the existing payment review without adding dependencies, credentials, schema migrations, model calls or financial transactions.

## Use it

1. Start the current local source using the [local setup guide](LOCAL_SETUP.md), with `RUN_WORKER=false` when inspecting existing agreements without automatic purchases. Sign in with your own NEAR testnet wallet.
2. Open **Payment security**, then **Review renewal changes & remaining budget** on one of your decisions.
3. Inspect the prior authorization reference and differences in contract/receiver identity, code, policy, amount and relevant shared report status/evidence hashes. Routine cycle/artifact changes are not presented as a commercial-term change.
4. Inspect the price, remaining reports, reserve, recipient and maximum scheduled spending under current contract terms. Agreement and service are read at the same finalized block.
5. Review the current payment reasons separately. The existing one-payment approval controls and mandatory signing gate remain authoritative. Reading this panel never approves anything.

The first review explicitly says there is no previous authorization. Missing history or an empty diff is never described as safe. A consumed authorization is not presented as a successful payment. RPC failure clears the previous preview and shows an error.

## Implementation and boundaries

- Authenticated `GET /security/decisions/:id/renewal` queries a decision belonging to the session owner. It rejects a different network/contract and compares only the same owner's agreement.
- The baseline is the most recent approved/consumed authorization acted on no later than the current decision's creation time. It is a historical evidence comparison, not newly collected reputation evidence. Unreviewed or declined decisions cannot become its baseline.
- `renewal-review.ts` produces structured before/after changes and an inspection digest. Budget arithmetic uses `BigInt`: `min(reserve, price × remaining reports)` while active and unexpired; otherwise scheduled spending is zero. Reserves may still require cancellation/recovery.
- The live reader pins both contract views to one fresh finalized block. It reads no key material, signs nothing, updates no security observation and writes no decision.
- This is a scheduled-spending bound under current contract terms, **not a maximum-loss guarantee**. Contract upgrades, compromised infrastructure, gas, storage and other agreements are outside that number. It is not a full wallet balance or automatic refund.
- The existing backend reputation trust boundary and retained deployment authority remain. The signing gate independently recollects evidence and checks exact approval before signing.

## Verification

```sh
npm run near:test --prefix backend
# Needs PostgreSQL; the check creates and drops its own isolated schema:
npm run near:test:security --prefix backend
npm run test:browser --prefix frontend
```

Unit checks cover code/report changes, ordinary cycle changes, initial review, exact reserve/report caps, cancellation/expiry, mismatched terms, unrelated owners/baselines and invalid chain numbers. The PostgreSQL/HTTP integration checks owner isolation, comparison output and absence of decision/authorization/signing side effects. Browser checks cover changed code, budget display, failed-refresh clearing, one-payment approval and mobile layout. Controlled test fixtures do not claim a new funded journey or wallet-extension acceptance.
