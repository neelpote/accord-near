---
name: loops-session
description: Builder · Hackathons — show the locally stored ideator conversation for an event (pass --clear to delete it). Pairs with `ideate`, so it is not part of a builder challenge either. Run `loops session --help` for usage details.
requires_bin: loops
command: loops session
---

# loops session

Builder · Hackathons — show the locally stored ideator conversation for an event (pass --clear to delete it). Pairs with `ideate`, so it is not part of a builder challenge either.

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
loops session --event my-hackathon

# Start over
loops session --event my-hackathon --clear true
```
