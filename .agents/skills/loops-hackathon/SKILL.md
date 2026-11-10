---
name: loops-hackathon
description: Legacy spellings of the Builder commands above — prefer `ideate`, `session` and `project create`. Kept working for skills already installed. Run `loops hackathon --help` for usage details.
requires_bin: loops
command: loops hackathon
---

# loops hackathon ideate

Legacy spelling of `ideate` — prefer that; behaviour is identical. Kept for skills already installed.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to ideate for |
| `--message` | `string` |  | Your prompt / question for the mentor. On a terminal you are asked for it; from an agent it is required — pass the builder's OWN words, not a prompt you composed for them. |
| `--sponsors` | `array` |  | Optional sponsor slugs to focus the ideation (sponsor-keyed events) |
| `--problems` | `array` |  | Optional problem slugs to focus the ideation (problem-keyed compete events) |
| `--withProject` | `boolean` |  | Include your project in the mentor's context (resolved automatically — you have at most one per event) |
| `--new` | `boolean` |  | Discard the stored conversation and start a fresh session |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `response` | `string` | yes |  |
| `sessionTurns` | `number` | yes |  |

## Examples

```sh
# Ask the mentor for an idea
loops hackathon ideate --event my-hackathon --message Suggest a project using the sponsor APIs

# Continue the same conversation — history is replayed automatically
loops hackathon ideate --event my-hackathon --message Go deeper on the second idea

# Focus a compete-event ideation on one problem
loops hackathon ideate --event my-contest --message How should I approach this problem? --problems hot-vault
```

---

# loops hackathon session

Legacy spelling of `session` — prefer that; behaviour is identical. Kept for skills already installed.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug the session belongs to |
| `--clear` | `boolean` |  | Delete the stored conversation instead of showing it |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cleared` | `boolean` | yes |  |
| `turns` | `array` | yes |  |
| `turns[].role` | `string` | yes |  |
| `turns[].text` | `string` | yes |  |
| `turns[].at` | `string` | yes |  |

## Examples

```sh
# Show the conversation
loops hackathon session --event my-hackathon

# Start over
loops hackathon session --event my-hackathon --clear true
```

---

# loops hackathon submit

Legacy spelling — prefer `project create`; identical fields and endpoint (a project IS the submission). Works on compete events despite the name. Kept for skills already installed.

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
# Submit a project
loops hackathon submit --event my-hackathon --name My Project --repoUrl https://github.com/me/proj --confirm true
```
