"use client"

import { useState, useRef, useCallback } from "react"
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
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ZoomIn, Camera, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface JudgeHeadshotUploadProps {
  headshotUrl: string | null
  hackathonId: string
  judgeId: string | null
  initials: string
  onFileSelected?: (file: File) => void
  onUploaded?: (url: string) => void
  disabled?: boolean
}

const ASPECT_RATIO = 1
const MAX_FILE_SIZE = 5 * 1024 * 1024

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
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
      "image/webp",
      0.95
    )
  })
}

export function JudgeHeadshotUpload({
  headshotUrl,
  hackathonId,
  judgeId,
  initials,
  onFileSelected,
  onUploaded,
  disabled = false,
}: JudgeHeadshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPEG, or WebP image")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be smaller than 5MB")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string)
    })
    reader.readAsDataURL(file)

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  async function handleCropComplete() {
    if (!imageSrc || !croppedAreaPixels) return

    setUploading(true)
    setError(null)

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const croppedFile = new File([croppedBlob], "headshot.webp", { type: "image/webp" })

      if (judgeId && !judgeId.startsWith("temp-")) {
        const formData = new FormData()
        formData.append("file", croppedFile)

        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/judges/display/${judgeId}/headshot`,
          { method: "POST", body: formData }
        )

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to upload headshot")
        }

        const data = await res.json()
        onUploaded?.(data.headshotUrl)
      } else {
        const localUrl = URL.createObjectURL(croppedBlob)
        setPreviewUrl(localUrl)
        onFileSelected?.(croppedFile)
      }

      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function handleCancel() {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError(null)
  }

  const displayUrl = previewUrl || headshotUrl

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "relative size-16 rounded-full shrink-0 overflow-hidden transition-colors group",
          "hover:ring-2 hover:ring-primary/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <Avatar className="size-16">
          {displayUrl && <AvatarImage src={displayUrl} alt="Judge headshot" />}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className="size-5 text-white" />
        </div>
      </button>

      <Dialog open={!!imageSrc} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Headshot</DialogTitle>
            <DialogDescription>
              Drag to reposition. Use the slider to zoom.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT_RATIO}
                cropShape="round"
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
            <Button type="button" onClick={handleCropComplete} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
