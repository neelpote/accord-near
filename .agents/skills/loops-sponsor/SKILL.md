---
name: loops-sponsor
description: "For sponsors and judges: set up your rubric, prizes and judges, then review the projects that targeted your bounties and pick winners. Judges get the read commands only. Run `loops sponsor --help` for usage details."
requires_bin: loops
command: loops sponsor
---

# loops sponsor bounty create

Add one prize, appended to the end of your list. `amountUsd` is the cash value in the event's currency; `reward` is for non-cash prizes (credits, hardware, an interview) and the two can both be set. `description` is what builders read when deciding whether to target it — write it for them, not for us.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--name` | `string` |  | Prize name, e.g. Best use of Acme Queues |
| `--amountUsd` | `string` |  | Cash value, digits only, e.g. 5000 |
| `--description` | `string` |  | What builders must do to win it |
| `--reward` | `string` |  | Non-cash reward, e.g. 10k API credits |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `created` | `string` | yes |  |

## Examples

```sh
# Add a cash prize
loops sponsor bounty create --event my-hackathon --sponsor acme --name Best use of Acme Queues --amountUsd 5000 --description Ship something where the queue is load-bearing, not decorative.
```

---

# loops sponsor bounty delete

Remove one prize. This cascades: any winner recorded against it is deleted TOO — including one already published — along with every judging score for it. Retype the bounty's name in --confirm. If the event has been judged, prefer editing the bounty over deleting it.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--bounty` | `string` |  | The bounty's name |
| `--confirm` | `string` |  | Retype the bounty name exactly. Never guess this: if the user has not named the bounty, ask. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `deleted` | `string` | yes |  |

## Examples

```sh
# Drop a prize we are not running
loops sponsor bounty delete --event my-hackathon --sponsor acme --bounty Best use of Acme Queues --confirm Best use of Acme Queues
```

---

# loops sponsor bounty list

Your bounties in display order. These names are what `sponsor winners set` expects, so read this before picking winners.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `bounties` | `array` | yes |  |
| `bounties[].name` | `string` | yes |  |
| `bounties[].amountUsd` | `unknown` | yes |  |
| `bounties[].description` | `unknown` | yes |  |
| `bounties[].reward` | `unknown` | yes |  |

## Examples

```sh
# See our prizes
loops sponsor bounty list --event my-hackathon --sponsor acme
```

---

# loops sponsor bounty update

Edit one prize, found by its CURRENT name (from `sponsor bounty list`). PATCH semantics — only what you pass changes. Pass --name to rename it; existing winner rows follow the bounty, they are keyed by id not name.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--bounty` | `string` |  | The bounty's current name |
| `--name` | `string` |  | New name |
| `--amountUsd` | `string` |  | New cash value, digits only |
| `--description` | `string` |  | New description |
| `--reward` | `string` |  | New non-cash reward |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `updated` | `array` | yes |  |

## Examples

```sh
# Raise the prize
loops sponsor bounty update --event my-hackathon --sponsor acme --bounty Best use of Acme Queues --amountUsd 7500
```

---

# loops sponsor criteria list

The criteria judging currently scores against, in display order. An empty list means no sponsor-specific rubric is set and the event's default applies.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `criteria` | `array` | yes |  |
| `criteria[].name` | `string` | yes |  |
| `criteria[].weight` | `number` | yes |  |
| `criteria[].description` | `unknown` | yes |  |

## Examples

```sh
# See our rubric
loops sponsor criteria list --event my-hackathon --sponsor acme
```

---

# loops sponsor criteria set

Set the rubric from JSON: an array of {name, weight, description}. REPLACES the whole set — anything omitted is deleted — and the array order is the display order. `weight` is relative, not a percentage: a set summing to 60 is legal and means what it says, though summing to 100 reads better in the portal. `description` tells the judging model what to look for and is what makes a criterion useful; a name alone scores vaguely. Pass --file <path.json> or --data '[...]'. Changing this AFTER judging has run makes old scores incomparable — re-run judging if you do.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--file` | `string` |  | Path to a .json file containing the criteria array |
| `--data` | `string` |  | The criteria JSON inline. (Not --json: incur reserves that for output formatting.) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `criteria` | `array` | yes |  |
| `criteria[].name` | `string` | yes |  |
| `criteria[].weight` | `number` | yes |  |
| `criteria[].description` | `unknown` | yes |  |

## Examples

```sh
# Set a three-criterion rubric
loops sponsor criteria set --event my-hackathon --sponsor acme --data [{"name":"Integration Depth","weight":40,"description":"How deeply the Acme SDK is used — architecture-level integration scores high, hello-world calls score low."},{"name":"Functional Correctness","weight":35,"description":"Does it do what it claims, on the happy path and the edges?"},{"name":"Code Quality","weight":25,"description":"Readable, structured, error-handled."}]
```

---

# loops sponsor judge

Start judging for your own bounties. Available to a sponsor MEMBER (judges cannot modify judging) — the underlying gate has always allowed this; only the CLI's host-shaped wrapper used to stand in the way. Refused while submissions are still open.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventSlug` | `string` | yes |  |
| `sponsorSlug` | `string` | yes |  |
| `triggered` | `boolean` | yes |  |
| `detail` | `string` | yes |  |

## Examples

```sh
# Judge our entries
loops sponsor judge --event my-hackathon --sponsor acme
```

---

# loops sponsor projects

The projects that targeted this sponsor's bounties, with their scores and per-criterion breakdown — the review queue. Excludes the heavy per-project artifact (tool calls, evidence dossier); read that in the portal.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Sponsor slug you judge for |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventSlug` | `string` | yes |  |
| `sponsorSlug` | `string` | yes |  |
| `state` | `unknown` | yes |  |

## Examples

```sh
# See what to review
loops sponsor projects --event my-event --sponsor acme
```

---

# loops sponsor status

How judging stands for one sponsor: how many of its projects are reviewed, and whether winners are published.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Sponsor slug you judge for |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventSlug` | `string` | yes |  |
| `sponsorSlug` | `string` | yes |  |
| `sponsorName` | `string` | yes |  |
| `state` | `unknown` | yes |  |

## Examples

```sh
# Check review progress
loops sponsor status --event my-event --sponsor acme
```

---

# loops sponsor team invite

Invite someone to your sponsor by email. --kind judge gives them the review queue and nothing else; --kind member (the default) gives them everything on this surface. Idempotent on the email. Two DIFFERENT permissions apply: an event host may add a member, but only an admin or an existing member may invite a judge — sponsors curate their own judges. ASK the user for the address; never guess one, it goes to a real inbox.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--email` | `string` |  | Their email address |
| `--kind` | `string` |  | member = full access to this surface; judge = read the queue only |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `email` | `string` | yes |  |
| `kind` | `string` | yes |  |
| `linked` | `boolean` | yes |  |

## Examples

```sh
# Bring a judge in
loops sponsor team invite --event my-hackathon --sponsor acme --email dana@acme.com --kind judge
```

---

# loops sponsor team list

Your sponsor's members and judges, and whether each has signed in yet (`linked`). Contact emails are PII: a judge is refused this even though they can read the judging queue.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `team` | `array` | yes |  |
| `team[].email` | `string` | yes |  |
| `team[].kind` | `string` | yes |  |
| `team[].linked` | `boolean` | yes |  |

## Examples

```sh
# See who has access
loops sponsor team list --event my-hackathon --sponsor acme
```

---

# loops sponsor telemetry

Your sponsor's telemetry report: the computed facts and the written narrative (headline, the five layers, caveats). Reading costs nothing. `outdated: true` means the stored snapshot was written by an older generator, so nothing is returned for it and only --refresh makes it readable — that is different from never having generated one, though both look empty. Pass --refresh to rebuild it — one strong-model call taking tens of seconds, so do it when `stale` is true, not on every read. Contact details for key projects are included only if you are a member; judges get the numbers without them.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--refresh` | `boolean` |  | Rebuild the snapshot before reading. Slow and metered — only when asked or stale. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
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
# Read our report
loops sponsor telemetry --event my-hackathon --sponsor acme

# Rebuild it after judging finished
loops sponsor telemetry --event my-hackathon --sponsor acme --refresh true
```

---

# loops sponsor winners clear

Clear your draft winner picks. Anything already published stays published.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `cleared` | `number` | yes |  |

## Examples

```sh
# Start our picks over
loops sponsor winners clear --event my-hackathon --sponsor acme
```

---

# loops sponsor winners set

Record your bounty winners by BOUNTY NAME and PROJECT SLUG — no ids. Replaces your non-finalized picks wholesale, so pass --confirm with the event slug. Names come from `loops bounties`; slugs from the project list. A judge cannot do this — sponsor members only.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Your sponsor slug |
| `--picks` | `string` |  | JSON array: '[{"bounty":"Best use of X","project":"team-rocket","rank":1}]'. `rank` optional. |
| `--confirm` | `string` |  | Retype the event slug to confirm — this replaces your existing picks. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorSlug` | `string` | yes |  |
| `set` | `number` | yes |  |

## Examples

```sh
# Record our winner
loops sponsor winners set --event my-hackathon --sponsor acme --picks [{"bounty":"Best use of Acme Queues","project":"team-rocket","rank":1}] --confirm my-hackathon
```
