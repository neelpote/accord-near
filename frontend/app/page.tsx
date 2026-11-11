"use client";
import { useEffect, useRef, useState } from "react";
import {
  api,
  view,
  wallet,
  connector,
  digest,
  near,
  sendWalletTransaction,
} from "@/lib/near";
import AgentExperience,{SiteMotion} from "@/components/AgentExperience";
import OperationsWorkspace from "@/components/OperationsWorkspace";
import PilotFeedback from "@/components/PilotFeedback";
import ReportView, { type ServiceReport } from "@/components/ReportView";
type AgentExample = {
  kind: string;
  service_id: string;
  subscription_id: string;
  cycle: number;
  input: Record<string, unknown>;
  report: ServiceReport;
  artifact_hash: string;
  receipt: { amount: string; provider: string };
  updated_at: string;
};
type Config = {
  network: string;
  contract: string;
  rpc: string;
  recipient: string;
  provider_url: string;
};
type Service = {
  provider: string;
  name: string;
  price: string;
  interval_ns: string;
  metadata_hash: string;
};
type AgentDefinition = {
  kind: string;
  name: string;
  category: string;
  description: string;
  input_label: string;
  input_example: Record<string, unknown>;
};
type Listing = {
  id: string;
  metadata: {
    kind?: string;
    name?: string;
    category?: string;
    input_label?: string;
    input_example?: Record<string, unknown>;
    description: string;
    provider_url: string;
    analysis_mode?: string;
  };
  service: Service;
};
type Sub = {
  id: string;
  state: string;
  last_error: string;
  service_name?: string;
  service_kind?: string;
  agreement: {
    active: boolean;
    max_cycles: number;
    cycles: number;
    reserved: string;
    next_due_ns: string;
    expires_at_ns: string;
    delegate_key: string;
  };
  cycles: {
    cycle: number;
    state: string;
    artifact_hash: string;
    report?: ServiceReport;
    receipt?: { provider: string; amount: string };
  }[];
};
type Pending = {
  provision_id: string;
  public_key: string;
  input: unknown;
  subscription_id?: string;
  service_id: string;
};
const sample = JSON.stringify(
  {
    walletAddress: "example.testnet",
    holdings: [
      { symbol: "NEAR", balance: "10", value_usd: 80 },
      { symbol: "USDC", balance: "20", value_usd: 20 },
    ],
    totalValueUsd: 100,
  },
  null,
  2,
);
export default function Home() {
  const serviceCache = useRef(new Map<string, Service>());
  const [config, setConfig] = useState<Config>(),
    [account, setAccount] = useState(""),
    [services, setServices] = useState<Listing[]>([]),
    [examples, setExamples] = useState<AgentExample[]>([]),
    [agentTypes, setAgentTypes] = useState<AgentDefinition[]>([]),
    [creatorKind, setCreatorKind] = useState("portfolio-concentration-v1"),
    [subs, setSubs] = useState<Sub[]>([]),
    [balance, setBalance] = useState({
      available: "0",
      earned: "0",
      pending: "0",
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Listing>(),
    [input, setInput] = useState(sample),
    [cycles, setCycles] = useState(3),
    [pending, setPending] = useState<Pending>(),
    [analysisMode, setAnalysisMode] = useState("deterministic"),
    [lookup, setLookup] = useState(""),
    [creator, setCreator] = useState(false),
    [name, setName] = useState("Portfolio concentration report"),
    [description, setDescription] = useState(
      "A concentration-risk report for the portfolio snapshot you supply. Deterministic analysis; no live prices or AI inference.",
    ),
    [price, setPrice] = useState("0.01"),
    [interval, setIntervalSeconds] = useState(60);
  useEffect(()=>{
    if(!selected)return;
    const form=document.getElementById("service-terms");
    form?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motion==="paused"?"auto":"smooth",block:"start"});
  },[selected]);
  async function refresh(c = config) {
    if (!c) return;
    const [rows, examples] = await Promise.all([
      api("/services"),
      api("/agent-examples"),
    ]);
    setExamples(examples);
    setServices(
      await Promise.all(
        rows.map(async (r: Listing) => ({
          ...r,
          service: await (async () => {
            let service = serviceCache.current.get(r.id);
            if (!service) {
              service = await view<Service>(c.rpc, c.contract, "get_service", {
                service_id: r.id,
              });
              serviceCache.current.set(r.id, service);
            }
            return service;
          })(),
        })),
      ),
    );
    try {
      const me = await api("/me");
      setAccount(me.accountId);
    } catch {
      setAccount("");
      return;
    }
    const refreshError = "Financial history could not be refreshed. Last loaded values are retained; your workspace remains signed in.";
    try {
      const [nextSubs, nextBalance] = await Promise.all([api("/subscriptions"), api("/balances")]);
      setSubs(nextSubs);
      setBalance(nextBalance);
      setError(current => current === refreshError ? "" : current);
    } catch {
      setError(refreshError);
    }
  }
  useEffect(() => {
    api("/agent-types")
      .then(setAgentTypes)
      .catch((e) => setError(e.message));
    api("/config")
      .then((c) => {
        setConfig(c);
        return refresh(c);
      })
      .catch((e) => setError(e.message));
    const saved = localStorage.getItem("accord_pending");
    if (saved)
      try {
        setPending(JSON.parse(saved));
      } catch {}
  }, []);
  useEffect(() => {
    if (!config) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (stopped) return;
      await refresh().catch(() => {});
      if (!stopped) timer = setTimeout(poll, 7000);
    }
    timer = setTimeout(poll, 7000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [config]);
  function savePending(p?: Pending) {
    setPending(p);
    if (p) localStorage.setItem("accord_pending", JSON.stringify(p));
    else localStorage.removeItem("accord_pending");
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  async function call(method: string, args: object, deposit = "1") {
    if (!config || !account) throw new Error("Sign in first");
    const result = await sendWalletTransaction({
      network: "testnet",
      signerId: account,
      receiverId: config.contract,
      actions: [
        {
          type: "FunctionCall",
          params: { methodName: method, args, gas: "50000000000000", deposit },
        },
      ],
    });
    if (method === "withdraw" && atob(result.confirmedResult) === "false")
      throw new Error(
        "Withdrawal failed; funds were restored to the contract ledger.",
      );
    return result;
  }
  async function signIn() {
    const challenge = await api("/auth/challenge", {});
    const c = await connector();
    await c.connect();
    const w = await c.wallet();
    const signed = await w.signMessage({
      network: "testnet",
      message: challenge.message,
      recipient: challenge.recipient,
      nonce: Uint8Array.from(atob(challenge.nonce), (c) => c.charCodeAt(0)),
    });
    await api("/auth/verify", {
      challenge_id: challenge.challenge_id,
      ...signed,
    });
    setSubs([]);
    setBalance({ available: "0", earned: "0", pending: "0" });
    setAccount(signed.accountId);
    setNotice("Wallet ownership verified. No spending authority granted.");
  }
  async function approve() {
    if (!selected || !config || !account)
      throw new Error("Choose a service and sign in");
    if (pending)
      throw new Error("Finish or cancel the pending agreement first");
    const checked = await api("/inputs/validate", {
      service_id: selected.id,
      input: JSON.parse(input),
    });
    const parsed = checked.input;
    const d = await api("/delegates", {});
    const p = { ...d, input: parsed, service_id: selected.id };
    savePending(p);
    const storage = await view<string>(
      config.rpc,
      config.contract,
      "storage_quote",
      { max_cycles: cycles },
    );
    await call(
      "subscribe",
      {
        service_id: selected.id,
        delegate_key: d.public_key,
        input_hash: await digest(parsed),
        max_cycles: cycles,
        expires_at_ns: ((BigInt(Date.now()) + 86400000n) * 1000000n).toString(),
      },
      (
        BigInt(selected.service.price) * BigInt(cycles) +
        BigInt(storage)
      ).toString(),
    );
    setNotice(
      "Agreement funded. Enable the limited key to start automatic purchases.",
    );
    await recover(p);
  }
  async function recover(p = pending) {
    if (!p || !config) throw new Error("No pending approval");
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const found = await api("/subscriptions/recover", {
          provision_id: p.provision_id,
        });
        savePending({ ...p, subscription_id: found.subscription_id });
        return;
      } catch (e) {
        if (attempt === 9) throw e;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  async function enable() {
    if (!pending?.subscription_id || !config)
      throw new Error("Recover the agreement first");
    await sendWalletTransaction({
      network: "testnet",
      signerId: account,
      receiverId: account,
      actions: [
        {
          type: "AddKey",
          params: {
            publicKey: pending.public_key,
            accessKey: {
              permission: {
                receiverId: config.contract,
                methodNames: ["charge"],
                allowance: "50000000000000000000000",
              },
            },
          },
        },
      ],
    });
    await api("/subscriptions", {
      subscription_id: pending.subscription_id,
      provision_id: pending.provision_id,
      input: pending.input,
    });
    savePending();
    setSelected(undefined);
    setNotice(
      "Automatic purchases enabled. The first report will appear after verified payment.",
    );
  }
  async function cancel(s: Sub) {
    await call("cancel", { subscription_id: s.id });
    await api(`/subscriptions/${s.id}/cancel`, {});
    setNotice(
      "Future billing revoked on NEAR. Paid reports remain available. You can now withdraw the remainder.",
    );
  }
  async function withdraw(earnings: boolean) {
    await call("withdraw", {
      amount: earnings ? balance.earned : balance.available,
      earnings,
    });
    setNotice("Withdrawal submitted. Refreshing the confirmed balance.");
  }
  async function publish() {
    if (!config) throw new Error("Configuration unavailable");
    if (!/^\d+(\.\d{1,24})?$/.test(price))
      throw new Error("Use a positive NEAR amount with at most 24 decimals");
    if (analysisMode === "groq") {
      const status = await api("/inference/status");
      if (!status.groq_configured) throw new Error("Groq provider is not configured; no offer transaction was requested");
    }
    const [whole, fraction = ""] = price.split(".");
    const amount =
      BigInt(whole) * 10n ** 24n + BigInt(fraction.padEnd(24, "0"));
    const metadata = {
      kind: creatorKind,
      ...(agentTypes.find((d) => d.kind === creatorKind) ?? {}),
      name,
      description,
      provider_url: config.provider_url,
      analysis_mode: analysisMode,
    };
    await call(
      "register_service",
      {
        name,
        metadata_hash: await digest(metadata),
        price: amount.toString(),
        interval_ns: (BigInt(interval) * 1000000000n).toString(),
      },
      "20480000000000000000000",
    );
    const counters = await view<[string, string]>(
      config.rpc,
      config.contract,
      "counters",
      {},
    );
    let found: string | undefined;
    for (
      let n = BigInt(counters[0]) - 1n;
      n >= 0n && n >= BigInt(counters[0]) - 20n;
      n--
    ) {
      const service = await view<Service>(
        config.rpc,
        config.contract,
        "get_service",
        { service_id: n.toString() },
      );
      if (
        service.provider === account &&
        service.metadata_hash === (await digest(metadata))
      ) {
        found = n.toString();
        break;
      }
    }
    if (found === undefined)
      throw new Error(
        "Offer saved on NEAR; refresh to recover its registration",
      );
    await api("/services", { service_id: found, metadata });
    setNotice("Service registered with verified provider ownership.");
    setCreator(false);
  }
  return (
    <>
      <SiteMotion/>
      <a className="skip-link" href="#operations">Skip to application workspace</a>
      <div className="network">
        NEAR TESTNET <span>Free test tokens · no mainnet payments</span>
      </div>
      <header>
        <a className="brand" href="/" aria-label="Accord home">
          <span className="mark" aria-hidden="true"><i/><i/><i/></span>accord<span className="brand-tag">/ NEAR</span>
        </a>
        <nav>
          <a href="#operations">Workspace</a>
          <a href="#market">Services</a>
          <a href="#agreements">Agreements</a>
          <button className="quiet" onClick={() => setCreator(!creator)}>
            List a service
          </button>
        </nav>
        <button
          disabled={busy || !config}
          onClick={() =>
            void run(
              account
                ? async () => {
                    await api("/auth/logout", {});
                    await (await connector()).disconnect();
                    setAccount("");
                  }
                : signIn,
            )
          }
        >
          {account ? account : "Sign in with NEAR"}
          {!account && " ↗"}
        </button>
      </header>
      <main>
        <AgentExperience/>
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
          </div>
        )}
        {pending && (
          <section className="panel pending">
            <h2>Finish your agreement</h2>
            <p>
              The commercial agreement and the charge-only key are separate
              wallet approvals. The key has a 0.05 test NEAR gas allowance.
            </p>
            <div className="actions">
              {pending.subscription_id ? (
                <>
                  <button
                    disabled={busy || !account}
                    onClick={() => void run(enable)}
                  >
                    Enable automatic purchases
                  </button>
                  <button
                    className="quiet"
                    disabled={busy || !account}
                    onClick={() =>
                      void run(async () => {
                        await call("cancel", {
                          subscription_id: pending.subscription_id,
                        });
                        savePending();
                        setNotice(
                          "Pending agreement canceled. Withdraw the remainder below.",
                        );
                      })
                    }
                  >
                    Cancel pending agreement
                  </button>
                </>
              ) : (
                <button
                  disabled={busy || !account}
                  onClick={() => void run(() => recover())}
                >
                  Recover funded agreement
                </button>
              )}
            </div>
            <p className="caption">
              If funding did not confirm, recover again after checking the
              wallet. If funds were deposited, cancel on NEAR and withdraw them.
              Contract: {config?.contract}
            </p>
          </section>
        )}
        {creator && (
          <section className="panel">
            <h2>Register a service</h2>
            <p>
              Sign with the account operated by the independent provider. This
              provider supports five live NEAR agent types and the portfolio
              snapshot service.
            </p>
            <div className="form-grid">
              <label>
                Agent type
                <select
                  value={creatorKind}
                  onChange={(e) => {
                    const kind = e.target.value;
                    setCreatorKind(kind);
                    setAnalysisMode("deterministic");
                    const d = agentTypes.find((x) => x.kind === kind);
                    if (d) {
                      setName(d.name);
                      setDescription(d.description);
                    }
                  }}
                >
                  <option value="portfolio-concentration-v1">
                    Portfolio concentration
                  </option>
                  {agentTypes.map((d) => (
                    <option value={d.kind} key={d.kind}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Service name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                Price per report · test NEAR
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label>
                Analysis method
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value)}
                >
                  <option value="deterministic">
                    Rule-based report
                  </option>
                  <option value="groq" disabled={!creatorKind.startsWith("near-")}>
                    Live chain evidence + Groq explanation
                  </option>
                  <option value="near-ai-cloud" disabled>
                    NEAR AI Cloud · awaiting credits
                  </option>
                </select>
              </label>
              <label>
                Minimum interval · seconds
                <input
                  type="number"
                  min="60"
                  max="2592000"
                  value={interval}
                  onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                />
              </label>
            </div>
            <p className="caption">
              Registration retains 0.02048 test NEAR for storage, plus wallet
              gas. Terms become immutable.
            </p>
            <button
              disabled={busy || !account}
              onClick={() => void run(publish)}
            >
              Approve service registration
            </button>
          </section>
        )}
        <OperationsWorkspace key={account||"anonymous"} account={account}/>
        <section id="market" data-reveal>
          <div className="section-heading">
            <div><p className="eyebrow">SERVICE DIRECTORY</p><h2>Choose the work.<br/><span>Read the terms.</span></h2></div>
            <span>Read the terms. Choose your specialist.</span>
          </div>
          <div className="service-grid">
            {services.map((s) => (
              <article className="service" key={s.id} data-reveal>
                <div className="service-identity"><span className="service-number">SERVICE / {s.id.padStart(2,"0")}</span>
                <p className="eyebrow">
                  {s.metadata.analysis_mode === "near-ai-cloud"
                    ? "NEAR AI CLOUD · VERIFIED INFERENCE"
                    : (s.metadata.category ?? "PORTFOLIO ANALYSIS")}
                </p>
                <h3>{s.service.name}</h3></div>
                <div className="service-description"><p>{s.metadata.description}</p>
                {s.metadata.analysis_mode === "groq" && <p className="caption">Groq explains public chain evidence. No private inference or automatic remediation.</p>}
                {s.metadata.analysis_mode === "near-ai-cloud" && (
                  <p>
                    AI report · signed model response. Preparation must verify
                    before billing.
                  </p>
                )}
                </div><div className="service-terms"><dl>
                  <div>
                    <dt>Per report</dt>
                    <dd>{near(s.service.price)} test NEAR</dd>
                  </div>
                  <div>
                    <dt>Minimum interval</dt>
                    <dd>
                      {Number(BigInt(s.service.interval_ns) / 1000000000n)}{" "}
                      seconds
                    </dd>
                  </div>
                  <div>
                    <dt>Provider</dt>
                    <dd className="account">{s.service.provider}</dd>
                  </div>
                </dl>
                <button
                  disabled={busy || !account}
                  onClick={() => {
                    setSelected(s);
                    setInput(
                      JSON.stringify(
                        s.metadata.input_example ?? JSON.parse(sample),
                        null,
                        2,
                      ),
                    );
                  }}
                >
                  Choose terms →
                </button></div>
                {examples
                  .filter(
                    (e) => e.service_id === s.id && e.kind === s.metadata.kind,
                  )
                  .map((e) => (
                    <details className="agent-demo" key={e.kind}>
                      <summary>View paid example</summary>
                      <p className="caption">
                        Recorded testnet demonstration ·{" "}
                        {new Date(e.updated_at).toLocaleString()}. This is a
                        purchased snapshot, not a fresh report generated when
                        you open it.
                      </p>
                      <ReportView report={e.report} />
                      <p className="caption">
                        Agreement #{e.subscription_id} · cycle {e.cycle + 1} ·
                        provider credit {near(e.receipt.amount)} test NEAR
                        <br />
                        Artifact SHA-256: {e.artifact_hash}
                      </p>
                      <a
                        className="evidence-link"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://testnet.nearblocks.io/address/${config?.contract}`}
                      >
                        Inspect the testnet contract ↗
                      </a>
                    </details>
                  ))}

              </article>
            ))}
            {services.length === 0 && (
              <div className="empty">
                <h3>No published services yet</h3>
                <p>
                  Start the provider and register its service to make it
                  available here. See the repository setup guide.
                </p>
              </div>
            )}
          </div>
        </section>
        {selected && (
          <section className="panel" id="service-terms">
            <div className="section-heading">
              <h2>Your terms · {selected.service.name}</h2>
              <button className="quiet" onClick={() => setSelected(undefined)}>
                Close
              </button>
            </div>
            <label>
              {selected.metadata.input_label ?? "Portfolio snapshot · JSON"}
              <textarea
                className="code-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={12}
              />
            </label>
            <p className="caption">
              {selected.metadata.kind?.startsWith("near-")
                ? "The provider reads live NEAR testnet data for this input. Every purchased report records its observation time and source block. No private key is needed."
                : "Values are supplied by you. The sample is illustrative. No live holdings or price feed is fetched."}
            </p>
            <label>
              Maximum reports
              <input
                type="number"
                min="1"
                max="20"
                value={cycles}
                onChange={(e) =>
                  setCycles(Math.max(1, Math.min(20, Number(e.target.value))))
                }
              />
            </label>
            <div className="budget">
              <div>
                <span>Maximum service spend</span>
                <strong>
                  {near(
                    (
                      BigInt(selected.service.price) * BigInt(cycles)
                    ).toString(),
                  )}{" "}
                  test NEAR
                </strong>
              </div>
              <div>
                <span>Retained storage fee</span>
                <strong>
                  {near(
                    ((2048n + 512n * BigInt(cycles)) * 10n ** 19n).toString(),
                  )}{" "}
                  test NEAR
                </strong>
              </div>
              <div>
                <span>Approval expires</span>
                <strong>24 hours after approval</strong>
              </div>
            </div>
            <p>
              First report can be purchased immediately; later reports follow
              the minimum interval. Funds are held by the Accord contract.
              Reports are not refundable automatically.
            </p>
            <button
              disabled={busy || !account}
              onClick={() => void run(approve)}
            >
              Approve and fund agreement
            </button>
          </section>
        )}
        <section id="agreements" data-reveal>
          <div className="section-heading">
            <h2>My agreements</h2>
            <button
              className="quiet"
              disabled={busy || !config}
              onClick={() => void run(() => refresh())}
            >
              Refresh ↻
            </button>
          </div>
          {!account ? (
            <div className="empty">
              Sign in to see your agreements and delivered reports.
            </div>
          ) : subs.length === 0 ? (
            <div className="empty">
              Choose a service to approve your first agreement.
            </div>
          ) : (
            subs.map((s) => (
              <article className="panel" key={s.id} id={`agreement-${s.id}`}>
                <div className="section-heading">
                  <h3>Agreement #{s.id}</h3>
                  <span className="badge">
                    {s.agreement.active
                      ? s.agreement.cycles >= s.agreement.max_cycles
                        ? "Complete"
                        : BigInt(s.agreement.expires_at_ns) <=
                            BigInt(Date.now()) * 1000000n
                          ? "Expired"
                          : "Active"
                      : "Canceled"}
                  </span>
                </div>
                <p className="eyebrow">
                  {s.service_name ?? "Portfolio concentration report"}
                </p>
                <div
                  className="cycle-strip"
                  aria-label={`${s.agreement.cycles} of ${s.agreement.max_cycles} reports purchased`}
                >
                  {Array.from({ length: s.agreement.max_cycles }, (_, i) => (
                    <span
                      key={i}
                      className={i < s.agreement.cycles ? "purchased" : ""}
                    />
                  ))}
                </div>
                <p>
                  {s.agreement.cycles} of {s.agreement.max_cycles} reports
                  purchased · {near(s.agreement.reserved)} test NEAR reserved
                </p>
                {s.last_error && (
                  <p role="alert" className="error-text">
                    {s.last_error}
                  </p>
                )}
                <div className="actions">
                  <button
                    className="quiet"
                    disabled={busy || !s.agreement.active}
                    onClick={() => void run(() => cancel(s))}
                  >
                    Cancel future purchases
                  </button>
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await sendWalletTransaction({
                          network: "testnet",
                          signerId: account,
                          receiverId: account,
                          actions: [
                            {
                              type: "DeleteKey",
                              params: { publicKey: s.agreement.delegate_key },
                            },
                          ],
                        });
                        setNotice(
                          "Limited key removed from wallet. Cancel the agreement to release its reserve.",
                        );
                      })
                    }
                  >
                    Remove limited key
                  </button>
                </div>
                {s.cycles.map((c) => (
                  <details key={c.cycle} open={c.state === "DELIVERED"}>
                    <summary>
                      Report {c.cycle + 1}{" "}
                      <span className="badge">
                        {c.state === "SETTLED"
                          ? "Paid · awaiting delivery"
                          : c.state === "DELIVERED"
                            ? "Paid · delivered"
                            : c.state}
                      </span>
                    </summary>
                    {c.report && <ReportView report={c.report} />}
                    <p className="caption">
                      Artifact SHA-256: {c.artifact_hash}
                    </p>
                    {c.receipt && (
                      <p className="caption">
                        Verified provider credit: {near(c.receipt.amount)} test
                        NEAR to {c.receipt.provider}. Provider withdrawal is a
                        separate step.
                      </p>
                    )}
                  </details>
                ))}
              </article>
            ))
          )}
        </section>
        {account && (
          <section className="panel">
            <h2>Recover an agreement</h2>
            <p>
              Funded an agreement on another device, or lost the activation
              reminder? Find it by its onchain ID to cancel and recover its
              reserve.
            </p>
            <label>
              Agreement ID
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button
              className="quiet"
              disabled={busy || !lookup}
              onClick={() =>
                void run(async () => {
                  if (!config || !/^\d{1,20}$/.test(lookup))
                    throw new Error("Enter a valid agreement ID");
                  const sub = await view<{ owner: string }>(
                    config.rpc,
                    config.contract,
                    "get_subscription",
                    { subscription_id: lookup },
                  );
                  if (!sub || sub.owner !== account)
                    throw new Error("This wallet does not own that agreement");
                  await call("cancel", { subscription_id: lookup });
                  setNotice(
                    "Agreement canceled on NEAR. Withdraw its remainder below.",
                  );
                })
              }
            >
              Cancel and recover reserve
            </button>
          </section>
        )}
        {account && (
          <section className="panel">
            <h2>Funds and earnings</h2>
            <div className="funds">
              <div>
                <p>Available remainder</p>
                <strong>
                  {near(balance.available)} <small>test NEAR</small>
                </strong>
                <button
                  disabled={
                    busy || balance.available === "0" || balance.pending !== "0"
                  }
                  onClick={() => void run(() => withdraw(false))}
                >
                  Withdraw remainder
                </button>
              </div>
              <div>
                <p>Provider earnings</p>
                <strong>
                  {near(balance.earned)} <small>test NEAR</small>
                </strong>
                <button
                  disabled={
                    busy || balance.earned === "0" || balance.pending !== "0"
                  }
                  onClick={() => void run(() => withdraw(true))}
                >
                  Withdraw earnings
                </button>
              </div>
            </div>
            {balance.pending !== "0" && (
              <p role="status">
                Withdrawal pending: {near(balance.pending)} test NEAR. Wait for
                confirmation before retrying.
              </p>
            )}
            <p className="caption">
              Funds return directly to your signed-in wallet. Withdrawals
              require one yoctoNEAR plus gas. Retained storage fees remain in
              the contract.
            </p>
          </section>
        )}
      <details id="pilot"><summary>Pilot feedback</summary><PilotFeedback account={account}/></details>
      </main>
      <footer>
        <a className="footer-wordmark" href="#">accord<span>↗</span></a>
        <span>Good agents. Clear limits.</span>
        <a href="https://quaternius.com/packs/animatedrobot.html" target="_blank" rel="noreferrer">Character / Quaternius · CC0 ↗</a>
        <a
          href="https://github.com/neelpote/accord-near"
          target="_blank"
          rel="noreferrer"
        >
          Source & verification ↗
        </a>
        <p>
          Testnet prototype. Report quality and delivery depend on the provider.
          The deployment account retains upgrade authority.
        </p>
      </footer>
      {busy && (
        <div className="working" role="status">
          Waiting for wallet or network confirmation…
        </div>
      )}
    </>
  );
}
