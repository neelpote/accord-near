---
name: loops-roles
description: "What you can act on, and as what: every event you have a role in (builder, host, sponsor, judge) with its sponsor links. Read this first — it tells you which of the host/sponsor command groups apply to you and gives you the slugs they need. Run `loops roles --help` for usage details."
requires_bin: loops
command: loops roles
---

# loops roles

What you can act on, and as what: every event you have a role in (builder, host, sponsor, judge) with its sponsor links. Read this first — it tells you which of the host/sponsor command groups apply to you and gives you the slugs they need.

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | `array` | yes |  |
| `events[].slug` | `string` | yes |  |
| `events[].name` | `string` | yes |  |
| `events[].roles` | `array` | yes |  |
| `events[].published` | `boolean` | yes |  |
| `events[].bucket` | `string` | yes |  |
| `events[].sponsors` | `array` | yes |  |
| `events[].sponsors[].slug` | `string` | yes |  |
| `events[].sponsors[].name` | `string` | yes |  |
| `events[].sponsors[].kind` | `string` | yes |  |

## Examples

```sh
# See which events you can manage or judge
loops roles
```
