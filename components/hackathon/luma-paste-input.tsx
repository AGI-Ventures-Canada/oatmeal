"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

function parseLumaUrl(input: string): string | null {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`)
    if (url.hostname === "luma.com" || url.hostname === "www.luma.com") {
      return url.pathname.replace(/^\//, "")
    }
    if (url.hostname === "lu.ma" || url.hostname === "www.lu.ma") {
      return url.pathname.replace(/^\//, "")
    }
    return null
  } catch {
    return null
  }
}

export function LumaPasteInput() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return

    const slug = parseLumaUrl(value)
    if (!slug) {
      setError("Please enter a valid Luma URL (e.g. luma.com/my-event)")
      return
    }

    setError(null)
    router.push(`/luma.com/${slug}`)
  }

  return (
    <div className="w-full sm:w-64">
      <Input
        placeholder="Paste a Luma link to import"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
