import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runWebhooksDelete(
  client: OatmealClient,
  webhookId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!webhookId) {
    console.error("Usage: oatmeal webhooks delete <webhook-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete webhook ${webhookId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/v1/webhooks/${webhookId}`)
  console.log(formatSuccess(`Deleted webhook ${webhookId}`))
}
