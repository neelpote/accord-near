"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
const Scene = dynamic(() => import("./AgentScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading" aria-hidden="true">
      Loading character study…
    </div>
  ),
});
const crew = [
  { name: "Wallet Watch", role: "Balances" },
  { name: "Access Guard", role: "Permissions" },
  { name: "Contract Sentinel", role: "Code identity" },
  { name: "Receipt Inspector", role: "Transactions" },
  { name: "Network Pulse", role: "Network" },
];
const chapters = [
  {
    label: "01 / OBSERVE",
    title: (
      <>
        Know what
        <br />
        changed.
      </>
    ),
    body: "Code changes. Keys change. Your baseline should not change without you. Put your NEAR application under a watch you can inspect.",
  },
  {
    label: "02 / INSPECT",
    title: (
      <>
        Evidence.
        <br />
        Then opinion.
      </>
    ),
    body: "Compare the approved and observed state. Read the source evidence. Ask for an AI explanation when you need one—not instead of the facts.",
  },
  {
    label: "03 / LIMIT",
    title: (
      <>
        Delegate work.
        <br />
        Keep control.
      </>
    ),
    body: "Choose the provider, price and finite budget for a paid report. The contract holds the terms. You keep the exit.",
  },
];
export default function AgentExperience() {
  const section = useRef<HTMLElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(2),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [progress, setProgress] = useState(0);
  const phase = Math.min(2, Math.floor(progress * 3));
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
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      if (!section.current || !stage.current || reduced) return;
      const rect = section.current.getBoundingClientRect(),
        top = parseFloat(getComputedStyle(stage.current).top) || 0;
      const range = Math.max(
        1,
        section.current.offsetHeight - stage.current.offsetHeight,
      );
      const p = reduced
        ? 0
        : Math.max(0, Math.min(1, (top - rect.top) / range));
      setProgress(p);
      section.current.style.setProperty("--story-progress", p.toFixed(4));
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [reduced]);
  function jump(index: number) {
    if (reduced) {
      setProgress((index + 0.2) / 3);
      return;
    }
    if (!section.current || !stage.current) return;
    const rect = section.current.getBoundingClientRect(),
      top = parseFloat(getComputedStyle(stage.current).top) || 0;
    const range = section.current.offsetHeight - stage.current.offsetHeight;
    scrollTo({
      top:
        scrollY +
        rect.top -
        top +
        range * (index === 0 ? 0 : (index + 0.2) / 3),
      behavior: paused || reduced ? "auto" : "smooth",
    });
  }
  return (
    <section
      className={`intro agent-story ${reduced ? "story-static" : ""}`}
      ref={section}
      data-chapter={phase}
      aria-label="Accord: observe, inspect and limit"
    >
      <div className="story-stage" ref={stage}>
        <div className="story-top">
          <span>ACCORD / NEAR APPLICATION OPERATIONS</span>
          <span>SCROLL TO INSPECT ↓</span>
        </div>
        <div className="story-copy">
          {chapters.map((c, i) => (
            <div
              className={`story-chapter ${phase === i ? "current" : ""}`}
              key={i}
              aria-hidden={phase !== i}
            >
              <p className="eyebrow">{c.label}</p>
              {i === 0 ? <h1>{c.title}</h1> : <h2>{c.title}</h2>}
              <p className="story-description">{c.body}</p>
            </div>
          ))}
          <div className="hero-actions">
            <a className="primary-link" href="#operations">
              Open workspace <span>↗</span>
            </a>
            <a className="text-link" href="#market">
              Browse services <span>↓</span>
            </a>
          </div>
        </div>
        <div className="story-visual">
          <svg
            className="story-circuit"
            viewBox="0 0 500 600"
            aria-hidden="true"
          >
            <path
              className="circuit-base"
              d="M20 150H135V250H320V80H460M70 500H180V390H420V540M20 320H80V50H210"
            />
            <path
              className="circuit-progress"
              pathLength="1"
              d="M20 150H135V250H320V80H460M70 500H180V390H420V540"
            />
            <rect x="12" y="142" width="16" height="16" />
            <rect x="452" y="72" width="16" height="16" />
            <rect x="412" y="532" width="16" height="16" />
          </svg>
          <div className="evidence-plane" aria-hidden="true">
            <span>APPROVED</span>
            <i />
            <i />
            <i />
            <b>COMPARE WITH OBSERVED STATE</b>
          </div>
          <Scene
            active={active}
            paused={paused || reduced}
            progress={progress}
          />
          <div className="budget-plane" aria-hidden="true">
            <span>AUTHORITY / BOUNDED</span>
            <dl>
              <div>
                <dt>Price</dt>
                <dd>Fixed</dd>
              </div>
              <div>
                <dt>Cycles</dt>
                <dd>Finite</dd>
              </div>
              <div>
                <dt>Exit</dt>
                <dd>Owner</dd>
              </div>
            </dl>
          </div>
          <div className="lab-agent">
            <span>FOCUS</span>
            <h2>{crew[active]!.name}</h2>
          </div>
          <div
            className="lab-selector"
            role="group"
            aria-label="Explore agent roles"
          >
            {crew.map((c, i) => (
              <button
                key={c.name}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                {c.role}
              </button>
            ))}
          </div>
        </div>
        <div className="story-bottom">
          <div
            className="chapter-selector"
            role="group"
            aria-label="Workflow chapters"
          >
            {["Observe", "Inspect", "Limit"].map((name, i) => (
              <button
                key={name}
                aria-pressed={phase === i}
                onClick={() => jump(i)}
              >
                <span>0{i + 1}</span>
                {name}
              </button>
            ))}
          </div>
          <span className="illustration-note">
            Illustrated workflow · not live telemetry
          </span>
          <button
            className="motion-toggle"
            disabled={reduced}
            aria-pressed={paused || reduced}
            onClick={() => setPaused((p) => !p)}
          >
            {reduced
              ? "Reduced motion"
              : paused
                ? "Resume animations"
                : "Pause animations"}
          </button>
        </div>
        <div className="story-progress" aria-hidden="true">
          <span />
        </div>
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
