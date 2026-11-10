---
name: loops-artifact
description: Builder · Hackathons — manage your ideation artifacts (scratchpad) for an event. Not part of a builder challenge, where the repo is the entry. Run `loops artifact --help` for usage details.
requires_bin: loops
command: loops artifact
---

# loops artifact list

List your ideation artifacts for an event

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `artifacts` | `array` | yes |  |
| `artifacts[].id` | `string` | yes |  |
| `artifacts[].name` | `string` | yes |  |
| `artifacts[].kind` | `string` | yes |  |
| `artifacts[].body` | `string` | yes |  |
| `artifacts[].createdAt` | `string` | yes |  |
| `artifacts[].updatedAt` | `string` | yes |  |

## Examples

```sh
# List your artifacts
loops artifact list --event my-hackathon
```

---

# loops artifact remove

Delete an ideation artifact

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug the artifact belongs to |
| `--id` | `string` |  | Artifact id (from `artifact list`) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deleted` | `boolean` | yes |  |

## Examples

```sh
# Delete an artifact
loops artifact remove --event my-hackathon --id uuid
```

---

# loops artifact save

Save a new ideation artifact (idea, problem, tech-stack, or note)

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--name` | `string` |  | Concise artifact title |
| `--kind` | `string` |  | Artifact kind: note | problem | tech-stack | idea |
| `--body` | `string` |  | Artifact content in Markdown |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes |  |

## Examples

```sh
# Save an idea
loops artifact save --event my-hackathon --name Onchain receipts --kind idea --body …
```

---

# loops artifact update

Update an existing ideation artifact (any of name, kind, body)

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug the artifact belongs to |
| `--id` | `string` |  | Artifact id (from `artifact list`) |
| `--name` | `string` |  | New title |
| `--kind` | `string` |  |  |
| `--body` | `string` |  | New Markdown content |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes |  |

## Examples

```sh
# Rewrite an artifact's body
loops artifact update --event my-hackathon --id uuid --body Updated notes…
```
