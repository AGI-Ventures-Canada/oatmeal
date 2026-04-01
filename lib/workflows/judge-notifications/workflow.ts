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

  const results = await Promise.allSettled(
    notifications.map((notification) =>
      sendJudgeNotification({
        notification,
        hackathonName: input.hackathonName,
        hackathonSlug: input.hackathonSlug,
      })
    )
  )

  const sent = results.filter((r) => r.status === "fulfilled").length
  return { sent }
}
