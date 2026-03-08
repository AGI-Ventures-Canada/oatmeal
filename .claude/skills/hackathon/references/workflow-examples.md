# Oatmeal — Workflow Examples

Natural language commands mapped to API call sequences. Use these as patterns when interpreting user requests.

## Natural Language → API Mapping

| User Says | API Calls |
|-----------|-----------|
| "Make me a hackathon on Sunday from 7am to 9pm" | `POST /dashboard/hackathons` with computed dates |
| "Add judge@example.com as a judge" | `GET /dashboard/hackathons` → find active → `POST .../judging/judges` |
| "Set up 3 judging criteria: innovation, execution, design" | 3x `POST .../judging/criteria` |
| "Create prizes: 1st place $5k, 2nd place $2k, 3rd place $1k" | 3x `POST .../prizes` |
| "Auto-assign judges to submissions" | `POST .../judging/auto-assign` |
| "Calculate results and publish them" | `POST .../results/calculate` → `POST .../results/publish` |
| "Change my hackathon name to AI Summit" | `GET /dashboard/hackathons` → `PATCH .../settings` |
| "Open registration" | `PATCH .../settings` with `{"status": "registration_open"}` |
| "Add TechCorp as a gold sponsor" | `POST .../sponsors` with `{"name":"TechCorp","tier":"gold"}` |
| "What hackathons do I have?" | `GET /dashboard/hackathons` |
| "Show me the results" | `GET .../results` |
| "Close judging and publish" | `POST .../results/calculate` → `POST .../results/publish` |

## End-to-End: Set Up a Full Hackathon

When a user says something like "Set up a hackathon called AI Builders this Saturday 9am-6pm with 3 prizes and innovation/execution/design criteria":

### Step 1: Create the Hackathon

```bash
# Compute dates from "this Saturday 9am-6pm" relative to today
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons" \
  -d '{
    "name": "AI Builders",
    "slug": "ai-builders",
    "description": "AI Builders Hackathon",
    "startsAt": "2026-03-14T09:00:00-05:00",
    "endsAt": "2026-03-14T18:00:00-05:00",
    "registrationOpensAt": "2026-03-08T00:00:00-05:00",
    "registrationClosesAt": "2026-03-14T08:00:00-05:00"
  }' | jq .
```

Save the returned `id` as `$HACKATHON_ID`.

### Step 2: Add Judging Criteria

```bash
for criteria in \
  '{"name":"Innovation","description":"How novel and creative is the solution?","maxScore":10,"weight":1.0,"displayOrder":1}' \
  '{"name":"Execution","description":"How well is the solution built and polished?","maxScore":10,"weight":1.0,"displayOrder":2}' \
  '{"name":"Design","description":"How good is the user experience and visual design?","maxScore":10,"weight":1.0,"displayOrder":3}'; do
  curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
    -H "Content-Type: application/json" \
    "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/judging/criteria" \
    -d "$criteria" | jq .
done
```

### Step 3: Create Prizes

```bash
for prize in \
  '{"name":"First Place","description":"Grand prize","value":"$5,000","displayOrder":1}' \
  '{"name":"Second Place","description":"Runner up","value":"$2,500","displayOrder":2}' \
  '{"name":"Third Place","description":"Third place","value":"$1,000","displayOrder":3}'; do
  curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
    -H "Content-Type: application/json" \
    "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/prizes" \
    -d "$prize" | jq .
done
```

### Step 4: Publish

```bash
curl -s -X PATCH -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/settings" \
  -d '{"status": "published"}' | jq .
```

## End-to-End: Add Judges and Run Judging

When a user says "Add these judges and set up judging: alice@co.com, bob@co.com, charlie@co.com":

### Step 1: Find the Hackathon

```bash
# List hackathons and identify the target
HACKATHON_ID=$(curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons" | jq -r '.hackathons[0].id')
```

### Step 2: Add Judges

```bash
for email in alice@co.com bob@co.com charlie@co.com; do
  curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
    -H "Content-Type: application/json" \
    "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/judging/judges" \
    -d "{\"email\": \"$email\"}" | jq .
done
```

### Step 3: Auto-Assign Submissions to Judges

```bash
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/judging/auto-assign" \
  -d '{"submissionsPerJudge": 5}' | jq .
```

### Step 4: Check Progress

```bash
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/judging/assignments" | jq .
```

## End-to-End: Calculate and Publish Results

When a user says "close judging and announce winners":

```bash
# Calculate rankings from submitted scores
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/results/calculate" | jq .

# Review results before publishing
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/results" | jq .

# Assign prizes to top submissions (get submission IDs from results)
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/prizes/$FIRST_PRIZE_ID/assign" \
  -d '{"submissionId": "winner-submission-id"}' | jq .

# Publish results (makes public, transitions hackathon to completed)
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/results/publish" | jq .
```

## End-to-End: Import from Luma

When a user says "import my Luma event":

```bash
# Extract event data from Luma
LUMA_DATA=$(curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/public/import/luma" \
  -d '{"slug": "luma-event-slug"}' | jq .)

# Create hackathon from Luma data
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/import/luma" \
  -d "$LUMA_DATA" | jq .
```

## End-to-End: Add Sponsors

When a user says "add sponsors: TechCorp (gold), StartupFund (silver), DevTools (bronze)":

```bash
for sponsor in \
  '{"name":"TechCorp","tier":"gold","websiteUrl":"https://techcorp.com"}' \
  '{"name":"StartupFund","tier":"silver","websiteUrl":"https://startupfund.com"}' \
  '{"name":"DevTools","tier":"bronze","websiteUrl":"https://devtools.com"}'; do
  curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
    -H "Content-Type: application/json" \
    "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/sponsors" \
    -d "$sponsor" | jq .
done
```

## End-to-End: Set Up Webhooks

When a user says "notify me when someone submits":

```bash
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/webhooks" \
  -d '{
    "url": "https://your-webhook-endpoint.com/hook",
    "events": ["submission.submitted", "participant.registered"]
  }' | jq .
```

Save the returned `secret` — it's shown only once and used to verify webhook signatures.

## Hackathon Lifecycle Status Transitions

```
draft → published → registration_open → active → judging → completed → archived
```

Each status change is done via:

```bash
curl -s -X PATCH -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/$HACKATHON_ID/settings" \
  -d '{"status": "TARGET_STATUS"}' | jq .
```

Typical flow:
1. **draft** — initial creation, configure settings
2. **published** — visible to public but registration not open
3. **registration_open** — participants can register
4. **active** — hackathon is running, teams building
5. **judging** — submissions closed, judges scoring
6. **completed** — results published
7. **archived** — historical record

## Date Handling Cheat Sheet

When converting natural language dates:

| User Says | Interpretation |
|-----------|---------------|
| "this Sunday" | Next upcoming Sunday from today |
| "next Friday" | Friday of next week |
| "tomorrow at 9am" | Tomorrow 09:00 in user's timezone |
| "March 15th" | 2026-03-15 (current year unless past) |
| "7am to 9pm" | startsAt=07:00, endsAt=21:00 |
| "all day" | startsAt=00:00, endsAt=23:59 |
| "weekend hackathon" | Saturday 09:00 to Sunday 18:00 |
| "48-hour hackathon" | startsAt to startsAt+48h |

Always use ISO 8601 format with timezone: `2026-03-15T09:00:00-05:00`

If the user's timezone is unknown, ask before creating the hackathon.
