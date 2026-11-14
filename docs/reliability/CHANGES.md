# Reliability change inventory

Compared with `24ead06044a946087213190c8722879771f70565`. Local commits only; no push or production deployment. Generated model weights, environments, private fixtures, browser traces and credentials are excluded.

## Backend

- `backend/.env.example`
- `backend/local-risk-requirements.txt`
- `backend/package.json`
- `backend/risk-model.json`
- `backend/scripts/execution-env.mjs`
- `backend/scripts/execution-env.test.mjs`
- `backend/scripts/hosted-worker.mjs`
- `backend/scripts/local-risk-model.py`
- `backend/src/near/agents.ts`
- `backend/src/near/config.ts`
- `backend/src/near/db.ts`
- `backend/src/near/delivery-api.ts`
- `backend/src/near/delivery-store.ts`
- `backend/src/near/execution-api.ts`
- `backend/src/near/execution-check.ts`
- `backend/src/near/execution-policy.test.ts`
- `backend/src/near/execution-policy.ts`
- `backend/src/near/execution.ts`
- `backend/src/near/live-proof.ts`
- `backend/src/near/provider-server.ts`
- `backend/src/near/recovery-check.ts`
- `backend/src/near/risk-analyst.test.ts`
- `backend/src/near/risk-analyst.ts`
- `backend/src/near/risk-cases.ts`
- `backend/src/near/risk-evaluate.ts`
- `backend/src/near/risk-readback.ts`
- `backend/src/near/server.ts`
- `backend/src/near/service-delivery.test.ts`
- `backend/src/near/service-delivery.ts`
- `backend/src/near/worker.ts`

## Frontend

- `frontend/app/globals.css`
- `frontend/app/page.tsx`
- `frontend/components/DeliveryVerification.tsx`
- `frontend/components/ExecutionControls.tsx`
- `frontend/components/ReportView.tsx`
- `frontend/components/RiskReportView.tsx`
- `frontend/package.json`
- `frontend/tests/delivery.spec.ts`
- `frontend/tests/execution.spec.ts`
- `frontend/tests/live-wallet.spec.ts`
- `frontend/tests/risk.spec.ts`

## Contract tests

- `contracts-near/src/lib.rs`

## Configured checks

- `.github/workflows/application.yml`

## Documentation and public evidence

- `docs/ARCHITECTURE.md`
- `docs/PROJECT_HANDOFF.md`
- `docs/demo/reliability-risk-verification.png`
- `docs/demo/reliability-risk-wallet.png`
- `docs/reliability/AI.md`
- `docs/reliability/CHANGES.md`
- `docs/reliability/DELIVERY.md`
- `docs/reliability/FINAL.md`
- `docs/reliability/IMPLEMENTATION.md`
- `docs/reliability/LOOPS_REVIEW.md`
- `docs/reliability/OPERATIONS.md`
- `docs/reliability/SECURITY.md`
- `docs/reliability/ai-evaluation-initial.json`
- `docs/reliability/ai-evaluation-small-model.json`
- `docs/reliability/ai-evaluation-startup-failure.json`
- `docs/reliability/ai-evaluation-template-v1.json`
- `docs/reliability/ai-evaluation.json`
- `docs/reliability/ai-human-review.json`
- `docs/reliability/ai-integration-status.json`
- `docs/reliability/phase1-testnet.json`
- `docs/reliability/phase2-recovery.json`
- `docs/reliability/phase2-testnet.json`
- `docs/reliability/phase3-final-local-state.json`
- `docs/reliability/phase3-fixture-funding.json`
- `docs/reliability/phase3-offer-disabled.json`
- `docs/reliability/phase3-readback.json`
- `docs/reliability/phase3-recovery.json`
- `docs/reliability/phase3-testnet.json`
- `docs/reliability/phase3-wallet-36-transactions.json`
- `docs/reliability/phase3-wallet-37-cleanup.json`
- `docs/reliability/phase3-wallet.json`
- `docs/reliability/test-results.json`

## Root documents

- `README.md`
