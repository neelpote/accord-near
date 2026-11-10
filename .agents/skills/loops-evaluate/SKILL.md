---
name: loops-evaluate
description: "Builder · Fetch the project-evaluator prompt (free), then run it inside your repo: it walks the judging criteria and reports how well the project aligns. Your project record is included automatically. Pass exactly one of --sponsor or --problem. Run `loops evaluate --help` for usage details."
requires_bin: loops
command: loops evaluate
---

# loops evaluate

Builder · Fetch the project-evaluator prompt (free), then run it inside your repo: it walks the judging criteria and reports how well the project aligns. Your project record is included automatically. Pass exactly one of --sponsor or --problem.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--sponsor` | `string` |  | Sponsor slug to evaluate against (sponsor-keyed events) |
| `--problem` | `string` |  | Problem slug to evaluate against (problem-keyed compete events) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | yes |  |

## Examples

```sh
# Get the Acme evaluator prompt for your project
loops evaluate --event my-hackathon --sponsor acme

# Get the Hot Vault problem's evaluator prompt for your project
loops evaluate --event my-contest --problem hot-vault
```
