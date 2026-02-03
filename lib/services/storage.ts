import sharp from "sharp"
import { supabase as getSupabase } from "@/lib/db/client"

const LOGOS_BUCKET = "logos"
const MAX_LOGO_WIDTH = 800
const MAX_LOGO_HEIGHT = 400
const QUALITY = 85

export type LogoVariant = "light" | "dark"

export interface UploadLogoResult {
  url: string
  path: string
}

export async function optimizeImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  const needsResize =
    (metadata.width && metadata.width > MAX_LOGO_WIDTH) ||
    (metadata.height && metadata.height > MAX_LOGO_HEIGHT)

  let pipeline = image

  if (needsResize) {
    pipeline = pipeline.resize(MAX_LOGO_WIDTH, MAX_LOGO_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  if (mimeType === "image/svg+xml") {
    return { buffer, mimeType }
  }

  if (mimeType === "image/png") {
    const optimized = await pipeline.png({ quality: QUALITY }).toBuffer()
    return { buffer: optimized, mimeType: "image/png" }
  }

  const optimized = await pipeline.webp({ quality: QUALITY }).toBuffer()
  return { buffer: optimized, mimeType: "image/webp" }
}

export async function uploadLogo(
  tenantId: string,
  file: Buffer,
  originalMimeType: string,
  variant: LogoVariant
): Promise<UploadLogoResult | null> {
  const client = getSupabase()

  const { buffer, mimeType } = await optimizeImage(file, originalMimeType)

  const extension = mimeType === "image/svg+xml"
    ? "svg"
    : mimeType === "image/png"
      ? "png"
      : "webp"

  const filename = variant === "light" ? `logo.${extension}` : `logo-dark.${extension}`
  const path = `${tenantId}/${filename}`

  const { error } = await client.storage
    .from(LOGOS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "3600",
    })

  if (error) {
    console.error("Failed to upload logo:", error)
    return null
  }

  const { data: urlData } = client.storage
    .from(LOGOS_BUCKET)
    .getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    path,
  }
}

export async function deleteLogo(
  tenantId: string,
  variant: LogoVariant
): Promise<boolean> {
  const client = getSupabase()

  const extensions = ["webp", "png", "svg"]
  const filename = variant === "light" ? "logo" : "logo-dark"

  const paths = extensions.map((ext) => `${tenantId}/${filename}.${ext}`)

  const { error } = await client.storage
    .from(LOGOS_BUCKET)
    .remove(paths)

  if (error) {
    console.error("Failed to delete logo:", error)
    return false
  }

  return true
}
