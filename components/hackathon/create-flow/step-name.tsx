"use client"

import { Input } from "@/components/ui/input"

interface StepNameProps {
  value: string
  onChange: (value: string) => void
}

export function StepName({ value, onChange }: StepNameProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-4xl">
          What&apos;s your hackathon called?
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Pick a name that excites participants. You can always change it later.
        </p>
      </div>
      <Input
        type="text"
        placeholder="My Awesome Hackathon"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-lg"
        autoFocus
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
    </div>
  )
}
