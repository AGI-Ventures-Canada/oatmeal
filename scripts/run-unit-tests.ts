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
  {
    name: "workflows",
    args: ["__tests__/workflows"],
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
