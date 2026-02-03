"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Sun, Moon, Sparkles } from "lucide-react"

type LogoUploadModalProps = {
  lightLogoUrl: string | null
  darkLogoUrl: string | null
  trigger?: React.ReactNode
}

type UploadState = {
  light: { file: File | null; preview: string | null; uploading: boolean }
  dark: { file: File | null; preview: string | null; uploading: boolean }
}

export function LogoUploadModal({
  lightLogoUrl,
  darkLogoUrl,
  trigger,
}: LogoUploadModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<UploadState>({
    light: { file: null, preview: lightLogoUrl, uploading: false },
    dark: { file: null, preview: darkLogoUrl, uploading: false },
  })
  const [error, setError] = useState<string | null>(null)

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
      [variant]: { ...prev[variant], file, preview },
    }))
  }

  async function handleUpload(variant: "light" | "dark") {
    const { file } = state[variant]
    if (!file) return

    setState((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], uploading: true },
    }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("variant", variant)

      const res = await fetch("/api/dashboard/upload-logo", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setState((prev) => ({
        ...prev,
        [variant]: { file: null, preview: data.url, uploading: false },
      }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setState((prev) => ({
        ...prev,
        [variant]: { ...prev[variant], uploading: false },
      }))
    }
  }

  async function handleDelete(variant: "light" | "dark") {
    setState((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], uploading: true },
    }))

    try {
      const res = await fetch(`/api/dashboard/logo/${variant}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Delete failed")
      }

      setState((prev) => ({
        ...prev,
        [variant]: { file: null, preview: null, uploading: false },
      }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      setState((prev) => ({
        ...prev,
        [variant]: { ...prev[variant], uploading: false },
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Upload Logo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Organization Logo</DialogTitle>
          <DialogDescription>
            Upload different versions for light and dark themes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Example section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center space-y-2">
              <div className="bg-[#f5f5f4] border rounded-lg p-4 flex items-center justify-center h-16">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#1a1a1a]" />
                  <span className="text-[#1a1a1a] font-semibold">ACME</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Sun className="size-3" />
                <span>Light mode</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex items-center justify-center h-16">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-white" />
                  <span className="text-white font-semibold">ACME</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Moon className="size-3" />
                <span>Dark mode</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Upload one logo if it works on both, or separate versions for each theme.
          </p>

          {/* Upload zones */}
          <div className="grid grid-cols-2 gap-4">
            <LogoDropzone
              variant="light"
              preview={state.light.preview}
              file={state.light.file}
              uploading={state.light.uploading}
              inputRef={lightInputRef}
              onFileSelect={(f) => handleFileSelect("light", f)}
              onUpload={() => handleUpload("light")}
              onDelete={() => handleDelete("light")}
              onClear={() =>
                setState((prev) => ({
                  ...prev,
                  light: { ...prev.light, file: null, preview: lightLogoUrl },
                }))
              }
            />
            <LogoDropzone
              variant="dark"
              preview={state.dark.preview}
              file={state.dark.file}
              uploading={state.dark.uploading}
              inputRef={darkInputRef}
              onFileSelect={(f) => handleFileSelect("dark", f)}
              onUpload={() => handleUpload("dark")}
              onDelete={() => handleDelete("dark")}
              onClear={() =>
                setState((prev) => ({
                  ...prev,
                  dark: { ...prev.dark, file: null, preview: darkLogoUrl },
                }))
              }
            />
          </div>

          {error && (
            <p className="text-destructive text-xs text-center">{error}</p>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            PNG, JPEG, WebP, or SVG. Images are automatically optimized.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type LogoDropzoneProps = {
  variant: "light" | "dark"
  preview: string | null
  file: File | null
  uploading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File | null) => void
  onUpload: () => void
  onDelete: () => void
  onClear: () => void
}

function LogoDropzone({
  variant,
  preview,
  file,
  uploading,
  inputRef,
  onFileSelect,
  onUpload,
  onDelete,
  onClear,
}: LogoDropzoneProps) {
  const isLight = variant === "light"
  const bgClass = isLight ? "bg-[#f5f5f4]" : "bg-[#1a1a1a]"
  const borderClass = isLight ? "border-[#e5e5e5]" : "border-[#333]"
  const textClass = isLight ? "text-[#666]" : "text-[#999]"

  return (
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
        className={`${bgClass} ${borderClass} border rounded-lg relative flex items-center justify-center h-24 cursor-pointer transition-all hover:opacity-80`}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`${variant} logo preview`}
              className="max-h-16 max-w-full object-contain p-2"
            />
            {!file && (
              <button
                type="button"
                className="absolute top-1.5 right-1.5 p-1 bg-background/90 rounded hover:bg-background transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                disabled={uploading}
              >
                <X className="size-3" />
              </button>
            )}
          </>
        ) : (
          <div className={`flex flex-col items-center gap-1.5 ${textClass}`}>
            <Upload className="size-5" />
            <span className="text-xs">Upload</span>
          </div>
        )}
      </div>

      {file && (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={onUpload}
            disabled={uploading}
            className="flex-1 h-7 text-xs"
          >
            {uploading ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClear}
            disabled={uploading}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
