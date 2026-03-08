# CLI Package

## Commands
```bash
bun cli <args>           # Run CLI from repo root (dev mode, TypeScript)
bun cli:test             # Run CLI tests
bun cli:build            # Build for npm distribution
cd packages/cli && bun test --coverage  # Coverage report
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

## Testing Against Local
```bash
bun dev                                        # Terminal 1
bun cli login --base-url http://localhost:3000  # Terminal 2
bun cli hackathons list
```

## Environment Targets
- Local: `--base-url http://localhost:3000`
- Staging: `--base-url https://staging.oatmeal.app`
- Production: default (`https://oatmeal.app`)
