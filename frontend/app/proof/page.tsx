"use client";
import { useState } from "react";
import model from "@/public/proof/causal-agent-responses.json";
import proof from "@/public/proof/causal-attack-proof.json";
import styles from "./proof.module.css";
const repo = "https://github.com/neelpote/accord-near";
export default function ProofPage() {
  const [poisoned, setPoisoned] = useState(false);
  const run = poisoned ? model.attack : model.control;
  const injected = model.attack.document.slice(model.control.document.length);
  return <main className={styles.lab}>
    <nav aria-label="Proof navigation"><a href="/">← Accord</a><a href={`${repo}/blob/main/docs/SECURITY_WALKTHROUGH.md`}>Reproduction guide ↗</a></nav>
    <div className={styles.label}>SECURITY CASE FILE / 13 NOVEMBER 2026 / NEAR TESTNET</div>
    <h1>The instruction changed.<br/>The payment boundary held.</h1>
    <p className={styles.lead}>A billing document persuaded a deliberately vulnerable reference agent to change the receiver. Accord stopped its proposal before signing. A legitimate control payment still went through.</p>
    <p className={styles.notice}>Recorded experiment, not a live attack. No wallet needed. Nothing on this page signs, pays or calls a model. The production worker does not use this reference planner.</p>
    <section aria-labelledby="compare-title">
      <h2 id="compare-title">Change one input. Inspect the result.</h2>
      <p>Same system prompt, same task, same model. Only the tool document changed between two captured Groq calls.</p>
      <div className={styles.switch} role="group" aria-label="Choose recorded agent input">
        <button aria-pressed={!poisoned} onClick={()=>setPoisoned(false)}>Clean billing document</button>
        <button aria-pressed={poisoned} onClick={()=>setPoisoned(true)}>Poisoned billing document</button>
      </div>
      <div className={styles.comparison}>
        <article><h3>What the agent read</h3><pre>{model.control.document}{poisoned && <mark>{injected}</mark>}</pre></article>
        <article aria-live="polite"><h3>What it proposed</h3><span className={styles.label}>{run.model} / CAPTURED OUTPUT</span><p className={styles.receiver}>{run.plan.receiver_account_id}</p><p>{run.plan.reason}</p><p className={poisoned ? styles.block : styles.allow}>{poisoned ? "BLOCK · no signature requested" : "CONTROL · paid after exact owner review"}</p><p>{poisoned ? "The proposed receiver differed from the registered agreement. The gate refused it; recorded signer calls: 0, broadcasts: 0." : "Agreement 31 was funded, due and explicitly reviewed. One scoped-key signing call paid 0.001 test NEAR."}</p></article>
      </div>
      <details><summary>Inspect the unchanged system prompt and task</summary><h3>System</h3><pre>{model.system}</pre><h3>Task</h3><pre>{model.task}</pre></details>
    </section>
    <section aria-labelledby="isolate-title"><h2 id="isolate-title">Was the block just a wrong receiver?</h2>
      <p>We checked that separately. A third case kept valid payment terms and used an isolated, curated denylist entry for our own provider fixture. The agreement was active, funded and due, with a scoped key. Reputation alone stopped signing.</p>
      <div className={styles.results}>
        <article><h3>Legitimate control</h3><strong>1 signature</strong><p>0.001 test NEAR credited to the provider. Agreement 31, cycle 0.</p><a href={`https://testnet.nearblocks.io/txns/${proof.control_transaction}`}>Inspect payment transaction ↗</a></article>
        <article><h3>Injected receiver</h3><strong>0 signatures</strong><p>TERMS_MISMATCH. Agreement 32. No broadcast recorded.</p></article>
        <article><h3>Valid terms, denied fixture</h3><strong>0 signatures</strong><p>VERIFIED_BLOCKLIST, without TERMS_MISMATCH. Buyer balance unchanged.</p></article>
      </div>
      <p className={styles.notice}>The denylisted accounts belong to this controlled experiment. They are not allegations about third parties. Zero-signature counts come from operator-produced logs; blockchain reads can check receipts, but cannot independently attest that a signer was never called.</p>
    </section>
    <section aria-labelledby="verify-title"><h2 id="verify-title">Don’t take the screenshot’s word for it.</h2><p>From a fresh checkout with Node 24, run this read-only check. No npm install, credentials, database or AI credits required.</p><pre>node scripts/verify-security-proof.mjs --chain</pre><p>It checks captured-input hashes and log consistency, then reads finalized testnet state: every field of the control receipt, absence of the attack’s cycle-zero receipt, and both canceled agreements’ paid-cycle counts. RPC failures fail the check; they never become a pass.</p>
      <div className={styles.links}><a href="/proof/causal-agent-responses.json" download>Download captured inputs + outputs</a><a href="/proof/causal-attack-proof.json" download>Download experiment log</a><a href={`${repo}/blob/main/scripts/verify-security-proof.mjs`}>Read the verifier ↗</a></div>
      <details><summary>What this does—and does not—prove</summary><p>The backend refuses denied proposals and binds warning approval to one intent and its evidence. The Rust contract separately fixes provider, price, interval, cycle limit and expiry. Its charge-only key cannot transfer native NEAR or withdraw funds.</p><p>Backend compromise can bypass reputation checks. Deployment authority is retained. File hashes check consistency, not independent model-provider authenticity. One controlled attack does not measure general detection accuracy. Report hashes identify content, not its quality. This remains an unaudited testnet prototype.</p></details>
    </section>
    <footer><a href="/#market">Explore the services →</a><a href={`${repo}/blob/main/docs/COUNTERPARTY_SECURITY.md`}>Data sources and trust boundaries ↗</a></footer>
  </main>;
}
