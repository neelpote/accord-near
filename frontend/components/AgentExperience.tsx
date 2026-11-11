"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const Scene = dynamic(() => import("./AgentScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading" aria-hidden="true">
      <AgentGlyph kind="near-contract-sentinel-v1" />
    </div>
  ),
});
const crew = [
  {
    name: "Wallet Watch",
    role: "Balances",
    description: "Review spendable funds and the reserve you choose.",
    kind: "near-wallet-watch-v1",
  },
  {
    name: "Access Guard",
    role: "Permissions",
    description: "Review public keys and the authority they hold.",
    kind: "near-access-guard-v1",
  },
  {
    name: "Contract Sentinel",
    role: "Code identity",
    description: "Compare deployed code with your approved baseline.",
    kind: "near-contract-sentinel-v1",
  },
  {
    name: "Receipt Inspector",
    role: "Transactions",
    description: "Inspect finalized outcomes and exact gas burn.",
    kind: "near-receipt-inspector-v1",
  },
  {
    name: "Network Pulse",
    role: "Network",
    description: "Check block freshness and the configured RPC.",
    kind: "near-network-pulse-v1",
  },
];
export function AgentGlyph({ kind }: { kind?: string }) {
  const index = crew.findIndex((c) => c.kind === kind);
  return (
    <svg
      className={`agent-glyph glyph-${index}`}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m16 22 25-10 24 12-25 12Z"
        fill="#fcf5e9"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <path
        d="M16 22v32l24 15V36Z"
        fill="#d9d5cc"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <path
        d="m40 36 25-12v31L40 69Z"
        fill="#efebe3"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <path d="m20 30 16 10v18L20 48Z" fill="#252d2d" />
      <path
        className="glyph-eyes"
        d="m24 37 2 1v6l-2-1zm7 4 2 1v6l-2-1Z"
        fill="#b5e6d4"
      />
      <path
        d="m48 42 10-5v10l-10 5Z"
        fill={index === 2 ? "#ec692e" : "#b6c2b3"}
      />
      <path d="m27 18 14-5 14 7-14 5Z" fill="#e96832" fillOpacity=".65" />
    </svg>
  );
}
export default function AgentExperience() {
  const [active, setActive] = useState(2),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion =
      paused || reduced ? "paused" : "running";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [paused, reduced]);
  const agent = crew[active]!;
  return (
    <section className="intro" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="orange-square" /> AUTONOMY, WITH BOUNDARIES
        </p>
        <h1 id="hero-heading">
          Your agents.
          <br />
          <span>Your rules.</span>
        </h1>
        <p className="lede">
          A watchful crew for your NEAR application. Catch code and key changes,
          inspect the evidence, and keep paid reports inside your limits.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="#operations">
            Open workspace <span>↗</span>
          </a>
          <a className="text-link" href="#market">
            Meet the agents <span>↓</span>
          </a>
        </div>
        <div className="hero-footnote">
          <span className="small-cross">+</span>
          <p>
            You approve the baseline.
            <br />
            You set the spending limit.
          </p>
        </div>
      </div>
      <div className="hero-lab">
        <div className="lab-topline">
          <span>ACCORD / AGENT LAB</span>
          <span className="lab-cross">+</span>
        </div>
        <Scene active={active} paused={paused || reduced} />
        <div className="lab-agent">
          <span className="agent-serial">0{active + 1} / 05</span>
          <div>
            <h2>{agent.name}</h2>
            <p>{agent.description}</p>
          </div>
          <a href="#market" aria-label={`Explore ${agent.name}`}>
            ↗
          </a>
        </div>
        <div
          className="lab-selector"
          role="group"
          aria-label="Explore agent roles"
        >
          {crew.map((c, i) => (
            <button
              key={c.kind}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
            >
              {c.role}
            </button>
          ))}
        </div>
        <div className="lab-bottomline">
          <span>Illustrative crew · explore reports below</span>
          <button
            className="motion-toggle"
            disabled={reduced}
            aria-pressed={paused || reduced}
            onClick={() => setPaused((p) => !p)}
          >
            {reduced
              ? "Reduced motion"
              : paused
                ? "▶ Resume animations"
                : "Ⅱ Pause animations"}
          </button>
        </div>
      </div>
    </section>
  );
}
export function WorkflowStrip() {
  return (
    <section
      className="workflow-strip"
      aria-label="How Accord works"
      data-reveal
    >
      <div>
        <span className="flow-index">01 / OBSERVE</span>
        <svg viewBox="0 0 180 80" aria-hidden="true">
          <path d="M10 40H170M90 8V72" />
          <rect x="61" y="15" width="58" height="50" />
          <rect className="scan-block" x="80" y="30" width="20" height="20" />
        </svg>
        <h2>A baseline you approve.</h2>
        <p>
          Start with your deployment records. Keep code identity and key
          permissions in view.
        </p>
      </div>
      <div>
        <span className="flow-index">02 / UNDERSTAND</span>
        <svg viewBox="0 0 180 80" aria-hidden="true">
          <path d="M12 20H55V40H125V60H168M90 40V10M90 40V72" />
          <rect x="5" y="13" width="14" height="14" />
          <rect className="signal-block" x="83" y="33" width="14" height="14" />
          <rect x="161" y="53" width="14" height="14" />
        </svg>
        <h2>Evidence, before opinion.</h2>
        <p>
          Inspect what changed. Ask for an optional AI explanation when you need
          context.
        </p>
      </div>
      <div>
        <span className="flow-index">03 / STAY IN CONTROL</span>
        <svg viewBox="0 0 180 80" aria-hidden="true">
          <path d="M12 40H57M123 40H168" />
          <path d="m90 9 30 13v23c0 13-30 27-30 27S60 58 60 45V22Z" />
          <path className="shield-tick" d="m78 39 9 9 17-20" />
        </svg>
        <h2>Terms that stay put.</h2>
        <p>
          Fixed price. Finite budget. Separate approval for every paid
          agreement.
        </p>
      </div>
    </section>
  );
}
export function SiteMotion() {
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    function register(element: Element) {
      if (!seen.has(element)) {
        seen.add(element);
        if (element.getBoundingClientRect().top > innerHeight)
          element.classList.add("reveal-pending");
        observer.observe(element);
      }
    }
    document.querySelectorAll("[data-reveal]").forEach(register);
    const changes = new MutationObserver((records) =>
      records.forEach((r) =>
        r.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            if (n.matches("[data-reveal]")) register(n);
            n.querySelectorAll("[data-reveal]").forEach(register);
          }
        }),
      ),
    );
    changes.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      changes.disconnect();
      document
        .querySelectorAll(".reveal-pending")
        .forEach((e) => e.classList.remove("reveal-pending"));
    };
  }, []);
  return null;
}
