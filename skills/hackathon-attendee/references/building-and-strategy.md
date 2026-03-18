# Building & Strategy Reference

Deep-dive on technical strategy, project selection, and time management during hackathons.

## Choosing Your Project

### The Sweet Spot

The best hackathon projects sit at the intersection of:

1. **Feasible** — you can build an MVP in the time available
2. **Impressive** — it has a "wow" factor that makes judges remember it
3. **Relevant** — it addresses the hackathon theme or a sponsor challenge

### Idea Evaluation Checklist

Before committing to an idea, score it 1-5 on each:

| Factor | Score 1-5 | Questions |
|--------|-----------|-----------|
| Feasibility | _ | Can your team build an MVP in the time? Do you have the skills? |
| Demo-ability | _ | Can you show it working live in 3 minutes? Is the value obvious visually? |
| Novelty | _ | Has this been done at every hackathon? Is there a fresh twist? |
| Impact | _ | Does it solve a real problem? Who would use this? |
| Tech depth | _ | Is it technically interesting beyond CRUD? Any AI/ML/real-time/hardware? |

**Score 20+:** Strong project. Go build it.
**Score 15-19:** Decent, but look for ways to boost demo-ability or novelty.
**Score <15:** Keep brainstorming.

### Project Categories That Win

1. **Developer tools** — tools that solve a pain point other developers have. Judges (who are developers) immediately relate
2. **AI/ML applications** — real AI integration (not just a ChatGPT wrapper) scores high on technical depth
3. **Social impact** — projects that help underserved communities, improve accessibility, or solve environmental problems
4. **Creative hardware hacks** — if hardware is available, combining physical and digital is memorable
5. **Real-time collaborative tools** — multiplayer/collaborative features are technically impressive and demo well

### Projects to Avoid

- **Another todo/note app** — judges have seen thousands
- **Pure landing pages** — no matter how pretty, there's no product
- **Overly ambitious projects** — if you need 6 microservices, you won't finish
- **Projects that require real users to demo** — build it so you can demo solo

## MVP Strategy

### The "One Feature" Rule

Your MVP should do exactly one thing really well. Not three things okay.

**Example:** Building a meal planning app?
- **Bad MVP:** User auth + recipe search + meal planning + grocery list + nutrition tracking
- **Good MVP:** Takes a photo of your fridge → suggests 3 meals you can make. That's the whole demo.

### The Demo-Driven Development Approach

1. **Write your demo script first** — what will you show in 3 minutes?
2. **List every screen/feature in the script** — this is your build list
3. **Build those screens in demo order** — if your demo shows the upload flow first, build that first
4. **Hard-code everything that isn't in the demo** — if the demo doesn't show the settings page, it doesn't exist

### Faking It (Legitimately)

These are all acceptable and common at hackathons:

- **Seeded database** — pre-populate with realistic data
- **Hardcoded user** — skip auth entirely, use a mock user object
- **Canned API responses** — if an external API is slow or flaky, cache a response and use it as fallback
- **Pre-trained model** — bring a model trained before the hackathon. Fine-tuning or training during the event is unrealistic
- **Wizard of Oz features** — if a feature is too complex to build, simulate the output manually behind the scenes
- **Static graphs/charts** — if the data pipeline isn't ready, use a static chart with realistic data

## Tech Stack Recommendations

### For Speed (24h hackathons)

| Layer | Recommendation | Why |
|-------|---------------|-----|
| Frontend | Next.js or React + Vite | Fast setup, huge ecosystem |
| Backend | Next.js API routes or Express | Minimal boilerplate |
| Database | Supabase or Firebase | Instant setup, real-time, auth included |
| AI | Anthropic Claude / OpenAI API | High-quality, fast inference |
| Deployment | Vercel or Railway | Push to deploy, free tier |
| UI | shadcn/ui or Tailwind | Beautiful defaults, no CSS debugging |

### For Mobile

| Option | When to Use |
|--------|-------------|
| React Native + Expo | Need actual mobile features (camera, GPS) |
| PWA (responsive web) | Demo on a phone but build as web — faster to develop |
| Flutter | If your team knows Dart |

**Pro tip:** Unless the hackathon requires a native mobile app, build a responsive web app and demo it on a phone. It's 3x faster to develop.

### For AI/ML Projects

- **Don't train a model from scratch** — use pre-trained models or fine-tuned versions
- **Use hosted APIs** — Claude, GPT-4, Whisper, DALL-E, Replicate
- **Vector databases** — Pinecone, Supabase pgvector, or ChromaDB for RAG applications
- **Prompt engineering > model training** — for a hackathon, well-crafted prompts beat custom models

## Common Technical Pitfalls

### Environment Issues

- **"Works on my machine"** — deploy to a shared URL early so everyone tests against the same environment
- **Version conflicts** — agree on Node/Python version and use `.nvmrc` or `pyproject.toml`
- **Missing env vars** — use a shared `.env.example` and communicate when new vars are added

### Integration Issues

- **API rate limits** — sponsor APIs may have hackathon-specific keys with higher limits. Ask at the sponsor booth
- **CORS errors** — if calling external APIs from the browser, proxy through your backend
- **Webhook tunnels** — use ngrok or Cloudflare Tunnels for local webhook testing

### Deployment Issues

- **Build failures at hour 20** — deploy early, deploy often. Don't leave deployment for the last hour
- **Database migrations** — use hosted databases that don't need migrations (Supabase, Firebase)
- **Secret management** — use environment variables on your hosting platform, not hardcoded values in code (even at a hackathon, exposed API keys get revoked)

## Time Recovery Strategies

When you're behind schedule:

### At the Halfway Point (No Working Demo)

1. **Cut scope aggressively** — keep only the one core feature
2. **Hardcode everything** — mock data, skip auth, fake API responses
3. **Focus on the happy path** — no error handling, no edge cases
4. **Ship to production** — even if it's half-baked, a deployed broken app is better than a local perfect app

### At 75% Time (Demo Still Broken)

1. **Pivot to a simpler version** — can you simplify the core feature to something that works?
2. **Record a demo video NOW** — show what you have working, even if it's partial
3. **Prepare a strong presentation** — if the tech is shaky, the story needs to be bulletproof
4. **Split the team** — one person fixes the demo, one person prepares the presentation

### At 90% Time (Nothing Works)

1. **Show the vision** — mockups, architecture diagrams, what you learned
2. **Talk about the journey** — technical challenges you overcame (even if the final product isn't there)
3. **Be honest** — judges respect honesty about what went wrong over fake demos
4. **Submit anyway** — you miss 100% of the shots you don't take
