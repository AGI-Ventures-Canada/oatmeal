# Oatmeal CLI — Command Reference

Complete reference for all `hackathon` CLI commands. Source: `packages/cli/src/`.

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

### `hackathon login`

Interactive login flow. Opens browser for Clerk sign-in, auto-creates an API key, and saves config to `~/.hackathon/config.json`.

| Flag | Description |
|------|-------------|
| `--api-key` | Skip browser flow, validate and save this key directly |
| `--base-url` | Target instance URL (saved to config) |
| `--no-browser` | Paste API key manually instead of opening browser |
| `--yes`, `-y` | Overwrite existing config without prompting |

Environment variables `HACKATHON_API_KEY` and `HACKATHON_BASE_URL` override config when set.

### `hackathon logout`

Remove saved credentials (`~/.hackathon/config.json`).

### `hackathon whoami`

Show current auth info: tenant ID, key ID, and scopes.

---

## Browse (public, no auth required)

### `hackathon browse hackathons`

Search public hackathons.

### `hackathon browse submissions <slug>`

View submissions for a hackathon by slug.

### `hackathon browse results <slug>`

View published results for a hackathon by slug.

### `hackathon browse org <slug>`

View organization profile by slug.

---

## Hackathons

### `hackathon hackathons list`

List all hackathons for your organization.

### `hackathon hackathons create`

Create a new hackathon. Prompts interactively if flags omitted in TTY.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Hackathon name |
| `--slug` | Yes | URL-safe identifier (auto-suggested from name in interactive mode) |
| `--description` | No | Short description |

### `hackathon hackathons get <id-or-slug>`

Get full details for a hackathon. Supports both UUID and slug.

### `hackathon hackathons update <id-or-slug>`

Update hackathon settings.

| Flag | Description |
|------|-------------|
| `--name` | Update name |
| `--slug` | Update slug |
| `--description` | Update description |

At least one flag is required.

### `hackathon hackathons delete <id-or-slug>`

Delete a hackathon. Prompts for confirmation (skip with `--yes`).

---

## Judging — Criteria

### `hackathon judging criteria list <hackathon-id>`

List all judging criteria.

### `hackathon judging criteria create <hackathon-id>`

Create a criterion. Prompts interactively if flags omitted.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Criterion name (e.g., "Innovation") |
| `--description` | No | What judges should evaluate |
| `--max-score` | No | Maximum score (default 10, prompted in TTY) |
| `--weight` | No | Weight multiplier (default 1, prompted in TTY) |

### `hackathon judging criteria update <hackathon-id> <criteria-id>`

Update a criterion. Same flags as `create`, all optional.

### `hackathon judging criteria delete <hackathon-id> <criteria-id>`

Delete a criterion. Prompts for confirmation.

---

## Judging — Judges

### `hackathon judging judges list <hackathon-id>`

List all judges with assignment and completion counts.

### `hackathon judging judges add <hackathon-id>`

Add a judge. Provide one of:

| Flag | Description |
|------|-------------|
| `--email` | Judge's email (sends invitation if not found on platform) |
| `--user-id` | Clerk user ID (if known) |

### `hackathon judging judges remove <hackathon-id> <participant-id>`

Remove a judge. Prompts for confirmation.

---

## Judging — Invitations

### `hackathon judging invitations list <hackathon-id>`

List pending judge invitations.

### `hackathon judging invitations cancel <hackathon-id> <invitation-id>`

Cancel a pending judge invitation. Prompts for confirmation.

---

## Judging — Assignments

### `hackathon judging auto-assign <hackathon-id>`

Auto-distribute submissions across judges.

| Flag | Required | Description |
|------|----------|-------------|
| `--per-judge` | Yes | Number of submissions per judge |

### `hackathon judging assignments list <hackathon-id>`

List all assignments with progress stats.

### `hackathon judging assignments create <hackathon-id>`

Manually assign a judge to a submission.

| Flag | Required | Description |
|------|----------|-------------|
| `--judge` | Yes | Judge participant ID |
| `--submission` | Yes | Submission ID |

### `hackathon judging assignments delete <hackathon-id> <assignment-id>`

Remove an assignment. Prompts for confirmation.

### `hackathon judging pick-results <hackathon-id>`

View pick-based judging results.

---

## Prizes

### `hackathon prizes list <hackathon-id>`

List all prizes and their assignments.

### `hackathon prizes create <hackathon-id>`

Create a prize. Prompts for name interactively if omitted.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Prize name (e.g., "First Place") |
| `--description` | No | Prize description |
| `--type` | No | Prize type |
| `--value` | No | Prize value (e.g., "$5,000") |

### `hackathon prizes update <hackathon-id> <prize-id>`

Update a prize. Same flags as `create`, all optional.

### `hackathon prizes delete <hackathon-id> <prize-id>`

Delete a prize. Prompts for confirmation.

### `hackathon prizes reorder <hackathon-id> <id-1> <id-2> ...`

Reorder prizes by passing prize IDs in desired order.

### `hackathon prizes assign <hackathon-id> <prize-id>`

Assign a prize to a winning submission.

| Flag | Required | Description |
|------|----------|-------------|
| `--submission` | Yes | Submission ID |

### `hackathon prizes unassign <hackathon-id> <prize-id> <submission-id>`

Remove a prize assignment. Prompts for confirmation.

---

## Judge Display

### `hackathon judge-display list <hackathon-id>`

List judge display profiles.

### `hackathon judge-display create <hackathon-id>`

Create a judge display profile.

### `hackathon judge-display update <hackathon-id> <display-id>`

Update a judge display profile.

### `hackathon judge-display delete <hackathon-id> <display-id>`

Delete a judge display profile. Prompts for confirmation.

### `hackathon judge-display reorder <hackathon-id> <id-1> <id-2> ...`

Reorder judge display profiles.

---

## Results

### `hackathon results calculate <hackathon-id>`

Calculate rankings from submitted scores.

### `hackathon results get <hackathon-id>`

View detailed results with scores (organizer view).

### `hackathon results publish <hackathon-id>`

Make results public. Transitions hackathon to `completed` status. Prompts for confirmation.

### `hackathon results unpublish <hackathon-id>`

Hide results from public view. Prompts for confirmation.

---

## Webhooks

### `hackathon webhooks list`

List all webhooks.

### `hackathon webhooks create`

| Flag | Required | Description |
|------|----------|-------------|
| `--url` | Yes | Webhook endpoint URL |
| `--events` | Yes | Comma-separated event list |

Available events: `hackathon.created`, `hackathon.updated`, `submission.submitted`, `submission.updated`, `results.published`, `participant.registered`

### `hackathon webhooks delete <id>`

Delete a webhook. Prompts for confirmation.

---

## Jobs

### `hackathon jobs list`

List jobs. Supports filtering via additional flags.

### `hackathon jobs get <id>`

Get job details and status.

### `hackathon jobs create`

Create a job (supports idempotency).

### `hackathon jobs result <id>`

Get job result. Returns 202 if still running.

### `hackathon jobs cancel <id>`

Cancel a running job. Prompts for confirmation.

---

## Schedules

### `hackathon schedules list`

List all schedules.

### `hackathon schedules create`

Create a schedule.

### `hackathon schedules get <id>`

Get schedule details.

### `hackathon schedules update <id>`

Update a schedule.

### `hackathon schedules delete <id>`

Delete a schedule. Prompts for confirmation.
