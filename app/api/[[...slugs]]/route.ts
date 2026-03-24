import { api } from "@/lib/api"
import { withPreResolvedAuth } from "@/lib/auth/principal"

async function handler(request: Request) {
  return withPreResolvedAuth(request, async () => api.fetch(request))
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler

