"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Upload, X, Sun, Moon, Sparkles } from "lucide-react"

type LogoUploadModalProps = {
  lightLogoUrl: string | null
  darkLogoUrl: string | null
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type UploadState = {
  light: { file: File | null; preview: string | null; deleted: boolean }
  dark: { file: File | null; preview: string | null; deleted: boolean }
}

export function LogoUploadModal({
  lightLogoUrl,
  darkLogoUrl,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: LogoUploadModalProps) {
  const isControlled = controlledOpen !== undefined
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen
  const [state, setState] = useState<UploadState>({
    light: { file: null, preview: lightLogoUrl, deleted: false },
    dark: { file: null, preview: darkLogoUrl, deleted: false },
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const hasPendingChanges =
    state.light.file !== null ||
    state.light.deleted ||
    state.dark.file !== null ||
    state.dark.deleted

  const lightInputRef = useRef<HTMLInputElement>(null)
  const darkInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(variant: "light" | "dark", file: File | null) {
    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPEG, WebP, or SVG file")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File must be smaller than 50MB")
      return
    }

    setError(null)
    const preview = URL.createObjectURL(file)
    setState((prev) => ({
      ...prev,
      [variant]: { file, preview, deleted: false },
    }))
  }

  function handleRemove(variant: "light" | "dark") {
    const original = variant === "light" ? lightLogoUrl : darkLogoUrl
    setState((prev) => {
      const v = prev[variant]
      if (v.file) {
        if (v.preview) URL.revokeObjectURL(v.preview)
        return { ...prev, [variant]: { file: null, preview: original, deleted: false } }
      }
      return { ...prev, [variant]: { file: null, preview: null, deleted: true } }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      for (const variant of ["light", "dark"] as const) {
        const v = state[variant]
        if (v.file) {
          const formData = new FormData()
          formData.append("file", v.file)
          formData.append("variant", variant)
          const res = await fetch("/api/dashboard/upload-logo", {
            method: "POST",
            body: formData,
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Upload failed")
          }
        } else if (v.deleted) {
          const res = await fetch(`/api/dashboard/logo/${variant}`, {
            method: "DELETE",
          })
          if (!res.ok) throw new Error("Delete failed")
        }
      }
      router.refresh()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setState({
        light: { file: null, preview: lightLogoUrl, deleted: false },
        dark: { file: null, preview: darkLogoUrl, deleted: false },
      })
      setError(null)
    } else {
      if (state.light.file && state.light.preview) URL.revokeObjectURL(state.light.preview)
      if (state.dark.file && state.dark.preview) URL.revokeObjectURL(state.dark.preview)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && hasPendingChanges && !saving) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Upload Logo</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Organization Logo</DialogTitle>
          <DialogDescription>
            Upload different versions for light and dark themes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            Upload one logo if it works on both, or separate versions for each theme.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <LogoDropzone
              variant="light"
              preview={state.light.preview}
              inputRef={lightInputRef}
              onFileSelect={(f) => handleFileSelect("light", f)}
              onRemove={() => handleRemove("light")}
            />
            <LogoDropzone
              variant="dark"
              preview={state.dark.preview}
              inputRef={darkInputRef}
              onFileSelect={(f) => handleFileSelect("dark", f)}
              onRemove={() => handleRemove("dark")}
            />
          </div>

          {error && (
            <p className="text-destructive text-xs text-center">{error}</p>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            PNG, JPEG, WebP, or SVG. Images are automatically optimized.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasPendingChanges || saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LogoDropzoneProps = {
  variant: "light" | "dark"
  preview: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File | null) => void
  onRemove: () => void
}

function LogoDropzone({
  variant,
  preview,
  inputRef,
  onFileSelect,
  onRemove,
}: LogoDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const isLight = variant === "light"
  const bgClass = isLight ? "bg-[#f5f5f4]" : "bg-[#1a1a1a]"
  const borderClass = isLight ? "border-[#e5e5e5]" : "border-[#333]"
  const textClass = isLight ? "text-[#666]" : "text-[#999]"

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }, [onFileSelect])

  const dropzone = (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
        {isLight ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        <span>{isLight ? "Light" : "Dark"}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
      />

      <div
        className={`${bgClass} ${borderClass} border rounded-lg relative flex items-center justify-center h-24 cursor-pointer transition-all hover:opacity-80 ${dragging ? "ring-2 ring-primary" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`${variant} logo preview`}
              className="max-h-16 max-w-full object-contain p-2"
            />
            <button
              type="button"
              className="absolute top-1.5 right-1.5 p-1 bg-background/90 rounded hover:bg-background transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <div className={`flex flex-col items-center gap-1.5 ${textClass}`}>
            <Upload className="size-5" />
            <span className="text-xs">Drop or click</span>
          </div>
        )}
      </div>

    </div>
  )

  if (preview) return dropzone

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {dropzone}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-auto p-3">
        <div className="text-center space-y-2">
          <div className={`${isLight ? "bg-[#f5f5f4] border" : "bg-[#1a1a1a] border border-[#333]"} rounded-lg p-4 flex items-center justify-center h-16`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className={`size-4 ${isLight ? "text-[#1a1a1a]" : "text-white"}`} />
              <span className={`font-semibold ${isLight ? "text-[#1a1a1a]" : "text-white"}`}>ACME</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isLight ? "Logo on light backgrounds" : "Logo on dark backgrounds"}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
