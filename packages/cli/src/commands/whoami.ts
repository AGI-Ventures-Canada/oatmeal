import type { OatmealClient } from "../client.js"
import { formatDetail, formatJson } from "../output.js"
import type { WhoAmIResponse } from "../types.js"

export async function runWhoAmI(
  client: OatmealClient,
  options: { json?: boolean }
): Promise<void> {
  const whoami = await client.get<WhoAmIResponse>("/api/v1/whoami")

  if (options.json) {
    console.log(formatJson(whoami))
    return
  }

  console.log(
    formatDetail([
      { label: "Tenant", value: whoami.tenantId },
      { label: "Key ID", value: whoami.keyId },
      { label: "Key Name", value: whoami.keyName },
      { label: "Scopes", value: whoami.scopes.join(", ") },
    ])
  )
}
