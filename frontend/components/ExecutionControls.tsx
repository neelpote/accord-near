"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/near";
export default function ExecutionControls({
  id,
  serviceId,
  active,
}: {
  id: string;
  serviceId: string;
  active: boolean;
}) {
  const [data, setData] = useState<any>(),
    [jobs, setJobs] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [d, j] = await Promise.all([
      api(`/services/${serviceId}/execution`),
      api("/execution/jobs"),
    ]);
    setData(d);
    setJobs(j);
  }
  useEffect(() => {
    let live = true;
    Promise.all([
      api(`/services/${serviceId}/execution`),
      api("/execution/jobs"),
    ])
      .then(([d, j]) => {
        if (live) {
          setData(d);
          setJobs(j);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, serviceId]);
  async function act(body: object) {
    setBusy(true);
    setError("");
    try {
      await api(`/subscriptions/${id}/execution`, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution control failed");
    } finally {
      setBusy(false);
    }
  }
  const job = jobs?.jobs?.find((j: any) => j.id === id),
    approved =
      !!data &&
      job?.approved_identity === data.identity.hash &&
      !job?.execution_paused;
  return (
    <section aria-label={`Execution authority for agreement ${id}`}>
      <h4>Execution authority</h4>
      <button
        disabled={busy}
        onClick={() => void load().catch((e) => setError(e.message))}
      >
        Refresh execution details
      </button>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            {data.identity.agent_id} · version {data.identity.version} ·{" "}
            {data.identity.provider_id}
          </p>
          <details>
            <summary>Inspect execution identity</summary>
            <p>
              Read-only public testnet tools and report generation. Payment
              remains under the separate finite contract and counterparty
              policy.
            </p>
            <p className="account">
              Endpoint: {data.identity.endpoint}
              <br />
              Build digest: {data.identity.build_digest}
              <br />
              Approval identity: {data.identity.hash}
            </p>
            <p>{data.limitations}</p>
          </details>
          <p>
            {approved
              ? "Execution identity approved"
              : "New work paused until you approve this execution identity."}
          </p>
          <div className="actions">
            <button
              disabled={busy || !active || !data.enabled}
              onClick={() =>
                void act({ approve: true, identity_hash: data.identity.hash })
              }
            >
              Approve this execution identity
            </button>
            <button
              disabled={busy || !active}
              onClick={() => void act({ paused: true })}
            >
              Pause new work
            </button>
          </div>
        </>
      )}
      {jobs && (
        <details>
          <summary>Inspect outstanding jobs and security events</summary>
          {jobs.jobs
            .filter((j: any) => j.id === id)
            .map((j: any) => (
              <p key={j.cycle ?? "pending"}>
                Cycle {j.cycle ?? "not started"} ·{" "}
                {j.payment_state ?? "awaiting authorization"} ·{" "}
                {j.receipt
                  ? "Payment receipt recorded"
                  : "No payment receipt recorded"}
              </p>
            ))}
          {jobs.events
            .filter((e: any) => e.subscription_id === id)
            .slice(0, 10)
            .map((e: any) => (
              <p key={e.id}>
                {e.created_at} · {e.event}
              </p>
            ))}
        </details>
      )}
    </section>
  );
}
