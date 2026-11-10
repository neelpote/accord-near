---
name: loops-events
description: "List active and upcoming events, or look up one by slug with --event (a concluded event still resolves, with ended:true and a winners URL — not an error). Call this first whenever you don't know the slug: the response's eventType tells you whether the event is sponsor-keyed (`hackathon`) or problem-keyed (`compete`, branded Builder Challenge). Run `loops events --help` for usage details."
requires_bin: loops
command: loops events
---

# loops events

List active and upcoming events, or look up one by slug with --event (a concluded event still resolves, with ended:true and a winners URL — not an error). Call this first whenever you don't know the slug: the response's eventType tells you whether the event is sponsor-keyed (`hackathon`) or problem-keyed (`compete`, branded Builder Challenge).

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to look up (omit to list events) |
| `--type` | `string` |  | Filter by kind. `challenge` means a compete event (branded Builder Challenge). Omitted on a terminal prompts for it; omitted elsewhere means all. |
| `--when` | `string` |  | Filter by timing: live = building or judging, upcoming = registration open, past = winners announced. Omitted on a terminal prompts for it; omitted elsewhere means live + upcoming. |

## Output

Type: `unknown`

## Examples

```sh
# Pick kind and timing interactively (or list live + upcoming)
loops events

# Challenges running now
loops events --type challenge --when live

# Concluded hackathons
loops events --type hackathon --when past

# Look up one event by slug
loops events --event my-hackathon
```
