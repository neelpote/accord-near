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
