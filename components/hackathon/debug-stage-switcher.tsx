"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { HackathonStatus } from "@/lib/db/hackathon-types"
import { getTimelineState } from "@/lib/utils/timeline"
import { cn } from "@/lib/utils"

const ALL_STAGES: { status: HackathonStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "registration_open", label: "Reg. Open" },
  { status: "active", label: "Active" },
  { status: "judging", label: "Judging" },
  { status: "completed", label: "Completed" },
  { status: "archived", label: "Archived" },
]

const EDGE_MARGIN = 12
const SNAP_TRANSITION = "all 200ms cubic-bezier(0.25, 1, 0.5, 1)"
const DRAG_THRESHOLD = 5

type EdgeY = "top" | "center" | "bottom"
type EdgeX = "left" | "center" | "right"
type Edge = `${EdgeY}-${EdgeX}`

const BUTTON_W = 140
const BUTTON_H = 48

const SIDEBAR_WIDTH = 256

function snapToEdge(x: number, y: number): { x: number; y: number; edge: Edge } {
  const hasSidebar = window.innerWidth >= 1024
  const leftEdge = hasSidebar ? SIDEBAR_WIDTH + EDGE_MARGIN : EDGE_MARGIN
  const rightEdge = window.innerWidth - BUTTON_W - EDGE_MARGIN
  const contentMidX = hasSidebar ? (SIDEBAR_WIDTH + window.innerWidth) / 2 : window.innerWidth / 2
  const centerX = contentMidX - BUTTON_W / 2
  const centerY = window.innerHeight / 2 - BUTTON_H / 2

  const thirdX = (window.innerWidth - (hasSidebar ? SIDEBAR_WIDTH : 0)) / 3
  const offsetX = x - (hasSidebar ? SIDEBAR_WIDTH : 0)
  const edgeX: EdgeX = offsetX < thirdX ? "left" : offsetX < thirdX * 2 ? "center" : "right"

  const thirdY = window.innerHeight / 3
  const edgeY: EdgeY = y < thirdY ? "top" : y < thirdY * 2 ? "center" : "bottom"

  const snapX = edgeX === "left" ? leftEdge : edgeX === "center" ? centerX : rightEdge
  const snapY = edgeY === "top" ? EDGE_MARGIN : edgeY === "center" ? centerY : window.innerHeight - BUTTON_H - EDGE_MARGIN

  return { x: snapX, y: snapY, edge: `${edgeY}-${edgeX}` }
}

interface DebugStageSwitcherProps {
  hackathonId: string
  currentStatus: HackathonStatus
  registrationOpensAt?: string | null
  registrationClosesAt?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

export function DebugStageSwitcher({
  hackathonId,
  currentStatus,
  registrationOpensAt,
  registrationClosesAt,
  startsAt,
  endsAt,
}: DebugStageSwitcherProps) {
  const router = useRouter()
  const [pending, setPending] = useState<HackathonStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [edge, setEdge] = useState<Edge>("bottom-right")
  const [isSnapping, setIsSnapping] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setPosition({ x: window.innerWidth - BUTTON_W - EDGE_MARGIN, y: window.innerHeight - BUTTON_H - EDGE_MARGIN })
    setMounted(true)
  }, [])
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const hasMoved = useRef(false)

  const timelineState = getTimelineState({
    status: currentStatus,
    registration_opens_at: registrationOpensAt,
    registration_closes_at: registrationClosesAt,
    starts_at: startsAt,
    ends_at: endsAt,
  })

  async function switchTo(status: HackathonStatus) {
    if (status === currentStatus || pending) return
    setPending(status)
    try {
      const res = await fetch(`/api/dev/hackathons/${hackathonId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed")
      router.refresh()
    } catch (err) {
      console.error("[DebugStageSwitcher] failed to update status:", err)
    } finally {
      setPending(null)
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return
      isDragging.current = true
      hasMoved.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsSnapping(false)
    },
    [position],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (!hasMoved.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    hasMoved.current = true
    const newX = Math.max(0, Math.min(dragStart.current.posX + dx, window.innerWidth - BUTTON_W))
    const newY = Math.max(0, Math.min(dragStart.current.posY + dy, window.innerHeight - BUTTON_H))
    setPosition({ x: newX, y: newY })
  }, [])

  const handlePointerUp = useCallback(() => {
    const wasDragging = hasMoved.current
    isDragging.current = false
    hasMoved.current = false

    if (wasDragging) {
      const centerX = position.x + BUTTON_W / 2
      const centerY = position.y + BUTTON_H / 2
      const snapped = snapToEdge(centerX, centerY)
      setIsSnapping(true)
      setPosition({ x: snapped.x, y: snapped.y })
      setEdge(snapped.edge)
    } else if (!expanded) {
      setExpanded(true)
    }
  }, [expanded, position])

  useEffect(() => {
    if (isSnapping) {
      const timer = setTimeout(() => setIsSnapping(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isSnapping])

  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleResize() {
      const snapped = snapToEdge(position.x + BUTTON_W / 2, position.y + BUTTON_H / 2)
      setPosition({ x: snapped.x, y: snapped.y })
      setEdge(snapped.edge)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [position])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && expanded) setExpanded(false)
    }
    function handleClickOutside(e: MouseEvent) {
      if (!expanded) return
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setExpanded(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("pointerdown", handleClickOutside)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("pointerdown", handleClickOutside)
    }
  }, [expanded])

  const [edgeY, edgeX] = edge.split("-") as [EdgeY, EdgeX]

  const panelOrigin = cn(
    edgeX === "right" ? "origin-right" : edgeX === "center" ? "origin-center" : "origin-left",
    edgeY === "bottom" ? "origin-bottom" : edgeY === "center" ? "origin-center" : "origin-top",
  )

  if (!mounted) return null

  return (
    <div
      className={cn(
        "fixed z-[9999] select-none",
        !expanded && "cursor-grab active:cursor-grabbing",
      )}
      style={{
        left: position.x,
        top: position.y,
        transition: isSnapping ? SNAP_TRANSITION : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {expanded ? (
        <div
          ref={panelRef}
          className={cn(
            "rounded-lg border border-dashed bg-card shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150",
            panelOrigin,
          )}
          style={{
            transform: [
              edgeX === "right" ? `translateX(calc(-100% + ${BUTTON_W}px))` : edgeX === "center" ? `translateX(calc(-50% + ${BUTTON_W / 2}px))` : "",
              edgeY === "bottom" || edgeY === "center" ? `translateY(calc(-100% - ${EDGE_MARGIN}px))` : `translateY(${BUTTON_H + EDGE_MARGIN}px)`,
            ].filter(Boolean).join(" ") || undefined,
          }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1 cursor-grab active:cursor-grabbing">
              <FlaskConical className="size-3.5" />
              <span className="font-medium">Dev</span>
            </div>
            <Badge variant={timelineState.variant} className="text-xs">
              {timelineState.label}
            </Badge>
            {ALL_STAGES.map(({ status, label }) => {
              const isActive = status === currentStatus
              const isLoading = pending === status
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  disabled={!!pending}
                  className={cn(
                    "transition-all duration-150",
                    !isActive && !pending && "hover:scale-105 hover:shadow-md",
                  )}
                  onClick={() => switchTo(status)}
                >
                  {isLoading && <Loader2 className="size-3 animate-spin mr-1" />}
                  {label}
                </Button>
              )
            })}
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0 ml-1"
              onClick={() => setExpanded(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          ref={buttonRef}
          className={cn(
            "flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground transition-all duration-150",
            isHovered && "scale-105",
          )}
          style={{
            boxShadow: isHovered
              ? "0 8px 32px color-mix(in oklch, var(--primary) 50%, transparent)"
              : "0 4px 20px color-mix(in oklch, var(--primary) 35%, transparent)",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FlaskConical className={cn("size-5 shrink-0 transition-transform duration-150", isHovered && "rotate-12")} />
          <span className="text-sm font-semibold whitespace-nowrap">Dev Tools</span>
        </div>
      )}
    </div>
  )
}
