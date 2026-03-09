# Oatmeal CLI — Workflow Examples

Natural language commands mapped to CLI command sequences.

## Natural Language → CLI Command Mapping

| User Says | CLI Commands |
|-----------|-------------|
| "Make me a hackathon" | `hackathon events create --name "..." --slug "..."` |
| "Add judge@example.com as a judge" | `hackathon events list` → `hackathon judging judges add <id> --email judge@example.com` |
| "Set up 3 judging criteria" | 3x `hackathon judging criteria create <id> --name "..." --max-score 10` |
| "Create prizes: 1st $5k, 2nd $2.5k, 3rd $1k" | 3x `hackathon prizes create <id> --name "..." --value "..."` |
| "Auto-assign judges" | `hackathon judging auto-assign <id> --per-judge 5` |
| "Calculate results and publish" | `hackathon results calculate <id>` → `hackathon results publish <id>` |
| "Change hackathon name to AI Summit" | `hackathon events update <id-or-slug> --name "AI Summit"` |
| "What hackathons do I have?" | `hackathon events list` |
| "Show me the results" | `hackathon results get <id>` |
| "Browse public hackathons" | `hackathon browse hackathons` |

## End-to-End: Set Up a Full Hackathon

When a user says "Set up a hackathon called AI Builders with 3 prizes and innovation/execution/design criteria":

### Step 1: Create the Hackathon

```bash
hackathon events create --name "AI Builders" --slug "ai-builders" --json
```

Save the returned `id` from the JSON output.

### Step 2: Add Judging Criteria

```bash
hackathon judging criteria create <id> \
  --name "Innovation" \
  --description "How novel and creative is the solution?" \
  --max-score 10 --weight 1.0

hackathon judging criteria create <id> \
  --name "Execution" \
  --description "How well is the solution built and polished?" \
  --max-score 10 --weight 1.0

hackathon judging criteria create <id> \
  --name "Design" \
  --description "How good is the UX and visual design?" \
  --max-score 10 --weight 1.0
```

### Step 3: Create Prizes

```bash
hackathon prizes create <id> --name "First Place" --value "$5,000"
hackathon prizes create <id> --name "Second Place" --value "$2,500"
hackathon prizes create <id> --name "Third Place" --value "$1,000"
```

### Step 4: Verify Setup

```bash
hackathon events get <id>
hackathon judging criteria list <id>
hackathon prizes list <id>
```

## End-to-End: Add Judges and Run Judging

When a user says "Add these judges: alice@co.com, bob@co.com, charlie@co.com":

### Step 1: Find the Hackathon

```bash
hackathon events list
```

### Step 2: Add Judges

```bash
hackathon judging judges add <id> --email alice@co.com
hackathon judging judges add <id> --email bob@co.com
hackathon judging judges add <id> --email charlie@co.com
```

### Step 3: Auto-Assign

```bash
hackathon judging auto-assign <id> --per-judge 5
```

### Step 4: Check Progress

```bash
hackathon judging assignments list <id>
```

## End-to-End: Calculate and Publish Results

When a user says "close judging and announce winners":

```bash
# Calculate rankings
hackathon results calculate <id>

# Review before publishing
hackathon results get <id>

# Assign prizes to top submissions
hackathon prizes assign <id> <first-prize-id> --submission <winner-id>

# Publish (makes public, transitions to completed)
hackathon results publish <id>
```

## End-to-End: Set Up Webhooks

When a user says "notify me when someone submits":

```bash
hackathon webhooks create \
  --url "https://your-endpoint.com/hook" \
  --events "submission.submitted,participant.registered"
```

## Hackathon Lifecycle

The typical lifecycle managed through the dashboard:

```
draft → published → registration_open → active → judging → completed → archived
```

## Using JSON Output for Scripting

Use `--json` to capture IDs programmatically:

```bash
# Create and capture ID
HACKATHON_ID=$(hackathon events create --name "Test" --slug "test" --json | jq -r '.id')

# Use in subsequent commands
hackathon judging criteria create $HACKATHON_ID --name "Innovation" --max-score 10
hackathon prizes create $HACKATHON_ID --name "First Place" --value "$1,000"
```

## Local Development

When working on the Oatmeal codebase, use `bun cli` instead of `oatmeal`:

```bash
# Start local server
bun dev

# Auth against local instance
bun cli login --base-url http://localhost:3000

# Run commands
bun cli events list
bun cli prizes create <hackathon-id> --name "Best AI App"
bun cli judging judges list <hackathon-id>
```

Seed test data for different scenarios:

```bash
bun run scripts/test-scenario.ts judging   # Seeds judges + submissions
bun cli judging judges list <hackathon-id>
bun cli judging auto-assign <hackathon-id> --per-judge 3
```
