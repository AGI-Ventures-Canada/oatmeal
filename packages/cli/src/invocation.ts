const PACKAGE_NAME = "@agi-ventures-canada/hackathon-cli"

export type InvocationMode = "global" | "local-bun-script" | "bunx" | "npx"

export function detectInvocationMode(): InvocationMode {
  const npmCommand = process.env.npm_command ?? ""
  const execPath = process.env.npm_execpath ?? ""
  const lifecycleEvent = process.env.npm_lifecycle_event ?? ""
  const launcher = process.env._ ?? ""
  const argv1 = process.argv[1] ?? ""

  if (
    (npmCommand === "run-script" && /bun/.test(execPath)) ||
    /packages\/cli\/src\/cli\.ts$/.test(argv1) ||
    /packages\/cli\/dist\/cli\.mjs$/.test(argv1)
  ) {
    return "local-bun-script"
  }

  if (
    lifecycleEvent === "bunx" ||
    npmCommand === "bunx" ||
    /bunx/.test(launcher)
  ) {
    return "bunx"
  }

  if (npmCommand === "exec" || /npm/.test(execPath)) {
    return "npx"
  }

  return "global"
}

export function formatUpdateHint(): string {
  switch (detectInvocationMode()) {
    case "local-bun-script":
      return `Update this repo to get the new CLI version, or install the published CLI with \`bun install -g ${PACKAGE_NAME}@latest\`.`
    case "bunx":
      return `Run \`bunx ${PACKAGE_NAME} update\` to update.`
    case "npx":
      return `Run \`npx ${PACKAGE_NAME} update\` to update.`
    default:
      return "Run `hackathon update` to update."
  }
}
