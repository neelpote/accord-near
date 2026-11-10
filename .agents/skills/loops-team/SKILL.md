---
name: loops-team
description: Builder · Invite teammates to your project, and see who has joined. Your project is resolved from your session — no ids. Run `loops team --help` for usage details.
requires_bin: loops
command: loops team
---

# loops team cancel

Withdraw a pending invitation, by the email it was sent to.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--email` | `string` |  | Email the invitation was sent to |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cancelled` | `boolean` | yes |  |

## Examples

```sh
# Withdraw an invite
loops team cancel --event my-hackathon --email ben@example.com
```

---

# loops team invite

Invite a teammate by email. Sends them an invite and returns a shareable link you can paste directly — useful when they are next to you or the mail is slow. On a terminal you are asked for the email; from an agent, ASK the builder for it rather than guessing an address.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |
| `--email` | `string` |  | Teammate's email address |
| `--role` | `string` |  | What they do on the team, e.g. design (optional) |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | yes |  |
| `inviteUrl` | `string` | yes |  |
| `expiresAt` | `unknown` | yes |  |

## Examples

```sh
# Invite a teammate
loops team invite --event my-hackathon --email ben@example.com
```

---

# loops team list

Who is on your team for this event, and who has been invited but not joined yet. Needs a project — create one first.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectSlug` | `string` | yes |  |
| `projectName` | `string` | yes |  |
| `members` | `array` | yes |  |
| `members[].name` | `string` | yes |  |
| `members[].email` | `unknown` | yes |  |
| `members[].role` | `unknown` | yes |  |
| `members[].isOwner` | `boolean` | yes |  |
| `pendingInvitations` | `array` | yes |  |
| `pendingInvitations[].email` | `string` | yes |  |
| `pendingInvitations[].role` | `unknown` | yes |  |
| `pendingInvitations[].expiresAt` | `unknown` | yes |  |

## Examples

```sh
# See the roster
loops team list --event my-hackathon
```
