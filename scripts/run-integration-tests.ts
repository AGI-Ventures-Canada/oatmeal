const glob = new Bun.Glob("__tests__/integration/*.integration.test.ts")
const files = [...glob.scanSync(".")].sort()

for (const file of files) {
  console.log(`\n--- Running: ${file} ---`)
  const proc = Bun.spawn(["bun", "test", file], {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: import.meta.dir + "/..",
  })
  const code = await proc.exited
  if (code !== 0) {
    console.error(`\nFailed: ${file}`)
    process.exit(code)
  }
}
