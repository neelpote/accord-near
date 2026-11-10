---
name: loops-add
description: "Set up an event in one step: installs the CLI, writes its agent skill into your coding agents (Claude Code + the `.agents` standard), and signs you in. Re-run to refresh sponsors and deadlines. Also `npx loopshouse add <slug>`. Run `loops add --help` for usage details."
requires_bin: loops
command: loops add
---

# loops add

Set up an event in one step: installs the CLI, writes its agent skill into your coding agents (Claude Code + the `.agents` standard), and signs you in. Re-run to refresh sponsors and deadlines. Also `npx loopshouse add <slug>`.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `event` | `string` | yes | Event slug to set up (from the event page URL) |
| `sponsor` | `string` | no | Optional sponsor slug — installs a skill focused on that sponsor's bounties, docs, and judging criteria |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--global` | `boolean` |  | Install the skill globally instead of into the current project |
| `--yes` | `boolean` |  | Skip prompts: all agents, project scope (unless --global), keep current auth |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `string` | yes |  |
| `sponsor` | `string` | no |  |
| `written` | `array` | yes |  |
| `cli` | `string` | yes |  |
| `authenticated` | `boolean` | yes |  |
| `email` | `string` | no |  |

## Examples

```sh
# Interactive setup for an event
loops add my-hackathon

# Install Acme's sponsor-focused skill
loops add my-hackathon acme

# Non-interactive, defaults
loops add my-hackathon --yes true
```
