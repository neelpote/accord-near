---
name: loops-host
description: "Run an event you host: check where it stands and how judging is going, without opening the dashboard. Run `loops host --help` for usage details."
requires_bin: loops
command: loops host
---

# loops host faq list

The event's current FAQ entries, in order. ALWAYS call this before `faq set`: setting replaces the whole list, so an agent that sends one new entry without the existing ones deletes them.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `faq` | `array` | yes |  |
| `faq[].question` | `string` | yes |  |
| `faq[].answer` | `string` | yes |  |

## Examples

```sh
# Read the FAQ before editing
loops host faq list --event my-event
```

---

# loops host faq set

Replace the FAQ with a JSON array of {question, answer}. REPLACES the whole list — read `faq list` first and send the existing entries back alongside any new one, or they are deleted. Two silent behaviours worth knowing: a row whose question is blank is dropped, and the list is capped at 30. The response reports `submitted` and `stored` so you can see what actually survived. Pass --file <path.json> or --data '[...]', plus --confirm with the event slug.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--file` | `string` |  | Path to a .json file containing the faq array |
| `--data` | `string` |  | The faq JSON inline. (Not --json: incur reserves that for output formatting.) |
| `--confirm` | `string` |  | Retype the event slug to confirm — replacing the FAQ cannot be undone by a host. Never guess this: if the user has not named the event, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `faq` | `array` | yes |  |
| `faq[].question` | `string` | yes |  |
| `faq[].answer` | `string` | yes |  |
| `submitted` | `number` | yes |  |
| `stored` | `number` | yes |  |

## Examples

```sh
# Set a two-entry FAQ
loops host faq set --event my-event --data [{"question":"Can I enter solo?","answer":"Yes — teams of 1 to 4."},{"question":"When is the deadline?","answer":"Submissions close at the date on the event page."}] --confirm my-event
```

---

# loops host finalize

Freeze a builder challenge's standings and move every builder's global rating. IRREVERSIBLE for a host — `battle_results` is one immutable row and only an admin can reverse it, so pass --confirm with the event slug. Run `host judging` first: finalizing with rows still in flight bakes in incomplete scores.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--confirm` | `string` |  | Retype the event slug to confirm — finalizing a board cannot be undone by a host. Never guess this: if the user has not named the event, ask. |
| `--excludeFailed` | `boolean` |  | Exclude projects whose judging permanently failed — they are listed but unranked. Without this, a failed row blocks finalize. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `finalized` | `boolean` | yes |  |

## Examples

```sh
# Close the board
loops host finalize --event my-challenge --confirm my-challenge

# Close it, leaving permanently-failed entries unranked
loops host finalize --event my-challenge --confirm my-challenge --excludeFailed true
```

---

# loops host judge reset

Throw away EVERY score and evidence row so judging can start clean. Re-runnable (the board can be judged again) but it destroys work, so pass --confirm with the event slug. Refused once a board is finalized.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--confirm` | `string` |  | Retype the event slug to confirm — proves intent and that you have the right event |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scores` | `number` | yes |  |
| `evidence` | `number` | yes |  |

## Examples

```sh
# Wipe scores and re-judge from scratch
loops host judge reset --event my-challenge --confirm my-challenge
```

---

# loops host judge retry

Re-judge one project — the fix for a row stuck in `failed` (see `host judging`). Builder challenges only: the hackathon equivalent is disabled in production because it can wedge artifacts while judging runs, so re-run the sponsor instead.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--project` | `string` |  | Project slug to re-judge (from `host submissions`) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dispatched` | `boolean` | yes |  |
| `detail` | `string` | no |  |

## Examples

```sh
# Retry a failed project
loops host judge retry --event my-challenge --project team-rocket
```

---

# loops host judge run

Start (or restart) judging. A builder challenge judges the whole board at once; a hackathon judges per sponsor, so pass --sponsor there. The server refuses while submissions are still open, or once a board is finalized.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Sponsor slug — required on hackathons, rejected on builder challenges |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dispatched` | `boolean` | yes |  |
| `detail` | `string` | no |  |

## Examples

```sh
# Judge a whole challenge board
loops host judge run --event my-challenge

# Judge one sponsor's entries
loops host judge run --event my-hackathon --sponsor acme
```

---

# loops host judging

Judging progress for an event, and the rows that failed. Counts are keyed by the shared status vocabulary (queued, scraping, evaluating, judging, completed, failed); `failures` names up to 50 failed rows by project slug and the problem/sponsor slug they judged against — what `host judge retry` (challenges) or `host judge run --sponsor` (hackathons) takes.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `eventType` | `string` | yes |  |
| `byStatus` | `object` | yes |  |
| `inFlight` | `number` | yes |  |
| `failed` | `number` | yes |  |
| `completed` | `number` | yes |  |
| `failures` | `array` | yes |  |
| `failures[].projectId` | `string` | yes |  |
| `failures[].projectSlug` | `unknown` | yes |  |
| `failures[].key` | `string` | yes |  |
| `failures[].updatedAt` | `unknown` | yes |  |

## Examples

```sh
# See if judging is stuck
loops host judging --event my-event
```

---

# loops host knowledge build

Ingest the resources already attached to a sponsor (hackathon) or problem (challenge) and rebuild its graph — this is what makes `knowledge query` return anything. Omit --sponsor/--problem to rebuild them all. Add resources first via `host sponsors import` or `host problems import`. Runs in the background; re-run after adding docs.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | One sponsor slug (hackathons) |
| `--problem` | `string` |  | One problem slug (builder challenges) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `building` | `string` | yes |  |
| `scope` | `string` | yes |  |

## Examples

```sh
# Rebuild one sponsor's graph
loops host knowledge build --event my-hackathon --sponsor acme

# Rebuild every graph on the event
loops host knowledge build --event my-hackathon
```

---

# loops host participants

The enrolled roster for an event you host: names and when they enrolled. Contact details are NOT included unless you pass --contact, because this output lands in your terminal and in an agent's context.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--contact` | `boolean` |  | Include participant email addresses — personal data, so opt in deliberately |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | `number` | yes |  |
| `participants` | `array` | yes |  |
| `participants[].displayName` | `string` | yes |  |
| `participants[].enrolledAt` | `string` | yes |  |
| `participants[].email` | `unknown` | no |  |

## Examples

```sh
# How many enrolled, and who
loops host participants --event my-event

# With emails, to mail them
loops host participants --event my-event --contact true
```

---

# loops host problems import

Replace this challenge's problems with a JSON array. Pass --file (a path) or --data (the payload inline) — an agent that has just drafted the problems can send them directly. REPLACES the whole list, so pass --confirm with the event slug. Required per problem: title, brief. Optional: successLooksLike, scoreWeight, judgingCriteria[{name,weight,whatToLookFor}], suggestedStack[], resources[], testCases[{name,weight}]. Criteria default to the standard rubric when omitted.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host (must be a builder challenge) |
| `--file` | `string` |  | Path to a .json file containing the problems array |
| `--data` | `string` |  | The problems JSON inline, as a string. (Not --json: incur reserves that for output formatting.) |
| `--confirm` | `string` |  | Retype the event slug to confirm — replacing the problem set cannot be undone by a host. Never guess this: if the user has not named the event, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `problems` | `number` | yes |  |
| `titles` | `array` | yes |  |

## Examples

```sh
# Import a drafted problem set
loops host problems import --event my-challenge --file ./problems.json --confirm my-challenge
```

---

# loops host problems template

Print a valid example of the problems JSON — the shape `problems import` expects. Start here: hand this to the host, draft their real problems against it, then import. Shows both an explicit weighted rubric and a minimal entry that inherits the default one.

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `problems` | `array` | yes |  |

## Examples

```sh
# See the expected format before drafting
loops host problems template
```

---

# loops host publish

Publish the event so builders can find and enter it. A builder challenge with no problems is refused — publishing one would open a workspace with nothing to build. Unpublishing is admin-only.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `published` | `boolean` | yes |  |

## Examples

```sh
# Go live
loops host publish --event my-event
```

---

# loops host sponsor create

Add a sponsor to a hackathon. Starts with no knowledge-graph resources — those are added in the dashboard's Knowledge tab, which owns the document picker.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Slug for the new sponsor (no underscores) |
| `--name` | `string` |  | Display name |
| `--tagline` | `string` |  |  |
| `--description` | `string` |  |  |
| `--tier` | `string` |  |  |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |

## Examples

```sh
# Add Acme
loops host sponsor create --event my-hackathon --sponsor acme --name Acme
```

---

# loops host sponsor delete

Remove a sponsor. Its bounties are deleted with it (cascade), so pass --confirm with the event slug.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Sponsor slug to remove |
| `--confirm` | `string` |  | Retype the event slug to confirm — deleting a sponsor and its bounties cannot be undone by a host. Never guess this: if the user has not named the event, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `deleted` | `boolean` | yes |  |

## Examples

```sh
# Delete Acme and its bounties
loops host sponsor delete --event my-hackathon --sponsor acme --confirm my-hackathon
```

---

# loops host sponsor update

Change a sponsor's details — PATCH semantics, only what you pass changes.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Sponsor slug |
| `--name` | `string` |  |  |
| `--tagline` | `string` |  |  |
| `--description` | `string` |  |  |
| `--tier` | `string` |  |  |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `updated` | `array` | yes |  |

## Examples

```sh
# Bump tier
loops host sponsor update --event my-hackathon --sponsor acme --tier gold
```

---

# loops host sponsors import

Create or update sponsors and their bounties from JSON. Upsert by sponsor slug and ADDITIVE — sponsors you do not mention are untouched, and bounties match on name so a re-import edits rather than duplicates (a bounty already targeted by a submission must keep its id). Required per sponsor: slug, name. Optional: tagline, description, tier, requirements, website, bounties[{name, amountUsd?, description?}].

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host (hackathon) |
| `--file` | `string` |  | Path to a .json file containing the sponsors array |
| `--data` | `string` |  | The sponsors JSON inline, as a string |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `sponsors` | `array` | yes |  |
| `sponsors[].slug` | `string` | yes |  |
| `sponsors[].created` | `boolean` | yes |  |
| `sponsors[].bountiesCreated` | `number` | yes |  |
| `sponsors[].bountiesUpdated` | `number` | yes |  |

## Examples

```sh
# Import a drafted sponsor line-up
loops host sponsors import --event my-hackathon --file ./sponsors.json
```

---

# loops host sponsors list

The event's sponsors with their slugs, tiers and bounty NAMES. Read this after importing, and before any `sponsor ...` command: those need a sponsor slug, and `roles` will not give you one — its `sponsors` field lists sponsors YOU are a contact of, which is empty for a host who is not also a sponsor member. Bounty names here are the handle `winners set` takes, so this one call hands you every id the rest of the flow needs.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `sponsors` | `array` | yes |  |
| `sponsors[].slug` | `string` | yes |  |
| `sponsors[].name` | `string` | yes |  |
| `sponsors[].tier` | `unknown` | yes |  |
| `sponsors[].tagline` | `unknown` | yes |  |
| `sponsors[].bounties` | `array` | yes |  |

## Examples

```sh
# Get the sponsor slugs and bounty names
loops host sponsors list --event my-hackathon
```

---

# loops host sponsors template

Print a valid example of the sponsors JSON — the shape `sponsors import` expects. Draft the host's real line-up against it, then import. Shows a full sponsor with bounties and a minimal one.

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsors` | `array` | yes |  |

## Examples

```sh
# See the expected format before drafting
loops host sponsors template
```

---

# loops host status

Where an event stands: stage, enrolled/submitted/judged counts, deadlines, and whether winners are out. `judged` is null when judging has not started at all, which is different from zero judged.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `name` | `string` | yes |  |
| `eventType` | `string` | yes |  |
| `stage` | `string` | yes |  |
| `published` | `boolean` | yes |  |
| `isPrivate` | `boolean` | yes |  |
| `enrolled` | `number` | yes |  |
| `submitted` | `number` | yes |  |
| `judged` | `unknown` | yes |  |
| `deadlines` | `object` | yes |  |
| `deadlines.startsAt` | `unknown` | yes |  |
| `deadlines.registrationDeadline` | `unknown` | yes |  |
| `deadlines.submissionDeadline` | `unknown` | yes |  |
| `winnersAnnouncedAt` | `unknown` | yes |  |

## Examples

```sh
# Check an event mid-run
loops host status --event my-event
```

---

# loops host submissions

Every project on an event you host, drafts included — name, repo and whether it is submitted. `submitted` counts only those past the line.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | `number` | yes |  |
| `submitted` | `number` | yes |  |
| `projects` | `array` | yes |  |
| `projects[].projectSlug` | `string` | yes |  |
| `projects[].name` | `string` | yes |  |
| `projects[].repoUrl` | `unknown` | yes |  |
| `projects[].submittedAt` | `unknown` | yes |  |

## Examples

```sh
# See what has come in
loops host submissions --event my-event
```

---

# loops host telemetry

The event's telemetry report: the computed facts and the written narrative (headline, the five layers, caveats). Reading costs nothing. `outdated: true` means the stored snapshot was written by an older generator, so nothing is returned for it and only --refresh makes it readable — that is different from never having generated one, though both look empty. Pass --refresh to rebuild it — that is one strong-model call taking tens of seconds, so do it when `stale` is true or the numbers have moved, not on every read.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--refresh` | `boolean` |  | Rebuild the snapshot before reading. Slow and metered — only when asked or stale. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `generated` | `boolean` | yes |  |
| `stale` | `boolean` | yes |  |
| `outdated` | `boolean` | yes |  |
| `hasSubmissions` | `boolean` | yes |  |
| `narrative` | `unknown` | yes |  |
| `narrativeError` | `unknown` | yes |  |
| `facts` | `unknown` | yes |  |
| `generatedAt` | `unknown` | yes |  |

## Examples

```sh
# Read the current report
loops host telemetry --event my-event

# Rebuild it first
loops host telemetry --event my-event --refresh true
```

---

# loops host update

Change an event's basics — PATCH semantics, so only the fields you pass change. Dates are UTC instants (ISO). These are the event's typed columns; FAQ, submission fields and problem content are JSONB with their own merging writers and are edited in the dashboard (or, for problems, via `host problems import`). Changing the event TYPE is admin-only.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--name` | `string` |  | Event name |
| `--tagline` | `string` |  | One-line tagline |
| `--description` | `string` |  | Full description |
| `--logoUrl` | `string` |  | Hosted URL of the event logo |
| `--bannerUrl` | `string` |  | Hosted URL of the event banner |
| `--startDate` | `string` |  | ISO instant the event starts |
| `--endDate` | `string` |  | ISO instant submissions close |
| `--registrationDeadline` | `string` |  | ISO instant registration closes |
| `--resultsAnnouncedDate` | `string` |  | ISO instant results are announced — shown to builders as when to expect them |
| `--timezone` | `string` |  | IANA timezone, e.g. Asia/Calcutta |
| `--currency` | `string` |  | ISO-4217 code for every prize amount on the event, e.g. USD or INR. An unknown code is coerced to USD server-side. |
| `--mode` | `string` |  | How the event runs: online, offline or hybrid |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `updated` | `array` | yes |  |

## Examples

```sh
# Only the tagline changes
loops host update --event my-event --tagline Build the future
```

---

# loops host winners clear

Clear one sponsor's winner picks. Only draft picks — anything already published stays published.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Sponsor slug whose picks to clear |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `cleared` | `number` | yes |  |

## Examples

```sh
# Start Acme's picks over
loops host winners clear --event my-hackathon --sponsor acme
```

---

# loops host winners publish

Publish every finalized bounty winner. PUBLIC the moment it lands and not undoable by a host, so pass --confirm with the event slug. Check `sponsor status` first — a bounty with no finalized pick publishes nothing.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--confirm` | `string` |  | Retype the event slug to confirm — publishing winners cannot be undone by a host. Never guess this: if the user has not named the event, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | yes |  |
| `published` | `boolean` | yes |  |

## Examples

```sh
# Announce the winners
loops host winners publish --event my-hackathon --confirm my-hackathon
```

---

# loops host winners set

Set this sponsor's bounty winners by BOUNTY NAME and PROJECT SLUG — no ids. Replaces their non-finalized picks wholesale, like the spreadsheet upload, so pass --confirm with the event slug. Names come from `loops bounties`, slugs from `host submissions`. Publishing is a separate step.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug you host |
| `--sponsor` | `string` |  | Sponsor slug whose winners these are |
| `--picks` | `string` |  | JSON array of picks: '[{"bounty":"Best use of X","project":"team-rocket","rank":1}]'. `rank` is optional. |
| `--confirm` | `string` |  | Retype the event slug to confirm — replacing this sponsor's winner picks cannot be undone by a host. Never guess this: if the user has not named the event, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `set` | `number` | yes |  |

## Examples

```sh
# Record Acme's winner
loops host winners set --event my-hackathon --sponsor acme --picks [{"bounty":"Best use of Acme Queues","project":"team-rocket","rank":1}] --confirm my-hackathon
```
