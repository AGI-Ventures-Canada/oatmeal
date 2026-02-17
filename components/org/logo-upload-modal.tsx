"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
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
import { Slider } from "@/components/ui/slider"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Upload, X, Sun, Moon, Sparkles, ZoomIn, Crop } from "lucide-react"

const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB

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

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve) => {
    image.onload = resolve
  })

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No 2d context")

  const maxWidth = 1600
  const maxHeight = 800
  let outWidth = pixelCrop.width
  let outHeight = pixelCrop.height

  if (outWidth > maxWidth || outHeight > maxHeight) {
    const scale = Math.min(maxWidth / outWidth, maxHeight / outHeight)
    outWidth = Math.round(outWidth * scale)
    outHeight = Math.round(outHeight * scale)
  }

  canvas.width = outWidth
  canvas.height = outHeight

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outWidth,
    outHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Canvas is empty"))
      },
      "image/webp",
      0.95
    )
  })
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

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropVariant, setCropVariant] = useState<"light" | "dark">("light")
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropAspect, setCropAspect] = useState(4 / 3)
  const [applying, setApplying] = useState(false)

  const isCropping = cropSrc !== null

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

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be smaller than 30MB")
      return
    }

    setError(null)

    if (file.type === "image/svg+xml") {
      const preview = URL.createObjectURL(file)
      setState((prev) => ({
        ...prev,
        [variant]: { file, preview, deleted: false },
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        setCropAspect(img.naturalWidth / img.naturalHeight)
        setCropSrc(dataUrl)
        setCropVariant(variant)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setCroppedAreaPixels(null)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleApplyCrop() {
    if (!cropSrc || !croppedAreaPixels) return

    setApplying(true)
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels)
      const file = new File([blob], `logo-${cropVariant}.webp`, { type: "image/webp" })
      const preview = URL.createObjectURL(blob)
      setState((prev) => ({
        ...prev,
        [cropVariant]: { file, preview, deleted: false },
      }))
      setCropSrc(null)
    } catch {
      setError("Failed to crop image")
    } finally {
      setApplying(false)
    }
  }

  function handleCancelCrop() {
    setCropSrc(null)
    setCroppedAreaPixels(null)
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
    if (!isOpen && isCropping) {
      handleCancelCrop()
      return
    }
    setOpen(isOpen)
    if (isOpen) {
      setState({
        light: { file: null, preview: lightLogoUrl, deleted: false },
        dark: { file: null, preview: darkLogoUrl, deleted: false },
      })
      setError(null)
      setCropSrc(null)
    } else {
      if (state.light.file && state.light.preview) URL.revokeObjectURL(state.light.preview)
      if (state.dark.file && state.dark.preview) URL.revokeObjectURL(state.dark.preview)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (isCropping && croppedAreaPixels && !applying) {
        handleApplyCrop()
      } else if (!isCropping && hasPendingChanges && !saving) {
        handleSave()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Upload Logo</Button>}
        </DialogTrigger>
      )}
      <DialogContent
        className={isCropping ? "sm:max-w-2xl" : "sm:max-w-md"}
        onKeyDown={handleKeyDown}
      >
        {isCropping ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crop className="size-4" />
                Crop Logo
              </DialogTitle>
              <DialogDescription>
                Drag to reposition. Use the slider to zoom in or out.
              </DialogDescription>
            </DialogHeader>

            <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
              <Cropper
                image={cropSrc!}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={false}
              />
            </div>

            <div className="flex items-center gap-3">
              <ZoomIn className="size-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {error && (
              <p className="text-destructive text-xs text-center">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelCrop} disabled={applying}>
                Back
              </Button>
              <Button onClick={handleApplyCrop} disabled={!croppedAreaPixels || applying}>
                {applying ? "Applying..." : "Apply Crop"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
          </>
        )}
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
        onChange={(e) => {
          onFileSelect(e.target.files?.[0] || null)
          if (e.target) e.target.value = ""
        }}
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
