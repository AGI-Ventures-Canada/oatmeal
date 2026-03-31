import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ParticipantRole } from "@/lib/db/hackathon-types"
import { clerkClient } from "@clerk/nextjs/server"
import { sendEmail } from "@/lib/email/resend"

export type BulkEmailResult = {
  sent: number
  failed: number
}

export async function sendBulkEmail(
  hackathonId: string,
  input: {
    subject: string
    html: string
    recipientFilter?: ParticipantRole[]
  }
): Promise<BulkEmailResult> {
  const client = getSupabase() as unknown as SupabaseClient

  let query = client
    .from("hackathon_participants")
    .select("clerk_user_id, role")
    .eq("hackathon_id", hackathonId)

  if (input.recipientFilter && input.recipientFilter.length > 0) {
    query = query.in("role", input.recipientFilter)
  }

  const { data: participants, error } = await query

  if (error || !participants || participants.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const clerkUserIds = participants.map((p: { clerk_user_id: string }) => p.clerk_user_id)
  const emails: string[] = []

  try {
    const clerk = await clerkClient()
    for (let i = 0; i < clerkUserIds.length; i += 100) {
      const batch = clerkUserIds.slice(i, i + 100)
      const users = await clerk.users.getUserList({ userId: batch })
      for (const user of users.data) {
        const email = user.emailAddresses[0]?.emailAddress
        if (email) emails.push(email)
      }
    }
  } catch {
    return { sent: 0, failed: participants.length }
  }

  let sent = 0
  let failed = 0

  for (const email of emails) {
    const result = await sendEmail({
      to: email,
      subject: input.subject,
      html: input.html,
    })
    if (result) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}
