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
