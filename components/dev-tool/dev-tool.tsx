"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import { DevToolPanel } from "./dev-tool-panel"
import { useEventContext } from "./use-event-context"

const EDGE_MARGIN = 12
const SNAP_TRANSITION = "all 200ms cubic-bezier(0.25, 1, 0.5, 1)"
const DRAG_THRESHOLD = 5
const BUTTON_W = 140
const BUTTON_H = 48
const SIDEBAR_WIDTH = 256

type EdgeY = "top" | "center" | "bottom"
type EdgeX = "left" | "center" | "right"
type Edge = `${EdgeY}-${EdgeX}`

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

function defaultPosition() {
  return {
    x: window.innerWidth - BUTTON_W - EDGE_MARGIN,
    y: window.innerHeight - BUTTON_H - EDGE_MARGIN,
  }
}

const SESSION_KEY = "devtools-state"

export function DevTool() {
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [edge, setEdge] = useState<Edge>("bottom-right")
  const [isSnapping, setIsSnapping] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef(position)
  const edgeRef = useRef(edge)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const hasMoved = useRef(false)

  const eventContext = useEventContext()

  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { edgeRef.current = edge }, [edge])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        sessionStorage.removeItem(SESSION_KEY)
        const s = JSON.parse(saved)
        setPosition(s.position ?? defaultPosition())
        setEdge(s.edge ?? "bottom-right")
        setExpanded(true)
      } else {
        setPosition(defaultPosition())
      }
      setMounted(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (isSnapping) {
      const timer = setTimeout(() => setIsSnapping(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isSnapping])

  useEffect(() => {
    function handleResize() {
      const snapped = snapToEdge(positionRef.current.x + BUTTON_W / 2, positionRef.current.y + BUTTON_H / 2)
      setPosition({ x: snapped.x, y: snapped.y })
      setEdge(snapped.edge)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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

  const saveState = useCallback(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ position: positionRef.current, edge: edgeRef.current })
    )
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, [role=button], a, input, textarea, select")) return
      isDragging.current = true
      hasMoved.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsSnapping(false)
    },
    [position]
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
      const centerX = positionRef.current.x + BUTTON_W / 2
      const centerY = positionRef.current.y + BUTTON_H / 2
      const snapped = snapToEdge(centerX, centerY)
      setIsSnapping(true)
      setPosition({ x: snapped.x, y: snapped.y })
      setEdge(snapped.edge)
    } else if (!expanded) {
      setExpanded(true)
    }
  }, [expanded])

  if (!mounted) return null

  const [edgeY, edgeX] = edge.split("-") as [EdgeY, EdgeX]

  const panelOrigin = cn(
    edgeX === "right" ? "origin-right" : edgeX === "center" ? "origin-center" : "origin-left",
    edgeY === "bottom" ? "origin-bottom" : edgeY === "center" ? "origin-center" : "origin-top"
  )

  return (
    <div
      className={cn("fixed z-9999 select-none", !expanded && "cursor-grab active:cursor-grabbing")}
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
            "rounded-lg border border-dashed bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150 w-[460px] max-h-[70vh] overflow-y-auto",
            panelOrigin
          )}
          style={{
            transform:
              [
                edgeX === "right"
                  ? `translateX(calc(-100% + ${BUTTON_W}px))`
                  : edgeX === "center"
                    ? `translateX(calc(-50% + ${BUTTON_W / 2}px))`
                    : "",
                edgeY === "bottom" || edgeY === "center"
                  ? `translateY(calc(-100% - ${EDGE_MARGIN}px))`
                  : `translateY(${BUTTON_H + EDGE_MARGIN}px)`,
              ]
                .filter(Boolean)
                .join(" ") || undefined,
          }}
        >
          <DevToolPanel
            eventContext={eventContext}
            onClose={() => setExpanded(false)}
            onSaveState={saveState}
          />
        </div>
      ) : (
        <div
          ref={buttonRef}
          className={cn(
            "flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground transition-all duration-150",
            isHovered && "scale-105"
          )}
          style={{
            boxShadow: isHovered
              ? "0 8px 32px color-mix(in oklch, var(--primary) 50%, transparent)"
              : "0 4px 20px color-mix(in oklch, var(--primary) 35%, transparent)",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FlaskConical
            className={cn("size-5 shrink-0 transition-transform duration-150", isHovered && "rotate-12")}
          />
          <span className="text-sm font-semibold whitespace-nowrap">Dev Tools</span>
          {eventContext && (
            <span className="size-2 rounded-full bg-primary-foreground/50 shrink-0" />
          )}
        </div>
      )}
    </div>
  )
}
