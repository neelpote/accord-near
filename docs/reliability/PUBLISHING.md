# Publication checkpoint — 14 November 2026

All 16 original reliability commits were pushed to `neelpote/accord-near` main in chronological order, with a 20-second pause after each verified update before the next push. Each remote head was independently read back; no force push or history rewrite was used. The engineering/evaluation reports describe the earlier local-only acceptance checkpoint; publication does not approve deployment or AI quality.

The first deployment-safety assumption was wrong. The project's `gitProviderOptions.createDeployments: disabled` value did **not** stop Vercel builds. The pushes automatically deployed unreleased code, including `4a0db47`. This was detected by comparing actual production deployment IDs and source commits, rather than trusting that flag.

The Vercel Git repository link was then disconnected and independently read back as `null`. The free plan would not perform an instant rollback that far back (HTTP 402); no upgrade was purchased. Instead, the exact previous production source `24ead06044a946087213190c8722879771f70565` was rebuilt from its stored deployment and restored to production as `dpl_DybZr3Aw37n55zZPgsPHwnxi5N88`, confirmed READY. Production had therefore changed temporarily; it is now back on the prior source. Additive database migrations may have run during the temporary release; they were not destructively reversed and no receipt/artifact data was deleted.

An explicit `git.deploymentEnabled: false` guard is now committed in `vercel.json`, with a regression check. This is a separate repository configuration setting; it is not inferred from the misleading project API flag. The Git link remains disconnected. Reconnecting it or manually deploying the new application is a separate reviewed rollout, with the existing migration/protocol/model quality gates still required. No smart contract deployment, mainnet transaction or paid upgrade was initiated by the push task. Experimental AI remains disabled.

## Original ordered pushes

| Commit | Subject | Remote verification (UTC) |
| --- | --- | --- |
| `8fac08c5` | Audit authorization and delivery gaps before reliability phases | 2026-11-14T02:24:21.556536+00:00 |
| `1b33cd17` | Require scoped execution approval and authenticated provider work | 2026-11-14T02:24:45.108657+00:00 |
| `12715afb` | Exercise authorization attacks and real testnet revocation paths | 2026-11-14T02:25:08.556700+00:00 |
| `1f31bd64` | Record security acceptance boundaries and coordinated rollback | 2026-11-14T02:25:32.023657+00:00 |
| `8fe20277` | Verify frozen service delivery criteria before payment | 2026-11-14T02:25:55.562313+00:00 |
| `3f7c5f03` | Test delivery failures disputes and paid artifact recovery | 2026-11-14T02:26:19.124741+00:00 |
| `cdb1ec56` | Document delivery acceptance and safe coordinated rollout | 2026-11-14T02:26:42.767300+00:00 |
| `6eb5ee8a` | Add bounded local risk analysis with independently checked chain evidence | 2026-11-14T02:27:06.422132+00:00 |
| `49c4fbaf` | Exercise risk analyst failures and pin reproducible local model execution | 2026-11-14T02:27:29.871887+00:00 |
| `484dc76a` | Preserve approved model identity during paid risk report recovery | 2026-11-14T02:27:54.347051+00:00 |
| `bd4b640b` | Check local inference readiness before spending benchmark request slots | 2026-11-14T02:28:17.800696+00:00 |
| `d73952f6` | Reject paused offers before funding and distinguish expected from observed history | 2026-11-14T02:28:41.453426+00:00 |
| `862b96e9` | Use proven wallet gas limits and verify finalized risk payment outcomes | 2026-11-14T02:29:04.902182+00:00 |
| `96c3d28f` | Keep risk reports readable and show the correct purchased service | 2026-11-14T02:29:28.238119+00:00 |
| `050026a9` | Wait for confirmed wallet history and bound the fixture purchase budget | 2026-11-14T02:29:51.861699+00:00 |
| `bcc9f80f` | Record verified reliability journeys and retain experimental AI release gates | 2026-11-14T02:30:16.992071+00:00 |

## CI follow-up

GitHub's clean runner exposed that `execution-check.ts` relied on `NEAR_CONTRACT_ID` from the developer's local `.env`. Earlier checkpoints therefore failed the HTTP fixture even though local runs passed. The follow-up fixture sets its own testnet contract, loopback-only RPC and provider URL before importing application configuration. Production code and assertion strength are unchanged. All chain/model calls remain controlled; no actual transaction or inference is made.

The failure was reproduced with an empty contract/RPC environment. The corrected isolated PostgreSQL/HTTP suite and backend types pass without relying on the developer contract. A subsequent commit publishes this fix after the original sequence; [application CI for the fixture correction passed](https://github.com/neelpote/accord-near/actions/runs/43546795854). The [contract workflow also passed](https://github.com/neelpote/accord-near/actions/runs/43546187901). Current checks for the later configuration/documentation guard are on [GitHub Actions](https://github.com/neelpote/accord-near/actions).

Human-labelled AI correctness/value, host isolation, third-party wallet certification and deployment acceptance remain open. Existing machine-readable test evidence is dated checkpoint data, not a claim that the original CI failures never happened.
