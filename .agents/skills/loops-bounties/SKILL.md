---
name: loops-bounties
description: Builder · List a hackathon's bounties (reward tracks) with their ids, sponsor and prize. The ids are what `project create --bountyIds` takes — pick with the builder, then set them. Builder challenges have problems instead, inlined in the event skill. Run `loops bounties --help` for usage details.
requires_bin: loops
command: loops bounties
---

# loops bounties

Builder · List a hackathon's bounties (reward tracks) with their ids, sponsor and prize. The ids are what `project create --bountyIds` takes — pick with the builder, then set them. Builder challenges have problems instead, inlined in the event skill.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bounties` | `array` | yes |  |
| `bounties[].id` | `string` | yes |  |
| `bounties[].name` | `string` | yes |  |
| `bounties[].sponsorName` | `string` | no |  |
| `bounties[].amountUsd` | `unknown` | yes |  |

## Examples

```sh
# See what can be targeted
loops bounties --event my-hackathon
```
