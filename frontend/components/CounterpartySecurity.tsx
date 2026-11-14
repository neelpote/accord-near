"use client";
import { useEffect, useState } from "react";
import RenewalReview from "./RenewalReview";
import { api, near } from "@/lib/near";
type Decision = {
  id: string;
  state: string;
  expires_at: string;
  body: {
    verdict: string;
    intent_hash: string;
    evidence_hash: string;
    intent: {
      receiver: string;
      contract: string;
      amount: string;
      args: { subscription_id: string; cycle: number };
    };
    reasons: { code: string; message: string; account?: string }[];
    evidence: unknown;
  };
};
type Report = {
  id: string;
  account: string;
  reporter: string;
  reason: string;
  status: string;
  evidence_hash: string;
  evidence: unknown;
  reviews: unknown[];
};
export default function CounterpartySecurity({ account }: { account: string }) {
  const [data, setData] = useState<{
      decisions: Decision[];
      reports: Report[];
      reviewer: boolean;
    }>({ decisions: [], reports: [], reviewer: false }),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  function checked(d: typeof data) {
    if (!d || !Array.isArray(d.decisions) || !Array.isArray(d.reports))
      throw Error(
        "Security service returned an invalid response; payment review is unavailable",
      );
    return d;
  }
  async function load() {
    setData(checked(await api("/security")));
  }
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      await load();
      setNotice("Saved. The worker rechecks current evidence before signing.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!account) return;
    let active = true;
    const refresh = async () => {
      try {
        const d = await api("/security");
        if (active) setData(checked(d));
      } catch (e) {
        if (active) setNotice((e as Error).message);
      }
    };
    void refresh();
    const t = setInterval(() => void refresh(), 10000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [account]);
  return (
    <section
      id="security"
      className="operations"
      aria-labelledby="security-title"
    >
      <div className="section-label">Before the signature</div>
      <h2 id="security-title">Payment security</h2>
      <p>
        Every automated charge checks the contract and its payment receiver.
        Blocks stop signing. Warnings wait for your review of one exact payment.
      </p>
      {!account ? (
        <p>Connect your wallet to review your decisions and submit evidence.</p>
      ) : (
        <>
          <button
            className="quiet"
            disabled={busy}
            onClick={() => void act(load)}
          >
            Refresh security decisions
          </button>
          <h3>Your payment decisions</h3>
          {!data.decisions.length && (
            <p>
              No decisions yet. They appear when an agreement has a payment due.
            </p>
          )}
          {data.decisions.map((d) => (
            <article className="baseline" key={d.id}>
              <h4>
                {d.body.verdict.toUpperCase()} · {d.state}
              </h4>
              <p>
                Agreement {d.body.intent.args.subscription_id} · cycle{" "}
                {d.body.intent.args.cycle} · {near(d.body.intent.amount)} test NEAR
              </p>
              <p>
                Receiver <code>{d.body.intent.receiver}</code>
                <br />
                Contract <code>{d.body.intent.contract}</code>
              </p>
              <ul>
                {d.body.reasons.map((r, i) => (
                  <li key={i}>
                    <strong>{r.code}</strong>: {r.message}
                    {r.account ? ` (${r.account})` : ""}
                  </li>
                ))}
              </ul>
              <p>Expires {new Date(d.expires_at).toLocaleString()}</p>
              <RenewalReview key={`${account}:${d.id}`} id={d.id}/>
              <details>
                <summary>Inspect exact intent and evidence</summary>
                <pre>{JSON.stringify(d.body, null, 2)}</pre>
              </details>
              {d.state === "pending" &&
                new Date(d.expires_at).getTime() > Date.now() && (
                  <div>
                    <p>
                      Approval permits this payment once. It cannot override a
                      block or missing live chain state. Changed evidence
                      requires another review.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          api(`/security/decisions/${d.id}`, {
                            approve: true,
                            intent_hash: d.body.intent_hash,
                            evidence_hash: d.body.evidence_hash,
                          }),
                        )
                      }
                    >
                      Approve this exact payment once
                    </button>
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          api(`/security/decisions/${d.id}`, {
                            approve: false,
                            intent_hash: d.body.intent_hash,
                            evidence_hash: d.body.evidence_hash,
                          }),
                        )
                      }
                    >
                      Decline payment
                    </button>
                  </div>
                )}
            </article>
          ))}
          <h3>Shared evidence reports</h3>
          <p>
            Reports are shared across agents. An unreviewed report causes a
            warning, not a confirmed scam label. Only configured reviewers can
            add a receiver to the enforced blocklist.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget,
                d = new FormData(f);
              void act(async () => {
                await api("/security/reports", Object.fromEntries(d));
                f.reset();
              });
            }}
          >
            <label>
              Reported testnet account
              <input name="account" required maxLength={64} />
            </label>
            <label>
              Evidence transaction hash
              <input name="transaction_hash" required maxLength={44} />
            </label>
            <label>
              Transaction signer account
              <input name="signer" required maxLength={64} />
            </label>
            <label>
              What happened? Include how the transaction supports your report
              <textarea
                name="reason"
                required
                minLength={15}
                maxLength={1000}
              />
            </label>
            <button disabled={busy}>Submit evidence for review</button>
          </form>
          {!data.reports.length && <p>No reports submitted.</p>}
          {data.reports.map((r) => (
            <article className="baseline" key={r.id}>
              <h4>
                {r.account} · {r.status}
              </h4>
              <p>{r.reason}</p>
              <p>
                Reported by <code>{r.reporter}</code>
              </p>
              <details>
                <summary>Verified chain evidence and review history</summary>
                <pre>
                  {JSON.stringify(
                    {
                      evidence: r.evidence,
                      evidence_hash: r.evidence_hash,
                      reviews: r.reviews,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
              {data.reviewer && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    void act(() =>
                      api(
                        `/security/reports/${r.id}/review`,
                        Object.fromEntries(d),
                      ),
                    );
                  }}
                >
                  <label>
                    Review outcome
                    <select name="status">
                      <option value="pending">Pending investigation</option>
                      <option value="block">Block receiver</option>
                      <option value="dismissed">Dismiss allegation</option>
                    </select>
                  </label>
                  <label>
                    Evidence assessment
                    <textarea
                      name="reason"
                      required
                      minLength={15}
                      maxLength={1000}
                    />
                  </label>
                  <button disabled={busy}>Record review</button>
                </form>
              )}
            </article>
          ))}
        </>
      )}
      <p role="status">{notice}</p>
    </section>
  );
}
