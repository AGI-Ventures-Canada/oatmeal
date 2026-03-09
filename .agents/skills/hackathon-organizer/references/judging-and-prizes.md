# Judging & Prizes Reference

Detailed guide for setting up fair, efficient judging and compelling prize structures.

## Judging Formats

### Expo-Style (Recommended for 15+ teams)

Judges walk around to each team's table/station. Each team gives a 3-5 minute demo + Q&A.

**Pros:** Fast, scales well, judges see projects in context
**Cons:** Noisy environment, judges may miss teams

**Setup:**
- Assign each team a table number
- Give judges a routing sheet so every team gets seen by at least 2-3 judges
- Use a scoring app or paper rubric at each stop
- Total time: ~2-3 hours for 30 teams with 5 judges

### Stage Presentations (Best for <15 teams)

Teams present on stage to all judges and audience.

**Pros:** Everyone sees every project, dramatic reveal
**Cons:** Time-consuming (3-5 min per team + transitions), later teams have advantage

**Setup:**
- Strict time limits with a visible timer
- 3 minutes to present, 2 minutes for Q&A
- No more than 15 teams (75+ minutes otherwise)
- Practice transitions — have next team set up while current team presents

### Hybrid (Best of both)

Round 1: Expo-style for all teams → judges select top 5-8 finalists
Round 2: Stage presentations for finalists only

**This is the gold standard for larger hackathons.** Everyone gets seen, but only the best present on stage.

## Designing Judging Criteria

### The 4 Universal Criteria

| Criterion | Weight | What Judges Evaluate |
|-----------|--------|---------------------|
| **Innovation** | 25% | Is the idea novel? Does it solve a real problem in a new way? |
| **Technical Execution** | 25% | Does it work? How complex is the implementation? Code quality? |
| **Design & UX** | 25% | Is it usable? Is the interface intuitive? Does it look polished? |
| **Impact & Viability** | 25% | Could this be useful to real people? Is it feasible beyond the hackathon? |

### Scoring Scale

**Use 1-10 scales, not 1-5.** More granularity = fewer ties = less debate.

| Score | Meaning |
|-------|---------|
| 9-10 | Exceptional — would invest in this |
| 7-8 | Strong — clear effort and quality |
| 5-6 | Average — meets basic expectations |
| 3-4 | Below average — significant gaps |
| 1-2 | Minimal effort or non-functional |

### Anti-Patterns in Criteria

- **"Most Creative"** — too subjective. Replace with "Innovation: novel approach to a real problem"
- **"Best Overall"** — meaningless without subcriteria. Break it into the 4 criteria above
- **"Coolest Hack"** — fun but ungradeable. Reserve for audience choice awards
- **Weighting everything equally when it shouldn't be** — if it's a data science hackathon, weight technical execution higher

## Recruiting Judges

### Ideal Judge Profile

- Mix of technical and non-technical (engineers, designers, PMs, VCs, domain experts)
- Has built or shipped products (understands what "working demo" means)
- Can evaluate without bias toward specific technologies
- Available for the full judging window (no early departures)

### How Many Judges

| Teams | Judges Needed | Why |
|-------|--------------|-----|
| <10 | 3-5 | All judges see all projects |
| 10-25 | 5-7 | Each project seen by 3+ judges |
| 25-50 | 7-10 | Expo-style, staggered routing |
| 50+ | 10-15 | Multiple judging tracks or rounds |

**Rule of thumb:** Every project should be evaluated by at least 3 judges to reduce individual bias.

### Judge Briefing (Do This!)

Before judging starts, brief all judges for 10 minutes:

1. Explain the criteria and scoring scale
2. Remind them these are hackathon projects (24-48h of work) — calibrate expectations
3. Ask them to evaluate the project, not the pitch. A nervous presenter with a great project beats a smooth talker with nothing working
4. Score independently first, then discuss. Group scoring leads to anchoring bias
5. Disclose conflicts of interest (judge works at a team member's company, etc.)

## Prize Strategy

### Prize Tiers

| Prize | Amount | Purpose |
|-------|--------|---------|
| Grand Prize | $3k-10k | Best overall project |
| Runner Up | $1k-5k | Second place |
| Third Place | $500-2k | Third place |
| Category Prizes | $500-2k each | Best in specific tracks (Best AI, Best Social Impact, etc.) |
| Sponsor Prizes | Varies | Best use of [Sponsor API/Product] |
| Fun Prizes | $50-200 | Best Team Name, Most Ambitious Failure, Audience Choice |

### Non-Cash Prizes That Work

- **Cloud credits** — AWS, GCP, Azure ($1k-10k credits)
- **Developer tools subscriptions** — GitHub, JetBrains, Figma
- **Hardware** — mechanical keyboards, monitors, drones, Raspberry Pi kits
- **Experiences** — conference tickets, office visits, dinner with a VC/CTO
- **Incubator/accelerator fast-track** — intro to YC, Techstars, etc.
- **Job interviews** — guaranteed interview at a sponsor company

### Prizes to Avoid

- **Gift cards under $25** — feels cheap for a weekend of effort
- **Company-branded swag as a "prize"** — that's a participation gift, not a prize
- **Prizes with strings attached** — "you win but we own your IP" kills trust
- **Equity in the sponsor's company** — just no

### Sponsor Prize Tracks

Sponsor challenge prizes drive real API adoption:

- "Best Use of [Company] API" — $2k prize + $5k cloud credits
- Requirements: must use the sponsor's API/product in a meaningful way
- Judges: 1-2 people from the sponsor company + 1 neutral judge
- **Critical:** provide good documentation, API keys, and a support channel during the hackathon

## Handling Edge Cases

### Ties

1. Judges re-evaluate just the tied projects
2. If still tied, use a tiebreaker criterion (e.g., "which project is more likely to be used in the real world?")
3. Last resort: split the prize

### Disqualifications

Valid reasons:
- Pre-built project (not built during the hackathon)
- Plagiarism or using someone else's project
- Code of conduct violation
- No working demo at judging time

Invalid reasons:
- Using boilerplate/starter templates (this is fine and encouraged)
- Using AI coding tools (this is 2026, everyone uses them)
- Team member left early

### Judge No-Shows

Always have 1-2 backup judges confirmed. If a judge doesn't show, redistribute their assignments. Never let a single judge's absence delay judging.

## Timing the Judging Window

```
Submissions close:     10:00 AM
Buffer (troubleshoot): 10:00 - 10:30
Judging begins:        10:30
Expo round:            10:30 - 12:30 (2 hours for 25 teams)
Lunch:                 12:30 - 13:00
Judge deliberation:    13:00 - 13:30
Finals (if hybrid):    13:30 - 14:15
Closing ceremony:      14:15 - 15:00
```

**Never rush judging.** If you're behind schedule, cut the closing ceremony short, not the judging.
