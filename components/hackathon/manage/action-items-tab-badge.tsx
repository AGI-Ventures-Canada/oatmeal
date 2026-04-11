"use client"

import { TabCount } from "@/components/ui/tab-count"
import { useActionItems } from "./action-items-context"

export function ActionItemsTabBadge() {
  const { remainingCount } = useActionItems()
  if (remainingCount === 0) return null
  return <TabCount>{remainingCount}</TabCount>
}
