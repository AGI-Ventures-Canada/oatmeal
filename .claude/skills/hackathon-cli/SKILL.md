---
name: hackathon-cli
model: sonnet
description: Use the Oatmeal CLI tool to manage hackathons from the terminal. Use when the user asks to create hackathons, add judges, manage prizes, or perform hackathon management tasks using the oatmeal command-line tool.
activationKeywords:
  - "oatmeal cli"
  - "oatmeal command"
  - "create a hackathon"
  - "make a hackathon"
  - "add a judge"
  - "set up judging"
  - "add a prize"
  - "publish results"
  - "manage hackathon"
  - "hackathon on"
---

# Hackathon CLI — Oatmeal Command-Line Tool

> **Status: Planned — not yet published.** The `@oatmeal/cli` package does not exist yet. The commands documented here represent the target CLI interface that will wrap the existing REST API.
>
> **Until the CLI is available, use the `hackathon-api` skill instead.** It provides the same functionality via direct `curl` commands against the REST API. Every CLI command below maps 1:1 to an API endpoint documented in `hackathon-api`.

Manage the Oatmeal hackathon platform from the terminal using the `oatmeal` CLI. This skill guides AI agents through installing, configuring, and using the CLI to create hackathons, manage judges, set up prizes, and publish results.

## Agent Instructions

1. **Check if the CLI is installed first:** Run `which oatmeal` or `oatmeal --version`. If the CLI is not found, **do not attempt to install it** — it is not yet published.
2. **If the CLI is not installed:** Tell the user the CLI is not yet available, then **automatically fall back to the `hackathon-api` skill** to accomplish the same task using curl commands against the REST API.
3. **If the CLI is installed:** Proceed with the CLI commands documented below.

## Reference Files

- `references/commands.md` — Complete CLI command reference with all flags and options
- `references/workflow-examples.md` — Natural language to CLI command mappings and end-to-end examples

## When to Activate

- User asks to create, update, or manage a hackathon using the CLI or terminal
- User asks to add/remove judges, sponsors, or prizes
- User asks to configure judging criteria or assignments
- User asks to calculate or publish results
- User gives natural language commands like "make me a hackathon on Sunday from 7am to 9pm"
- User mentions "oatmeal" in the context of hackathon management

## When NOT to Activate

- User wants to make direct REST API calls or curl commands (use `hackathon-api`)
- User is working on the Oatmeal codebase itself (editing source code, running tests)
- User is asking about general hackathon concepts (use `hackathon-organizer` or `hackathon-attendee`)
- User is working with the Oatmeal web dashboard UI directly

## Installation (once published)

### Install the CLI

```bash
# Install globally via bun
bun add -g @oatmeal/cli
```

Verify installation:

```bash
oatmeal --version
```

### Login & Configuration

```bash
# Login with your API key
oatmeal login

# Or set API key directly
oatmeal config set api-key sk_live_your_api_key_here

# Set the target instance (defaults to production)
oatmeal config set url http://localhost:3000   # for local dev
oatmeal config set url https://getoatmeal.com  # for production
```

Verify your setup:

```bash
oatmeal whoami
```

This displays your organization, user info, and API key scopes.

## Core Commands

### Hackathon Management

```bash
# List your hackathons
oatmeal hackathons list

# Create a new hackathon
oatmeal hackathons create \
  --name "Sunday AI Hackathon" \
  --slug "sunday-ai-hackathon" \
  --starts "2026-03-15T07:00:00Z" \
  --ends "2026-03-15T21:00:00Z" \
  --registration-opens "2026-03-08T00:00:00Z" \
  --registration-closes "2026-03-15T06:00:00Z"

# Get hackathon details
oatmeal hackathons get <hackathon-id>

# Update settings
oatmeal hackathons update <hackathon-id> \
  --name "Updated Name" \
  --status published

# Delete a hackathon
oatmeal hackathons delete <hackathon-id>
```

**Status transitions:** `draft` → `published` → `registration_open` → `active` → `judging` → `completed` → `archived`

### Judge Management

```bash
# List judges
oatmeal judges list --hackathon <hackathon-id>

# Add a judge by email (sends invitation if not found)
oatmeal judges add --hackathon <hackathon-id> --email judge@example.com

# Remove a judge
oatmeal judges remove --hackathon <hackathon-id> --judge <participant-id>

# List pending judge invitations
oatmeal judges invitations --hackathon <hackathon-id>
```

### Judging Criteria

```bash
# List criteria
oatmeal criteria list --hackathon <hackathon-id>

# Add a criterion
oatmeal criteria add --hackathon <hackathon-id> \
  --name "Innovation" \
  --description "How novel and creative is the solution?" \
  --max-score 10 \
  --weight 1.0

# Update a criterion
oatmeal criteria update --hackathon <hackathon-id> --criteria <criteria-id> \
  --weight 1.5

# Delete a criterion
oatmeal criteria delete --hackathon <hackathon-id> --criteria <criteria-id>
```

### Judging Assignments

```bash
# Auto-assign judges to submissions
oatmeal judging auto-assign --hackathon <hackathon-id> --per-judge 5

# List assignments with progress
oatmeal judging assignments --hackathon <hackathon-id>

# Manually assign a judge to a submission
oatmeal judging assign --hackathon <hackathon-id> \
  --judge <participant-id> --submission <submission-id>
```

### Prize Management

```bash
# List prizes
oatmeal prizes list --hackathon <hackathon-id>

# Create a prize
oatmeal prizes create --hackathon <hackathon-id> \
  --name "First Place" \
  --description "Grand prize for the winning team" \
  --value "\$5,000"

# Assign a prize to a submission
oatmeal prizes assign --hackathon <hackathon-id> \
  --prize <prize-id> --submission <submission-id>

# Unassign a prize
oatmeal prizes unassign --hackathon <hackathon-id> \
  --prize <prize-id> --submission <submission-id>
```

### Sponsor Management

```bash
# List sponsors
oatmeal sponsors list --hackathon <hackathon-id>

# Add a sponsor
oatmeal sponsors add --hackathon <hackathon-id> \
  --name "TechCorp" \
  --tier gold \
  --website "https://techcorp.com"

# Update a sponsor
oatmeal sponsors update --hackathon <hackathon-id> --sponsor <sponsor-id> \
  --tier title

# Remove a sponsor
oatmeal sponsors remove --hackathon <hackathon-id> --sponsor <sponsor-id>
```

Tiers: `title`, `gold`, `silver`, `bronze`, `partner`

### Results

```bash
# Calculate rankings from submitted scores
oatmeal results calculate --hackathon <hackathon-id>

# View results (organizer detail view)
oatmeal results get --hackathon <hackathon-id>

# Publish results (makes public, transitions to completed)
oatmeal results publish --hackathon <hackathon-id>

# Unpublish results
oatmeal results unpublish --hackathon <hackathon-id>
```

### Webhooks

```bash
# List webhooks
oatmeal webhooks list

# Create a webhook
oatmeal webhooks create \
  --url "https://your-endpoint.com/hook" \
  --events "submission.submitted,participant.registered"

# Delete a webhook
oatmeal webhooks delete <webhook-id>
```

### Organization

```bash
# View org profile
oatmeal org get

# Update org profile
oatmeal org update --name "New Org Name" --website "https://example.com"
```

## Finding the Current Hackathon

When a user says "my current hackathon" or "my hackathon":

```bash
oatmeal hackathons list
```

Look for the hackathon with `active` or `published` status. If ambiguous, ask which one they mean.

## Date Handling

When users say things like "make me a hackathon on Sunday from 7am to 9pm":

1. **Parse the dates** — convert natural language to ISO 8601 timestamps
2. Use the user's timezone if known, otherwise ask
3. Registration typically opens immediately and closes at or before the start time
4. Default status is `draft` — remind the user to publish when ready

## Error Handling

Common errors:
- **"Not authenticated"** — run `oatmeal login` or `oatmeal config set api-key <key>`
- **"Insufficient permissions"** — API key lacks required scope, create a new key with proper permissions
- **"Not found"** — verify the hackathon/resource ID exists with a list command
- **"Conflict"** — duplicate resource (slug already taken, already registered, etc.)

## Tips for AI Agents

1. **Always store IDs** — capture returned `id` values for use in subsequent commands
2. **Check before creating** — list existing resources before creating duplicates
3. **Parse dates carefully** — convert "this Sunday" to ISO 8601 using the current date
4. **Confirm destructive actions** — ask the user before deleting or publishing
5. **Batch operations** — when setting up a full hackathon, create criteria, prizes, then add judges
6. **Default to draft** — create hackathons in draft status, let the user decide when to publish

## Full Reference

For the complete command reference, see `references/commands.md`.

For end-to-end workflow examples, see `references/workflow-examples.md`.
