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
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Upload, Trash2, ZoomIn, ImagePlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerUploadProps {
  hackathonId: string
  currentBannerUrl: string | null
  onUploadComplete?: (url: string) => void
  onAuthRequired?: () => void
  className?: string
  variant?: "default" | "hero"
}

const ASPECT_RATIO = 1
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc

  await new Promise((resolve) => {
    image.onload = resolve
  })

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("No 2d context")
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("Canvas is empty"))
        }
      },
      "image/jpeg",
      0.95
    )
  })
}

export function BannerUpload({
  hackathonId,
  currentBannerUrl,
  onUploadComplete,
  onAuthRequired,
  className,
  variant = "default",
}: BannerUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]

  function processFile(file: File) {
    if (onAuthRequired) {
      onAuthRequired()
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPEG, or WebP image")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be smaller than 50MB")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string)
    })
    reader.readAsDataURL(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleUpload() {
    if (!imageSrc || !croppedAreaPixels) return

    setUploading(true)
    setError(null)

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const formData = new FormData()
      formData.append("file", croppedBlob, "banner.jpg")

      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/banner`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to upload banner")
      }

      const data = await res.json()
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      onUploadComplete?.(data.url)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/banner`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete banner")
      }

      onUploadComplete?.("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  function handleCancel() {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError(null)
  }

  const isHero = variant === "hero"

  const dropHandlers = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className={cn("space-y-2", className)}>
        {currentBannerUrl ? (
          <div
            className={cn(
              "relative group overflow-hidden border",
              isHero ? "rounded-xl" : "rounded-lg",
              isDragOver && "ring-2 ring-primary"
            )}
            {...dropHandlers}
          >
            <div className="aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentBannerUrl}
                alt="Current banner"
                className="h-full w-full object-cover"
              />
            </div>
            <div className={cn(
              "absolute inset-0 flex items-center justify-center gap-3 pointer-events-none",
              isDragOver && "bg-primary/20"
            )}>
              {isDragOver ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-medium">Drop to replace</span>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    size="icon"
                    className="size-12 rounded-full shadow-lg pointer-events-auto"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="size-5" />
                  </Button>
                  {onAuthRequired ? (
                    <Button
                      type="button"
                      size="icon"
                      className="size-12 rounded-full shadow-lg pointer-events-auto"
                      onClick={onAuthRequired}
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          className="size-12 rounded-full shadow-lg pointer-events-auto"
                          disabled={deleting}
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove banner image?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the current banner image. You can always upload a new one later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDelete}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAuthRequired ? onAuthRequired() : inputRef.current?.click()}
            className={cn(
              "aspect-square w-full flex flex-col items-center justify-center gap-1.5 border border-dashed bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              isHero
                ? "rounded-xl border-2 border-muted-foreground/25 hover:border-primary/50 gap-2"
                : "rounded-lg",
              isDragOver && "border-primary bg-primary/5 text-foreground"
            )}
            {...dropHandlers}
          >
            <ImagePlus className={isHero ? "size-8" : "size-5"} />
            <span className={cn("font-medium", isHero ? "text-sm" : "text-xs")}>
              {isDragOver ? "Drop image here" : isHero ? "Add event image" : "Upload banner image"}
            </span>
            {isHero && !isDragOver && (
              <span className="text-xs text-muted-foreground">or drag & drop</span>
            )}
          </button>
        )}

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}
      </div>

      <Dialog open={!!imageSrc} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Banner Image</DialogTitle>
            <DialogDescription>
              Drag to reposition. Use the slider to zoom in or out.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT_RATIO}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={false}
              />
            )}
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
            <p className="text-destructive text-sm">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
