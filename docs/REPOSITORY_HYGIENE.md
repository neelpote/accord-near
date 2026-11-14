# Repository organization — 14 November 2026

The README follows [GitHub's README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes): what/why first, then getting started and help. Product capabilities, evidence, NEAR's role, judge testing and release boundaries are explicit; detailed operator history stays in linked guides.

Cleanup scope:

- Removed 74 vendored/mirrored Loops skill files or symlinks from `.agents/skills`, `.claude/skills`, `.continue/skills` and `.kiro/skills`. These are editor tooling, not runtime dependencies. Matching local paths are ignored. No global or personal skills were uninstalled.
- Removed the root `.env.example` containing only comments; `backend/.env.example` is the actual application template.
- Removed the inactive root Arbitrum `demo.sh`. Active NEAR commands remain in package scripts and documented guides. The imported baseline remains available through `upstream-baseline` and Git history.
- Moved historical upstream PRD/whitepaper and the dated implementation checklist under `docs/archive/`; adjusted relative links.
- Preserved contracts/source, source provenance, licenses, lockfiles, CI, screenshots, videos, proof JSON and the separate in-progress narrated film. Inherited EVM source is labelled baseline, not claimed as the active NEAR path.
- Preserved pre-existing uncommitted wallet-test edits from the interrupted rehearsal. They are not part of this documentation cleanup and are not reported as a passed acceptance run.
