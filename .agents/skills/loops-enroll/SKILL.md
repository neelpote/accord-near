---
name: loops-enroll
description: "Builder · Register for an event (also `register`). On a terminal this asks only for the details not already on your profile; from an agent, pass them as flags. Requires displayName, location and ageGroup — the same three the web form requires. Idempotent: enrolling twice is not an error. Run `loops enroll --help` for usage details."
requires_bin: loops
command: loops enroll
---

# loops enroll

Builder · Register for an event (also `register`). On a terminal this asks only for the details not already on your profile; from an agent, pass them as flags. Requires displayName, location and ageGroup — the same three the web form requires. Idempotent: enrolling twice is not an error.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--event` | `string` |  | Event slug to register for |
| `--displayName` | `string` |  | Name organisers and teammates see |
| `--location` | `string` |  | City or country — used for event demographics |
| `--ageGroup` | `string` |  | Age bracket (we never ask for a date of birth) |
| `--gender` | `string` |  | Optional |
| `--githubRepo` | `string` |  | Your GitHub profile or main repo |
| `--twitterUrl` | `string` |  | Optional |
| `--linkedinUrl` | `string` |  | Optional |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enrollmentId` | `string` | yes |  |
| `alreadyEnrolled` | `boolean` | yes |  |
| `profilePatched` | `boolean` | yes |  |

## Examples

```sh
# Register, filling gaps interactively
loops enroll --event my-hackathon

# Register non-interactively
loops enroll --event my-hackathon --displayName Asha Menon --location Pune --ageGroup 25-34
```
