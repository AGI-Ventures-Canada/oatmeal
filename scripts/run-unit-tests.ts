/**
 * Unit test runner — splits component tests into separate bun processes
 * to avoid mock.module pollution between test files.
 *
 * Why the split:
 * - mobile-header.test.tsx mocks @/components/install-skill-button and
 *   @/components/hackathon/create-hackathon-menu at the module level.
 *   When run in the same process, those mocks replace the real modules
 *   for InstallSkillButton's and CreateHackathonMenu's own test files.
 * - Bun's mock.module persists across files in the same process, so
 *   tests that mock overlapping modules must run in separate processes.
 *
 * Groups:
 * 1. API, lib, and service tests (no mock.module conflicts)
 * 2. Component tests (subdirectories + standalone files)
 * 3. mobile-header (isolated — mocks other component modules)
 */

const groups = [
  {
    name: "api + lib + services",
    args: ["__tests__/api", "__tests__/lib/*.test.ts", "__tests__/services"],
  },
  {
    name: "components",
    args: [
      "__tests__/components/hackathon",
      "__tests__/components/dashboard",
      "__tests__/components/ui",
      "__tests__/components/org",
      "__tests__/components/install-skill-button.test.tsx",
      "__tests__/components/homepage-hero.test.tsx",
    ],
  },
  {
    name: "mobile-header (isolated)",
    args: ["__tests__/components/mobile-header.test.tsx"],
  },
]

for (const group of groups) {
  const proc = Bun.spawn(["bun", "test", ...group.args], {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: import.meta.dir + "/..",
  })
  const code = await proc.exited
  if (code !== 0) {
    console.error(`\nFailed: ${group.name}`)
    process.exit(code)
  }
}
