"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/near";
export default function DeliveryVerification({
  id,
  cycle,
  verification,
  receipt,
  artifactHash,
  deliveredAt,
  paymentState,
  paymentTx,
  serviceName,
}: {
  id: string;
  cycle: number;
  verification?: any;
  receipt?: { provider: string; amount: string };
  artifactHash: string;
  deliveredAt?: string;
  paymentState: string;
  paymentTx?: string;
  serviceName: string;
}) {
  const [details, setDetails] = useState<any>(),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function inspect() {
    try {
      setDetails(
        await api(`/subscriptions/${id}/cycles/${cycle}/verification`),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot retrieve verification");
    }
  }
  async function feedback(action: string) {
    setBusy(true);
    try {
      await api(`/subscriptions/${id}/cycles/${cycle}/feedback`, {
        action,
        reason,
      });
      await inspect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setBusy(false);
    }
  }
  const v = details?.verification ?? verification,
    status = v?.status ?? "PENDING";
  return (
    <section className="delivery-verification" aria-label={`Delivery verification for ${id}:${cycle}`}>
      <h4>Delivery verification</h4>
      <p>{serviceName}</p>
      <p>
        Job {id}:{cycle} · payment/delivery: {paymentState}
      </p>
      <p>
        Verification: <strong>{status}</strong>
      </p>
      <dl>
        <dt>Provider</dt>
        <dd className="account">{receipt?.provider ?? "Not paid"}</dd>
        <dt>Payment evidence</dt>
        <dd>
          {receipt
            ? "Finalized contract receipt recorded"
            : "No finalized receipt recorded"}
          {paymentTx ? (
            <a
              href={`https://testnet.nearblocks.io/txns/${paymentTx}`}
              target="_blank"
              rel="noreferrer"
            >
              {" "}
              · Inspect transaction
            </a>
          ) : (
            receipt &&
            " · Transaction hash unavailable; inspect the agreement/cycle receipt."
          )}
        </dd>
        <dt>Delivery time</dt>
        <dd>{details?.delivered_at ?? deliveredAt ?? "Not delivered"}</dd>
        <dt>Artifact SHA-256</dt>
        <dd className="account">{artifactHash ?? "Not prepared"}</dd>
        <dt>Schema</dt>
        <dd>
          {v?.schema_valid ? "Report structure validated" : "Not validated"}
        </dd>
        <dt>Evidence</dt>
        <dd>
          {v?.evidence_valid
            ? "Supported source evidence retrieved"
            : "Not independently validated"}
        </dd>
        <dt>Freshness</dt>
        <dd>
          {v?.freshness ?? "Not verified"}
          {v?.checked_at && ` · checked ${v.checked_at}`}
        </dd>
      </dl>
      <p>
        Structure, evidence and payment checks do not prove factual correctness
        or service quality.
      </p>
      {v?.warnings?.map((w: string) => (
        <p key={w}>{w}</p>
      ))}
      {v?.evidence && (
        <details>
          <summary>Inspect retrieved source references</summary>
          <pre>{JSON.stringify(v.evidence, null, 2)}</pre>
        </details>
      )}
      <button disabled={busy} onClick={() => void inspect()}>
        Refresh verification history
      </button>
      {details && (
        <details>
          <summary>Validation and dispute history</summary>
          <pre>
            {JSON.stringify(
              { history: details.history, disputes: details.disputes },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      {paymentState === "DELIVERED" && (
        <>
          <label>
            Report a delivery or quality issue
            <textarea
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="actions">
            <button disabled={busy} onClick={() => void feedback("accept")}>
              Acknowledge receipt
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() => void feedback("dispute")}
            >
              Record dispute
            </button>
          </div>
          <p>
            Disputes are recorded for manual review. This contract does not
            automatically refund paid reports.
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function ServiceSpecification({
  serviceId,
  onReady,
}: {
  serviceId: string;
  onReady: (hash: string) => void;
}) {
  const [data, setData] = useState<any>(),
    [error, setError] = useState("");
  useEffect(()=>{
    let active=true;
    api(`/services/${serviceId}/execution`).then(result=>{
      if(!result?.specification?.output_schema||!Array.isArray(result.specification.output_schema.required)||typeof result.spec_hash!=="string")throw Error("Delivery specification unavailable");
      if(active){setData(result);onReady(result.spec_hash);setError('');}
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Specification unavailable');});
    return()=>{active=false;};
  },[serviceId,onReady]);
  return (
    <section className="delivery-verification" aria-label="Service delivery specification">
      {data && (
        <p>
          Required output:{" "}
          {data.specification.output_schema.required.join(", ")}. Evidence
          window: {data.specification.freshness_seconds} seconds.{" "}
          {data.specification.correctness}.
        </p>
      )}
      <details>
        <summary>
          Inspect service delivery specification before approval
        </summary>
        {error && <p role="alert">{error}</p>}
        {data ? (
          <>
            <p>
              Provider {data.specification.provider_id} ·{" "}
              {data.specification.schema_version}
            </p>
            <p>
              Freshness: {data.specification.freshness_seconds} seconds at
              purchase. Execution window:{" "}
              {data.specification.execution_window_seconds} seconds.
            </p>
            <p>
              {data.specification.retry_policy}.{" "}
              {data.specification.failure_policy}.
            </p>
            <p>
              Required output:{" "}
              {data.specification.output_schema.required.join(", ")}.
            </p>
            <p>{data.specification.correctness}</p>
            <pre>{JSON.stringify(data.specification, null, 2)}</pre>
            <p className="account">Consent hash: {data.spec_hash}</p>
          </>
        ) : (
          <p>Loading service specification…</p>
        )}
      </details>
    </section>
  );
}
