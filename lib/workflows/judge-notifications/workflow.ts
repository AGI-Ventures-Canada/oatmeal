"use workflow"

export type SendJudgeNotificationsInput = {
  hackathonId: string
  hackathonName: string
  hackathonSlug: string
}

export async function sendJudgeNotificationsWorkflow(
  input: SendJudgeNotificationsInput
): Promise<{ sent: number }> {
  const { fetchPendingNotifications, sendJudgeNotification } = await import("./steps")

  const notifications = await fetchPendingNotifications(input.hackathonId)

  if (notifications.length === 0) return { sent: 0 }

  let sent = 0
  for (const notification of notifications) {
    try {
      await sendJudgeNotification({
        notification,
        hackathonName: input.hackathonName,
        hackathonSlug: input.hackathonSlug,
      })
      sent++
    } catch {
    }
  }

  return { sent }
}
