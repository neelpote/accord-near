---
name: loops-project
description: Builder · Manage your project (the submission) for an event. Run `loops project --help` for usage details.
requires_bin: loops
command: loops project
---

# loops project create

Builder · Create your project submission for an event — the canonical submit for hackathon AND compete events (one per user per event; team membership counts). Compete entries need a real repo and auto-name from the problems; hackathon entries need --name. Run `project fields` first: the draft lists what the event would still be missing.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to submit to |
| `--confirm` | `boolean` |  | Send it. Without this the command prints the draft and writes nothing. Agents: show the draft to the builder and let THEM decide — never pass this on their behalf. |
| `--name` | `string` |  | Project name — required for hackathon events; compete battles auto-name from the problems |
| `--tagline` | `string` |  | One-line tagline (max 250 chars) |
| `--pitch` | `string` |  | Short elevator pitch |
| `--description` | `string` |  | Full project description |
| `--repoUrl` | `string` |  | Source repository URL |
| `--demoUrl` | `string` |  | Live demo URL |
| `--videoUrl` | `string` |  | Demo video URL |
| `--logoUrl` | `string` |  | Logo image URL (already hosted) |
| `--screenshotUrls` | `array` |  | Screenshot image URLs (already hosted) |
| `--logo` | `string` |  | Path to a local logo image — uploaded for you, max 2MB (png/jpg/webp/gif/svg) |
| `--screenshot` | `array` |  | Paths to local screenshots — uploaded for you, max 4MB each. Repeat the flag. |
| `--bountyIds` | `array` |  | Bounty/track ids to target (unchanged on update when omitted) |
| `--answer` | `array` |  | Answer to one of the event's extra fields or feedback questions as <id>=<value> — the field's name works as the key too (see `project fields`). Repeat the flag. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | yes |  |
| `submissionId` | `string` | yes |  |
| `created` | `boolean` | yes |  |
| `missing` | `array` | yes |  |
| `missing[].id` | `string` | yes |  |
| `missing[].label` | `string` | yes |  |
| `missing[].how` | `string` | yes |  |

## Examples

```sh
# A challenge entry — the repo IS the entry
loops project create --event my-challenge --repoUrl https://github.com/me/entry --confirm true

# A hackathon entry needs a name
loops project create --event my-hackathon --name My Project --confirm true
```

---

# loops project fields

Builder · Everything this event's submission asks for, with your current answers: the built-in fields the host left visible (each names the flag that sets it), the event's extra fields and its private feedback questions (set with `--answer <id or name>=<value>`), and `missing` — the required ones still unanswered. Read this before drafting a submission so the builder is asked once.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventType` | `string` | yes |  |
| `exists` | `unknown` | yes |  |
| `builtin` | `array` | yes |  |
| `builtin[].key` | `string` | yes |  |
| `builtin[].label` | `string` | yes |  |
| `builtin[].description` | `string` | yes |  |
| `builtin[].required` | `boolean` | yes |  |
| `builtin[].value` | `unknown` | yes |  |
| `builtin[].flag` | `string` | yes |  |
| `extra` | `array` | yes |  |
| `extra[].id` | `string` | yes |  |
| `extra[].name` | `string` | yes |  |
| `extra[].type` | `string` | yes |  |
| `extra[].required` | `boolean` | yes |  |
| `extra[].description` | `unknown` | yes |  |
| `extra[].answer` | `unknown` | yes |  |
| `feedback` | `array` | yes |  |
| `feedback[].id` | `string` | yes |  |
| `feedback[].name` | `string` | yes |  |
| `feedback[].type` | `string` | yes |  |
| `feedback[].required` | `boolean` | yes |  |
| `feedback[].description` | `unknown` | yes |  |
| `feedback[].answer` | `unknown` | yes |  |
| `missing` | `array` | yes |  |
| `missing[].id` | `string` | yes |  |
| `missing[].label` | `string` | yes |  |
| `missing[].how` | `string` | yes |  |

## Examples

```sh
# See what this event asks for
loops project fields --event my-hackathon
```

---

# loops project get

Get your project for an event (a user has at most one; being a team member counts). Returns exists=false when you haven't created one yet.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to look up |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `exists` | `boolean` | yes |  |
| `project` | `unknown` | yes |  |

## Examples

```sh
# Look up your project
loops project get --event my-hackathon
```

---

# loops project update

Update your project for an event. PATCH semantics: only the fields you pass change — everything else (including bounty picks and answers) is preserved. No project id needed; yours is resolved automatically. The result lists what the event still asks for.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug the project belongs to |
| `--confirm` | `boolean` |  | Send it. Without this the command prints the draft and writes nothing. Agents: show the draft to the builder and let THEM decide — never pass this on their behalf. |
| `--name` | `string` |  | New project name (unchanged when omitted) |
| `--tagline` | `string` |  | One-line tagline (max 250 chars) |
| `--pitch` | `string` |  | Short elevator pitch |
| `--description` | `string` |  | Full project description |
| `--repoUrl` | `string` |  | Source repository URL |
| `--demoUrl` | `string` |  | Live demo URL |
| `--videoUrl` | `string` |  | Demo video URL |
| `--logoUrl` | `string` |  | Logo image URL (already hosted) |
| `--screenshotUrls` | `array` |  | Screenshot image URLs (already hosted) |
| `--logo` | `string` |  | Path to a local logo image — uploaded for you, max 2MB (png/jpg/webp/gif/svg) |
| `--screenshot` | `array` |  | Paths to local screenshots — uploaded for you, max 4MB each. Repeat the flag. |
| `--bountyIds` | `array` |  | Bounty/track ids to target (unchanged on update when omitted) |
| `--answer` | `array` |  | Answer to one of the event's extra fields or feedback questions as <id>=<value> — the field's name works as the key too (see `project fields`). Repeat the flag. |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | yes |  |
| `submissionId` | `string` | yes |  |
| `created` | `boolean` | yes |  |
| `missing` | `array` | yes |  |
| `missing[].id` | `string` | yes |  |
| `missing[].label` | `string` | yes |  |
| `missing[].how` | `string` | yes |  |

## Examples

```sh
# Change just the tagline — nothing else is touched
loops project update --event my-hackathon --tagline New tagline

# Answer an extra field by its name
loops project update --event my-hackathon --answer Team size=3 --confirm true
```
