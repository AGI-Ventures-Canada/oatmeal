import { cache } from "react"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "./public-hackathons"

export type ManageHackathonResult = {
  hackathon: NonNullable<Awaited<ReturnType<typeof getPublicHackathon>>>
  isOrganizer: true
}

export const getManageHackathon = cache(
  async (slug: string): Promise<ManageHackathonResult | null> => {
    const { userId, orgId } = await auth()

    if (!userId) {
      return null
    }

    const hackathon = await getPublicHackathon(slug, { includeUnpublished: true })

    if (!hackathon) {
      return null
    }

    const isOrganizer = orgId !== null && hackathon.organizer.clerk_org_id === orgId

    if (!isOrganizer) {
      return null
    }

    return { hackathon, isOrganizer: true }
  }
)
