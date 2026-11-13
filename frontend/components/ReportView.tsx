import RiskReportView from "./RiskReportView";
import { near } from "@/lib/near";
export type ServiceReport = {
  explanation?: {provider: string; model: string; summary: string; next_steps: string[]; disclosure: string};
  risk_score?: number;
  risk_level?: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  method?: string;
  kind?: string;
  title?: string;
  status?: string;
  observed_at?: string;
  disclosure?: string;
  metrics?: { label: string; value: string }[];
  source?: {
    network: string;
    block_height: number;
    block_hash: string;
    transaction_hash?: string;
  };
  inference?: { model: string; completion_id: string; signature_kind: string };
};
function readableNear(value: string) {
  const full = near(value),
    [whole, fraction = ""] = full.split(".");
  return fraction.length > 6 ? `≈ ${whole}.${fraction.slice(0, 6)}` : full;
}
export default function ReportView({ report: r }: { report: ServiceReport }) {
  if(r.kind==="near-contract-risk-analyst-v1")return <RiskReportView report={r}/>;
  return (
    <div className="report">
      {r.metrics ? (
        <div className={`agent-status ${r.status}`}>
          {r.status === "ok" ? "OK" : r.status}
          <small>live RPC check</small>
        </div>
      ) : (
        <div className="risk-score">
          {r.risk_score}
          <small>/100 concentration</small>
        </div>
      )}
      <div>
        <h4>{r.title ?? `${r.risk_level} concentration risk`}</h4>
        <p>{r.summary}</p>
        {r.metrics && (
          <dl className="report-metrics">
            {r.metrics.map((m) => (
              <div key={m.label}>
                <dt>
                  {m.label.includes("yoctoNEAR") && !m.label.includes("/gas")
                    ? m.label.replace(" · yoctoNEAR", "")
                    : m.label}
                </dt>
                <dd>
                  {m.label.includes("yoctoNEAR") &&
                  !m.label.includes("/gas") &&
                  /^\d+$/.test(m.value) ? (
                    <>
                      {readableNear(m.value)} test NEAR
                      <small className="exact-value">{m.value} yoctoNEAR</small>
                    </>
                  ) : (
                    m.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {r.source && (
          <p className="caption">
            {r.source.network} · block {r.source.block_height} · {r.observed_at}
            <br />
            Block hash: {r.source.block_hash}
          </p>
        )}
        {r.explanation && <aside className="panel">
          <h4>What to review next</h4>
          <p>{r.explanation.summary}</p>
          <ol>{r.explanation.next_steps.map((step,i) => <li key={i}>{step}</li>)}</ol>
          <p className="caption">Groq · {r.explanation.model} · {r.explanation.disclosure}</p>
        </aside>}
        {r.disclosure && <p className="caption">{r.disclosure}</p>}
        {r.findings.map((f, i) => (
          <p key={i}>{f}</p>
        ))}
        {r.recommendations.map((f, i) => (
          <p key={i}>{f}</p>
        ))}
        {r.method === "near-ai-cloud-v1" && r.inference && (
          <p className="caption">
            NEAR AI Cloud · {r.inference.model} · {r.inference.signature_kind}{" "}
            signature verified by provider · {r.inference.completion_id}
          </p>
        )}
      </div>
    </div>
  );
}
