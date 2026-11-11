# Phase reviews using Loops evaluator prompts

Method: installed `.agents/skills/loops-evaluate/SKILL.md` and event skill; refreshed authenticated free `loops evaluate` prompts for Agent Economy and AI Security & Defense. Saved as phase-agent-prompt.json and phase-security-prompt.json. Loops returns a prompt to run in this repository, not an independent approval service. Reports below are agent-run engineering/alignment reviews, not hosted judging, scores, win predictions, customer validation or a security audit. No submission/project record or external message was created. Existing paid-agent demonstrations remain distinct from the unbilled operations pilot.

## Phase 1 — discovery preparation

Reviewed code through 10c6916: pilot.ts, pilot.test.ts, operations-api.ts, operations-check.ts and PilotFeedback.tsx. 15 unit tests, both typechecks and isolated HTTP/DB feedback checks passed.

Alignment: the user/problem is specific and the feedback captures workarounds and continuation terms. Security: records are wallet-private, ownership enforced on deletion, strings bounded and customer validation remains false. No weighted rubric was supplied; placement bounties are judge decisions, not technical checklists.

Feedback applied: do not turn different wallet addresses into “distinct customers”; require actual monitoring needs and explicit terms; distinguish interest, acceptance and revenue. These are enforced in pilot.ts and explained in docs/pilot/INTERVIEWS.md. Residual risk: no actual recruitment or demand evidence. Decision: proceed with the explicitly authorized testnet implementation hypothesis; the market-demand gate remains **pending**, not passed.

## Phase 2 — onboarding

Reviewed onboarding increment after d5985d1 / 5c07af7 plus the workspace UI. 16 unit tests, both typechecks, production build, three presentation browser checks and isolated HTTP/DB approval tests passed.

Verified strengths: operations.ts pins account/code and key reads to the same finalized block; workspaces.ts locks approvals, checks owner, exact proposal digest and ten-minute expiry. Workspace creation is bounded under an owner advisory lock. UI requires review, calls out that initial state is not automatically safe and discloses zero pilot charges. Marketplace agreements are separate.

Feedback applied: avoid automatically accepting observed keys; keep full public-key permissions inspectable; bound workspace/account counts and capture frequency. Remove nonces from baselines. Upcoming change comparison must ignore ordinary gas-allowance consumption, otherwise it will generate useless alerts. Decision: proceed to incident implementation with that requirement. Distinct-team and unassisted-customer validation remain pending; mocked browser presentation is not customer evidence.

## Phase 3 — actionable incidents

Reviewed incidents.ts, notifications.ts, operations-worker.ts, operations-api.ts and WorkspaceIncidents.tsx. 17 unit tests, typechecks, isolated HTTP/DB changes/recovery/deduplication tests, actual signed local HTTP retry tests and three browser presentation checks passed.

Strengths: exact before/after code/key evidence; deduplication by baseline and change, automatic resolution/reopening; notifications are inserted in the incident transaction. Worker failures retain evidence. No gas-consumption noise, no model verdict or automatic wallet changes. Webhook URLs are not user-supplied, secrets remain server-side, redirects are rejected and delivery is at least once with stable IDs.

Feedback applied: make acknowledgement distinct from baseline approval, show unavailable external delivery explicitly, and state that in-app notifications do not reach a user while the app is closed. Remaining limitation: one sequential pilot worker and no configured external customer receiver. Polling can miss transient changes; there is no SLA. Decision: proceed to evidence/paid-report integration; production reliability and actual customer alert usefulness remain unvalidated.

## Phase 4 — evidence and bounded payments

Reviewed evidence.ts, workspace-reports.ts, WorkspaceEvidence.tsx, operations-demo.ts and operations-live.spec.ts. Unit/HTTP checks passed; actual testnet canary deployment, background detection, Groq explanation, unchanged escrow hash and real browser export/receipt presentation passed. Paid reports use existing separately demonstrated agreements, not an invented bundle or a charge for free pilot observations.

Feedback applied: separate historical paid evidence from current incidents; verify receipt amount/provider/hash and wallet ownership; retain before/after source blocks; hash normalized JSON so the downloaded file is reproducible. AI is cached per incident and bounded by the existing persistent server cap. The initial UI build caught a mistaken stylesheet write and was repaired before commit; the live browser locator was corrected to use the accessible combobox role. Neither failure is counted as a pass.

Decision: proceed to release hardening. Limits remain explicit: report digests do not prove quality, polling is not exploit prevention, the deployment key retains escrow upgrade authority, customer demand is unknown, and external delivery has only been exercised with a real local receiver. No official Loops approval or placement claim is made.

## Phase 5 — release and honest validation

Reviewed final application code b0449d89a9c1f1853071b99069600f5d669b7a1a and release evidence. [Application CI 42972243590](https://github.com/neelpote/accord-near/actions/runs/42972243590) passed including the new isolated operations integration suite. Local 17 unit tests, eight HTTP/DB check groups, three presentation browser checks, nine existing paid-recovery checks, a real controlled deployment/background-detection run and final real-data browser/export acceptance passed. See operations-integration-proof.json, operations-release-proof.json and operations-demo-proof.json for scope/provenance.

Feedback applied: exclude synthetic demonstrations from pilot metrics; do not count self-reported acceptance as payment; preserve independent paid agreements when deleting pilot data; add worker readiness and a creation allowlist; make acknowledgement, monitoring updates and paid-link timeline events atomic. Scope was kept narrow instead of adding more generic agents or automatic remediation. Ordinary allowance consumption does not create incidents. Export verification caught and fixed inconsistent date hashing.

Per-criterion/bounty assessment: sponsor context still supplies track descriptions and placement bounties, not weighted technical criteria. Agent commerce is concretely demonstrated by the existing exact-term paid workflow; the read-only operations pilot adds a coherent use case, not independently competing providers or negotiated work. Defense alignment is meaningful at the authority/spending boundary, not a security-audit or exploit-prevention claim. Prize placement remains undetermined by an agent-run review.

Engineering decision: ready to review as a testnet pilot with documented limitations. Market-demand gate: pending real participants. Production gate: pending infrastructure/receiver configuration, security review appropriate to funds/availability, external uptime and restore rehearsal. These are residual gates, not failures hidden by a nominal “approval.” No hosted Loops verdict, score, submission, public post or notification to a third party was issued.

Phase-5 recording follow-up review: the fast mobile check was insufficient while agreement history was loading. Long hashes in nested AI prose now wrap without hiding content; an offline fixture and the real browser run both cover this. The recording includes readable pauses only when explicitly requested, while normal checks await actual history completion. No financial/authority changes were introduced. Live run passed in 14.1 seconds, with working-tree stylesheet provenance recorded.
