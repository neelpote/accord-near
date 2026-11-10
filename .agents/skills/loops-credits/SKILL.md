---
name: loops-credits
description: Show remaining agent credits for an event. 1 credit = one ideator turn or one knowledge-graph query. Run `loops credits --help` for usage details.
requires_bin: loops
command: loops credits
---

# loops credits

Show remaining agent credits for an event. 1 credit = one ideator turn or one knowledge-graph query.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to check credits for |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `used` | `number` | yes |  |
| `cap` | `number` | yes |  |
| `remaining` | `number` | yes |  |

## Examples

```sh
# Check your balance
loops credits --event my-hackathon
```
