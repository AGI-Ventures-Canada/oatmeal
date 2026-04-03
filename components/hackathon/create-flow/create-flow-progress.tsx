"use client"

import { ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

interface CreateFlowProgressProps {
  currentStep: number
  totalSteps: number
  canSkip: boolean
  onSkip: () => void
  onBack: () => void
  onClose: () => void
}

export function CreateFlowProgress({
  currentStep,
  totalSteps,
  canSkip,
  onSkip,
  onBack,
  onClose,
}: CreateFlowProgressProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={currentStep === 0 ? onClose : onBack}
        className="gap-1.5 text-muted-foreground"
      >
        {currentStep === 0 ? (
          <X className="size-4" />
        ) : (
          <ArrowLeft className="size-4" />
        )}
        <span className="hidden sm:inline">
          {currentStep === 0 ? "Close" : "Back"}
        </span>
      </Button>

      <div
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemax={totalSteps}
        className="flex items-center gap-2"
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors duration-500",
              i <= currentStep
                ? "bg-primary"
                : "bg-muted-foreground/15",
            )}
          />
        ))}
        <span className="sr-only">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {canSkip ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="gap-2 text-muted-foreground"
        >
          Skip to event page
          <Kbd className="hidden sm:inline-flex">
            {typeof navigator !== "undefined" &&
            (navigator.userAgent?.includes("Mac") ?? false)
              ? "⌘"
              : "Ctrl"}
            +Enter
          </Kbd>
        </Button>
      ) : (
        <div className="w-[140px]" />
      )}
    </div>
  )
}
