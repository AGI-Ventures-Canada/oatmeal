"use client"

import { useCallback, useState, type ReactNode } from "react"

const MAX_HEIGHT = 400

export function TruncatableContent({ children }: { children: ReactNode }) {
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      setIsOverflowing(el.scrollHeight > MAX_HEIGHT)
      setIsExpanded(false)
    }
  }, [children]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div
        ref={measureRef}
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
              setIsExpanded(true)
            }}
          >
            Show more
          </button>
        </div>
      )}
    </div>
  )
}
