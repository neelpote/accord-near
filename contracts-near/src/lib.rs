//! Bounded prepaid native-NEAR subscriptions. No administrator or arbitrary delegate transfers.
use near_sdk::{
    AccountId, Gas, NearToken, PanicOnDefault, Promise, PublicKey, assert_one_yocto, env,
    ext_contract,
    json_types::{U64, U128},
    near, require,
    store::LookupMap,
};
const SECOND: u64 = 1_000_000_000;
const STORAGE_BYTE: u128 = 10_000_000_000_000_000_000;
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Service {
    pub provider: AccountId,
    pub name: String,
    pub metadata_hash: String,
    pub price: U128,
    pub interval_ns: U64,
}
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Subscription {
    pub owner: AccountId,
    pub service_id: U64,
    pub delegate_key: PublicKey,
    pub input_hash: String,
    pub max_cycles: u32,
    pub cycles: u32,
    pub expires_at_ns: U64,
    pub next_due_ns: U64,
    pub reserved: U128,
    pub active: bool,
}
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Receipt {
    pub subscription_id: U64,
    pub cycle: u32,
    pub provider: AccountId,
    pub amount: U128,
    pub artifact_hash: String,
    pub paid_at_ns: U64,
}
#[near(serializers = [borsh, json])]
#[derive(Clone, Default)]
pub struct Balance {
    pub available: U128,
    pub earned: U128,
    pub pending: U128,
}
#[ext_contract(ext_self)]
#[allow(dead_code)]
trait Callbacks {
    fn on_withdraw(&mut self, account_id: AccountId, amount: U128, earnings: bool) -> bool;
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Accord {
    services: LookupMap<u64, Service>,
    subscriptions: LookupMap<u64, Subscription>,
    receipts: LookupMap<(u64, u32), Receipt>,
    balances: LookupMap<AccountId, Balance>,
    next_service: u64,
    next_subscription: u64,
}
fn hash(value: &str) {
    require!(
        value.len() == 64
            && value
                .bytes()
                .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
        "Expected lowercase SHA-256 hex"
    );
}
fn direct_owner() -> AccountId {
    let owner = env::predecessor_account_id();
    require!(
        owner == env::signer_account_id(),
        "Direct wallet call required"
    );
    owner
}
fn event(name: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        near_sdk::serde_json::json!({"standard":"accord", "version":"1.0.0", "event":name, "data":[data]})
    ));
}
#[near]
impl Accord {
    #[init]
    pub fn new() -> Self {
        Self {
            services: LookupMap::new(b"s"),
            subscriptions: LookupMap::new(b"u"),
            receipts: LookupMap::new(b"r"),
            balances: LookupMap::new(b"b"),
            next_service: 0,
            next_subscription: 0,
        }
    }
    /// Retained storage keeps bounded immutable offers and receipts readable.
    pub fn storage_quote(&self, max_cycles: u32) -> U128 {
        require!((1..=20).contains(&max_cycles), "Cycles must be 1..20");
        U128((2048 + 512 * u128::from(max_cycles)) * STORAGE_BYTE)
    }
    #[payable]
    pub fn register_service(
        &mut self,
        name: String,
        metadata_hash: String,
        price: U128,
        interval_ns: U64,
    ) -> U64 {
        let provider = direct_owner();
        require!(
            env::attached_deposit().as_yoctonear() == 2048 * STORAGE_BYTE,
            "Attach exactly 0.02048 NEAR storage"
        );
        require!(
            !name.is_empty() && name.len() <= 80,
            "Name must be 1..80 bytes"
        );
        hash(&metadata_hash);
        require!(price.0 > 0, "Price must be positive");
        require!(
            (60 * SECOND..=30 * 86400 * SECOND).contains(&interval_ns.0),
            "Interval must be 60 seconds..30 days"
        );
        let id = self.next_service;
        self.next_service = id.checked_add(1).expect("ID overflow");
        self.services.insert(
            id,
            Service {
                provider: provider.clone(),
                name,
                metadata_hash,
                price,
                interval_ns,
            },
        );
        self.balances.entry(provider).or_default();
        event(
            "service_registered",
            near_sdk::serde_json::json!({"service_id":U64(id)}),
        );
        U64(id)
    }
    /// Exact finite budget plus storage. First cycle can execute immediately; later cycles cannot catch up.
    #[payable]
    pub fn subscribe(
        &mut self,
        service_id: U64,
        delegate_key: PublicKey,
        input_hash: String,
        max_cycles: u32,
        expires_at_ns: U64,
    ) -> U64 {
        let owner = direct_owner();
        let service = self.services.get(&service_id.0).expect("Unknown service");
        hash(&input_hash);
        let storage = self.storage_quote(max_cycles).0;
        let now = env::block_timestamp();
        require!(
            expires_at_ns.0 > now
                && expires_at_ns.0 <= now.checked_add(30 * 86400 * SECOND).expect("Time overflow"),
            "Expiry must be within 30 days"
        );
        let budget = service
            .price
            .0
            .checked_mul(u128::from(max_cycles))
            .expect("Budget overflow");
        require!(
            env::attached_deposit().as_yoctonear()
                == budget.checked_add(storage).expect("Deposit overflow"),
            "Attach exact budget plus storage"
        );
        let id = self.next_subscription;
        self.next_subscription = id.checked_add(1).expect("ID overflow");
        self.subscriptions.insert(
            id,
            Subscription {
                owner: owner.clone(),
                service_id,
                delegate_key,
                input_hash,
                max_cycles,
                cycles: 0,
                expires_at_ns,
                next_due_ns: U64(now),
                reserved: U128(budget),
                active: true,
            },
        );
        self.balances.entry(owner).or_default();
        event(
            "subscribed",
            near_sdk::serde_json::json!({"subscription_id":U64(id)}),
        );
        U64(id)
    }
    /// Only delegate entrypoint. Amount/recipient are never worker arguments.
    pub fn charge(&mut self, subscription_id: U64, cycle: u32, artifact_hash: String) -> Receipt {
        hash(&artifact_hash);
        let mut sub = self
            .subscriptions
            .get(&subscription_id.0)
            .expect("Unknown subscription")
            .clone();
        require!(
            env::predecessor_account_id() == sub.owner
                && env::signer_account_id() == sub.owner
                && env::signer_account_pk() == sub.delegate_key,
            "Wrong delegate"
        );
        if let Some(receipt) = self.receipts.get(&(subscription_id.0, cycle)) {
            require!(
                receipt.artifact_hash == artifact_hash,
                "Cycle already bound to another artifact"
            );
            return receipt.clone();
        }
        let now = env::block_timestamp();
        require!(sub.active, "Canceled subscription");
        require!(now < sub.expires_at_ns.0, "Expired subscription");
        require!(cycle == sub.cycles && cycle < sub.max_cycles, "Wrong cycle");
        require!(now >= sub.next_due_ns.0, "Not due");
        let service = self
            .services
            .get(&sub.service_id.0)
            .expect("Unknown service");
        sub.reserved.0 = sub
            .reserved
            .0
            .checked_sub(service.price.0)
            .expect("Insufficient reserve");
        sub.cycles += 1;
        sub.next_due_ns = U64(now
            .checked_add(service.interval_ns.0)
            .expect("Time overflow"));
        let receipt = Receipt {
            subscription_id,
            cycle,
            provider: service.provider.clone(),
            amount: service.price,
            artifact_hash,
            paid_at_ns: U64(now),
        };
        let balance = self
            .balances
            .get_mut(&service.provider)
            .expect("Provider balance missing");
        balance.earned.0 = balance
            .earned
            .0
            .checked_add(service.price.0)
            .expect("Balance overflow");
        self.receipts
            .insert((subscription_id.0, cycle), receipt.clone());
        self.subscriptions.insert(subscription_id.0, sub);
        event("charged", near_sdk::serde_json::to_value(&receipt).unwrap());
        receipt
    }
    /// Atomically revoke billing and release all unspent reserve. Already-paid receipt retrieval remains valid.
    #[payable]
    pub fn cancel(&mut self, subscription_id: U64) {
        assert_one_yocto();
        let owner = direct_owner();
        let sub = self
            .subscriptions
            .get_mut(&subscription_id.0)
            .expect("Unknown subscription");
        require!(sub.owner == owner, "Not owner");
        let balance = self
            .balances
            .get_mut(&owner)
            .expect("Owner balance missing");
        balance.available.0 = balance
            .available
            .0
            .checked_add(sub.reserved.0)
            .expect("Balance overflow");
        sub.reserved = U128(0);
        sub.active = false;
        event(
            "canceled",
            near_sdk::serde_json::json!({"subscription_id":subscription_id}),
        );
    }
    #[payable]
    pub fn withdraw(&mut self, amount: U128, earnings: bool) -> Promise {
        assert_one_yocto();
        require!(
            env::prepaid_gas() >= Gas::from_tgas(25),
            "Attach at least 25 TGas"
        );
        let account_id = direct_owner();
        let b = self.balances.get_mut(&account_id).expect("No balance");
        require!(
            amount.0 > 0 && b.pending.0 == 0,
            "Zero amount or withdrawal pending"
        );
        let source = if earnings {
            &mut b.earned
        } else {
            &mut b.available
        };
        source.0 = source
            .0
            .checked_sub(amount.0)
            .expect("Insufficient balance");
        b.pending = amount;
        Promise::new(account_id.clone())
            .transfer(NearToken::from_yoctonear(amount.0))
            .then(
                ext_self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(10))
                    .on_withdraw(account_id, amount, earnings),
            )
    }
    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, amount: U128, earnings: bool) -> bool {
        require!(
            env::promise_results_count() == 1,
            "Expected one transfer result"
        );
        let success = env::promise_result_checked(0, 0).is_ok();
        let b = self.balances.get_mut(&account_id).expect("No balance");
        require!(b.pending == amount, "Wrong withdrawal callback");
        b.pending = U128(0);
        if !success {
            let source = if earnings {
                &mut b.earned
            } else {
                &mut b.available
            };
            source.0 = source.0.checked_add(amount.0).expect("Balance overflow");
        }
        event(
            "withdrawal_resolved",
            near_sdk::serde_json::json!({"account_id":account_id,"amount":amount,"success":success}),
        );
        success
    }
    pub fn get_service(&self, service_id: U64) -> Option<Service> {
        self.services.get(&service_id.0).cloned()
    }
    pub fn get_subscription(&self, subscription_id: U64) -> Option<Subscription> {
        self.subscriptions.get(&subscription_id.0).cloned()
    }
    pub fn get_receipt(&self, subscription_id: U64, cycle: u32) -> Option<Receipt> {
        self.receipts.get(&(subscription_id.0, cycle)).cloned()
    }
    pub fn get_balance(&self, account_id: AccountId) -> Balance {
        self.balances.get(&account_id).cloned().unwrap_or_default()
    }
    pub fn counters(&self) -> (U64, U64) {
        (U64(self.next_service), U64(self.next_subscription))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{PromiseResult, test_utils::VMContextBuilder, testing_env};
    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }
    fn key() -> PublicKey {
        "ed25519:11111111111111111111111111111111".parse().unwrap()
    }
    fn context(who: &str, deposit: u128, time: u64) {
        let mut b = VMContextBuilder::new();
        b.current_account_id(account("accord.testnet"))
            .predecessor_account_id(account(who))
            .signer_account_id(account(who))
            .signer_account_pk(key())
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .account_balance(NearToken::from_near(100))
            .block_timestamp(time);
        testing_env!(b.build());
    }
    fn setup() -> Accord {
        context("provider.testnet", 2048 * STORAGE_BYTE, SECOND);
        let mut c = Accord::new();
        c.register_service(
            "Concentration analysis".into(),
            "a".repeat(64),
            U128(100),
            U64(60 * SECOND),
        );
        context("alice.testnet", c.storage_quote(3).0 + 300, SECOND);
        c.subscribe(U64(0), key(), "b".repeat(64), 3, U64(1000 * SECOND));
        c
    }
    #[test]
    fn billing_cancel_and_retrieval_conserve_budget() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        assert_eq!(c.charge(U64(0), 0, "c".repeat(64)).amount.0, 100);
        c.charge(U64(0), 0, "c".repeat(64));
        assert_eq!(c.get_balance(account("provider.testnet")).earned.0, 100);
        context("alice.testnet", 0, 61 * SECOND);
        c.charge(U64(0), 1, "d".repeat(64));
        context("alice.testnet", 1, 62 * SECOND);
        c.cancel(U64(0));
        c.cancel(U64(0));
        assert_eq!(c.get_balance(account("alice.testnet")).available.0, 100);
        assert_eq!(c.get_balance(account("provider.testnet")).earned.0, 200);
        context("alice.testnet", 0, 62 * SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
        assert_eq!(c.get_subscription(U64(0)).unwrap().reserved.0, 0);
    }
    #[test]
    #[should_panic(expected = "Not due")]
    fn early_cycle_is_rejected() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
        c.charge(U64(0), 1, "d".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Wrong delegate")]
    fn wrong_owner_is_rejected() {
        let mut c = setup();
        context("attacker.testnet", 0, SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Wrong delegate")]
    fn wrong_key_is_rejected() {
        let mut c = setup();
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(account("alice.testnet"))
            .signer_account_id(account("alice.testnet"))
            .signer_account_pk(
                "ed25519:HF4ncfF9kCDVxPQ8xHt7v6h1kRfdhPWfZP8G9B5mX7og"
                    .parse()
                    .unwrap(),
            );
        testing_env!(b.build());
        c.charge(U64(0), 0, "c".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Expired subscription")]
    fn expired_is_rejected() {
        let mut c = setup();
        context("alice.testnet", 0, 1000 * SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Canceled subscription")]
    fn cancel_revokes_delegate() {
        let mut c = setup();
        context("alice.testnet", 1, SECOND);
        c.cancel(U64(0));
        context("alice.testnet", 0, SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Cycle already bound")]
    fn artifact_cannot_be_replaced() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        c.charge(U64(0), 0, "c".repeat(64));
        c.charge(U64(0), 0, "d".repeat(64));
    }
    #[test]
    #[should_panic(expected = "Wrong cycle")]
    fn exhausted_is_rejected() {
        let mut c = setup();
        for i in 0..4 {
            context("alice.testnet", 0, (1 + 60 * u64::from(i)) * SECOND);
            c.charge(U64(0), i, "c".repeat(64));
        }
    }
    #[test]
    #[should_panic(expected = "Attach exact budget")]
    fn underfunding_is_rejected() {
        let mut c = setup();
        context("alice.testnet", 1, SECOND);
        c.subscribe(U64(0), key(), "b".repeat(64), 3, U64(1000 * SECOND));
    }
    #[test]
    #[should_panic(expected = "Budget overflow")]
    fn overflow_is_rejected() {
        context("provider.testnet", 2048 * STORAGE_BYTE, SECOND);
        let mut c = Accord::new();
        c.register_service(
            "large".into(),
            "a".repeat(64),
            U128(u128::MAX),
            U64(60 * SECOND),
        );
        context("alice.testnet", 1, SECOND);
        c.subscribe(U64(0), key(), "b".repeat(64), 2, U64(1000 * SECOND));
    }
    #[test]
    fn failed_transfer_restores_balance_and_success_does_not() {
        let mut c = setup();
        context("alice.testnet", 1, SECOND);
        c.cancel(U64(0));
        c.withdraw(U128(100), false).detach();
        assert_eq!(c.get_balance(account("alice.testnet")).available.0, 200);
        let mut b = VMContextBuilder::new();
        b.current_account_id(account("accord.testnet"))
            .predecessor_account_id(account("accord.testnet"));
        testing_env!(
            b.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![PromiseResult::Failed]
        );
        assert!(!c.on_withdraw(account("alice.testnet"), U128(100), false));
        assert_eq!(c.get_balance(account("alice.testnet")).available.0, 300);
        context("alice.testnet", 1, SECOND);
        c.withdraw(U128(100), false).detach();
        testing_env!(
            b.build(),
            near_sdk::test_vm_config(),
            near_sdk::RuntimeFeesConfig::test(),
            Default::default(),
            vec![PromiseResult::Successful(vec![])]
        );
        assert!(c.on_withdraw(account("alice.testnet"), U128(100), false));
        assert_eq!(c.get_balance(account("alice.testnet")).available.0, 200);
        assert_eq!(c.get_balance(account("alice.testnet")).pending.0, 0);
    }
    #[test]
    fn immutable_service_fixes_amount_and_provider() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        let receipt = c.charge(U64(0), 0, "c".repeat(64));
        assert_eq!(receipt.amount.0, 100);
        assert_eq!(receipt.provider, account("provider.testnet"));
        assert_eq!(c.get_balance(account("alice.testnet")).earned.0, 0);
    }
    #[test]
    #[should_panic(expected = "1 yoctoNEAR")]
    fn zero_deposit_delegate_cannot_cancel() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        c.cancel(U64(0));
    }
    #[test]
    #[should_panic(expected = "1 yoctoNEAR")]
    fn zero_deposit_delegate_cannot_withdraw() {
        let mut c = setup();
        context("alice.testnet", 0, SECOND);
        c.withdraw(U128(1), false).detach();
    }
    #[test]
    #[should_panic(expected = "Not owner")]
    fn another_customer_cannot_cancel() {
        let mut c = setup();
        context("attacker.testnet", 1, SECOND);
        c.cancel(U64(0));
    }
}
