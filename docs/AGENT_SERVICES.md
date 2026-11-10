# Five working NEAR agents

These are autonomous, rule-based services reading live NEAR **testnet** data. They do not require AI credits. Five distinct handlers share the configured reference provider process and existing billing contract; they are not five separately isolated AI models.

| Agent | Service ID | What it does | Input |
| --- | --- | --- | --- |
| Wallet Watch | 2 | Reads balance, locked stake and protocol storage cost at a finalized block; compares spendable funds with a chosen reserve. | Account ID and minimum yoctoNEAR reserve |
| Access Guard | 3 | Reviews public access-key permissions, broad methods, other receivers and unlimited gas allowances. It never removes keys. | Account ID and trusted contract ID |
| Contract Sentinel | 4 | Compares a deployed code hash with the baseline supplied in the signed agreement. It flags a mismatch without automatically approving new code. | Contract account and approved code hash |
| Receipt Inspector | 5 | Reads a finalized transaction, checks receipt failures and sums exact gas burn. A transaction diagnostic does not replace Accord's purchase proof. | Transaction hash and signer account |
| Network Pulse | 6 | Checks network identity, finalized-block age, RPC synchronization, reported validators and gas price. | Maximum block age in seconds |

Current contract: `contract.accord-dev-261110.testnet`. All five cost **0.001 test NEAR per purchased report**, with a minimum 60-second interval. Storage and gas are separate and disclosed by the approval form. IDs above refer to this deployed catalog; a new independent deployment receives its own IDs.

## See them working

Open http://localhost:3000 and choose **View paid example** on each card. The panel shows an actual purchased report, source block, observation time, artifact SHA-256 and credited amount. These public examples are explicitly recorded demonstration snapshots; opening them does not generate a fresh report or charge a wallet.

- [Five-agent walkthrough video](demo/five-agents-showcase.webm)
- [Catalog screenshot](demo/five-agent-catalog.png)
- [Wallet Watch report](demo/wallet-watch.png)
- [Access Guard report](demo/access-guard.png)
- [Contract Sentinel report](demo/contract-sentinel.png)
- [Receipt Inspector report](demo/receipt-inspector.png)
- [Network Pulse report](demo/network-pulse.png)
- [Real testnet proof for all five](agents-demo-proof.json)
- [Browser Wallet Watch purchase / cancellation / exit](browser-live-agent-proof.json)

To request a fresh report, sign in with a funded testnet wallet, choose **Choose terms**, review/edit that agent's input, approve the finite budget and separately enable the charge-only key. The worker prepares fresh chain observations for each due cycle, freezes that report, verifies payment and delivers the same artifact. Reopening a paid cycle retrieves its original snapshot; it does not overwrite history.

## What was demonstrated

`npm run near:demo:agents` in `backend` registered the five immutable service offers using the dedicated provider fixture, authenticated both actors with NEP-413, funded separate three-cycle agreements and installed separate charge-only keys. Agreements 9–13 each delivered two purchased reports after actual onchain billing intervals. Each artifact's hash, price, recipient and final receipt were verified. The script then canceled the agreements, deleted those limited keys, withdrew the customer's unspent balance and paid out the provider's earned balance. Both receiving wallet increases were checked.

The script explicitly publishes only its synthetic developer-fixture reports to `accord_agent_demos`. The public examples endpoint does not read or publish arbitrary customer reports. Test subscriptions are canceled after verification; the service listings and running scheduler remain available for new customer-approved agreements.

Run it only with the dedicated testnet fixtures described in the root README:

```sh
cd backend
npm run near:demo:agents
```

This performs real **testnet** transactions. It never calls mainnet or NEAR AI Cloud. Re-running can create new demonstration agreements and consume more free test tokens/storage; it reuses matching service listings.

For browser verification with the local application running:

```sh
cd frontend
npm run test:agents
npm run test:agent-wallet
```

The first checks all five public paid examples and their evidence. The second exercises actual wallet-backed sign-in, the Wallet Watch input form, funding, restricted-key activation, paid live report, cancellation, key removal and a finalized withdrawal through a standard-interface test wallet. Keys remain in the Node test process. Third-party wallet vendor interfaces remain a separate manual check.

## Limits and safeguards

Inputs are validated by the service type before funding/activation. The provider binds that type to the immutable onchain metadata hash; the worker checks the delivered report's expected type and schema in addition to its paid hash. Currency math uses integer yoctoNEAR. Human-facing balances may be marked approximate, with exact raw values alongside them.

Access Guard uses review heuristics, not evidence of compromise. Matching code identity is not an audit. Global-contract references produce an explicit review status rather than an ordinary local-code match. Receipt failures can be handled by later callbacks, so inspect final state before retrying. Network Pulse is one RPC/clock snapshot, not a global availability guarantee. No agent automatically changes a wallet, deploys code, trades, replenishes funds or sends external notifications. Low reserves/mismatches appear as flags in the purchased report.

The original portfolio-snapshot service remains available separately. AI inference and market-price feeds remain inactive. Contract custody and retained development upgrade keys are unchanged and disclosed in the main README.
