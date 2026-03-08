# Presenting & Networking Reference

Deep-dive on demo presentations, what judges evaluate, and maximizing networking value at hackathons.

## Demo Presentation Masterclass

### The 3-Minute Demo Framework

Every winning demo follows this arc:

```
Hook → Problem → Solution → Live Demo → Impact → Close
```

#### 1. The Hook (10 seconds)

Open with something that grabs attention:

- **A statistic:** "40% of food in the US is wasted — that's $218 billion per year."
- **A question:** "When was the last time you spent 30 minutes searching for the right API documentation?"
- **A scenario:** "Imagine you're a first-generation college student trying to find scholarships..."

Don't open with "Hi, we're Team Alpha and we built..." — that's a forgettable opening.

#### 2. The Problem (20 seconds)

Make the pain real. Use specific examples, not abstract statements.

- **Bad:** "Communication is hard for remote teams."
- **Good:** "Remote teams waste 2 hours per day switching between Slack, email, Jira, and Notion to find one piece of information."

#### 3. The Solution (15 seconds)

One sentence. What does your product do?

"We built [Name], a unified inbox that pulls messages from all your work tools into a single, searchable timeline."

Don't list features yet — show them.

#### 4. The Live Demo (90 seconds)

This is the core. Show, don't tell.

**Structure your demo as a user story:**
1. Show the starting state (the problem in action)
2. Show the user taking action (using your product)
3. Show the result (the problem solved)

**Demo tips:**
- Use realistic data (not "test123" and "lorem ipsum")
- Click slowly and deliberately — judges need to follow along
- Narrate what you're doing: "Now I'll upload a photo of my receipt, and watch what happens..."
- Zoom in on key UI elements
- If something loads slowly, talk while it loads — never let there be dead silence

#### 5. Technical Highlights (20 seconds)

Briefly mention 2-3 impressive technical details:
- "Under the hood, we're using Claude's vision API to extract line items from receipt photos"
- "We built a real-time sync engine using WebSockets that handles concurrent edits"
- "The recommendation model runs inference in under 200ms using edge functions"

Don't show code. Don't show architecture diagrams (unless you're a dev-tools hackathon).

#### 6. The Close (15 seconds)

End with impact and a forward look:
- "In 24 hours, we built a tool that could save remote workers 10+ hours per week"
- "Our next step is adding calendar integration and opening a beta"

### Presentation Anti-Patterns

| Don't Do This | Do This Instead |
|--------------|-----------------|
| Start with your names and school | Start with the problem hook |
| Show a slide deck for 2 of 3 minutes | Show the live product for 2 of 3 minutes |
| List every feature you built | Show the one killer feature in depth |
| Read from a script word-for-word | Know your key points, speak naturally |
| Show your code editor | Show the user-facing product |
| Apologize for bugs | Skip broken features, show what works |
| Pass the mic between 3+ people | One speaker, others answer Q&A |
| End with "that's it, any questions?" | End with impact statement |

### Handling Q&A

- **If asked "how does X work technically?"** — give a concise answer naming the specific technologies. "We use Supabase real-time subscriptions to sync state across clients, with a CRDT-based conflict resolution layer."
- **If asked "what would you do with more time?"** — have 2-3 features ready. Show you've thought beyond the MVP.
- **If asked "who is this for?"** — be specific. "Freelance designers who manage 5+ clients" beats "everyone."
- **If asked something you don't know** — "That's a great question, we haven't explored that yet but it's something we'd investigate." Honesty > bluffing.

## What Judges Really Think

### The Unspoken Judging Criteria

Beyond the official rubric, judges are influenced by:

1. **First impression bias** — the first 15 seconds shape the rest. Nail your hook.
2. **Working demo > everything** — a judge who sees a working product will always score higher than one who sees slides
3. **Story coherence** — problem → solution → demo should feel like one continuous narrative
4. **Team chemistry** — teams that seem like they had fun together get a boost
5. **Technical ambition** — judges respect teams that tried something hard, even if it's not perfect
6. **Polish signals effort** — consistent colors, clean UI, and good typography signal that you cared

### How Judges Compare Projects

In expo-style judging, judges see 20-30 projects in 2 hours. They remember:

- The projects that had a clear "wow" moment
- The projects that solved a problem they personally relate to
- The projects that worked flawlessly during the demo
- The projects where the team was enthusiastic and articulate

They forget:
- Projects with generic names ("HackHelper", "SmartApp")
- Projects where the team couldn't clearly explain what it does
- Projects that were "almost working"

### The Sponsor Prize Hack

Sponsor prizes are often easier to win than overall prizes because:
- Fewer teams compete for them
- Judges are sponsor engineers who appreciate deep integration
- The bar is "best use of our API," not "best project overall"

**To win a sponsor prize:**
1. Use the API in a non-trivial way (not just a single API call)
2. Mention the sponsor by name in your demo
3. Show the API response/integration working live
4. Talk to the sponsor engineers during the hackathon — they'll remember you

## Networking Strategy

### Who to Talk To (and Why)

| Person | What They Offer | How to Approach |
|--------|----------------|-----------------|
| **Sponsor engineers** | Job opportunities, API help, industry insight | Ask about their tech stack and what problems they're solving |
| **Judges** | Feedback, connections, mentorship | After judging, ask "What would you have done differently with our project?" |
| **Other hackers** | Future teammates, collaborators, friends | Help them with a bug. Share a tool. Compliment their project |
| **Organizers** | Future event invites, community access | Thank them. Ask how you can help at the next event |
| **Mentors** | Technical guidance, career advice | Come with a specific question, not "can you help us?" |

### The 30-Second Introduction

Have this ready:

"Hi, I'm [Name]. I'm a [role] working on [current thing]. At this hackathon, my team built [project name] — it [one sentence of what it does]. What are you working on?"

Short, specific, and ends with a question that invites conversation.

### Following Up (The Part Most People Skip)

Within 48 hours of the hackathon:

1. **Connect on LinkedIn** with a personalized note: "Great meeting you at [Hackathon]. I was on the team that built [Project]. Would love to stay in touch."
2. **Email sponsor contacts** who gave you their card: "Thanks for the help with [specific thing]. Our team ended up [result]. I'd love to learn more about [their company/role]."
3. **Share your project on social media** and tag people you met
4. **Follow up on any promises made** — "I'll send you that resource" or "Let's grab coffee" — do it within the week

### Building Your Hackathon Reputation

The hackathon community is small. People who consistently show up, help others, and build impressive projects get:
- Invited to exclusive/invite-only hackathons
- Recruited by sponsors
- Asked to mentor or judge future events
- Connections that lead to cofounders, jobs, and collaborations

The fastest way to build reputation: **help other teams.** If you solve someone's bug, they'll remember you longer than the team that won first place.
