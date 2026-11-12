use near_sdk::{env, near, require};

/// No balances, sessions, access keys or persistent challenge storage.
#[near(contract_state)]
#[derive(Default)]
pub struct Contract {}

#[near]
impl Contract {
    pub fn authenticate(&self, challenge: String, audience: String) -> bool {
        let contract = env::current_account_id();
        require!(
            contract.as_str().ends_with(".testnet") || contract.as_str().ends_with(".sandbox"),
            "Testnet only"
        );
        let caller = env::predecessor_account_id();
        let address = caller.as_str();
        require!(
            address.starts_with("0x")
                && address.len() == 42
                && address[2..]
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
            "Ethereum implicit account required"
        );
        require!(
            caller == env::signer_account_id(),
            "Direct wallet intent required"
        );
        require!(
            challenge.len() == 64
                && challenge
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
            "Invalid challenge"
        );
        require!(
            !audience.is_empty() && audience.len() <= 200,
            "Invalid audience"
        );
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({
                "standard": "accord_auth", "version": "1.0.0", "event": "login",
                "data": [{ "account_id": caller, "challenge": challenge, "audience": audience }]
            })
        ));
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{
        test_utils::{VMContextBuilder, get_logs},
        testing_env,
    };
    fn context(caller: &str, signer: &str, contract: &str) {
        let mut b = VMContextBuilder::new();
        b.current_account_id(contract.parse().unwrap())
            .predecessor_account_id(caller.parse().unwrap())
            .signer_account_id(signer.parse().unwrap());
        testing_env!(b.build());
    }
    const EVM: &str = "0x1234567890abcdef1234567890abcdef12345678";
    #[test]
    fn emits_caller_bound_receipt_without_storage() {
        context(EVM, EVM, "login.testnet");
        assert!(Contract {}.authenticate("a".repeat(64), "https://accord.example".into()));
        let event: near_sdk::serde_json::Value =
            near_sdk::serde_json::from_str(get_logs()[0].strip_prefix("EVENT_JSON:").unwrap())
                .unwrap();
        assert_eq!(event["data"][0]["account_id"], EVM);
        assert_eq!(event["data"][0]["challenge"], "a".repeat(64));
        assert_eq!(event["data"][0]["audience"], "https://accord.example");
        assert!(env::storage_read(b"STATE").is_none());
    }
    #[test]
    #[should_panic(expected = "Ethereum implicit account required")]
    fn rejects_named_caller() {
        context("alice.testnet", "alice.testnet", "login.testnet");
        Contract {}.authenticate("a".repeat(64), "https://accord.example".into());
    }
    #[test]
    #[should_panic(expected = "Direct wallet intent required")]
    fn rejects_forwarded_identity() {
        context(EVM, "alice.testnet", "login.testnet");
        Contract {}.authenticate("a".repeat(64), "https://accord.example".into());
    }
    #[test]
    #[should_panic(expected = "Invalid challenge")]
    fn rejects_unbounded_or_nonhex_challenge() {
        context(EVM, EVM, "login.testnet");
        Contract {}.authenticate("g".repeat(64), "https://accord.example".into());
    }
    #[test]
    #[should_panic(expected = "Testnet only")]
    fn rejects_mainnet_deployment() {
        context(EVM, EVM, "login.near");
        Contract {}.authenticate("a".repeat(64), "https://accord.example".into());
    }
}
