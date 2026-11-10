---
name: loops-auth
description: Authenticate with the Loops House platform. Run `loops auth --help` for usage details.
requires_bin: loops
command: loops auth
---

# loops auth link

Attach a GitHub/Google identity to the account you're signed in to. Use when provider sign-in fails with 'multiple accounts with the same email' — after linking, that provider always signs in to THIS account.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--provider` | `string` |  | OAuth provider identity to link |
| `--port` | `number` | `54321` | Local port for the OAuth callback server |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | yes |  |
| `email` | `string` | no |  |
| `userId` | `string` | no |  |
| `identities` | `array` | yes |  |

## Examples

```sh
# Link your GitHub identity to the signed-in account
loops auth link --provider github
```

---

# loops auth login

Log in via browser OAuth (GitHub/Google) or an email one-time code

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--provider` | `string` |  | OAuth provider (default google). Ignored when --email is set. |
| `--email` | `string` |  | Log in with an email one-time code instead of a browser |
| `--port` | `number` | `54321` | Local port for the OAuth callback server |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | yes |  |
| `email` | `string` | no |  |
| `userId` | `string` | no |  |
| `message` | `string` | no |  |

## Examples

```sh
# Log in with Google
loops auth login --provider google

# Log in with GitHub
loops auth login --provider github

# Send an email one-time code
loops auth login --email you@example.com
```

---

# loops auth logout

Clear stored credentials

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | yes |  |

---

# loops auth status

Show the current authentication status

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `authenticated` | `boolean` | yes |  |
| `email` | `string` | no |  |
| `userId` | `string` | no |  |

---

# loops auth verify

Complete email one-time-code login (pairs with `auth login --email`)

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--email` | `string` |  | Email the code was sent to |
| `--code` | `string` |  | The 6-digit code from the email |

## Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | yes |  |
| `email` | `string` | no |  |
| `userId` | `string` | no |  |

## Examples

```sh
# Verify the emailed code
loops auth verify --email you@example.com --code 123456
```
