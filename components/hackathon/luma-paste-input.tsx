"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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

type LumaPasteInputProps = {
  onClose?: () => void
}

export function LumaPasteInput({ onClose }: LumaPasteInputProps = {}) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    const slug = parseLumaUrl(value)
    if (!slug) {
      setError("Please enter a valid Luma URL (e.g. luma.com/my-event)")
      return
    }

    setError(null)
    onClose?.()
    router.push(`/luma.com/${slug}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isValid = value.trim().length > 0 && parseLumaUrl(value) !== null

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Input
          placeholder="Paste a Luma link (e.g. luma.com/my-event)"
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
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  )
}
