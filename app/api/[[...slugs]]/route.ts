import { api } from "@/lib/api"
import { auth } from "@clerk/nextjs/server"
import { preResolveAuth } from "@/lib/auth/principal"

async function handler(request: Request) {
  await preResolveAuth(request)
  return api.fetch(request)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler

