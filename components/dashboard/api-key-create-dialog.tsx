"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Copy, Check } from "lucide-react"
import type { CreateApiKeyResponse } from "@/lib/types/dashboard"

export function ApiKeyCreateDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = await res.json()
        setCreatedKey(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      const shouldRefresh = createdKey !== null
      setName("")
      setCreatedKey(null)
      setCopied(false)
      if (shouldRefresh) {
        router.refresh()
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create API Key
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {createdKey ? "API Key Created" : "Create API Key"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {createdKey
              ? "Copy your API key now. You won't be able to see it again."
              : "Create a new API key for external integrations."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {createdKey ? (
          <>
            <div className="space-y-4">
              <div className="bg-muted p-4 font-mono text-sm break-all">
                {createdKey.key}
              </div>
              <Button onClick={handleCopy} className="w-full">
                {copied ? (
                  <>
                    <Check className="size-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => handleOpenChange(false)}>Done</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (name && !loading) {
                handleCreate()
              }
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={!name || loading}>
                {loading ? "Creating..." : "Create Key"}
              </Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
