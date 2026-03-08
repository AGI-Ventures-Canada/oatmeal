# Oatmeal CLI — Command Reference

Complete reference for all `oatmeal` CLI commands. Source: `packages/cli/src/`.

## Global Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help / banner |
| `--version`, `-v` | Show CLI version |
| `--json` | Output as JSON instead of formatted table |
| `--yes`, `-y` | Skip confirmation prompts |
| `--base-url` | Override API base URL for this command |
| `--api-key` | Override API key for this command |

## Auth

### `oatmeal login`

Interactive login flow. Opens browser for Clerk sign-in, auto-creates an API key, and saves config to `~/.oatmeal/config.json`.

| Flag | Description |
|------|-------------|
| `--api-key` | Skip browser flow, validate and save this key directly |
| `--base-url` | Target instance URL (saved to config) |
| `--no-browser` | Paste API key manually instead of opening browser |
| `--yes`, `-y` | Overwrite existing config without prompting |

Environment variables `OATMEAL_API_KEY` and `OATMEAL_BASE_URL` override config when set.

### `oatmeal logout`

Remove saved credentials (`~/.oatmeal/config.json`).

### `oatmeal whoami`

Show current auth info: tenant ID, key ID, and scopes.

---

## Browse (public, no auth required)

### `oatmeal browse hackathons`

Search public hackathons.

### `oatmeal browse submissions <slug>`

View submissions for a hackathon by slug.

### `oatmeal browse results <slug>`

View published results for a hackathon by slug.

### `oatmeal browse org <slug>`

View organization profile by slug.

---

## Hackathons

### `oatmeal hackathons list`

List all hackathons for your organization.

### `oatmeal hackathons create`

Create a new hackathon. Prompts interactively if flags omitted in TTY.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Hackathon name |
| `--slug` | Yes | URL-safe identifier (auto-suggested from name in interactive mode) |
| `--description` | No | Short description |

### `oatmeal hackathons get <id-or-slug>`

Get full details for a hackathon. Supports both UUID and slug.

### `oatmeal hackathons update <id-or-slug>`

Update hackathon settings.

| Flag | Description |
|------|-------------|
| `--name` | Update name |
| `--slug` | Update slug |
| `--description` | Update description |

At least one flag is required.

### `oatmeal hackathons delete <id-or-slug>`

Delete a hackathon. Prompts for confirmation (skip with `--yes`).

---

## Judging — Criteria

### `oatmeal judging criteria list <hackathon-id>`

List all judging criteria.

### `oatmeal judging criteria create <hackathon-id>`

Create a criterion. Prompts interactively if flags omitted.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Criterion name (e.g., "Innovation") |
| `--description` | No | What judges should evaluate |
| `--max-score` | No | Maximum score (default 10, prompted in TTY) |
| `--weight` | No | Weight multiplier (default 1, prompted in TTY) |

### `oatmeal judging criteria update <hackathon-id> <criteria-id>`

Update a criterion. Same flags as `create`, all optional.

### `oatmeal judging criteria delete <hackathon-id> <criteria-id>`

Delete a criterion. Prompts for confirmation.

---

## Judging — Judges

### `oatmeal judging judges list <hackathon-id>`

List all judges with assignment and completion counts.

### `oatmeal judging judges add <hackathon-id>`

Add a judge. Provide one of:

| Flag | Description |
|------|-------------|
| `--email` | Judge's email (sends invitation if not found on platform) |
| `--user-id` | Clerk user ID (if known) |

### `oatmeal judging judges remove <hackathon-id> <participant-id>`

Remove a judge. Prompts for confirmation.

---

## Judging — Invitations

### `oatmeal judging invitations list <hackathon-id>`

List pending judge invitations.

### `oatmeal judging invitations cancel <hackathon-id> <invitation-id>`

Cancel a pending judge invitation. Prompts for confirmation.

---

## Judging — Assignments

### `oatmeal judging auto-assign <hackathon-id>`

Auto-distribute submissions across judges.

| Flag | Required | Description |
|------|----------|-------------|
| `--per-judge` | Yes | Number of submissions per judge |

### `oatmeal judging assignments list <hackathon-id>`

List all assignments with progress stats.

### `oatmeal judging assignments create <hackathon-id>`

Manually assign a judge to a submission.

| Flag | Required | Description |
|------|----------|-------------|
| `--judge` | Yes | Judge participant ID |
| `--submission` | Yes | Submission ID |

### `oatmeal judging assignments delete <hackathon-id> <assignment-id>`

Remove an assignment. Prompts for confirmation.

### `oatmeal judging pick-results <hackathon-id>`

View pick-based judging results.

---

## Prizes

### `oatmeal prizes list <hackathon-id>`

List all prizes and their assignments.

### `oatmeal prizes create <hackathon-id>`

Create a prize. Prompts for name interactively if omitted.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Prize name (e.g., "First Place") |
| `--description` | No | Prize description |
| `--type` | No | Prize type |
| `--value` | No | Prize value (e.g., "$5,000") |

### `oatmeal prizes update <hackathon-id> <prize-id>`

Update a prize. Same flags as `create`, all optional.

### `oatmeal prizes delete <hackathon-id> <prize-id>`

Delete a prize. Prompts for confirmation.

### `oatmeal prizes reorder <hackathon-id> <id-1> <id-2> ...`

Reorder prizes by passing prize IDs in desired order.

### `oatmeal prizes assign <hackathon-id> <prize-id>`

Assign a prize to a winning submission.

| Flag | Required | Description |
|------|----------|-------------|
| `--submission` | Yes | Submission ID |

### `oatmeal prizes unassign <hackathon-id> <prize-id> <submission-id>`

Remove a prize assignment. Prompts for confirmation.

---

## Judge Display

### `oatmeal judge-display list <hackathon-id>`

List judge display profiles.

### `oatmeal judge-display create <hackathon-id>`

Create a judge display profile.

### `oatmeal judge-display update <hackathon-id> <display-id>`

Update a judge display profile.

### `oatmeal judge-display delete <hackathon-id> <display-id>`

Delete a judge display profile. Prompts for confirmation.

### `oatmeal judge-display reorder <hackathon-id> <id-1> <id-2> ...`

Reorder judge display profiles.

---

## Results

### `oatmeal results calculate <hackathon-id>`

Calculate rankings from submitted scores.

### `oatmeal results get <hackathon-id>`

View detailed results with scores (organizer view).

### `oatmeal results publish <hackathon-id>`

Make results public. Transitions hackathon to `completed` status. Prompts for confirmation.

### `oatmeal results unpublish <hackathon-id>`

Hide results from public view. Prompts for confirmation.

---

## Webhooks

### `oatmeal webhooks list`

List all webhooks.

### `oatmeal webhooks create`

| Flag | Required | Description |
|------|----------|-------------|
| `--url` | Yes | Webhook endpoint URL |
| `--events` | Yes | Comma-separated event list |

Available events: `hackathon.created`, `hackathon.updated`, `submission.submitted`, `submission.updated`, `results.published`, `participant.registered`

### `oatmeal webhooks delete <id>`

Delete a webhook. Prompts for confirmation.

---

## Jobs

### `oatmeal jobs list`

List jobs. Supports filtering via additional flags.

### `oatmeal jobs get <id>`

Get job details and status.

### `oatmeal jobs create`

Create a job (supports idempotency).

### `oatmeal jobs result <id>`

Get job result. Returns 202 if still running.

### `oatmeal jobs cancel <id>`

Cancel a running job. Prompts for confirmation.

---

## Schedules

### `oatmeal schedules list`

List all schedules.

### `oatmeal schedules create`

Create a schedule.

### `oatmeal schedules get <id>`

Get schedule details.

### `oatmeal schedules update <id>`

Update a schedule.

### `oatmeal schedules delete <id>`

Delete a schedule. Prompts for confirmation.
