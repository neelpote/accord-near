---
name: loops-knowledge
description: Builder · Query a knowledge graph (graph-RAG over docs and bounty/problem materials) — keyed by sponsor on hackathons, by problem on builder challenges (`compete`). Run `loops knowledge --help` for usage details.
requires_bin: loops
command: loops knowledge
---

# loops knowledge query

Retrieve cited evidence from one knowledge graph. Pass exactly one of --sponsor (sponsor-keyed events) or --problem (problem-keyed compete events). Returns an evidence block (entities, relationships, chunks, sources) — compose the answer yourself. Costs 1 agent credit.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug the sponsor or problem belongs to |
| `--sponsor` | `string` |  | Sponsor slug whose knowledge graph to query (sponsor-keyed events) |
| `--problem` | `string` |  | Problem slug whose knowledge graph to query (problem-keyed compete events) |
| `--query` | `string` |  | A focused question about the products, docs, or SDKs |
| `--mode` | `string` |  | 'mix' = balanced (default), 'local' = entity-centric, 'global' = relation-centric |
| `--hlKeywords` | `array` |  | 2-5 high-level concept keywords — supplying them skips a server-side LLM call |
| `--llKeywords` | `array` |  | 2-5 specific low-level terms (APIs, product names) that focus retrieval |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `evidence` | `string` | yes |  |

## Examples

```sh
# Ask about a sponsor's SDK
loops knowledge query --event my-hackathon --sponsor acme --query How do I authenticate against the Acme SDK?

# Ask about a compete problem's brief and reference materials
loops knowledge query --event my-contest --problem hot-vault --query What storage guarantees does the problem require?
```
