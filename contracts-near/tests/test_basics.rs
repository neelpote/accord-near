use near_api::{AccountId, NearGas, NearToken};
use near_sdk::serde_json::json;

#[tokio::test]
async fn real_wasm_billing_revocation_and_exits() -> testresult::TestResult<()> {
    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let network = near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?;
    for name in ["accord.sandbox", "buyer.sandbox", "provider.sandbox"] {
        sandbox
            .create_account(name.parse()?)
            .initial_balance(NearToken::from_near(10))
            .send()
            .await?;
    }
    let contract = near_api::Contract("accord.sandbox".parse()?);
    let buyer: AccountId = "buyer.sandbox".parse()?;
    let provider: AccountId = "provider.sandbox".parse()?;
    let wasm = std::fs::read("target/near/contracts_near.wasm")?;
    near_api::Contract::deploy(contract.account_id().clone())
        .use_code(wasm)
        .with_init_call("new", ())?
        .with_signer(signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    let pk = near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY
        .parse::<near_api::SecretKey>()?
        .public_key();
    contract.call_function("register_service", json!({"name":"Concentration analysis", "metadata_hash":"a".repeat(64), "price":"10000000000000000000000", "interval_ns":"60000000000"}))
        .transaction().deposit(NearToken::from_yoctonear(20480000000000000000000))
        .with_signer(provider.clone(),signer.clone()).send_to(&network).await?.assert_success();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_nanos() as u64;
    contract.call_function("subscribe", json!({"service_id":"0", "delegate_key":pk, "input_hash":"b".repeat(64),"max_cycles":3,"expires_at_ns":(now+3_600_000_000_000).to_string()}))
        .transaction().deposit(NearToken::from_yoctonear(65840000000000000000000))
        .with_signer(buyer.clone(),signer.clone()).send_to(&network).await?.assert_success();
    let args = json!({"subscription_id":"0", "cycle":0, "artifact_hash":"c".repeat(64)});
    // An unrelated valid account/signature is still not a billing delegate.
    contract
        .call_function("charge", args.clone())
        .transaction()
        .with_signer(provider.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_failure();
    contract
        .call_function("charge", args.clone())
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    contract
        .call_function("charge", args.clone())
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    let balance: near_sdk::serde_json::Value = contract
        .call_function("get_balance", json!({"account_id":provider}))
        .read_only()
        .fetch_from(&network)
        .await?
        .data;
    assert_eq!(balance["earned"], "10000000000000000000000");
    let next = json!({"subscription_id":"0", "cycle":1, "artifact_hash":"d".repeat(64)});
    contract
        .call_function("charge", next.clone())
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_failure();
    sandbox.fast_forward(200).await?;
    contract
        .call_function("charge", next)
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    contract
        .call_function("cancel", json!({"subscription_id":"0"}))
        .transaction()
        .deposit(NearToken::from_yoctonear(1))
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    contract
        .call_function(
            "charge",
            json!({"subscription_id":"0","cycle":2,"artifact_hash":"e".repeat(64)}),
        )
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_failure();
    // Paid retrieval still works after revocation, without another credit.
    contract
        .call_function("charge", args)
        .transaction()
        .with_signer(buyer.clone(), signer.clone())
        .send_to(&network)
        .await?
        .assert_success();
    for (account, earnings, amount) in [
        (buyer, false, "10000000000000000000000"),
        (provider, true, "20000000000000000000000"),
    ] {
        let before = near_api::Account(account.clone())
            .tokens()
            .near_balance()
            .fetch_from(&network)
            .await?
            .total;
        contract
            .call_function("withdraw", json!({"amount":amount,"earnings":earnings}))
            .transaction()
            .deposit(NearToken::from_yoctonear(1))
            .gas(NearGas::from_tgas(40))
            .with_signer(account.clone(), signer.clone())
            .send_to(&network)
            .await?
            .assert_success();
        let after = near_api::Account(account.clone())
            .tokens()
            .near_balance()
            .fetch_from(&network)
            .await?
            .total;
        assert!(after > before, "Recipient must actually receive NEAR");
        let b: near_sdk::serde_json::Value = contract
            .call_function("get_balance", json!({"account_id":account}))
            .read_only()
            .fetch_from(&network)
            .await?
            .data;
        assert_eq!(b["pending"], "0");
        assert_eq!(b[if earnings { "earned" } else { "available" }], "0");
    }
    Ok(())
}
