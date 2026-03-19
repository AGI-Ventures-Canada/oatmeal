import { notFound } from "next/navigation"
import { CreateHackathonDialogPreview } from "./preview-client"

export default function CreateHackathonDialogPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <CreateHackathonDialogPreview />
}
