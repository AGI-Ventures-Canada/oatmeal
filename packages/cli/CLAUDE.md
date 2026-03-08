# CLI Package

## Commands
```bash
bun cli <args>           # Run CLI from repo root (dev mode, TypeScript)
bun cli:test             # Run CLI tests
bun cli:build            # Build for npm distribution (must pass before pushing)
cd packages/cli && bun test --coverage  # Coverage report
```

## Local Development Flow

The CLI is a standalone HTTP client — it just talks to a URL. During development you run the TypeScript source directly (no build step needed):

```bash
# Terminal 1: Start the app + local Supabase
bun dev

# Terminal 2: Auth the CLI against local
bun cli login --base-url http://localhost:3000
# → Opens browser → sign in via Clerk → API key auto-created and saved

# Now run commands against your local instance
bun cli hackathons list
bun cli prizes create <hackathon-id> --name "Best AI App"
bun cli judging judges list <hackathon-id>
```

The `--base-url` is saved in `~/.oatmeal/config.json` after login — you only set it once. To switch back to production later, just `bun cli login` (no flag = default prod URL).

Edit any `.ts` file in `packages/cli/src/` and re-run `bun cli` — changes are picked up instantly since Bun executes TypeScript directly.

### Testing with seeded data

```bash
bun run scripts/test-scenario.ts judging   # Seeds judges + submissions
bun cli judging judges list <hackathon-id>
bun cli judging auto-assign <hackathon-id> --per-judge 3
```

## Architecture
- `src/cli.ts` — argv dispatch → command handlers
- `src/client.ts` — HTTP client (no server imports)
- `src/config.ts` — `~/.oatmeal/config.json` management
- All types are CLI-local (no imports from main app)

## Adding a Command
1. Create `src/commands/<resource>/<action>.ts`
2. Export `run<Action>(client, args)` function
3. Add dispatch case in `src/cli.ts`
4. Add tests in `__tests__/commands/<resource>.test.ts`
5. Update help text in `src/cli.ts`

## Environment Targets
- Local: `--base-url http://localhost:3000`
- Staging: `--base-url https://staging.oatmeal.app`
- Production: default (`https://oatmeal.app`)

## Build & Distribution

End users install via npm (`npx @oatmeal/cli` or `npm install -g @oatmeal/cli`). The build step (`bun cli:build`) uses `obuild` to bundle all TypeScript + dependencies into a single `dist/cli.mjs` file (~11 kB gzipped). Only Node.js builtins remain external — no Bun required at runtime.

```bash
bun cli:build                                    # Bundle → dist/cli.mjs
node packages/cli/bin/cli.mjs --version          # Verify built artifact
```
