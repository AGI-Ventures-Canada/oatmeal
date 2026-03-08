# Oatmeal CLI — Workflow Examples

Natural language commands mapped to CLI command sequences.

## Natural Language → CLI Command Mapping

| User Says | CLI Commands |
|-----------|-------------|
| "Make me a hackathon on Sunday from 7am to 9pm" | `oatmeal hackathons create --name "..." --starts ... --ends ...` |
| "Add judge@example.com as a judge" | `oatmeal hackathons list` → `oatmeal judges add --hackathon <id> --email judge@example.com` |
| "Set up 3 judging criteria" | 3x `oatmeal criteria add --hackathon <id> ...` |
| "Create prizes: 1st $5k, 2nd $2.5k, 3rd $1k" | 3x `oatmeal prizes create --hackathon <id> ...` |
| "Auto-assign judges" | `oatmeal judging auto-assign --hackathon <id> --per-judge 5` |
| "Calculate results and publish" | `oatmeal results calculate --hackathon <id>` → `oatmeal results publish --hackathon <id>` |
| "Change hackathon name to AI Summit" | `oatmeal hackathons update <id> --name "AI Summit"` |
| "Open registration" | `oatmeal hackathons update <id> --status registration_open` |
| "Add TechCorp as gold sponsor" | `oatmeal sponsors add --hackathon <id> --name "TechCorp" --tier gold` |
| "What hackathons do I have?" | `oatmeal hackathons list` |
| "Show me the results" | `oatmeal results get --hackathon <id>` |

## End-to-End: Set Up a Full Hackathon

When a user says "Set up a hackathon called AI Builders this Saturday 9am-6pm with 3 prizes and innovation/execution/design criteria":

### Step 1: Create the Hackathon

```bash
oatmeal hackathons create \
  --name "AI Builders" \
  --slug "ai-builders" \
  --description "AI Builders Hackathon" \
  --starts "2026-03-14T09:00:00-05:00" \
  --ends "2026-03-14T18:00:00-05:00" \
  --registration-opens "2026-03-08T00:00:00-05:00" \
  --registration-closes "2026-03-14T08:00:00-05:00"
```

Save the returned ID.

### Step 2: Add Judging Criteria

```bash
oatmeal criteria add --hackathon <id> \
  --name "Innovation" \
  --description "How novel and creative is the solution?" \
  --max-score 10 --weight 1.0 --order 1

oatmeal criteria add --hackathon <id> \
  --name "Execution" \
  --description "How well is the solution built and polished?" \
  --max-score 10 --weight 1.0 --order 2

oatmeal criteria add --hackathon <id> \
  --name "Design" \
  --description "How good is the UX and visual design?" \
  --max-score 10 --weight 1.0 --order 3
```

### Step 3: Create Prizes

```bash
oatmeal prizes create --hackathon <id> \
  --name "First Place" --value "\$5,000" --order 1

oatmeal prizes create --hackathon <id> \
  --name "Second Place" --value "\$2,500" --order 2

oatmeal prizes create --hackathon <id> \
  --name "Third Place" --value "\$1,000" --order 3
```

### Step 4: Publish

```bash
oatmeal hackathons update <id> --status published
```

## End-to-End: Add Judges and Run Judging

When a user says "Add these judges: alice@co.com, bob@co.com, charlie@co.com":

### Step 1: Find the Hackathon

```bash
oatmeal hackathons list
```

### Step 2: Add Judges

```bash
oatmeal judges add --hackathon <id> --email alice@co.com
oatmeal judges add --hackathon <id> --email bob@co.com
oatmeal judges add --hackathon <id> --email charlie@co.com
```

### Step 3: Auto-Assign

```bash
oatmeal judging auto-assign --hackathon <id> --per-judge 5
```

### Step 4: Check Progress

```bash
oatmeal judging assignments --hackathon <id>
```

## End-to-End: Calculate and Publish Results

When a user says "close judging and announce winners":

```bash
# Calculate rankings
oatmeal results calculate --hackathon <id>

# Review before publishing
oatmeal results get --hackathon <id>

# Assign prizes to top submissions
oatmeal prizes assign --hackathon <id> \
  --prize <first-prize-id> --submission <winner-id>

# Publish (makes public, transitions to completed)
oatmeal results publish --hackathon <id>
```

## End-to-End: Add Sponsors

When a user says "add sponsors: TechCorp (gold), StartupFund (silver), DevTools (bronze)":

```bash
oatmeal sponsors add --hackathon <id> \
  --name "TechCorp" --tier gold --website "https://techcorp.com"

oatmeal sponsors add --hackathon <id> \
  --name "StartupFund" --tier silver --website "https://startupfund.com"

oatmeal sponsors add --hackathon <id> \
  --name "DevTools" --tier bronze --website "https://devtools.com"
```

## End-to-End: Set Up Webhooks

When a user says "notify me when someone submits":

```bash
oatmeal webhooks create \
  --url "https://your-endpoint.com/hook" \
  --events "submission.submitted,participant.registered"
```

Save the returned secret — it's shown only once.

## Hackathon Lifecycle

```
draft → published → registration_open → active → judging → completed → archived
```

Each transition:

```bash
oatmeal hackathons update <id> --status <target-status>
```

## Date Handling

When converting natural language dates:

| User Says | Interpretation |
|-----------|---------------|
| "this Sunday" | Next upcoming Sunday from today |
| "next Friday" | Friday of next week |
| "tomorrow at 9am" | Tomorrow 09:00 in user's timezone |
| "7am to 9pm" | `--starts` 07:00, `--ends` 21:00 |
| "all day" | `--starts` 00:00, `--ends` 23:59 |
| "weekend hackathon" | Saturday 09:00 to Sunday 18:00 |

Always use ISO 8601 with timezone: `2026-03-15T09:00:00-05:00`

If the user's timezone is unknown, ask before creating.
