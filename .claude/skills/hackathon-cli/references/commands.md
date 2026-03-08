# Oatmeal CLI — Command Reference

Complete reference for all `oatmeal` CLI commands.

## Global Flags

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help for any command |
| `--version`, `-v` | Show CLI version |
| `--json` | Output as JSON instead of formatted table |
| `--quiet`, `-q` | Suppress non-essential output |

## Configuration

### `oatmeal login`

Interactive login flow. Prompts for API key and instance URL.

### `oatmeal config set <key> <value>`

Set configuration values:

| Key | Description | Default |
|-----|-------------|---------|
| `api-key` | Your Oatmeal API key (`sk_live_...`) | — |
| `url` | Oatmeal instance URL | `https://getoatmeal.com` |

### `oatmeal config get <key>`

Display a configuration value.

### `oatmeal whoami`

Show current user, organization, and API key scopes.

---

## Hackathons

### `oatmeal hackathons list`

List all hackathons for your organization.

| Flag | Description |
|------|-------------|
| `--search`, `-q` | Filter by name |
| `--status` | Filter by status |

### `oatmeal hackathons create`

Create a new hackathon.

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Hackathon name |
| `--slug` | Yes | URL-safe identifier |
| `--description` | No | Short description |
| `--starts` | No | Start datetime (ISO 8601) |
| `--ends` | No | End datetime (ISO 8601) |
| `--registration-opens` | No | Registration open datetime |
| `--registration-closes` | No | Registration close datetime |
| `--location` | No | Venue or "Virtual" |

### `oatmeal hackathons get <id>`

Get full details for a hackathon.

### `oatmeal hackathons update <id>`

Update hackathon settings. All flags optional:

| Flag | Description |
|------|-------------|
| `--name` | Update name |
| `--slug` | Update slug |
| `--description` | Update description |
| `--rules` | Update rules (markdown) |
| `--status` | Change status |
| `--starts` | Update start time |
| `--ends` | Update end time |
| `--registration-opens` | Update registration open |
| `--registration-closes` | Update registration close |
| `--location` | Update location |
| `--anonymous-judging` | Enable/disable anonymous judging (true/false) |
| `--min-team-size` | Minimum team size |
| `--max-team-size` | Maximum team size |

### `oatmeal hackathons delete <id>`

Delete a hackathon. Prompts for confirmation.

---

## Judges

### `oatmeal judges list --hackathon <id>`

List all judges with assignment and completion counts.

### `oatmeal judges add --hackathon <id>`

Add a judge. Specify one of:

| Flag | Description |
|------|-------------|
| `--email` | Judge's email (sends invitation if not found on platform) |
| `--user-id` | Clerk user ID (if known) |

### `oatmeal judges remove --hackathon <id> --judge <participant-id>`

Remove a judge. Returns warning if results may become stale.

### `oatmeal judges invitations --hackathon <id>`

List pending judge invitations.

### `oatmeal judges cancel-invite --hackathon <id> --invitation <invitation-id>`

Cancel a pending judge invitation.

### `oatmeal judges search --hackathon <id> --query <name>`

Search for users to add as judges.

---

## Judging Criteria

### `oatmeal criteria list --hackathon <id>`

List all judging criteria.

### `oatmeal criteria add --hackathon <id>`

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Criterion name (e.g., "Innovation") |
| `--description` | No | What judges should evaluate |
| `--max-score` | Yes | Maximum score (e.g., 10) |
| `--weight` | No | Weight multiplier (default 1.0) |
| `--order` | No | Display order |

### `oatmeal criteria update --hackathon <id> --criteria <criteria-id>`

Update a criterion. Same flags as `add`, all optional.

### `oatmeal criteria delete --hackathon <id> --criteria <criteria-id>`

Delete a criterion.

---

## Judging Assignments

### `oatmeal judging auto-assign --hackathon <id>`

Auto-distribute submissions across judges.

| Flag | Required | Description |
|------|----------|-------------|
| `--per-judge` | Yes | Number of submissions per judge |

### `oatmeal judging assignments --hackathon <id>`

List all assignments with progress stats.

### `oatmeal judging assign --hackathon <id>`

Manually assign a judge to a submission.

| Flag | Required | Description |
|------|----------|-------------|
| `--judge` | Yes | Judge participant ID |
| `--submission` | Yes | Submission ID |

### `oatmeal judging unassign --hackathon <id> --assignment <assignment-id>`

Remove an assignment.

---

## Prizes

### `oatmeal prizes list --hackathon <id>`

List all prizes and their assignments.

### `oatmeal prizes create --hackathon <id>`

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Prize name (e.g., "First Place") |
| `--description` | No | Prize description |
| `--value` | No | Prize value (e.g., "$5,000") |
| `--order` | No | Display order |

### `oatmeal prizes update --hackathon <id> --prize <prize-id>`

Update a prize. Same flags as `create`, all optional.

### `oatmeal prizes delete --hackathon <id> --prize <prize-id>`

Delete a prize.

### `oatmeal prizes assign --hackathon <id> --prize <prize-id> --submission <submission-id>`

Assign a prize to a winning submission.

### `oatmeal prizes unassign --hackathon <id> --prize <prize-id> --submission <submission-id>`

Remove a prize assignment.

---

## Sponsors

### `oatmeal sponsors list --hackathon <id>`

List all sponsors.

### `oatmeal sponsors add --hackathon <id>`

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Sponsor name |
| `--tier` | No | Tier: `title`, `gold`, `silver`, `bronze`, `partner` |
| `--website` | No | Sponsor website URL |
| `--logo-url` | No | Logo URL |

### `oatmeal sponsors update --hackathon <id> --sponsor <sponsor-id>`

Update a sponsor. Same flags as `add`, all optional.

### `oatmeal sponsors remove --hackathon <id> --sponsor <sponsor-id>`

Remove a sponsor.

---

## Results

### `oatmeal results calculate --hackathon <id>`

Calculate rankings from submitted scores.

### `oatmeal results get --hackathon <id>`

View detailed results with scores (organizer view).

### `oatmeal results publish --hackathon <id>`

Make results public. Transitions hackathon to `completed` status. Triggers `results.published` webhook.

### `oatmeal results unpublish --hackathon <id>`

Hide results from public view.

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

Returns a webhook secret (shown only once).

### `oatmeal webhooks delete <id>`

Delete a webhook.

---

## Organization

### `oatmeal org get`

View organization profile.

### `oatmeal org update`

| Flag | Description |
|------|-------------|
| `--name` | Organization name |
| `--slug` | Organization slug |
| `--description` | Description |
| `--website` | Website URL |
