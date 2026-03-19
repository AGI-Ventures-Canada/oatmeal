import { notFound } from "next/navigation"
import { DraftBannerPreview } from "./preview-client"

export default function DraftBannerPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <DraftBannerPreview />
}
