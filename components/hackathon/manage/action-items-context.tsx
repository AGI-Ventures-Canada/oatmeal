"use client"

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect, startTransition } from "react"
import { useRouter } from "next/navigation"
import { getOrganizerActionItems, type ActionItem, type ActionSeverity } from "@/lib/utils/organizer-actions"
import { useOrganizerPoll } from "@/hooks/use-organizer-poll"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChallengeDialogs, type ChallengeDialogsHandle } from "./challenge-dialogs"
import { TransitionConfirmDialog, type TransitionConfirmDialogHandle } from "./transition-confirm-dialog"
import type { ScheduleItem } from "@/lib/services/schedule-items"

const SEVERITY_ORDER: ActionSeverity[] = ["urgent", "warning", "info"]

interface ActionItemsContextValue {
  actionItems: ActionItem[]
  completedIds: Set<string>
  dismissedIds: Set<string>
  activeItems: ActionItem[]
  completedItems: ActionItem[]
  remainingCount: number
  totalCount: number
  toggleComplete: (id: string) => void
  dismissItem: (id: string) => void
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  handleActionClick: (item: ActionItem) => void
  slug: string
}

const ActionItemsContext = createContext<ActionItemsContextValue | null>(null)

export function useActionItems() {
  const ctx = useContext(ActionItemsContext)
  if (!ctx) throw new Error("useActionItems must be used within ActionItemsProvider")
  return ctx
}

export function buildActionHref(slug: string, item: ActionItem): string | null {
  if (item.action) return null
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

type ProviderProps = {
  actionItems: ActionItem[]
  hackathonId: string
  slug: string
  challengeExists: boolean
  scheduleItems: ScheduleItem[]
  endsAt: string | null
  children: React.ReactNode
}

export function ActionItemsProvider({
  actionItems: serverActionItems,
  hackathonId,
  slug,
  challengeExists,
  scheduleItems,
  endsAt: serverEndsAt,
  children,
}: ProviderProps) {
  const router = useRouter()
  const challengeRef = useRef<ChallengeDialogsHandle>(null)
  const transitionRef = useRef<TransitionConfirmDialogHandle>(null)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)

  const { data: pollData, refresh: refreshPoll } = useOrganizerPoll(hackathonId)
  const actionItems = pollData ? getOrganizerActionItems(pollData) : serverActionItems
  const liveChallengeExists = pollData ? pollData.challengeExists : challengeExists
  const liveEndsAt = pollData ? pollData.endsAt : serverEndsAt

  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem(`completed-actions-${hackathonId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem(`dismissed-actions-${hackathonId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const [panelOpen, setPanelOpenState] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`action-panel-open-${hackathonId}`)
    if (stored !== null) startTransition(() => setPanelOpenState(stored === "true"))
  }, [hackathonId])

  const actionItemIds = useMemo(() => new Set(actionItems.map((i) => i.id)), [actionItems])

  const effectiveCompletedIds = useMemo(() => {
    const filtered = new Set<string>()
    for (const id of completedIds) {
      if (actionItemIds.has(id)) filtered.add(id)
    }
    return filtered.size !== completedIds.size ? filtered : completedIds
  }, [completedIds, actionItemIds])

  useEffect(() => {
    if (effectiveCompletedIds !== completedIds) {
      localStorage.setItem(`completed-actions-${hackathonId}`, JSON.stringify([...effectiveCompletedIds]))
    }
  }, [effectiveCompletedIds, completedIds, hackathonId])

  const effectiveDismissedIds = useMemo(() => {
    const filtered = new Set<string>()
    for (const id of dismissedIds) {
      if (actionItemIds.has(id)) filtered.add(id)
    }
    return filtered.size !== dismissedIds.size ? filtered : dismissedIds
  }, [dismissedIds, actionItemIds])

  useEffect(() => {
    if (effectiveDismissedIds !== dismissedIds) {
      localStorage.setItem(`dismissed-actions-${hackathonId}`, JSON.stringify([...effectiveDismissedIds]))
    }
  }, [effectiveDismissedIds, dismissedIds, hackathonId])

  const toggleComplete = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem(`completed-actions-${hackathonId}`, JSON.stringify([...next]))
      return next
    })
  }, [hackathonId])

  const dismissItem = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(`dismissed-actions-${hackathonId}`, JSON.stringify([...next]))
      return next
    })
  }, [hackathonId])

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenState(open)
    localStorage.setItem(`action-panel-open-${hackathonId}`, String(open))
  }, [hackathonId])

  const handleActionClick = useCallback((item: ActionItem) => {
    if (item.action === "confirm-promote") {
      setPromoteDialogOpen(true)
    } else if (item.action === "open-challenge-dialog") {
      challengeRef.current?.openChallengeDialog()
    } else if (item.action === "release-challenge") {
      challengeRef.current?.openReleaseDialog()
    } else if (item.action === "highlight-agenda") {
      router.push(`/e/${slug}/manage?tab=overview`)
    } else if (item.action?.startsWith("transition-to-")) {
      const targetStatus = item.action.replace("transition-to-", "")
      transitionRef.current?.openTransitionDialog(targetStatus)
    } else {
      const href = buildActionHref(slug, item)
      if (href) router.push(href)
    }
  }, [slug, router])

  const { activeItems, completedItems } = useMemo(() => {
    const active: ActionItem[] = []
    const completed: ActionItem[] = []
    for (const item of actionItems) {
      if (effectiveDismissedIds.has(item.id)) continue
      if (item.completed || effectiveCompletedIds.has(item.id)) {
        completed.push(item)
      } else {
        active.push(item)
      }
    }
    active.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    return { activeItems: active, completedItems: completed }
  }, [actionItems, effectiveCompletedIds, effectiveDismissedIds])

  const totalCount = actionItems.filter((i) => !effectiveDismissedIds.has(i.id)).length
  const remainingCount = activeItems.length

  const value = useMemo<ActionItemsContextValue>(() => ({
    actionItems,
    completedIds: effectiveCompletedIds,
    dismissedIds: effectiveDismissedIds,
    activeItems,
    completedItems,
    remainingCount,
    totalCount,
    toggleComplete,
    dismissItem,
    panelOpen,
    setPanelOpen,
    handleActionClick,
    slug,
  }), [actionItems, effectiveCompletedIds, effectiveDismissedIds, activeItems, completedItems, remainingCount, totalCount, toggleComplete, dismissItem, panelOpen, setPanelOpen, handleActionClick, slug])

  return (
    <ActionItemsContext.Provider value={value}>
      {children}
      <ChallengeDialogs
        ref={challengeRef}
        hackathonId={hackathonId}
        challengeExists={liveChallengeExists}
        scheduleItems={scheduleItems}
      />
      <TransitionConfirmDialog
        ref={transitionRef}
        hackathonId={hackathonId}
        endsAt={liveEndsAt}
        onTransitioned={refreshPoll}
      />
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Have you promoted your event?</AlertDialogTitle>
            <AlertDialogDescription>
              Share the event link on social media, email potential participants, and spread the word through your community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleComplete("promote-event")}>
              Yes, done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ActionItemsContext.Provider>
  )
}
