---
name: loops-ideate
description: Builder · Hackathons — brainstorm with the AI mentor. Each call sends one more message and the conversation continues automatically, stored locally per event. Costs 1 agent credit per turn. On a builder challenge, focus it with --problems — the entry itself is still judged on the repo against the problem briefs. Run `loops ideate --help` for usage details.
requires_bin: loops
command: loops ideate
---

# loops ideate

Builder · Hackathons — brainstorm with the AI mentor. Each call sends one more message and the conversation continues automatically, stored locally per event. Costs 1 agent credit per turn. On a builder challenge, focus it with --problems — the entry itself is still judged on the repo against the problem briefs.

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
loops ideate --event my-hackathon --message Suggest a project using the sponsor APIs

# Continue the same conversation — history is replayed automatically
loops ideate --event my-hackathon --message Go deeper on the second idea

# Focus a compete-event ideation on one problem
loops ideate --event my-contest --message How should I approach this problem? --problems hot-vault
```
