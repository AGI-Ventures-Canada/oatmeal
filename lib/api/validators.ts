import { t } from "elysia"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

const HACKATHON_STATUS_VALUES = [
  "draft",
  "published",
  "registration_open",
  "active",
  "judging",
  "completed",
  "archived",
] as const satisfies readonly HackathonStatus[]

export const HackathonStatusEnum = t.Union(
  HACKATHON_STATUS_VALUES.map((s) => t.Literal(s))
)
