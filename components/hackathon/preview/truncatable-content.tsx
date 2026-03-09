"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"

const MAX_HEIGHT = 400

export function TruncatableContent({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ isOverflowing: false, isExpanded: false })
  const { isOverflowing, isExpanded } = state

  useEffect(() => {
    const el = contentRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ isExpanded: false, isOverflowing: el ? el.scrollHeight > MAX_HEIGHT : false })
  }, [children])

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={!isExpanded && isOverflowing ? "overflow-hidden" : undefined}
        style={!isExpanded && isOverflowing ? { maxHeight: MAX_HEIGHT } : undefined}
      >
        {children}
      </div>
      {isOverflowing && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-0">
          <button
            type="button"
            className="text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setState((s) => ({ ...s, isExpanded: true }))
            }}
          >
            Show more
          </button>
        </div>
      )}
    </div>
  )
}
