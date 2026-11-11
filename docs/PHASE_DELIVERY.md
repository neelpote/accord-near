# Five-phase delivery

Audience: a small NEAR application team or agency with limited operations capacity. The job is to notice meaningful changes, investigate with evidence and keep recurring service spending bounded.

The customer-discovery gate has **not** passed. No interviews, willingness to pay, reliability SLA or production security approval is implied by implementation. User requested all five phases; phases 2–5 proceed as a testnet pilot hypothesis while customer evidence remains pending. No outreach, public submission, mainnet deployment or purchase is authorized by this work.

## Commit sequence and acceptance

Each phase has three reviewable increments, with runnable checks before commits. Final verification records actual results, limitations and commit IDs.

1. Discovery: pilot brief/interviews; structured feedback and honest gate evaluation; authenticated evidence capture.
2. Onboarding: workspace storage and capture; explicit baseline approval with ownership/race checks; application-focused UI and exact budget preview.
3. Incidents: deterministic changes and grouping; persisted notifications/retry and health; incident UI/acknowledgement and integration checks.
4. Investigation: evidence timeline/export; bind existing paid reports/agreements and spending controls; optional AI with provenance and controlled testnet scenario.
5. Release: pilot metrics and concrete pricing feedback; reproducible demo/operational checks; end-to-end verification and release documentation.

## Scope decisions

- At most three workspaces per wallet, five accounts per workspace, two checks initially: deployed-code identity and public access-key permissions.
- Baselines require review; first observation is not automatically trusted. Reapproving a baseline does not erase incidents.
- Pilot read-only observations are explicitly unbilled. Paid service agreements remain separate; no silent auto-enrollment, bundled contract or new recurring price is invented.
- Existing escrow contract and its upgrade authority remain unchanged. No automatic key removal or rollback.
- One external notification integration uses operator-configured, explicitly selected destinations. No arbitrary user URL fetching or automatic messages to third parties during development. Local receiver tests may exercise actual delivery/retries.
- No routine LLM calls for unchanged observations. AI text remains advisory, separate from measurements.

### Phase 1 result
Pilot interview guide and authenticated, wallet-private feedback capture are implemented. Feedback can be deleted. The model rejects empty problems and acceptance without explicit terms, and never converts self-reports into validated demand or revenue. Target conversations and distinct-team verification remain pending; no outreach was sent. API authorization and deletion are included in the operations integration check added in phase 2.

### Phase 2 result
Workspace onboarding, finalized code/key capture, explicit baseline approval and mobile presentation checks are implemented. Read-only pilot cost is zero; existing paid offers retain separate exact-term approvals. RPC failure cannot create a fake baseline. The UI test is a presentation fixture; real signed onboarding and a controlled chain change are verified later in the release phase. Loops-prompt review: docs/evaluations/PHASE_GATES.md.

### Phase 3 result
Deterministic code/key changes now open grouped incidents, resolve on return to baseline and reopen on recurrence without duplicating every poll. Ordinary allowance consumption is ignored. Failed observations retain prior evidence and show unhealthy/stale monitoring. The user explicitly enables/pause monitoring and acknowledges incidents without approving changes. In-app delivery is persistent. Optional signed HTTPS webhook delivery is selected explicitly and uses an operator-configured destination, durable leases, bounded retries and stable receiver deduplication IDs. Real local HTTP receiver tests exercised 503 → retry → delivered; no external third-party notification was sent. UI and ownership tests passed. No always-on delivery guarantee is claimed.

### Phase 4 result
Owner-private timeline, paginated history and consistent JSON exports now connect baseline approval, incidents, human acknowledgement, explanations and related paid artifacts. Export SHA-256 is computed over the serialized body and verified in the browser. Linking a delivered report rechecks its receipt, owner, account association, provider, price and exact artifact hash on NEAR; it does not request a new payment. Agreement links expose the existing cancellation/key-removal/withdrawal controls. Optional incident explanations are capped and cached, with no automatic retry or model transaction authority.

Controlled live proof: docs/operations-demo-proof.json. A separate canary received two valid no-op WASM versions with different custom-section markers. The actual background worker detected code identity change; this is not an exploit or behavior change. Escrow code was checked unchanged. A historical paid Wallet Watch report for the escrow account was linked, not falsely sold as a canary observation. Actual Groq explanation and browser export verification passed. The run records working-tree provenance honestly. Browser recording: docs/demo/operations-workspace.webm.

### Phase 5 result
Engineering release work is implemented: wallet-private setup/review metrics, explicit continuation feedback, demo exclusion, confirmed pilot-data deletion, optional creation allowlist, DB/worker readiness, atomic review/state history, indexes, CI integration coverage and an operator/recovery runbook. The final committed application passed local checks and [Application CI 42972243590](https://github.com/neelpote/accord-near/actions/runs/42972243590). Real customer recruitment, repeated use and paid continuation are still **pending**. Hosting and an authorized external receiver are unconfigured. This is a tested testnet pilot, not a certified production monitoring service.

## Commit map

| Phase | Increment 1 | Increment 2 | Increment 3 |
| --- | --- | --- | --- |
| 1 | 1d2acaf — discovery brief and gates | 6186cbd — structured feedback model | 10c6916 — private feedback API/UI |
| 2 | d5985d1 — finalized capture and scope | 5c07af7 — reviewed baseline approval | 61bcfca — workspace onboarding and review |
| 3 | 19bb138 — grouped meaningful changes | 3ba4704 — notification retries/worker | 43c90f4 — incident review and health UI |
| 4 | ca63ebb — evidence timeline/export | 8c7ea3e — paid links and optional AI | cdcea75 — real testnet incident/browser demonstration |
| 5 | 4cf04ae — pilot metrics/demo separation | b0449d8 — consistency/readiness/CI | this release-evidence commit — final verification and reviews |

## Does each phase belong in Accord?

Discovery prevents confusing engineering evidence with demand. The workspace replaces repeated configuration with one application scope. Grouped incidents and reliable notification delivery address the actual job of noticing a change. Evidence and existing bounded agreements connect investigation to inspectable paid work without claiming that a hash proves quality. Release metrics expose whether anyone uses this beyond our own demo. No additional generic agents, trading, automatic remediation or provider marketplace were added.

Limits worth preserving: code/key checks are deliberately narrow; deeper transaction diagnosis remains the existing paid service. The unbilled pilot and separately purchased reports are distinct until customer feedback justifies a reviewed commercial bundle. We have not invented customers, a production price or an independent Loops approval to make the roadmap appear complete.
