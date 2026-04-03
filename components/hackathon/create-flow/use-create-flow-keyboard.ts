"use client"

import { useEffect } from "react"

interface UseCreateFlowKeyboardOptions {
  onNext: () => void
  onSkip: () => void
  onClose: () => void
  canSkip: boolean
}

export function useCreateFlowKeyboard({
  onNext,
  onSkip,
  onClose,
  canSkip,
}: UseCreateFlowKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const isTextarea = tag === "TEXTAREA"
      const isContentEditable = (e.target as HTMLElement)?.isContentEditable

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSkip) {
        e.preventDefault()
        onSkip()
        return
      }

      if (e.key === "Enter" && !isTextarea && !isContentEditable && !e.shiftKey) {
        e.preventDefault()
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNext, onSkip, onClose, canSkip])
}
