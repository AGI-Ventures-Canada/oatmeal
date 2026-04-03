"use client"

import { MarkdownEditor } from "@/components/ui/markdown-editor"

interface StepDescriptionProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function StepDescription({ value, onChange }: StepDescriptionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-4xl">
          Tell people what it&apos;s about
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          A short description so participants know what to expect. Markdown supported.
        </p>
      </div>
      <MarkdownEditor
        value={value ?? ""}
        onChange={(val) => onChange(val || null)}
        placeholder="What will participants build? What's the theme?"
        rows={8}
      />
    </div>
  )
}
