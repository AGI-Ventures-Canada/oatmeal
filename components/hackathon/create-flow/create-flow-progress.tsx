"use client"

import { ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"

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
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={currentStep === 0 ? onClose : onBack}
          className="gap-1.5"
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

        <span className="text-xs text-muted-foreground tabular-nums">
          {currentStep + 1} / {totalSteps}
        </span>

        {canSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip to event page
            <Kbd className="hidden sm:inline-flex">
              {typeof navigator !== "undefined" &&
              navigator.platform?.includes("Mac")
                ? "⌘"
                : "Ctrl"}
              +Enter
            </Kbd>
          </button>
        ) : (
          <div className="w-[140px]" />
        )}
      </div>
      <Progress value={progress} />
    </div>
  )
}
