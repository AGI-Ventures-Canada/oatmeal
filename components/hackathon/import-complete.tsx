"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck } from "lucide-react"

const REDIRECT_DELAY_MS = 2000

export function ImportComplete({ slug }: { slug: string }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(`/e/${slug}/manage`)
    }, REDIRECT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [slug, router])

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8">
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <CircleCheck className="size-8 text-primary animate-in fade-in zoom-in duration-300" />
        <p className="text-sm font-medium text-foreground animate-in fade-in duration-500">
          Hackathon imported successfully
        </p>
        <p className="text-xs text-muted-foreground animate-in fade-in duration-700">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  )
}
